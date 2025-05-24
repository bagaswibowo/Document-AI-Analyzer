
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import cheerio from 'cheerio';

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
        // Coba tambahkan header untuk menerima encoding apa pun, axios akan menanganinya
        'Accept-Encoding': 'gzip, deflate, br',
      },
      timeout: 10000, // Timeout 10 detik
      // Pastikan axios mendekode respons secara otomatis
      responseType: 'text', 
      decompress: true,
    });

    if (status !== 200) {
      // Ini seharusnya ditangkap oleh blok catch jika axios.get melempar error untuk status non-2xx,
      // tetapi jika tidak, kita tangani di sini.
      console.error(`PROXY_UNEXPECTED_NON_ERROR_STATUS: Target URL ${targetUrl} merespons dengan status ${status} tetapi axios tidak melempar error.`);
      return res.status(status).json({ error: `Server target (${targetUrl}) merespons dengan status ${status} (ditangani secara eksplisit).` });
    }

    const $ = cheerio.load(htmlString);

    $('script, style, noscript, nav, footer, header, aside, form, iframe, link, meta[name="robots"], [aria-hidden="true"]').remove();
    
    let extractedText = '';
    if ($('main').length) {
      extractedText = $('main').text();
    } else if ($('article').length) {
      extractedText = $('article').text();
    } else if ($('body').length) { // Fallback ke body jika tidak ada main atau article
      extractedText = $('body').text();
    } else { // Fallback jika body pun tidak ada atau htmlString kosong
      extractedText = ""; // Pastikan extractedText adalah string
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
    // 1. Log error mentah terlebih dahulu ke Vercel logs untuk diagnosis mendalam
    console.error("PROXY_CAUGHT_ERROR_RAW:", error);
    // 2. Logging detail tentang bagaimana error diproses
    const errorTimestamp = new Date().toISOString();
    console.error(`PROXY_ERROR_DETAILS (${errorTimestamp}): Error saat mengambil ${targetUrl}. Pesan: ${error?.message}. Stack: ${error?.stack}`);

    let statusCode = 500;
    let clientErrorMessage = `Gagal mengambil atau memproses konten dari URL target (${targetUrl}). Silakan coba lagi nanti atau periksa URL.`; // Pesan awal generik

    if (axios.isAxiosError(error)) {
        if (error.response) { 
            statusCode = error.response.status;
            // Hindari mengirim error.response.data langsung ke klien jika besar atau bukan teks
            let targetServerMessage = `Server target (${targetUrl}) merespons dengan status ${statusCode}.`;
            if (typeof error.response.data === 'string' && error.response.data.length < 200) { // Hanya sertakan data error jika pendek
                targetServerMessage += ` Detail: ${error.response.data}`;
            }
            clientErrorMessage = targetServerMessage;
            console.error(`PROXY_AXIOS_RESPONSE_ERROR (${errorTimestamp}): Status ${statusCode}, Data:`, error.response.data);
        } else if (error.request) { 
            clientErrorMessage = `Tidak ada respons dari server target (${targetUrl}). Mungkin masalah jaringan, URL tidak dapat dijangkau, atau timeout.`;
            console.error(`PROXY_AXIOS_REQUEST_ERROR (${errorTimestamp}): Tidak ada respons yang diterima.`);
        } else { 
            clientErrorMessage = `Kesalahan saat menyiapkan permintaan ke server target (${targetUrl}): ${error.message || 'Kesalahan Axios tidak diketahui'}`;
            console.error(`PROXY_AXIOS_SETUP_ERROR (${errorTimestamp}):`, error.message);
        }
    } else if (error instanceof Error) {
        // Error non-Axios, tapi objek Error standar
        clientErrorMessage = `Kesalahan internal server saat memproses permintaan untuk ${targetUrl}: ${error.message}`;
        console.error(`PROXY_NON_AXIOS_ERROR (${errorTimestamp}):`, error.message, error.stack);
    } else {
        // Tipe error tidak diketahui
        clientErrorMessage = `Terjadi kesalahan internal server yang tidak diketahui saat memproses permintaan untuk ${targetUrl}.`;
        console.error(`PROXY_UNKNOWN_ERROR_TYPE (${errorTimestamp}):`, error);
    }
    
    // 3. Pastikan respons ke klien selalu berupa JSON yang valid
    try {
        return res.status(statusCode).json({ error: clientErrorMessage });
    } catch (responseJsonError) {
        // Ini adalah fallback untuk kasus langka di mana res.json() sendiri gagal
        console.error(`PROXY_CRITICAL_ERROR (${errorTimestamp}): Gagal mengirim respons JSON ke klien:`, responseJsonError);
        // Kirim respons teks biasa jika JSON gagal
        res.status(500).setHeader('Content-Type', 'text/plain').send("Kesalahan kritis pada server proxy. Tidak dapat membentuk respons JSON.");
    }
  }
}
