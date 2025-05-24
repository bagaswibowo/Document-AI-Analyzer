
import { DataRow, ColumnInfo, DataType, ColumnStats, ParsedCsvData } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';



export const parseCSV = (text: string, delimiter: ',' | '\t' = ','): { headers: string[]; rows: DataRow[] } => {
  const lines = text.trim().split(/\r\n|\n|\r/);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, '')); 
  const rows: DataRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
    const row: DataRow = {};
    headers.forEach((header, index) => {
      row[header] = inferTypeAndConvert(values[index]);
    });
    rows.push(row);
  }
  return { headers, rows };
};


const inferTypeAndConvert = (value: any): string | number | boolean | null | Date => {
  if (value === undefined || value === null || (typeof value === 'string' && (value.toLowerCase() === 'na' || value.toLowerCase() === 'null' || value.trim() === ''))) {
    return null;
  }

  
  if (value instanceof Date) {
    if (!isNaN(value.getTime())) {
        return value;
    } else {
        const strVal = String(value);
        if (strVal.trim() === '' || strVal.toLowerCase() === 'invalid date') return null;
        
    }
  }
  
  
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'boolean') return value;

  
  const sValue = String(value).trim();
  if (sValue === '') return null; 

  
  if (/^-?\d*\.?\d+$/.test(sValue) && !isNaN(Number(sValue))) {
    return Number(sValue);
  }
  
  if (sValue.toLowerCase() === 'true' || sValue.toLowerCase() === 'false') { 
    return sValue.toLowerCase() === 'true';
  }
  
  if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/.test(sValue) || 
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(sValue) || 
      /^\d{1,2}-\w{3}-\d{2,4}$/.test(sValue) || 
      /^\w{3}\s\d{1,2},?\s\d{4}$/.test(sValue) 
     ) {
    const date = new Date(sValue);
    if (!isNaN(date.getTime())) {
        return date;
    }
  }
  return sValue; 
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
    const allColumnValues = rows.map(row => row[header]);
    const nonMissingValues = allColumnValues.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
    
    let type: DataType = 'unknown';
    if (nonMissingValues.length > 0) {
        const typeCounts: Record<string, number> = {};
        
        const sampleForTypeInference = nonMissingValues.length > 200 ? nonMissingValues.slice(0, 200) : nonMissingValues;
        sampleForTypeInference.forEach(v => {
            const t = getDataType(v);
            typeCounts[t] = (typeCounts[t] || 0) + 1;
        });
        
        let maxCount = 0;
        let majorityType: DataType = 'unknown';
        
        if (typeCounts.number > 0 && typeCounts.string > 0) {
             
             const stringToNumberRatio = typeCounts.number / (typeCounts.number + typeCounts.string);
             if (stringToNumberRatio > 0.5) { 
                
             }
        }

        for (const t in typeCounts) {
            if (typeCounts[t] > maxCount) {
                maxCount = typeCounts[t];
                majorityType = t as DataType;
            }
        }
        type = majorityType;
         
        if (type === 'string' && sampleForTypeInference.every(v => String(v).trim() === '' || (typeof v === 'string' && /^-?\d*\.?\d+$/.test(v.trim()) && !isNaN(Number(v))))) {
           type = 'number';
        }
    }

    const stats: ColumnStats = {
      missingCount: allColumnValues.length - nonMissingValues.length,
    };

    const numericValues = nonMissingValues.map(v => type === 'number' ? Number(v) : parseFloat(String(v))).filter(v => typeof v === 'number' && !isNaN(v)) as number[];

    if (type === 'number' && numericValues.length > 0) {
      numericValues.sort((a, b) => a - b);
      stats.mean = numericValues.reduce((acc, v) => acc + v, 0) / numericValues.length;
      stats.median = numericValues.length % 2 === 0
        ? (numericValues[Math.floor(numericValues.length / 2) - 1] + numericValues[Math.floor(numericValues.length / 2)]) / 2
        : numericValues[Math.floor(numericValues.length / 2)];
      const variance = numericValues.reduce((acc, v) => acc + Math.pow(v - (stats.mean as number), 2), 0) / (numericValues.length > 1 ? numericValues.length -1 : 1) ; 
      stats.stdDev = Math.sqrt(variance);
      stats.min = numericValues[0];
      stats.max = numericValues[numericValues.length - 1];
      
      const numFreq: Record<number, number> = {};
      numericValues.forEach(v => numFreq[v] = (numFreq[v] || 0) + 1);
      if (Object.keys(numFreq).length > 0) {
        stats.mode = parseFloat(Object.entries(numFreq).sort((a,b) => b[1]-a[1])[0]?.[0]);
      }
    }
    
    if (type === 'string' || type === 'boolean' || (type === 'number' && numericValues.length === 0) ) { 
      const valueCounts: Record<string, number> = {};
      nonMissingValues.forEach(v => {
        const key = String(v); 
        valueCounts[key] = (valueCounts[key] || 0) + 1;
      });
      stats.valueCounts = valueCounts;
      stats.uniqueValues = Object.keys(valueCounts); 
      if (stats.uniqueValues.length > 0) {
         stats.mode = Object.entries(valueCounts).sort((a,b) => b[1]-a[1])[0]?.[0];
      }
    } else if (type === 'date') {
        const dateValues = nonMissingValues.filter(v => v instanceof Date) as Date[];
        if (dateValues.length > 0) {
            dateValues.sort((a, b) => a.getTime() - b.getTime());
            stats.min = dateValues[0].toISOString().split('T')[0] as any; 
            stats.max = dateValues[dateValues.length - 1].toISOString().split('T')[0] as any;
            
        }
    }
    
    
    if (!stats.uniqueValues && (type === 'number' || type === 'date')) {
        stats.uniqueValues = [...new Set(nonMissingValues.map(v => {
            if (v instanceof Date) {
                return v.toISOString().split('T')[0]; 
            }
            if (typeof v === 'boolean') {
                return String(v); 
            }
            
            return v; 
        }))];
    }

    return { name: header, type, stats };
  });
};

export const parseExcel = async (file: File): Promise<ParsedCsvData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          reject(new Error("Gagal membaca file Excel: tidak ada data dari pembaca file."));
          return;
        }

        const workbook = xlsx.read(arrayBuffer, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          reject(new Error("File Excel tidak mengandung sheet."));
          return;
        }
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: null });

        if (!jsonData || jsonData.length === 0) {
          resolve({ headers: [], rows: [], columnInfos: [], rowCount: 0, columnCount: 0, sampleRows: [], fileName: file.name });
          return;
        }

        const rawHeaders = jsonData[0] as any[];
        
        const headers = rawHeaders.map(header => String(header ?? '').trim());
        
        const rows: DataRow[] = jsonData.slice(1).map((rowArray: any[]) => {
          const row: DataRow = {};
          headers.forEach((header, index) => {
            
            row[header] = inferTypeAndConvert(rowArray[index]);
          });
          return row;
        });
        
        
        const cleanedRows = rows.filter(row => 
          headers.some(header => {
            const val = row[header];
            return val !== null && val !== undefined && String(val).trim() !== '';
          })
        );

        if (headers.length === 0 && cleanedRows.length === 0 && jsonData.length > 0) {
           
           if (rawHeaders.every(h => (h === null || String(h ?? '').trim() === ''))) {
               
                resolve({ headers: [], rows: [], columnInfos: [], rowCount: 0, columnCount: 0, sampleRows: [], fileName: file.name });
                return;
           }
           
        }
        
        if (headers.length > 0 && headers.every(h => h === '') && cleanedRows.length === 0) {
             
             resolve({ headers: [], rows: [], columnInfos: [], rowCount: 0, columnCount: 0, sampleRows: [], fileName: file.name });
             return;
        }


        resolve({ 
            headers, 
            rows: cleanedRows, 
            columnInfos: [], 
            rowCount: cleanedRows.length,
            columnCount: headers.length, 
            sampleRows: [], 
            fileName: file.name 
        });

      } catch (error) {
        console.error("Error parsing Excel file:", error);
        reject(new Error(`Gagal mem-parsing file Excel: ${error instanceof Error ? error.message : String(error)}`));
      }
    };
    reader.onerror = (errEvent) => {
        const fileReaderError = reader.error;
        console.error("FileReader error while reading Excel file:", errEvent);
        console.error("FileReader.error object:", fileReaderError);
        let detailedMessage = "Gagal membaca file Excel dari disk.";
        if (fileReaderError) {
            detailedMessage += ` Detail: ${fileReaderError.name} - ${fileReaderError.message}.`;
        }
        reject(new Error(detailedMessage));
    };
    reader.readAsArrayBuffer(file);
  });
};


async function extractTextFromPdfWithPdfJs(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        if (!event.target?.result) {
          reject("Gagal membaca file PDF: tidak ada hasil dari pembaca file.");
          return;
        }
        const typedArray = new Uint8Array(event.target.result as ArrayBuffer);
        
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            console.warn('pdfjsLib.GlobalWorkerOptions.workerSrc tidak diatur. Ekstraksi PDF mungkin gagal atau menggunakan path default yang mungkin tidak berfungsi dengan esm.sh. Pastikan ini diatur dengan benar (misalnya, di index.html).');
        }

        const pdfDoc = await pdfjsLib.getDocument(typedArray).promise;
        let fullText = '';
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + (pdfDoc.numPages > 1 && i < pdfDoc.numPages ? '\n\n' : '');
        }
        resolve(fullText.trim());
      } catch (error) {
        console.error("Kesalahan saat parsing PDF dengan PDF.js:", error);
        let errorMessage = "Gagal mengekstrak teks dari PDF. ";
        if (error instanceof Error) {
            errorMessage += error.message;
            if ((error as any).name === 'MissingPDFException' || (error as any).name === 'InvalidPDFException') {
                errorMessage += " File mungkin rusak atau bukan PDF yang valid.";
            } else if ((error as any).message?.includes('password')) {
                errorMessage += " PDF mungkin terproteksi password.";
            } else if ((error as any).message?.includes('worker')) {
                 errorMessage += " Masalah dengan PDF.js worker. Pastikan dikonfigurasi dengan benar.";
            }
        } else {
            errorMessage += String(error);
        }
        reject(errorMessage);
      }
    };
    reader.onerror = (error) => {
      console.error("Kesalahan FileReader saat membaca PDF:", error);
      reject("Gagal membaca file PDF dari disk.");
    };
    reader.readAsArrayBuffer(file);
  });
}

async function extractTextFromDocxOrDocWithMammoth(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        if (!event.target?.result) {
          reject(new Error(`Gagal membaca file ${file.name}: tidak ada hasil dari pembaca file.`));
          return;
        }
        const arrayBuffer = event.target.result as ArrayBuffer;
        const result = await mammoth.extractRawText({ arrayBuffer });
        resolve(result.value);
      } catch (error) {
        console.error(`Kesalahan saat parsing ${file.name} dengan Mammoth.js:`, error);
        let errorMessage = `Gagal mengekstrak teks dari ${file.name}. `;
        if (error instanceof Error) {
          errorMessage += error.message;
        } else {
          errorMessage += String(error);
        }
        if (file.name.toLowerCase().endsWith('.doc')) {
            errorMessage += " Format .doc (Word 97-2003) mungkin memiliki keterbatasan dalam ekstraksi client-side, terutama untuk file kompleks."
        }
        reject(new Error(errorMessage));
      }
    };
    reader.onerror = (error) => {
      console.error(`Kesalahan FileReader saat membaca ${file.name}:`, error);
      reject(new Error(`Gagal membaca file ${file.name} dari disk.`));
    };
    reader.readAsArrayBuffer(file);
  });
}


export const extractTextFromFile = async (file: File): Promise<string> => {
  const fileName = file.name.toLowerCase();
  const fileType = fileName.split('.').pop() || 'tidak diketahui';

  if (fileName.endsWith('.txt')) {
    return file.text();
  } else if (fileName.endsWith('.pdf')) {
    console.log("Mencoba mengekstrak teks dari PDF menggunakan PDF.js...");
    return extractTextFromPdfWithPdfJs(file);
  } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
    console.log(`Mencoba mengekstrak teks dari ${fileType.toUpperCase()} menggunakan Mammoth.js...`);
    return extractTextFromDocxOrDocWithMammoth(file);
  }
  throw new Error(`Tipe file .${fileType} tidak didukung untuk ekstraksi teks langsung.`);
};



export const getColumnValues = (
  rows: DataRow[],
  columnName: string,
  convertToNumeric: boolean = false
): (number | string | boolean | Date | null)[] => {
  if (!rows || rows.length === 0 || !columnName) {
    return [];
  }
  return rows.map(row => {
    const value = row[columnName];
    if (value === null || value === undefined || String(value).trim() === '') {
      return null;
    }
    if (convertToNumeric) {
      const num = Number(value);
      return isNaN(num) ? null : num; 
    }
    return value;
  }).filter(v => v !== null); 
};


export type SupportedCalculation = "SUM" | "AVERAGE" | "MEDIAN" | "MODE" | "MIN" | "MAX" | "COUNT" | "COUNTA" | "COUNTUNIQUE" | "STDEV" | "VAR";

export const calculateDynamicStat = (
    rows: DataRow[],
    columnName: string,
    operation: SupportedCalculation,
    columnType?: DataType 
  ): number | string | null => {
    
    if (!columnName) return null;

    const isNumericOperation = ["SUM", "AVERAGE", "MEDIAN", "STDEV", "VAR"].includes(operation);
    
    
    let values: (number | string | boolean | Date | null)[];

    if (isNumericOperation || operation === "MIN" || operation === "MAX") {
        if (columnType && columnType !== 'number' && columnType !== 'date' && (operation !== "MIN" && operation !== "MAX")) {
             
             
        }
        values = getColumnValues(rows, columnName, true).filter(v => typeof v === 'number' && !isNaN(v)) as number[];
        if (values.length === 0 && isNumericOperation) return null; 
    } else {
        values = getColumnValues(rows, columnName, false);
    }


    switch (operation) {
        case "SUM":
            return (values as number[]).reduce((acc, val) => acc + val, 0);
        case "AVERAGE":
            return values.length > 0 ? (values as number[]).reduce((acc, val) => acc + val, 0) / values.length : null;
        case "MEDIAN":
            if (values.length === 0) return null;
            const sortedNumValues = [...(values as number[])].sort((a, b) => a - b);
            const mid = Math.floor(sortedNumValues.length / 2);
            return sortedNumValues.length % 2 !== 0 ? sortedNumValues[mid] : (sortedNumValues[mid - 1] + sortedNumValues[mid]) / 2;
        case "MODE":
            if (values.length === 0) return null;
            const freqMap: Record<string, number> = {};
            let maxFreq = 0;
            let mode: string | number | null = null;
            for (const val of getColumnValues(rows, columnName, false)) { 
                if (val === null) continue;
                const key = String(val);
                freqMap[key] = (freqMap[key] || 0) + 1;
                if (freqMap[key] > maxFreq) {
                    maxFreq = freqMap[key];
                    mode = val instanceof Date ? val.toISOString().split("T")[0] : (typeof val === 'number' ? val : String(val));
                }
            }
            return mode;
        case "MIN":
            if (values.length === 0) return null;
            if (columnType === 'date') {
                const dateValues = getColumnValues(rows, columnName, false).filter(v => v instanceof Date) as Date[];
                return dateValues.length > 0 ? dateValues.sort((a,b) => a.getTime() - b.getTime())[0].toISOString().split("T")[0] : null;
            }
            return Math.min(...(values as number[]));
        case "MAX":
            if (values.length === 0) return null;
            if (columnType === 'date') {
                const dateValues = getColumnValues(rows, columnName, false).filter(v => v instanceof Date) as Date[];
                return dateValues.length > 0 ? dateValues.sort((a,b) => b.getTime() - a.getTime())[0].toISOString().split("T")[0] : null;
            }
            return Math.max(...(values as number[]));
        case "COUNT": 
             return getColumnValues(rows, columnName, false).length;
        case "COUNTA": 
             return getColumnValues(rows, columnName, false).length;
        case "COUNTUNIQUE":
            return new Set(getColumnValues(rows, columnName, false)).size;
        case "STDEV":
            if (values.length < 2) return null; 
            const meanForStdev = (values as number[]).reduce((acc, val) => acc + val, 0) / values.length;
            const varianceInterim = (values as number[]).reduce((acc, val) => acc + Math.pow(val - meanForStdev, 2), 0) / (values.length - 1);
            return Math.sqrt(varianceInterim);
        case "VAR":
            if (values.length < 2) return null; 
            const meanForVar = (values as number[]).reduce((acc, val) => acc + val, 0) / values.length;
            return (values as number[]).reduce((acc, val) => acc + Math.pow(val - meanForVar, 2), 0) / (values.length - 1);
        default:
            return null;
    }
};