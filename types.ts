

export type DataType = 'string' | 'number' | 'boolean' | 'date' | 'unknown';

export interface ColumnStats {
  missingCount: number;
  // Numerical stats
  mean?: number;
  median?: number;
  mode?: number | string; // Mode can be string for categorical
  stdDev?: number;
  min?: number;
  max?: number;
  // Categorical stats
  uniqueValues?: (string | number)[];
  valueCounts?: Record<string, number>;
}

export interface ColumnInfo {
  name: string;
  type: DataType;
  stats: ColumnStats;
}

export type DataRow = Record<string, string | number | boolean | null | Date>;

export interface ParsedCsvData {
  headers: string[];
  rows: DataRow[];
  columnInfos: ColumnInfo[];
  rowCount: number;
  columnCount: number;
  sampleRows: DataRow[]; // First N rows for display
  fileName: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

// For Recharts, data often needs to be an array of objects
// FIX: Allow boolean and null values in ChartData to match DataRow possibilities.
export type ChartData = Record<string, string | number | boolean | Date | null>[];