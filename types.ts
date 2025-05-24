

export type DataType = 'string' | 'number' | 'boolean' | 'date' | 'unknown';

export interface ColumnStats {
  missingCount: number;
  
  mean?: number;
  median?: number;
  mode?: number | string; 
  stdDev?: number;
  min?: number;
  max?: number;
  
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
  sampleRows: DataRow[]; 
  fileName: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}


export type ChartData = Record<string, string | number | boolean | Date | null>[];