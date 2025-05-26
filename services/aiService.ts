
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ParsedCsvData, ColumnInfo } from '../types';

const API_KEY = process.env.API_KEY;
let aiInstance: GoogleGenAI | null = null;
let apiKeyInitializationError: string | null = null;

export const INFO_NOT_FOUND_MARKER = "[INFO_NOT_FOUND_SUGGEST_WEB_SEARCH]";

const SUGGESTIONS_START_MARKER = "[SUGGESTIONS_START]";
const SUGGESTIONS_END_MARKER = "[SUGGESTIONS_END]";

const SUGGESTIONS_PROMPT_BLOCK = `
---
Setelah teks utama jawaban Anda, sertakan blok ${SUGGESTIONS_START_MARKER}...${SUGGESTIONS_END_MARKER} yang berisi 2-4 saran pertanyaan lanjutan yang relevan dengan topik yang baru saja dibahas. Setiap saran harus dalam baris baru dan berupa TEKS BIASA tanpa nomor, poin, atau format tebal. Pastikan saran-saran tersebut singkat dan langsung ke intinya.
Contoh:
${SUGGESTIONS_START_MARKER}
Apa dampak perubahan iklim terhadap pertanian?
Bagaimana cara mengurangi jejak karbon pribadi?
${SUGGESTIONS_END_MARKER}
---
`;

// Fix: Export AiServiceResponse interface
export interface AiServiceResponse {
  mainText: string;
  suggestedQuestions?: string[];
  sources?: Array<{ uri: string; title: string }>; // Untuk fungsi pencarian internet
}


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

const parseAiResponseText = (responseText: string): AiServiceResponse => {
  const startIdx = responseText.indexOf(SUGGESTIONS_START_MARKER);
  const endIdx = responseText.indexOf(SUGGESTIONS_END_MARKER);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const suggestionsBlock = responseText.substring(startIdx + SUGGESTIONS_START_MARKER.length, endIdx).trim();
    const suggestedQuestions = suggestionsBlock.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    const mainText = responseText.substring(0, startIdx).trim();
    return { mainText, suggestedQuestions: suggestedQuestions.length > 0 ? suggestedQuestions : undefined };
  }
  return { mainText: responseText.trim(), suggestedQuestions: undefined };
};


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


export const generateInsights = async (data: ParsedCsvData): Promise<AiServiceResponse> => {
  const currentAi = getAiInstance();
  const dataSummary = formatDataSummaryForPrompt(data);
  const tabularSuggestionsInstruction = `
---
Setelah teks utama wawasan Anda, sertakan blok ${SUGGESTIONS_START_MARKER}...${SUGGESTIONS_END_MARKER} yang berisi 2-4 saran pertanyaan lanjutan.
PENTING: Setiap saran pertanyaan HARUS dapat dijawab HANYA dari ringkasan dataset yang telah disediakan di atas (termasuk statistik kolom yang ada). Jangan menyarankan pertanyaan yang memerlukan pengetahuan eksternal, informasi di luar dataset (seperti tren pasar, penyebab eksternal), atau pencarian internet. Pertanyaan harus bersifat analitis terhadap data yang ada.
Setiap saran harus dalam baris baru dan berupa TEKS BIASA tanpa nomor, poin, atau format tebal. Pastikan saran-saran tersebut singkat dan langsung ke intinya.
Contoh pertanyaan yang VALID (jika data mendukung): "Berapa rata-rata kolom 'Usia'?", "Manakah kategori 'Produk' yang paling umum?", "Bandingkan penjualan antara 'Region A' dan 'Region B' jika data tersebut ada.", "Apakah ada korelasi antara 'Pendapatan' dan 'Durasi Kunjungan'?".
Contoh pertanyaan yang TIDAK VALID (karena memerlukan info eksternal atau analisis sangat kompleks): "Bagaimana tren pasar untuk produk dalam kategori X?", "Apa penyebab utama penurunan penjualan di kuartal terakhir?", "Prediksikan penjualan untuk tahun depan.".
---
`;

  const prompt = `
Analisis ringkasan dataset berikut. Berikan 3-5 wawasan, pola, atau anomali penting dari data ini.
Gunakan bahasa yang sederhana dan mudah dipahami, seolah-olah Anda menjelaskan kepada seseorang yang tidak terbiasa dengan analisis data.
Hindari jargon teknis sebisa mungkin.
Jika ada masalah kualitas data yang jelas (misalnya, banyak nilai yang hilang di kolom utama), sebutkan juga dengan bahasa yang mudah dimengerti.
Format respons Anda sebagai daftar poin-poin menggunakan Markdown.

Ringkasan Dataset:
${dataSummary}

Wawasan (dalam bahasa yang sederhana):
${tabularSuggestionsInstruction}
`;

  try {
    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    return parseAiResponseText(response.text);
  } catch (error) {
    console.error("Kesalahan API AI (generateInsights):", error);
    return { mainText: `Gagal menghasilkan wawasan: ${enhanceErrorMessage(error)}`, suggestedQuestions: undefined };
  }
};

export const answerQuestion = async (
    dataSummary: string,
    question: string,
    calculationResultContext?: string
  ): Promise<AiServiceResponse> => {
  const currentAi = getAiInstance();

  const prompt = `
Anda adalah asisten AI yang sangat mahir dalam menganalisis data tabular dan menafsirkan permintaan perhitungan mirip fungsi spreadsheet.
Gunakan HANYA ringkasan data yang disediakan untuk menjawab pertanyaan pengguna secara akurat. JANGAN gunakan pengetahuan eksternal atau internet untuk pertanyaan tentang data.

${calculationResultContext ? `KONTEKS TAMBAHAN: Sistem telah melakukan perhitungan atau interpretasi berdasarkan pertanyaan pengguna. ${calculationResultContext} Tugas Anda adalah menyajikan hasil ini dengan jelas dalam jawaban Anda, sambil tetap merujuk pada ringkasan data jika perlu untuk konteks tambahan.\n` : ""}

Kemampuan Anda Meliputi:
1.  Menjawab pertanyaan umum tentang data berdasarkan ringkasan yang diberikan.
2.  Untuk permintaan perhitungan statistik dasar (SUM, AVERAGE, MEDIAN, MODE, MIN, MAX, COUNT, COUNTA, COUNTUNIQUE, STDEV, VAR):
    *   Jika KONTEKS TAMBAHAN menyediakan hasil perhitungan, GUNAKAN HASIL TERSEBUT sebagai jawaban utama dan sajikan dengan jelas.
    *   Jika tidak ada KONTEKS TAMBAHAN, rujuk pada statistik yang sudah ada dalam ringkasan data jika pertanyaan dapat dijawab darinya.
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
*   Jika pertanyaan tidak dapat dijawab dari data yang diberikan, atau perhitungan tidak mungkin dilakukan (misalnya kolom tidak ada, data tidak memadai), DAN pertanyaan tersebut adalah spesifik tentang data yang diberikan:
    Awali jawaban Anda dengan penanda khusus ${INFO_NOT_FOUND_MARKER}. Kemudian, nyatakan bahwa informasi tersebut tidak dapat ditemukan atau operasi tidak dapat dilakukan pada konteks data yang diberikan. Sarankan pengguna untuk mencoba menggunakan fitur "Cari di Internet" untuk pertanyaan tersebut jika mereka merasa itu mungkin pertanyaan umum.
*   Sebutkan nama fungsi spreadsheet yang relevan jika pengguna menggunakan istilah umum (misalnya, "total" berarti SUM).
*   Lakukan interpretasi perhitungan hanya pada kolom yang relevan. Jika tidak relevan, jelaskan mengapa.
*   Jika pertanyaan bersifat ambigu, minta klarifikasi.
*   Jawab dengan ringkas, jelas, dan langsung ke intinya. Gunakan poin-poin jika perlu.
*   Anda TIDAK dapat mengeksekusi query SQL, membuat visualisasi, atau memodifikasi data. Fokus pada interpretasi, penjelasan, dan penyajian hasil yang diberikan berdasarkan data yang ada.

Ringkasan Dataset (gunakan ini sebagai dasar pengetahuan Anda tentang data):
---
${dataSummary}
---

Pertanyaan Pengguna: "${question}"

Jawaban (berdasarkan ringkasan, pertanyaan, dan KONTEKS TAMBAHAN jika ada):
${SUGGESTIONS_PROMPT_BLOCK}
`;

  try {
    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    return parseAiResponseText(response.text);
  } catch (error) {
    console.error("Kesalahan API AI (answerQuestion):", error);
    throw new Error(enhanceErrorMessage(error));
  }
};

export const summarizeContent = async (textContent: string): Promise<AiServiceResponse> => {
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
${SUGGESTIONS_PROMPT_BLOCK}
`;
  try {
    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    return parseAiResponseText(response.text);
  } catch (error) {
    console.error("Kesalahan API AI (summarizeContent):", error);
    throw new Error(enhanceErrorMessage(error));
  }
};

export const answerQuestionFromContent = async (textContent: string, question: string): Promise<AiServiceResponse> => {
  const currentAi = getAiInstance();
  const prompt = `
Anda adalah asisten AI yang menjawab pertanyaan berdasarkan konten yang disediakan.
Gunakan HANYA informasi dari konten di bawah ini untuk menjawab pertanyaan. JANGAN gunakan pengetahuan eksternal atau internet.
Jika jawaban tidak ditemukan dalam konten yang disediakan:
    Awali jawaban Anda dengan penanda khusus ${INFO_NOT_FOUND_MARKER}. Setelah penanda, nyatakan bahwa informasi tersebut tidak tersedia dalam teks yang diberikan. Kemudian, sarankan pengguna bahwa mereka bisa mencoba menggunakan fitur "Cari di Internet" untuk pertanyaan tersebut jika mereka merasa itu pertanyaan umum.
Jawab dengan bahasa yang sederhana dan mudah dipahami.

Konten:
---
${textContent.substring(0, 30000)} ${textContent.length > 30000 ? "... (konten dipotong)" : ""}
---

Pertanyaan: "${question}"

Jawaban (berdasarkan HANYA konten yang disediakan, dalam bahasa sederhana):
${SUGGESTIONS_PROMPT_BLOCK}
`;
  try {
    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    return parseAiResponseText(response.text);
  } catch (error) {
    console.error("Kesalahan API AI (answerQuestionFromContent):", error);
    throw new Error(enhanceErrorMessage(error));
  }
};

export const simplifyText = async (textToSimplify: string): Promise<AiServiceResponse> => {
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
${SUGGESTIONS_PROMPT_BLOCK}
`;
  try {
    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    return parseAiResponseText(response.text);
  } catch (error) {
    console.error("Kesalahan API AI (simplifyText):", error);
    throw new Error(enhanceErrorMessage(error));
  }
};

// For structured "cari..." requests
export const answerQuestionWithInternetSearch = async (question: string): Promise<AiServiceResponse> => {
  const currentAi = getAiInstance();
  const prompt = `
Anda adalah asisten AI peneliti yang canggih dengan akses ke pencarian internet.
Tugas Anda adalah menjawab pertanyaan pengguna dengan memberikan daftar tautan relevan beserta ringkasannya. Permintaan ini adalah untuk pencarian terstruktur.

Pertanyaan Pengguna: "${question}"

Ikuti langkah-langkah berikut dengan SANGAT TELITI:

1.  **Pencarian Internet**: Lakukan pencarian Google Search yang komprehensif berdasarkan pertanyaan pengguna.
2.  **Seleksi Sumber**: Identifikasi 3 hingga 5 halaman web yang paling relevan, **terpercaya, dan dapat diakses** untuk menjawab pertanyaan pengguna. Prioritaskan sumber resmi, berita terkemuka, artikel ilmiah, atau dokumentasi yang mendalam. Usahakan untuk memilih sumber yang terlihat aktif dikelola dan kontennya tampak stabil serta dapat diakses publik. Hindari sumber yang terlihat usang, halaman direktori, atau situs dengan kualitas rendah.
3.  **Ekstraksi Informasi & Ringkasan**: Untuk setiap halaman web yang Anda pilih:
    *   Dapatkan judul halaman yang akurat.
    *   Sediakan **hanya placeholder judul** untuk tautan. Klien akan menggantinya dengan tautan Markdown yang benar menggunakan URL dari metadata. Format placeholder: \`[AI akan menuliskan judul halaman di sini sebagai placeholder untuk diganti klien]\`.
    *   Buat **ringkasan yang lebih detail (sekitar 2-4 kalimat atau satu paragraf pendek)** yang menjelaskan poin-poin kunci dari halaman tersebut dan bagaimana halaman itu relevan dengan pertanyaan pengguna. Ringkasan ini HARUS FOKUS pada aspek yang menjawab pertanyaan dan memberikan pemahaman yang lebih baik tentang kontennya. **Sorot bagian penting dalam ringkasan dengan menggunakan Markdown bold (\`**teks tebal**\`)**.

**Format Output WAJIB (gunakan Markdown):**

Tentu, berikut adalah beberapa tautan relevan yang saya temukan beserta ringkasannya:

1.  **[Judul Halaman Web 1 yang Ditemukan AI]**
    *   **Tautan Asli:** [Placeholder Judul oleh AI untuk Sumber 1]
    *   **Ringkasan Detail:** [Ringkasan yang lebih detail (sekitar 2-4 kalimat atau satu paragraf pendek) untuk Halaman Web 1 yang dibuat AI, dengan **sorotan** pada poin-poin kunci yang relevan.]

2.  **[Judul Halaman Web 2 yang Ditemukan AI]**
    *   **Tautan Asli:** [Placeholder Judul oleh AI untuk Sumber 2]
    *   **Ringkasan Detail:** [Ringkasan yang lebih detail (sekitar 2-4 kalimat atau satu paragraf pendek) untuk Halaman Web 2 yang dibuat AI, dengan **sorotan** pada poin-poin kunci yang relevan.]

(Lanjutkan untuk sumber ke-3, ke-4, dan ke-5 jika ada, dengan format yang sama. Label "**Tautan Asli:**" dan "**Ringkasan Detail:**" harus selalu tebal.)

---
**Meta**: Kata kunci pencarian yang mungkin digunakan: "[inferensi 3-5 kata kunci utama dari pertanyaan pengguna yang paling relevan untuk pencarian yang dibuat AI]"

**PENTING SEKALI**:
*   Label "**Tautan Asli:**" dan "**Ringkasan Detail:**" HARUS SELALU tebal.
*   Bagian setelah "**Tautan Asli:**" HARUS HANYA berupa placeholder judul dalam kurung siku, misalnya \`[AI Generated Title for This Source]\`. JANGAN sertakan URL di sini.
*   Ringkasan harus benar-benar **detail dan informatif** namun tetap ringkas, dengan bagian penting **disorot**.
*   Jangan menambahkan teks pembuka atau penutup di luar format yang ditentukan di atas.
*   Pilih sumber yang kredibel dan dapat diandalkan, dan usahakan untuk menghindari halaman yang kemungkinan besar tidak dapat diakses atau kontennya sudah tidak relevan.
${SUGGESTIONS_PROMPT_BLOCK.replace("Setiap saran harus dalam baris baru dan berupa TEKS BIASA tanpa nomor, poin, atau format tebal.", "Setiap saran harus dalam baris baru dan berupa TEKS BIASA (tanpa nomor, poin, atau format tebal).")}
`;
  try {
    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const parsedResponse = parseAiResponseText(response.text);
    let sources: Array<{ uri: string; title:string }> | undefined = undefined;

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
    return { ...parsedResponse, sources };
  } catch (error) {
    console.error("Kesalahan API AI (answerQuestionWithInternetSearch):", error);
    throw new Error(enhanceErrorMessage(error));
  }
};

// For conversational general knowledge questions using internet search
export const getConversationalAnswerWithInternetSearch = async (question: string): Promise<AiServiceResponse> => {
  const currentAi = getAiInstance();
  const prompt = `
Anda adalah asisten AI yang sangat membantu, informatif, dan canggih dengan akses ke pencarian internet.
Tugas Anda adalah menjawab pertanyaan pengguna secara detail, alami, dan dalam gaya percakapan yang menarik.

PENTING: Ketika Anda menggunakan informasi spesifik dari sebuah sumber yang ditemukan melalui pencarian internet, Anda **HARUS** berusaha menyematkan referensi ke sumber tersebut secara naratif dan langsung di dalam kalimat jawaban Anda jika memungkinkan. Gunakan format Markdown untuk tautan: \`[Teks Tautan yang Relevan](URL_ASLI_VALID)\`. Teks tautan bisa berupa nama sumber, judul artikel, atau frasa deskriptif. Usahakan agar URL yang Anda gunakan adalah URL asli yang valid dan langsung ke konten, bukan URL redirect.

Contoh bagaimana cara menyematkan referensi naratif dengan tautan Markdown:
*   "Pemanasan global disebabkan oleh peningkatan emisi gas rumah kaca, seperti yang dijelaskan oleh [NASA Climate Change](https://climate.nasa.gov/)."
*   "Menurut sebuah studi terbaru yang diterbitkan di [Nature](URL_JURNAL_NATURE_RELEVAN), para peneliti menemukan bahwa..."
*   "Anda bisa menemukan informasi lebih lanjut mengenai cara kerja fotosintesis di [Wikipedia - Fotosintesis](URL_HALAMAN_WIKIPEDIA_FOTOSINTESIS)."

Instruksi Tambahan:
*   **JAWABAN ANDA TIDAK BOLEH menggunakan format daftar kaku** seperti "Tautan Asli:", "Ringkasan Detail:", atau daftar tautan bernomor di akhir. Semua referensi harus disematkan secara kontekstual dalam kalimat menggunakan tautan Markdown.
*   Sajikan jawaban seolah-olah Anda sedang berbicara langsung dan membantu pengguna memahami topik.
*   Jika Anda merangkum informasi dari beberapa sumber, Anda bisa menyertakan beberapa tautan Markdown inline jika relevan.
*   Usahakan jawaban tidak terlalu panjang, namun tetap komprehensif, akurat, dan menjawab inti pertanyaan pengguna.
*   Fokus pada penyajian fakta dan informasi yang Anda temukan. Hindari opini pribadi kecuali diminta.
*   Jika sebuah URL sangat panjang atau kompleks, Anda bisa menggunakan judul artikel atau nama domain sebagai teks tautan.

Pertanyaan Pengguna: "${question}"

Jawaban Percakapan (dengan referensi naratif dan tautan Markdown yang disematkan secara alami dalam kalimat):
${SUGGESTIONS_PROMPT_BLOCK.replace("Setiap saran harus dalam baris baru dan berupa TEKS BIASA tanpa nomor, poin, atau format tebal.", "Setiap saran harus dalam baris baru dan berupa TEKS BIASA (tanpa nomor, poin, atau format tebal).")}
`;

  try {
    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const parsedResponse = parseAiResponseText(response.text);
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
    return { ...parsedResponse, sources };
  } catch (error) {
    console.error("Kesalahan API AI (getConversationalAnswerWithInternetSearch):", error);
    throw new Error(enhanceErrorMessage(error));
  }
};


export const evaluateDocumentWithReferences = async (textContent: string): Promise<AiServiceResponse> => {
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
${SUGGESTIONS_PROMPT_BLOCK.replace("Setiap saran harus dalam baris baru dan berupa TEKS BIASA tanpa nomor, poin, atau format tebal.", "Setiap saran harus dalam baris baru dan berupa TEKS BIASA (tanpa nomor, poin, atau format tebal).")}
`;

  try {
    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const parsedResponse = parseAiResponseText(response.text);
    let sources: Array<{ uri: string; title: string }> | undefined = undefined;

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
        sources = Array.from(uniqueSources.entries()).map(([uri, title]) => ({ uri, title }));
      } else {
        sourcesMarkdown += "\nTidak ada sumber referensi spesifik yang ditemukan oleh pencarian Google untuk mendukung evaluasi ini.\n";
      }
      // Append sources markdown to the main text, or handle it separately if needed
      parsedResponse.mainText += sourcesMarkdown;

    } else {
      parsedResponse.mainText += "\n\n---\n### Sumber Referensi dari Internet:\n\nTidak ada sumber referensi yang ditemukan oleh pencarian Google untuk mendukung evaluasi ini.\n";
    }

    return { ...parsedResponse, sources };
  } catch (error) {
    console.error("Kesalahan API AI (evaluateDocumentWithReferences):", error);
    throw new Error(enhanceErrorMessage(error));
  }
};
