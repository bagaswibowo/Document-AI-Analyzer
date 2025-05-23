
import { DataRow, ColumnInfo, DataType, ColumnStats } from '../types';

// Simple CSV parser
export const parseCSV = (csvText: string): { headers: string[]; rows: DataRow[] } => {
  const lines = csvText.trim().split(/\r\n|\n|\r/);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map(h => h.trim());
  const rows: DataRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    const values = lines[i].split(','); // Basic split, doesn't handle commas in quotes well
    const row: DataRow = {};
    headers.forEach((header, index) => {
      const value = values[index]?.trim();
      row[header] = inferTypeAndConvert(value);
    });
    rows.push(row);
  }
  return { headers, rows };
};

const inferTypeAndConvert = (value: string | undefined): string | number | boolean | null | Date => {
  if (value === undefined || value === null || value.toLowerCase() === 'na' || value.toLowerCase() === 'null' || value === '') {
    return null;
  }
  if (!isNaN(Number(value)) && value.trim() !== '') { // Check for numbers
    return Number(value);
  }
  if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') { // Check for booleans
    return value.toLowerCase() === 'true';
  }
  // Basic date check (YYYY-MM-DD or MM/DD/YYYY). More robust parsing might be needed.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date;
  }
  return value; // Default to string
};

const getDataType = (value: any): DataType => {
  if (value === null || value === undefined) return 'unknown';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (value instanceof Date) return 'date';
  if (typeof value === 'string') return 'string';
  return 'unknown';
};

export const analyzeColumns = (rows: DataRow[], headers: string[]): ColumnInfo[] => {
  return headers.map(header => {
    const values = rows.map(row => row[header]).filter(v => v !== null && v !== undefined);
    const numericValues = values.filter(v => typeof v === 'number') as number[];
    const stringValues = values.filter(v => typeof v === 'string') as string[];
    
    let type: DataType = 'unknown';
    if (values.length > 0) {
        type = getDataType(values[0]); // Infer type from first non-null value
        // More robust type inference: check consistency or majority type
        const typeCounts: Record<string, number> = {};
        values.forEach(v => {
            const t = getDataType(v);
            typeCounts[t] = (typeCounts[t] || 0) + 1;
        });
        let maxCount = 0;
        for (const t in typeCounts) {
            if (typeCounts[t] > maxCount) {
                maxCount = typeCounts[t];
                type = t as DataType;
            }
        }
    }


    const stats: ColumnStats = {
      missingCount: rows.length - values.length,
    };

    if (type === 'number' && numericValues.length > 0) {
      numericValues.sort((a, b) => a - b);
      stats.mean = numericValues.reduce((acc, v) => acc + v, 0) / numericValues.length;
      stats.median = numericValues.length % 2 === 0
        ? (numericValues[numericValues.length / 2 - 1] + numericValues[numericValues.length / 2]) / 2
        : numericValues[Math.floor(numericValues.length / 2)];
      const variance = numericValues.reduce((acc, v) => acc + Math.pow(v - (stats.mean as number), 2), 0) / numericValues.length;
      stats.stdDev = Math.sqrt(variance);
      stats.min = numericValues[0];
      stats.max = numericValues[numericValues.length - 1];
      // Simple mode for numbers (most frequent, or first if multiple)
      const numFreq: Record<number, number> = {};
      numericValues.forEach(v => numFreq[v] = (numFreq[v] || 0) + 1);
      stats.mode = parseFloat(Object.entries(numFreq).sort((a,b) => b[1]-a[1])[0]?.[0]);

    } else if (type === 'string' || type === 'boolean') {
      const valueCounts: Record<string, number> = {};
      values.forEach(v => {
        const key = String(v);
        valueCounts[key] = (valueCounts[key] || 0) + 1;
      });
      stats.valueCounts = valueCounts;
      stats.uniqueValues = Object.keys(valueCounts);
      if (stats.uniqueValues.length > 0) {
         stats.mode = Object.entries(valueCounts).sort((a,b) => b[1]-a[1])[0]?.[0];
      }
    }
     // For date type, min/max can be useful
    if (type === 'date') {
        const dateValues = values.filter(v => v instanceof Date) as Date[];
        if (dateValues.length > 0) {
            dateValues.sort((a, b) => a.getTime() - b.getTime());
            stats.min = dateValues[0].toISOString().split('T')[0] as any; // Store as string for simplicity
            stats.max = dateValues[dateValues.length - 1].toISOString().split('T')[0] as any;
        }
    }


    return { name: header, type, stats };
  });
};
    