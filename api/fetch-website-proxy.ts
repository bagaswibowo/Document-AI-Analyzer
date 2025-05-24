
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
        // Beberapa website mungkin memerlukan User-Agent yang umum
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      timeout: 10000, // Timeout 10 detik
    });

    if (status !== 200) {
      return res.status(status).json({ error: `Server target merespons dengan status ${status} untuk ${targetUrl}.` });
    }

    const $ = cheerio.load(htmlString);

    // Hapus elemen yang umumnya tidak mengandung konten utama
    $('script, style, noscript, nav, footer, header, aside, form, iframe, link, meta[name="robots"], [aria-hidden="true"]').remove();
    
    // Coba ambil dari elemen konten utama, lalu fallback ke body
    let extractedText = '';
    if ($('main').length) {
      extractedText = $('main').text();
    } else if ($('article').length) {
      extractedText = $('article').text();
    } else {
      extractedText = $('body').text();
    }
    
    // Bersihkan whitespace berlebih dan baris kosong
    extractedText = extractedText
      .replace(/(\r\n|\n|\r){3,}/g, '\n\n') // Kurangi baris kosong berurutan menjadi maksimal dua
      .replace(/[ \t]{2,}/g, ' ') // Kurangi spasi/tab berurutan menjadi satu
      .trim();


    if (!extractedText) {
      return res.status(200).json({ extractedText: "Tidak ada konten teks yang signifikan yang dapat diekstrak dari URL ini." });
    }
    
    return res.status(200).json({ extractedText });

  } catch (error: any) {
    console.error(`Error fetching ${targetUrl}:`, error.message);
    let statusCode = 500;
    let errorMessage = `Gagal mengambil atau memproses konten dari ${targetUrl}.`;

    if (axios.isAxiosError(error)) {
        if (error.response) { // Error dari respons axios (mis. 404, 403 dari target)
            statusCode = error.response.status;
            errorMessage = `Server target merespons dengan status ${statusCode} untuk ${targetUrl}.`;
        } else if (error.request) { // Permintaan dibuat tapi tidak ada respons
            errorMessage = `Tidak ada respons dari server target untuk ${targetUrl}. Mungkin masalah jaringan, URL tidak dapat dijangkau, atau timeout.`;
        } else { // Error lainnya saat setup request
            errorMessage = `Kesalahan saat menyiapkan permintaan ke ${targetUrl}: ${error.message}`;
        }
    } else {
        // Error non-axios
        errorMessage = `Kesalahan internal saat memproses permintaan untuk ${targetUrl}: ${error.message}`;
    }
    return res.status(statusCode).json({ error: errorMessage });
  }
}
