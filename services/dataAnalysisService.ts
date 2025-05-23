
import { DataRow, ColumnInfo, DataType, ColumnStats, ParsedCsvData } from '../types';
import * as pdfjsLib from 'pdfjs-dist';

// Tip: Set pdfjsLib.GlobalWorkerOptions.workerSrc di index.html atau saat aplikasi diinisialisasi.

// Simple CSV/TSV parser
export const parseCSV = (text: string, delimiter: ',' | '\t' = ','): { headers: string[]; rows: DataRow[] } => {
  const lines = text.trim().split(/\r\n|\n|\r/);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, '')); // Remove surrounding quotes
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


const inferTypeAndConvert = (value: string | undefined): string | number | boolean | null | Date => {
  if (value === undefined || value === null || value.toLowerCase() === 'na' || value.toLowerCase() === 'null' || value === '') {
    return null;
  }
  // Coba konversi ke angka DULU, pastikan tidak ada karakter non-numerik selain titik desimal atau tanda minus di awal.
  // Regex ini memastikan format angka yang lebih ketat.
  if (/^-?\d*\.?\d+$/.test(value.trim()) && !isNaN(Number(value))) {
    return Number(value);
  }
  if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') { 
    return value.toLowerCase() === 'true';
  }
  // Format tanggal yang lebih umum dan ISO
  if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/.test(value) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value) || /^\d{1,2}-\w{3}-\d{2,4}$/.test(value)) {
    const date = new Date(value);
    // Validasi tambahan untuk memastikan tanggal valid (misalnya, 30 Feb tidak valid)
    if (!isNaN(date.getTime())) {
        // Jika formatnya hanya tanggal (tanpa waktu), kita bisa set ke UTC tengah malam untuk konsistensi
        if (value.match(/^\d{4}-\d{2}-\d{2}$/) || value.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) {
           // Ini bisa membuat perbandingan tanggal lebih sederhana, tapi perhatikan zona waktu jika penting.
           // Untuk sekarang, biarkan Date object standar yang menangani ini.
        }
        return date;
    }
  }
  return value; 
};

const getDataType = (value: any): DataType => {
  if (value === null || value === undefined) return 'unknown'; // Harus konsisten dengan inferTypeAndConvert
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
        // Infer type dari sampel yang lebih besar atau seluruh data jika memungkinkan dan tidak terlalu besar
        const sampleForTypeInference = nonMissingValues.length > 200 ? nonMissingValues.slice(0, 200) : nonMissingValues;
        sampleForTypeInference.forEach(v => {
            const t = getDataType(v);
            typeCounts[t] = (typeCounts[t] || 0) + 1;
        });
        
        let maxCount = 0;
        let majorityType: DataType = 'unknown';
        // Prioritaskan 'number' jika ada campuran dengan 'string' yang mungkin angka
        if (typeCounts.number > 0 && typeCounts.string > 0) {
             // Jika sebagian besar nilai yang tampak seperti string adalah angka, maka perlakukan sebagai angka
             const stringToNumberRatio = typeCounts.number / (typeCounts.number + typeCounts.string);
             if (stringToNumberRatio > 0.5) { // mayoritas adalah angka
                //  Coba konversi semua string ke angka, jika banyak yang berhasil, anggap angka.
             }
        }

        for (const t in typeCounts) {
            if (typeCounts[t] > maxCount) {
                maxCount = typeCounts[t];
                majorityType = t as DataType;
            }
        }
        type = majorityType;
         // Jika tipe mayoritas adalah string, tapi semua sampel adalah representasi angka yang valid, pertimbangkan sebagai angka.
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
      const variance = numericValues.reduce((acc, v) => acc + Math.pow(v - (stats.mean as number), 2), 0) / (numericValues.length > 1 ? numericValues.length -1 : 1) ; // Sample variance
      stats.stdDev = Math.sqrt(variance);
      stats.min = numericValues[0];
      stats.max = numericValues[numericValues.length - 1];
      
      const numFreq: Record<number, number> = {};
      numericValues.forEach(v => numFreq[v] = (numFreq[v] || 0) + 1);
      if (Object.keys(numFreq).length > 0) {
        stats.mode = parseFloat(Object.entries(numFreq).sort((a,b) => b[1]-a[1])[0]?.[0]);
      }
    }
    
    if (type === 'string' || type === 'boolean' || (type === 'number' && numericValues.length === 0) ) { // Also handle cases where type inferred as number but no numeric values found
      const valueCounts: Record<string, number> = {};
      nonMissingValues.forEach(v => {
        const key = String(v); // Booleans will be converted to "true" or "false" here
        valueCounts[key] = (valueCounts[key] || 0) + 1;
      });
      stats.valueCounts = valueCounts;
      stats.uniqueValues = Object.keys(valueCounts); // Object.keys returns string[], which is (string | number)[]
      if (stats.uniqueValues.length > 0) {
         stats.mode = Object.entries(valueCounts).sort((a,b) => b[1]-a[1])[0]?.[0];
      }
    } else if (type === 'date') {
        const dateValues = nonMissingValues.filter(v => v instanceof Date) as Date[];
        if (dateValues.length > 0) {
            dateValues.sort((a, b) => a.getTime() - b.getTime());
            stats.min = dateValues[0].toISOString().split('T')[0] as any; 
            stats.max = dateValues[dateValues.length - 1].toISOString().split('T')[0] as any;
            // Mode for dates could be complex (e.g., most frequent month, year). For now, skip mode for dates.
        }
    }
    // Ensure uniqueValues is populated for all relevant types for COUNTUNIQUE
    // FIX: Ensure that values mapped to uniqueValues are string or number
    if (!stats.uniqueValues && (type === 'number' || type === 'date')) {
        stats.uniqueValues = [...new Set(nonMissingValues.map(v => {
            if (v instanceof Date) {
                return v.toISOString().split('T')[0]; // Convert Date to string
            }
            if (typeof v === 'boolean') {
                return String(v); // Convert boolean to string "true" or "false"
            }
            // v is now string or number
            return v; 
        }))];
    }

    return { name: header, type, stats };
  });
};

export const parseExcel = async (file: File): Promise<ParsedCsvData> => {
  console.warn("Parsing Excel (.xlsx, .xls) adalah tiruan. Implementasi penuh memerlukan pustaka seperti SheetJS.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const { headers, rows } = parseCSV(text); // coba parsing sebagai CSV
        if (headers.length === 0 || rows.length === 0) {
            reject(new Error("Gagal mem-parsing file Excel sebagai CSV. File mungkin kosong atau format tidak didukung oleh parser tiruan ini."));
            return;
        }
        resolve({ headers, rows, columnInfos: [], rowCount: 0, columnCount: 0, sampleRows: [], fileName: file.name });
      } catch (error) {
        reject(new Error("Gagal mem-parsing file Excel. Fitur ini masih dalam pengembangan."));
      }
    };
    reader.onerror = () => reject(new Error("Gagal membaca file Excel."));
    reader.readAsText(file);
  });
};

const generateMockDocxContent = (fileName: string): string => {
  return `[SIMULASI EKSTRAKSI KONTEN DOKUMEN - ${fileName}]

Dokumen DOCX ini (${fileName}) tampaknya berisi informasi yang relevan. 
Kontennya bisa berupa laporan, artikel, atau catatan.

(CATATAN PENTING: Ini adalah TEKS SIMULASI. Aplikasi ini saat ini TIDAK memiliki kemampuan untuk mengekstrak konten aktual dari file DOCX. Fungsionalitas ekstraksi teks penuh dari file DOCX memerlukan integrasi pustaka eksternal khusus. Oleh karena itu, ringkasan dan tanya jawab untuk file ini akan didasarkan pada teks simulasi ini, BUKAN konten file asli Anda. Untuk analisis konten dokumen yang sebenarnya, silakan gunakan file .txt, .pdf (jika didukung), atau fitur input teks langsung.)`;
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
            // Pengaturan workerSrc seharusnya sudah dilakukan di index.html.
            // Jika tidak, PDF.js mungkin akan gagal atau mencoba memuat dari path default.
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

export const extractTextFromFile = async (file: File): Promise<string> => {
  const fileName = file.name.toLowerCase();
  const fileType = fileName.split('.').pop() || 'tidak diketahui';

  if (fileName.endsWith('.txt')) {
    return file.text();
  } else if (fileName.endsWith('.pdf')) {
    console.log("Mencoba mengekstrak teks dari PDF menggunakan PDF.js...");
    return extractTextFromPdfWithPdfJs(file);
  } else if (fileName.endsWith('.docx')) {
    console.warn("Ekstraksi teks DOCX disimulasikan. Implementasi penuh memerlukan pustaka seperti Mammoth.js.");
    return generateMockDocxContent(file.name);
  }
  throw new Error(`Tipe file .${fileType} tidak didukung untuk ekstraksi teks langsung.`);
};

// Helper untuk mendapatkan nilai dari kolom, dengan opsi konversi ke numerik
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
      return isNaN(num) ? null : num; // Mengembalikan null jika tidak dapat dikonversi ke angka
    }
    return value;
  }).filter(v => v !== null); // Filter null eksplisit setelah konversi jika perlu
};


export type SupportedCalculation = "SUM" | "AVERAGE" | "MEDIAN" | "MODE" | "MIN" | "MAX" | "COUNT" | "COUNTA" | "COUNTUNIQUE" | "STDEV" | "VAR";

export const calculateDynamicStat = (
    rows: DataRow[],
    columnName: string,
    operation: SupportedCalculation,
    columnType?: DataType // Tipe data kolom target, bisa membantu validasi
  ): number | string | null => {
    
    if (!columnName) return null;

    const isNumericOperation = ["SUM", "AVERAGE", "MEDIAN", "STDEV", "VAR"].includes(operation);
    // MIN/MAX bisa numerik atau tanggal/string
    
    let values: (number | string | boolean | Date | null)[];

    if (isNumericOperation || operation === "MIN" || operation === "MAX") {
        if (columnType && columnType !== 'number' && columnType !== 'date' && (operation !== "MIN" && operation !== "MAX")) {
             // console.warn(`Operasi numerik ${operation} pada kolom non-numerik ${columnName} (${columnType})`);
             // return null; // Atau coba konversi jika memungkinkan
        }
        values = getColumnValues(rows, columnName, true).filter(v => typeof v === 'number' && !isNaN(v)) as number[];
        if (values.length === 0 && isNumericOperation) return null; // Tidak ada data numerik untuk dihitung
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
            for (const val of getColumnValues(rows, columnName, false)) { // Ambil nilai asli untuk mode
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
        case "COUNT": // Jumlah nilai non-missing
             return getColumnValues(rows, columnName, false).length;
        case "COUNTA": // Sama dengan COUNT di implementasi ini (non-missing)
             return getColumnValues(rows, columnName, false).length;
        case "COUNTUNIQUE":
            return new Set(getColumnValues(rows, columnName, false)).size;
        case "STDEV":
            if (values.length < 2) return null; // Perlu setidaknya 2 poin data untuk stdev sampel
            const meanForStdev = (values as number[]).reduce((acc, val) => acc + val, 0) / values.length;
            const varianceInterim = (values as number[]).reduce((acc, val) => acc + Math.pow(val - meanForStdev, 2), 0) / (values.length - 1);
            return Math.sqrt(varianceInterim);
        case "VAR":
            if (values.length < 2) return null; // Perlu setidaknya 2 poin data untuk var sampel
            const meanForVar = (values as number[]).reduce((acc, val) => acc + val, 0) / values.length;
            return (values as number[]).reduce((acc, val) => acc + Math.pow(val - meanForVar, 2), 0) / (values.length - 1);
        default:
            return null;
    }
};