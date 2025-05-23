
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ParsedCsvData, ColumnInfo } from '../types';

const API_KEY = process.env.API_KEY;
let ai: GoogleGenAI | null = null;
let apiKeyInitializationError: string | null = null;

// Fungsi untuk inisialisasi atau mendapatkan instance AI
function getAiInstance(): GoogleGenAI {
  if (apiKeyInitializationError) {
    throw new Error(apiKeyInitializationError);
  }
  if (ai) {
    return ai;
  }
  if (!API_KEY) {
    apiKeyInitializationError = "Kesalahan Konfigurasi: Variabel lingkungan API_KEY tidak diatur. Panggilan ke Gemini API tidak mungkin dilakukan.";
    console.error(apiKeyInitializationError);
    throw new Error(apiKeyInitializationError);
  }
  try {
    ai = new GoogleGenAI({ apiKey: API_KEY });
    return ai;
  } catch (e) {
    apiKeyInitializationError = `Kesalahan saat inisialisasi Gemini SDK: ${e instanceof Error ? e.message : String(e)}. Pastikan API_KEY adalah string yang valid.`;
    console.error(apiKeyInitializationError);
    ai = null; 
    throw new Error(apiKeyInitializationError);
  }
}

const modelName = 'gemini-2.5-flash-preview-04-17';

// Helper function to check for API key and ai instance readiness (diganti dengan getAiInstance)
// function ensureApiReady(): GoogleGenAI { ... }

function formatDataSummaryForPrompt(data: ParsedCsvData): string {
  let summary = `Dataset: ${data.fileName}\n`;
  summary += `Baris: ${data.rowCount}, Kolom: ${data.columnCount}\n\n`;
  summary += "Detail Kolom (Nama Kolom: Tipe Data [Statistik Utama jika ada]):\n";
  data.columnInfos.forEach(col => {
    summary += `- ${col.name}: ${col.type}`;
    let statsSummary = [];
    if (col.stats.mean !== undefined) statsSummary.push(`rata-rata=${col.stats.mean.toFixed(2)}`);
    if (col.stats.median !== undefined) statsSummary.push(`median=${col.stats.median.toFixed(2)}`);
    if (col.stats.min !== undefined) statsSummary.push(`min=${col.stats.min}`);
    if (col.stats.max !== undefined) statsSummary.push(`maks=${col.stats.max}`);
    if (col.stats.stdDev !== undefined) statsSummary.push(`stdev=${col.stats.stdDev.toFixed(2)}`);
    if (col.stats.uniqueValues?.length) statsSummary.push(`unik=${col.stats.uniqueValues.length}`);
    if (col.stats.missingCount > 0) statsSummary.push(`hilang=${col.stats.missingCount}`);
    if (statsSummary.length > 0) summary += ` [${statsSummary.join(', ')}]`;
    summary += `\n`;
  });

  if (data.sampleRows.length > 0) {
    summary += "\nData Sampel (beberapa baris pertama):\n";
    summary += data.headers.join(', ') + '\n';
    data.sampleRows.slice(0,3).forEach(row => { 
        summary += data.headers.map(h => String(row[h] ?? 'N/A')).join(', ') + '\n';
    });
  }
  return summary;
}

function enhanceErrorMessage(error: unknown): string {
    let baseMessage = `Permintaan API Gemini gagal: ${error instanceof Error ? error.message : String(error)}`;
    const errorMessageString = String(error).toLowerCase(); // Convert to lower case for robust checking
    if (errorMessageString.includes("permission_denied") || errorMessageString.includes("403")) {
        baseMessage += "\n\nSaran: Ini mungkin karena API Key yang digunakan tidak memiliki izin yang diperlukan untuk layanan Gemini atau model yang diminta. Silakan periksa konfigurasi API Key Anda di Google Cloud Console (pastikan Generative Language API atau Vertex AI API diaktifkan dan kunci memiliki hak akses yang benar).";
    } else if (errorMessageString.includes("api key not valid") || errorMessageString.includes("api_key_not_valid")) {
        baseMessage += "\n\nSaran: API Key yang digunakan tidak valid. Pastikan API_KEY di environment variable sudah benar dan tidak ada kesalahan ketik.";
    } else if (errorMessageString.includes("quota") || errorMessageString.includes("resource_exhausted") || errorMessageString.includes("429")) {
        baseMessage += "\n\nSaran: Anda mungkin telah melebihi kuota permintaan API Anda. Silakan periksa kuota Anda di Google Cloud Console dan coba lagi nanti.";
    } else if (errorMessageString.includes("model_not_found") || errorMessageString.includes("model not found")) {
        baseMessage += `\n\nSaran: Model '${modelName}' tidak ditemukan atau tidak tersedia untuk API Key Anda. Pastikan nama model sudah benar dan API Key Anda memiliki akses ke model tersebut.`;
    }
    return baseMessage;
}

export interface CalculationInterpretation {
  operation: "SUM" | "AVERAGE" | "MEDIAN" | "MODE" | "MIN" | "MAX" | "COUNT" | "COUNTA" | "COUNTUNIQUE" | "STDEV" | "VAR" | "UNKNOWN";
  columnName: string | null;
  errorMessage?: string; // e.g., "COLUMN_NOT_FOUND", "OPERATION_UNCLEAR", "MULTIPLE_COLUMNS_AMBIGUOUS"
}


export const interpretUserCalculationRequest = async (question: string, columnInfos: ColumnInfo[]): Promise<CalculationInterpretation> => {
  const currentAi = getAiInstance();
  const availableColumns = columnInfos.map(c => ({ name: c.name, type: c.type }));
  const validOperations = ["SUM", "AVERAGE", "MEDIAN", "MODE", "MIN", "MAX", "COUNT", "COUNTA", "COUNTUNIQUE", "STDEV", "VAR"];

  const prompt = `
Anda adalah AI yang bertugas menginterpretasikan permintaan pengguna untuk perhitungan statistik pada data tabular.
Berdasarkan pertanyaan pengguna dan daftar kolom yang tersedia, identifikasi:
1.  Operasi statistik yang diminta. Operasi yang valid adalah: ${validOperations.join(", ")}.
2.  Nama kolom target.

Format output HARUS berupa objek JSON tunggal dengan struktur berikut:
{
  "operation": "NAMA_OPERASI_VALID_ATAU_UNKNOWN",
  "columnName": "NAMA_KOLOM_TARGET_ATAU_NULL_JIKA_TIDAK_ADA",
  "errorMessage": "PESAN_ERROR_JIKA_ADA_ATAU_KOSONG" 
}

Pesan error bisa berupa:
- "COLUMN_NOT_FOUND" jika kolom yang disebut tidak ada dalam daftar.
- "OPERATION_UNCLEAR" jika operasi tidak dapat diidentifikasi atau tidak valid.
- "AMBIGUOUS_REQUEST" jika permintaan terlalu ambigu untuk diinterpretasikan.
- "" (string kosong) jika tidak ada error.


Daftar Kolom Tersedia (nama: tipe):
${availableColumns.map(c => `- ${c.name}: ${c.type}`).join("\n")}

Pertanyaan Pengguna: "${question}"

Objek JSON Hasil Interpretasi:
`;

  try {
    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: modelName,
      contents: prompt,
      config: { responseMimeType: "application/json" } // Meminta output JSON
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsed = JSON.parse(jsonStr) as CalculationInterpretation;

    // Validasi tambahan
    if (!validOperations.includes(parsed.operation as any) && parsed.operation !== "UNKNOWN") {
        // Jika operasi tidak valid tapi bukan UNKNOWN, set ke UNKNOWN dan beri pesan
        console.warn(`Operasi tidak valid diterima dari AI: ${parsed.operation}. Diubah menjadi UNKNOWN.`);
        parsed.errorMessage = parsed.errorMessage || `Operasi '${parsed.operation}' tidak dikenali.`;
        parsed.operation = "UNKNOWN";
    }
    if (parsed.columnName && !availableColumns.some(c => c.name.toLowerCase() === (parsed.columnName || '').toLowerCase())) {
        parsed.errorMessage = parsed.errorMessage || `Kolom '${parsed.columnName}' tidak ditemukan.`;
        // parsed.columnName = null; // Biarkan nama kolom apa adanya untuk pelaporan error
    }

    return parsed;

  } catch (error) {
    console.error("Kesalahan API Gemini (interpretUserCalculationRequest):", error);
    console.error("Pertanyaan yang menyebabkan error:", question);
    // Kembalikan struktur default jika terjadi error parsing atau API
    return {
      operation: "UNKNOWN",
      columnName: null,
      errorMessage: `Gagal menginterpretasi permintaan karena kesalahan internal: ${enhanceErrorMessage(error)}`
    };
  }
};


export const generateInsights = async (data: ParsedCsvData): Promise<string> => {
  const currentAi = getAiInstance();
  const dataSummary = formatDataSummaryForPrompt(data);
  const prompt = `
Analisis ringkasan dataset berikut dan berikan 3-5 wawasan, pola, atau anomali yang bermakna.
Fokus pada observasi yang dapat ditindaklanjuti atau menarik. Jaga agar tetap ringkas dan jelas.
Jika ada masalah kualitas data yang jelas (misalnya, banyak nilai yang hilang di kolom utama), sebutkan.
Format respons Anda sebagai daftar wawasan menggunakan Markdown.

Ringkasan Dataset:
${dataSummary}

Wawasan:
`;

  try {
    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Kesalahan API Gemini (generateInsights):", error);
    throw new Error(enhanceErrorMessage(error));
  }
};

export const answerQuestion = async (
    dataSummary: string, // Diubah untuk menerima summary yang sudah diformat
    question: string,
    calculationResultContext?: string // Konteks hasil perhitungan yang sudah dilakukan
  ): Promise<string> => {
  const currentAi = getAiInstance();
  
  // Bagian prompt ini tidak lagi memerlukan skema kolom terpisah karena sudah ada di dataSummary
  // let columnSchema = "Skema Kolom (Nama: Tipe Data [Statistik Utama jika ada]):\n";
  // data.columnInfos.forEach(col => { ... });

  const prompt = `
Anda adalah asisten AI yang sangat mahir dalam menganalisis data tabular dan menafsirkan permintaan perhitungan mirip fungsi spreadsheet.
Gunakan ringkasan data yang disediakan untuk menjawab pertanyaan pengguna secara akurat.

${calculationResultContext ? `KONTEKS TAMBAHAN: Sistem telah melakukan perhitungan berdasarkan pertanyaan pengguna. ${calculationResultContext} Tugas Anda adalah menyajikan hasil ini dengan jelas dalam jawaban Anda, sambil tetap merujuk pada ringkasan data jika perlu untuk konteks tambahan.\n` : ""}

Kemampuan Anda Meliputi:
1.  Menjawab pertanyaan umum tentang data berdasarkan ringkasan yang diberikan.
2.  Untuk permintaan perhitungan statistik dasar (SUM, AVERAGE, MEDIAN, MODE, MIN, MAX, COUNT, COUNTA, COUNTUNIQUE, STDEV, VAR):
    *   Jika KONTEKS TAMBAHAN menyediakan hasil perhitungan, GUNAKAN HASIL TERSEBUT sebagai jawaban utama dan sajikan dengan jelas.
    *   Jika tidak ada KONTEKS TAMBAHAN, rujuk pada statistik yang sudah ada dalam ringkasan data jika pertanyaan dapat dijawab darinya. Misalnya, "Rata-rata untuk kolom 'Usia' adalah 25.5 tahun, seperti yang tertera dalam statistik kolom."
    *   Jika statistik tidak ada di ringkasan dan tidak ada hasil perhitungan yang diberikan, jelaskan bagaimana cara menghitungnya secara konseptual.
3.  Memahami dan menjelaskan secara KONSEPTUAL fungsi spreadsheet yang lebih kompleks. Anda BELUM dapat MELAKUKAN perhitungan ini, tetapi Anda harus bisa MENJELASKAN CARA KERJANYA:
    *   FUNGSI LOGIKA & KONDISIONAL (SUMIF, COUNTIF, AVERAGEIF, IF, AND, OR, NOT, IFS): Jelaskan logika kondisional dan bagaimana data akan difilter atau dievaluasi. Misalnya, untuk SUMIF, "Untuk menghitung total penjualan kategori 'Elektronik', kita akan memfilter baris dimana kolom 'Kategori' adalah 'Elektronik', lalu menjumlahkan kolom 'Penjualan' untuk baris-baris tersebut."
    *   FUNGSI TEKS (CONCATENATE, LEFT, RIGHT, MID, LEN, FIND, REPLACE, SUBSTITUTE, TRIM, LOWER, UPPER, PROPER): Jelaskan tujuan masing-masing fungsi (misalnya, CONCATENATE untuk menggabungkan teks, LEN untuk panjang teks).
    *   FUNGSI TANGGAL & WAKTU (TODAY, NOW, DATE, YEAR, MONTH, DAY, HOUR, MINUTE, SECOND, DATEDIF, WEEKDAY): Jelaskan bagaimana fungsi ini mengekstrak atau memanipulasi komponen tanggal/waktu.
    *   FUNGSI LOOKUP (VLOOKUP - secara konseptual): Jelaskan sebagai cara mencari nilai di satu kolom dan mengembalikan nilai terkait dari kolom lain di baris yang sama. Sebutkan ini untuk pencarian.
    *   FUNGSI MATEMATIKA TAMBAHAN (ROUND, ABS, POWER, SQRT): Jelaskan fungsi matematika dasar ini.

Instruksi Penting:
*   SELALU prioritaskan penggunaan HASIL PERHITUNGAN YANG DIBERIKAN dalam 'KONTEKS TAMBAHAN' jika ada.
*   Jika tidak ada hasil yang diberikan, prioritaskan STATISTIK YANG SUDAH ADA dalam ringkasan data.
*   Jika perhitungan diminta tetapi tidak ada hasil atau statistik relevan, JELASKAN PROSES ATAU METODE KONSEPTUAL. Jangan mengarang angka.
*   Sebutkan nama fungsi spreadsheet yang relevan jika pengguna menggunakan istilah umum (misalnya, "total" berarti SUM).
*   Lakukan interpretasi perhitungan hanya pada kolom yang relevan. Jika tidak relevan, jelaskan mengapa.
*   Jika pertanyaan tidak dapat dijawab dari data yang diberikan atau perhitungan tidak mungkin dilakukan (dan tidak ada hasil yang diberikan), jelaskan mengapa secara sopan.
*   Jika pertanyaan bersifat ambigu, minta klarifikasi.
*   Jawab dengan ringkas, jelas, dan langsung ke intinya. Gunakan poin-poin jika perlu.
*   Anda TIDAK dapat mengeksekusi query SQL, membuat visualisasi, atau memodifikasi data. Fokus pada interpretasi, penjelasan, dan penyajian hasil yang diberikan.

Ringkasan Dataset (gunakan ini sebagai dasar pengetahuan Anda tentang data):
---
${dataSummary}
---

Pertanyaan Pengguna: "${question}"

Jawaban (berdasarkan ringkasan, pertanyaan, dan KONTEKS TAMBAHAN jika ada):
`;

  try {
    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Kesalahan API Gemini (answerQuestion):", error);
    throw new Error(enhanceErrorMessage(error));
  }
};

export const summarizeContent = async (textContent: string): Promise<string> => {
  const currentAi = getAiInstance();
  const prompt = `
Ringkas konten berikut dalam 3-5 poin utama atau dalam satu paragraf singkat (sekitar 100-150 kata).
Fokus pada ide-ide inti dan informasi paling penting.
Konten:
---
${textContent.substring(0, 30000)} ${textContent.length > 30000 ? "... (konten dipotong)" : ""}
---
Ringkasan:
`;
  try {
    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Kesalahan API Gemini (summarizeContent):", error);
    throw new Error(enhanceErrorMessage(error));
  }
};

export const answerQuestionFromContent = async (textContent: string, question: string): Promise<string> => {
  const currentAi = getAiInstance();
  const prompt = `
Anda adalah asisten AI yang menjawab pertanyaan berdasarkan konten yang disediakan.
Gunakan hanya informasi dari konten di bawah ini untuk menjawab pertanyaan.
Jika jawaban tidak ditemukan dalam konten, nyatakan bahwa informasi tersebut tidak tersedia dalam teks yang diberikan.
Jangan gunakan pengetahuan eksternal.

Konten:
---
${textContent.substring(0, 30000)} ${textContent.length > 30000 ? "... (konten dipotong)" : ""}
---

Pertanyaan: "${question}"

Jawaban (berdasarkan konten yang disediakan):
`;
  try {
    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Kesalahan API Gemini (answerQuestionFromContent):", error);
    throw new Error(enhanceErrorMessage(error));
  }
};
