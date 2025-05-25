
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ParsedCsvData, ColumnInfo } from '../types';

const API_KEY = process.env.API_KEY;
let aiInstance: GoogleGenAI | null = null; 
let apiKeyInitializationError: string | null = null;

export const INFO_NOT_FOUND_MARKER = "[INFO_NOT_FOUND_SUGGEST_WEB_SEARCH]";


function getAiInstance(): GoogleGenAI {
  if (apiKeyInitializationError) {
    throw new Error(apiKeyInitializationError);
  }
  if (aiInstance) {
    return aiInstance;
  }
  if (!API_KEY) {
    apiKeyInitializationError = "Kesalahan Konfigurasi: Variabel lingkungan API_KEY tidak diatur. Panggilan ke API AI tidak mungkin dilakukan.";
    console.error(apiKeyInitializationError);
    throw new Error(apiKeyInitializationError);
  }
  try {
    aiInstance = new GoogleGenAI({ apiKey: API_KEY });
    return aiInstance;
  } catch (e) {
    apiKeyInitializationError = `Kesalahan saat inisialisasi SDK AI: ${e instanceof Error ? e.message : String(e)}. Pastikan API_KEY adalah string yang valid.`;
    console.error(apiKeyInitializationError);
    aiInstance = null; 
    throw new Error(apiKeyInitializationError);
  }
}

const modelName = 'gemini-2.5-flash-preview-04-17';

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
    let baseMessage = `Permintaan API AI gagal: ${error instanceof Error ? error.message : String(error)}`;
    const errorMessageString = String(error).toLowerCase(); 
    if (errorMessageString.includes("permission_denied") || errorMessageString.includes("403")) {
        baseMessage += "\n\nSaran: Ini mungkin karena API Key yang digunakan tidak memiliki izin yang diperlukan untuk layanan AI atau model yang diminta. Silakan periksa konfigurasi API Key Anda di Google Cloud Console (pastikan Generative Language API atau Vertex AI API diaktifkan dan kunci memiliki hak akses yang benar).";
    } else if (errorMessageString.includes("api key not valid") || errorMessageString.includes("api_key_not_valid")) {
        baseMessage += "\n\nSaran: API Key yang digunakan tidak valid. Pastikan API_KEY di environment variable sudah benar dan tidak ada kesalahan ketik.";
    } else if (errorMessageString.includes("quota") || errorMessageString.includes("resource_exhausted") || errorMessageString.includes("429")) {
        baseMessage += "\n\nSaran: Anda mungkin telah melebihi kuota permintaan API Anda. Silakan periksa kuota Anda di Google Cloud Console dan coba lagi nanti.";
    } else if (errorMessageString.includes("model_not_found") || errorMessageString.includes("model not found")) {
        baseMessage += `\n\nSaran: Model '${modelName}' tidak ditemukan atau tidak tersedia untuk API Key Anda. Pastikan nama model sudah benar dan API Key Anda memiliki akses ke model tersebut.`;
    }  else if (errorMessageString.includes("grounding") && errorMessageString.includes("tool")) {
        baseMessage += `\n\nSaran: Terjadi masalah dengan alat grounding (Google Search). Ini mungkin masalah sementara atau konfigurasi alat. Pastikan model mendukung alat yang diminta.`;
    }
    return baseMessage;
}

export interface CalculationInterpretation {
  operation: "SUM" | "AVERAGE" | "MEDIAN" | "MODE" | "MIN" | "MAX" | "COUNT" | "COUNTA" | "COUNTUNIQUE" | "STDEV" | "VAR" | "UNKNOWN";
  columnName: string | null;
  errorMessage?: string; 
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
- "OPERATION_UNCLEAR" jika operasi tidak dapat diidentifikasi atau tidak valid, atau jika permintaan melibatkan perbandingan antar baris atau pengelompokan yang kompleks (misalnya, "pelanggan dengan tanggal pendaftaran yang sama").
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
      config: { responseMimeType: "application/json" } 
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsed = JSON.parse(jsonStr) as CalculationInterpretation;

    if (!validOperations.includes(parsed.operation as any) && parsed.operation !== "UNKNOWN") {
        console.warn(`Operasi tidak valid diterima dari AI: ${parsed.operation}. Diubah menjadi UNKNOWN.`);
        parsed.errorMessage = parsed.errorMessage || `Operasi '${parsed.operation}' tidak dikenali.`;
        parsed.operation = "UNKNOWN";
    }
    if (parsed.columnName && !availableColumns.some(c => c.name.toLowerCase() === (parsed.columnName || '').toLowerCase())) {
        parsed.errorMessage = parsed.errorMessage || `Kolom '${parsed.columnName}' tidak ditemukan.`;
    }

    return parsed;

  } catch (error) {
    console.error("Kesalahan API AI (interpretUserCalculationRequest):", error);
    console.error("Pertanyaan yang menyebabkan error:", question);
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
Analisis ringkasan dataset berikut. Berikan 3-5 wawasan, pola, atau anomali penting dari data ini.
Gunakan bahasa yang sederhana dan mudah dipahami, seolah-olah Anda menjelaskan kepada seseorang yang tidak terbiasa dengan analisis data.
Hindari jargon teknis sebisa mungkin.
Jika ada masalah kualitas data yang jelas (misalnya, banyak nilai yang hilang di kolom utama), sebutkan juga dengan bahasa yang mudah dimengerti.
Format respons Anda sebagai daftar poin-poin menggunakan Markdown.

Ringkasan Dataset:
${dataSummary}

Wawasan (dalam bahasa yang sederhana):
`;

  try {
    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Kesalahan API AI (generateInsights):", error);
    throw new Error(enhanceErrorMessage(error));
  }
};

export const answerQuestion = async (
    dataSummary: string, 
    question: string,
    calculationResultContext?: string 
  ): Promise<string> => {
  const currentAi = getAiInstance();
  
  const prompt = `
Anda adalah asisten AI yang sangat mahir dalam menganalisis data tabular dan menafsirkan permintaan perhitungan mirip fungsi spreadsheet.
Gunakan ringkasan data yang disediakan untuk menjawab pertanyaan pengguna secara akurat.

${calculationResultContext ? `KONTEKS TAMBAHAN: Sistem telah melakukan perhitungan atau interpretasi berdasarkan pertanyaan pengguna. ${calculationResultContext} Tugas Anda adalah menyajikan hasil ini dengan jelas dalam jawaban Anda, sambil tetap merujuk pada ringkasan data jika perlu untuk konteks tambahan.\n` : ""}

Kemampuan Anda Meliputi:
1.  Menjawab pertanyaan umum tentang data berdasarkan ringkasan yang diberikan.
2.  Untuk permintaan perhitungan statistik dasar (SUM, AVERAGE, MEDIAN, MODE, MIN, MAX, COUNT, COUNTA, COUNTUNIQUE, STDEV, VAR):
    *   Jika KONTEKS TAMBAHAN menyediakan hasil perhitungan, GUNAKAN HASIL TERSEBUT sebagai jawaban utama dan sajikan dengan jelas.
    *   Jika tidak ada KONTEKS TAMBAHAN, rujuk pada statistik yang sudah ada dalam ringkasan data jika pertanyaan dapat dijawab darinya. Misalnya, "Rata-rata untuk kolom 'Usia' adalah 25.5 tahun, seperti yang tertera dalam statistik kolom."
    *   Jika statistik tidak ada di ringkasan dan tidak ada hasil perhitungan yang diberikan, jelaskan bagaimana cara menghitungnya secara konseptual.
3.  Memahami dan menjelaskan secara KONSEPTUAL fungsi spreadsheet yang lebih kompleks. Anda BELUM dapat MELAKUKAN perhitungan ini, tetapi Anda harus bisa MENJELASKAN CARA KERJANYA.

Instruksi Penting:
*   SELALU prioritaskan penggunaan HASIL PERHITUNGAN YANG DIBERIKAN dalam 'KONTEKS TAMBAHAN' jika ada.
*   Jika tidak ada hasil yang diberikan, prioritaskan STATISTIK YANG SUDAH ADA dalam ringkasan data.
*   Jika perhitungan diminta tetapi tidak ada hasil atau statistik relevan, JELASKAN PROSES ATAU METODE KONSEPTUAL. Jangan mengarang angka.
*   Jika 'KONTEKS TAMBAHAN' mengindikasikan 'OPERATION_UNCLEAR' atau bahwa permintaan pengguna adalah untuk operasi kompleks di luar kemampuan perhitungan langsung:
    1.  Jelaskan dengan sopan bahwa sistem tidak dapat melakukan operasi kompleks tersebut secara langsung.
    2.  Jelaskan secara konseptual bagaimana permintaan tersebut akan ditangani.
    3.  Tawarkan untuk menjawab pertanyaan terkait yang lebih sederhana.
*   Jika pertanyaan tidak dapat dijawab dari data yang diberikan atau perhitungan tidak mungkin dilakukan, dan itu bukan pertanyaan umum yang bisa dijawab dengan pengetahuan umum (misalnya, definisi suatu istilah), awali jawaban Anda dengan penanda khusus ${INFO_NOT_FOUND_MARKER} lalu jelaskan mengapa secara sopan dan sarankan pencarian internet jika relevan.
*   Sebutkan nama fungsi spreadsheet yang relevan jika pengguna menggunakan istilah umum (misalnya, "total" berarti SUM).
*   Lakukan interpretasi perhitungan hanya pada kolom yang relevan. Jika tidak relevan, jelaskan mengapa.
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
    console.error("Kesalahan API AI (answerQuestion):", error);
    throw new Error(enhanceErrorMessage(error));
  }
};

export const summarizeContent = async (textContent: string): Promise<string> => {
  const currentAi = getAiInstance();
  const prompt = `
Ringkas konten berikut dalam 3-5 poin utama atau dalam satu paragraf singkat (sekitar 100-150 kata).
Fokus pada ide-ide inti dan informasi paling penting.
Gunakan bahasa yang sederhana dan mudah dipahami.
Konten:
---
${textContent.substring(0, 30000)} ${textContent.length > 30000 ? "... (konten dipotong)" : ""}
---
Ringkasan (dalam bahasa sederhana):
`;
  try {
    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Kesalahan API AI (summarizeContent):", error);
    throw new Error(enhanceErrorMessage(error));
  }
};

export const answerQuestionFromContent = async (textContent: string, question: string): Promise<string> => {
  const currentAi = getAiInstance();
  const prompt = `
Anda adalah asisten AI yang menjawab pertanyaan berdasarkan konten yang disediakan.
Gunakan hanya informasi dari konten di bawah ini untuk menjawab pertanyaan.
Jika jawaban tidak ditemukan dalam konten, awali jawaban Anda dengan penanda khusus ${INFO_NOT_FOUND_MARKER} lalu nyatakan bahwa informasi tersebut tidak tersedia dalam teks yang diberikan dan bahwa pengguna dapat mencoba mencarinya di internet. Jangan gunakan pengetahuan eksternal.
Jawab dengan bahasa yang sederhana dan mudah dipahami.

Konten:
---
${textContent.substring(0, 30000)} ${textContent.length > 30000 ? "... (konten dipotong)" : ""}
---

Pertanyaan: "${question}"

Jawaban (berdasarkan konten yang disediakan, dalam bahasa sederhana):
`;
  try {
    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Kesalahan API AI (answerQuestionFromContent):", error);
    throw new Error(enhanceErrorMessage(error));
  }
};

export const simplifyText = async (textToSimplify: string): Promise<string> => {
  const currentAi = getAiInstance();
  const prompt = `
Tolong sederhanakan teks berikut agar lebih mudah dipahami oleh audiens umum.
Gunakan bahasa yang jelas, hindari jargon teknis jika memungkinkan, dan pertahankan makna inti dari teks asli.
Pastikan jawaban tetap akurat dan tidak menghilangkan informasi penting.
Jawab HANYA dengan versi yang disederhanakan dari teks, tanpa tambahan kalimat pembuka atau penutup.

Teks Asli:
---
${textToSimplify.substring(0, 30000)} ${textToSimplify.length > 30000 ? "... (teks dipotong)" : ""}
---

Versi yang Disederhanakan:
`;
  try {
    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Kesalahan API AI (simplifyText):", error);
    throw new Error(enhanceErrorMessage(error));
  }
};

export const answerQuestionWithInternetSearch = async (question: string): Promise<{ text: string; sources?: Array<{ uri: string; title: string }> }> => {
  const currentAi = getAiInstance();
  const prompt = `
Jawab pertanyaan pengguna berikut berdasarkan informasi yang Anda temukan dari internet menggunakan Google Search.
Sajikan jawaban yang ringkas, jelas, dan relevan dalam bahasa Indonesia.
Jika Anda menemukan beberapa sumber, prioritaskan informasi yang paling komprehensif dan kredibel.

Pertanyaan Pengguna: "${question}"

Jawaban (dalam bahasa Indonesia):
`;
  try {
    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    let answerText = response.text;
    let sources: Array<{ uri: string; title: string }> | undefined = undefined;

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata?.groundingChunks && groundingMetadata.groundingChunks.length > 0) {
      const uniqueSources = new Map<string, string>();
      groundingMetadata.groundingChunks.forEach(chunk => {
        if (chunk.web && chunk.web.uri && chunk.web.title) {
          if (!uniqueSources.has(chunk.web.uri)) {
            uniqueSources.set(chunk.web.uri, chunk.web.title.trim());
          }
        }
      });
      if (uniqueSources.size > 0) {
        sources = Array.from(uniqueSources.entries()).map(([uri, title]) => ({ uri, title }));
      }
    }
    return { text: answerText, sources };
  } catch (error) {
    console.error("Kesalahan API AI (answerQuestionWithInternetSearch):", error);
    throw new Error(enhanceErrorMessage(error));
  }
};


export const evaluateDocumentWithReferences = async (textContent: string): Promise<string> => {
  const currentAi = getAiInstance();
  const prompt = `
Anda adalah seorang editor dan peneliti ahli.
Tugas Anda adalah mengevaluasi kualitas teks berikut, memberikan saran perbaikan yang konstruktif, dan menemukan referensi dari internet yang mendukung atau mengkontraskan poin-poin utama dalam teks.

Teks untuk dievaluasi:
---
${textContent.substring(0, 28000)} ${textContent.length > 28000 ? "... (konten dipotong untuk keamanan dan batas token)" : ""}
---

Instruksi:
1.  **Evaluasi Kualitas**: Berikan analisis mengenai kejelasan, kelengkapan, akurasi (berdasarkan pengetahuan umum dan referensi yang Anda temukan), dan potensi bias dalam teks. Gunakan poin-poin atau paragraf.
2.  **Saran Perbaikan**: Berikan saran konkret tentang bagaimana teks tersebut dapat ditingkatkan (misalnya, menambahkan detail, mengklarifikasi poin, memperbaiki struktur, sumber yang lebih beragam, dll.). Gunakan poin-poin atau paragraf.
3.  **Referensi Internet**: Temukan dan sebutkan 2-4 sumber valid dari internet (berita, artikel ilmiah, laporan organisasi terpercaya) yang relevan dengan topik utama teks. Untuk setiap referensi, sebutkan bagaimana referensi tersebut mendukung, mengkontraskan, atau memberikan konteks tambahan pada poin-poin dalam teks yang dievaluasi.

Format output Anda dalam Markdown.
Jika tidak ada referensi yang relevan ditemukan oleh pencarian, sebutkan itu dengan jelas.
Pastikan setiap URL yang disertakan adalah URL lengkap yang valid.
`;

  try {
    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: modelName, 
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], 
      },
    });

    let evaluationText = response.text;

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata?.groundingChunks && groundingMetadata.groundingChunks.length > 0) {
      let sourcesMarkdown = "\n\n---\n### Sumber Referensi dari Internet:\n";
      const uniqueSources = new Map<string, string>(); 

      groundingMetadata.groundingChunks.forEach(chunk => {
        if (chunk.web && chunk.web.uri && chunk.web.title) {
          if (!uniqueSources.has(chunk.web.uri)) {
            uniqueSources.set(chunk.web.uri, chunk.web.title);
          }
        }
      });
      
      if (uniqueSources.size > 0) {
        uniqueSources.forEach((title, uri) => {
            sourcesMarkdown += `- [${title.replace(/\[|\]/g, '')}](${uri})\n`; 
        });
      } else {
        sourcesMarkdown += "\nTidak ada sumber referensi spesifik yang ditemukan oleh pencarian Google untuk mendukung evaluasi ini.\n";
      }
      evaluationText += sourcesMarkdown;
    } else {
      evaluationText += "\n\n---\n### Sumber Referensi dari Internet:\n\nTidak ada sumber referensi yang ditemukan oleh pencarian Google untuk mendukung evaluasi ini.\n";
    }

    return evaluationText;
  } catch (error) {
    console.error("Kesalahan API AI (evaluateDocumentWithReferences):", error);
    throw new Error(enhanceErrorMessage(error));
  }
};