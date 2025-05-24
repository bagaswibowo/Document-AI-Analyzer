
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import cheerio from 'cheerio';

// Fungsi untuk membersihkan string dari karakter yang berpotensi merusak JSON
function sanitizeStringForJSON(str: string | undefined | null): string {
  if (str === undefined || str === null) return "";
  // Hapus karakter kontrol C0 (kecuali tab, line feed, carriage return), DEL, dan kontrol C1.
  // Ini membantu memastikan string aman untuk JSON.stringify.
  return String(str).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '?');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const targetUrl = req.query.url as string;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Parameter URL target diperlukan.' });
  }

  if (!targetUrl.toLowerCase().startsWith('http://') && !targetUrl.toLowerCase().startsWith('https://')) {
    return res.status(400).json({ error: 'URL tidak valid. Harus dimulai dengan http:// atau https://.' });
  }
  
  try {
    const { data: htmlString, status } = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      timeout: 10000, 
      responseType: 'text', 
      decompress: true,
    });

    if (status !== 200) {
      console.error(`PROXY_UNEXPECTED_NON_ERROR_STATUS: Target URL ${targetUrl} merespons dengan status ${status} tetapi axios tidak melempar error.`);
      return res.status(status).json({ error: `Server target (${sanitizeStringForJSON(targetUrl)}) merespons dengan status ${status} (ditangani secara eksplisit).` });
    }

    const $ = cheerio.load(htmlString);

    $('script, style, noscript, nav, footer, header, aside, form, iframe, link, meta[name="robots"], [aria-hidden="true"]').remove();
    
    let extractedText = '';
    if ($('main').length) {
      extractedText = $('main').text();
    } else if ($('article').length) {
      extractedText = $('article').text();
    } else if ($('body').length) { 
      extractedText = $('body').text();
    } else { 
      extractedText = ""; 
    }
    
    extractedText = extractedText
      .replace(/(\r\n|\n|\r){3,}/g, '\n\n') 
      .replace(/[ \t]{2,}/g, ' ') 
      .trim();

    if (!extractedText) {
      return res.status(200).json({ extractedText: "Tidak ada konten teks yang signifikan yang dapat diekstrak dari URL ini." });
    }
    
    return res.status(200).json({ extractedText });

  } catch (error: any) {
    const errorTimestamp = new Date().toISOString();
    console.error(`PROXY_CAUGHT_ERROR_RAW (${errorTimestamp}):`, error); // Log error mentah
    console.error(`PROXY_ERROR_DETAILS (${errorTimestamp}): Error saat mengambil ${targetUrl}. Pesan: ${error?.message}. Stack: ${error?.stack}`);

    let statusCode = 500;
    let clientErrorMessage = `Gagal mengambil atau memproses konten dari URL target (${sanitizeStringForJSON(targetUrl)}). Silakan coba lagi nanti atau periksa URL.`; 

    if (axios.isAxiosError(error)) {
        if (error.response) { 
            statusCode = error.response.status;
            let targetServerMessage = `Server target (${sanitizeStringForJSON(targetUrl)}) merespons dengan status ${statusCode}.`;
            
            if (error.response.data) {
                let detailSnippet = '';
                if (typeof error.response.data === 'string') {
                    detailSnippet = error.response.data.substring(0, 150);
                } else if (typeof error.response.data === 'object') {
                    try {
                        detailSnippet = JSON.stringify(error.response.data).substring(0, 150);
                    } catch {
                        detailSnippet = '[Data objek tidak dapat diserialisasi]';
                    }
                } else {
                    detailSnippet = String(error.response.data).substring(0, 150);
                }
                // Sanitasi snippet sebelum dimasukkan ke pesan error
                targetServerMessage += ` Detail: ${sanitizeStringForJSON(detailSnippet)}${String(error.response.data).length > 150 ? '...' : ''}`;
            }
            clientErrorMessage = targetServerMessage;
            console.error(`PROXY_AXIOS_RESPONSE_ERROR (${errorTimestamp}): Status ${statusCode}, Data:`, error.response.data);
        } else if (error.request) { 
            clientErrorMessage = `Tidak ada respons dari server target (${sanitizeStringForJSON(targetUrl)}). Mungkin masalah jaringan, URL tidak dapat dijangkau, atau timeout.`;
            console.error(`PROXY_AXIOS_REQUEST_ERROR (${errorTimestamp}): Tidak ada respons yang diterima.`);
        } else { 
            clientErrorMessage = `Kesalahan saat menyiapkan permintaan ke server target (${sanitizeStringForJSON(targetUrl)}): ${sanitizeStringForJSON(error.message) || 'Kesalahan Axios tidak diketahui'}`;
            console.error(`PROXY_AXIOS_SETUP_ERROR (${errorTimestamp}):`, error.message);
        }
    } else if (error instanceof Error) {
        clientErrorMessage = `Kesalahan internal server saat memproses permintaan untuk ${sanitizeStringForJSON(targetUrl)}: ${sanitizeStringForJSON(error.message)}`;
        console.error(`PROXY_NON_AXIOS_ERROR (${errorTimestamp}):`, error.message, error.stack);
    } else {
        clientErrorMessage = `Terjadi kesalahan internal server yang tidak diketahui saat memproses permintaan untuk ${sanitizeStringForJSON(targetUrl)}.`;
        console.error(`PROXY_UNKNOWN_ERROR_TYPE (${errorTimestamp}):`, error);
    }
    
    try {
        return res.status(statusCode).json({ error: clientErrorMessage });
    } catch (responseJsonError) {
        console.error(`PROXY_CRITICAL_ERROR (${errorTimestamp}): Gagal mengirim respons JSON ke klien:`, responseJsonError, "Pesan error asli yang coba dikirim:", clientErrorMessage);
        res.status(500).setHeader('Content-Type', 'text/plain').send("Kesalahan kritis pada server proxy. Tidak dapat membentuk respons JSON. Periksa log server untuk detail.");
    }
  }
}
