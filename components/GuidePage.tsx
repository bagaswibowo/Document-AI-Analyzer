
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeftIcon, LightBulbIcon } from '@heroicons/react/24/outline';

interface GuidePageProps {
  onBackToApp: () => void;
}

const guideContent = `
## Selamat Datang di Penganalisis & Evaluator Dokumen AI!
Aplikasi ini dirancang untuk membantu Anda menggali wawasan dari data tabular, memahami dokumen dengan cepat, dan meningkatkan kualitas tulisan Anda dengan bantuan AI.

### 1. Memulai (Tab Input)
Tab **Input** adalah gerbang utama Anda. Pilih salah satu mode berikut untuk memulai:

*   #### Mode Data Tabular
    *   **Apa yang bisa diunggah?** File dengan format berikut:
        *   **\`.csv\`**
        *   **\`.tsv\`**
        *   **\`.xls\`**
        *   **\`.xlsx\`**
    *   **Setelah unggah:** Aplikasi akan secara otomatis menganalisis data Anda. Anda akan diarahkan ke tab "Ringkasan". Dari sana, Anda dapat menjelajahi:
        *   **Visualisasi:** Buat grafik interaktif.
        *   **Wawasan:** Dapatkan analisis berbasis AI tentang data Anda.
        *   **Tanya Jawab (Data):** Ajukan pertanyaan langsung tentang dataset Anda.

*   #### Mode Dokumen
    *   **Apa yang bisa diunggah?** File dokumen seperti berikut:
        *   **\`.pdf\`**
        *   **\`.docx\`**
        *   **\`.doc\`**
        *   **\`.txt\`**
    *   **Setelah unggah:** Teks dari dokumen akan diekstrak. Anda akan melihat ringkasan singkat dan bisa langsung:
        *   **Tanya Jawab (Dokumen):** Bertanya tentang isi dokumen.
        *   **Evaluasi:** Pindah ke tab "Evaluasi" untuk analisis kualitas dan referensi.

*   #### Mode Teks Langsung
    *   **Bagaimana caranya?** Ketik atau tempel teks Anda langsung ke dalam area yang tersedia.
    *   **Setelah input:** Sama seperti mode dokumen, Anda bisa menggunakan fitur "Tanya Jawab" atau "Evaluasi" untuk teks yang Anda masukkan.

### 2. Menganalisis Data Tabular (Menu Navigasi Bawah)
Setelah file tabular Anda diproses, gunakan menu di bagian bawah untuk fitur-fitur ini:

*   **Ringkasan (Overview):**
    *   Lihat informasi dasar: nama file, jumlah baris dan kolom.
    *   Pahami struktur data: detail per kolom (tipe data, data hilang, nilai unik).
    *   Intip data Anda: beberapa baris sampel dari dataset.
*   **Visualisasi (Visualize):**
    *   Pilih jenis grafik: Bar, Line, Area, Pie, Doughnut, Scatter, atau Histogram.
    *   Pilih kolom untuk sumbu X dan Y (jika diperlukan) atau kolom kategori untuk Pie/Doughnut.
    *   Sesuaikan jumlah bins untuk Histogram.
    *   Grafik akan otomatis diperbarui berdasarkan pilihan Anda.
*   **Wawasan (Insights):**
    *   Klik tombol "Hasilkan Wawasan".
    *   AI akan menganalisis data Anda dan menyajikan temuan-temuan menarik, pola, atau anomali dalam format yang mudah dibaca.
*   **Tanya Jawab (Mode Data):**
    *   Area chat untuk bertanya tentang dataset Anda menggunakan bahasa sehari-hari.
    *   Contoh: "Berapa rata-rata kolom penjualan?", "Tampilkan 5 baris dengan nilai tertinggi di kolom skor", "Total pendapatan dari produk A?".
    *   Sistem dapat mencoba melakukan perhitungan dasar berdasarkan permintaan Anda.

### 3. Bekerja dengan Dokumen dan Teks
*   **Tanya Jawab (Mode Dokumen/Teks):**
    *   Setelah dokumen diunggah atau teks dimasukkan, ringkasan otomatis akan muncul di atas area chat (jika berhasil dibuat).
    *   Ajukan pertanyaan spesifik tentang konten. AI akan berusaha menjawab berdasarkan teks yang Anda berikan.
    *   Contoh: "Apa saja poin-poin utama dari teks ini?", "Siapa yang disebutkan dalam dokumen ini terkait proyek X?".
*   **Evaluasi (Tab Evaluasi):**
    *   Jika Anda sudah memproses dokumen/teks dari tab Input, kontennya akan tersedia di sini. Anda juga bisa mengunggah file baru langsung di tab Evaluasi.
    *   Klik tombol "Evaluasi dengan Referensi Internet". AI akan:
        1.  **Menganalisis Kualitas Teks:** Memberikan penilaian terhadap kejelasan, kelengkapan, potensi akurasi, dan bias.
        2.  **Memberikan Saran Perbaikan:** Menawarkan ide konkret untuk meningkatkan tulisan Anda.
        3.  **Mencari Referensi:** Mencoba menemukan 2-4 sumber dari internet yang relevan, mendukung, atau mengkontraskan poin utama teks Anda, lengkap dengan tautan.

### 4. Navigasi Utama
Ikon-ikon di bagian bawah layar adalah cara utama Anda berpindah antar fitur. Beberapa tombol mungkin tidak aktif jika belum ada data atau konten yang sesuai (misalnya, "Visualisasi" tidak aktif jika belum ada data tabular yang diunggah).

### Tips Penggunaan Efektif:
*   **API Key:** Anda tidak perlu khawatir tentang API Key, aplikasi ini sudah dikonfigurasi.
*   **Batas Ukuran File:** Perhatikan batas ukuran file yang tertera saat mengunggah (umumnya sekitar 25MB). File yang lebih besar mungkin gagal diproses.
*   **Pesan Kesalahan:** Jika ada masalah, pesan kesalahan akan muncul di bagian atas layar. Coba periksa kembali file atau input Anda, atau coba lagi.
*   **Format .doc:** Untuk file Word versi lama (\`.doc\`), ekstraksi teks mungkin kurang optimal dibandingkan \`.docx\`. Jika memungkinkan, konversi ke \`.docx\` atau \`.pdf\` untuk hasil terbaik.
*   **Kesabaran:** Beberapa proses AI (seperti menghasilkan wawasan atau evaluasi) mungkin memerlukan beberapa saat. Mohon tunggu hingga proses selesai.

Semoga panduan ini membantu Anda memanfaatkan semua fitur aplikasi dengan maksimal!
`;

const MarkdownComponents = {
  h1: ({node, ...props}: any) => <h1 className="text-3xl font-bold my-5 text-blue-700 border-b pb-3" {...props} />,
  h2: ({node, ...props}: any) => <h2 className="text-2xl font-semibold mt-6 mb-3 text-slate-800" {...props} />,
  h3: ({node, ...props}: any) => <h3 className="text-xl font-semibold mt-5 mb-2 text-slate-700" {...props} />,
  h4: ({node, ...props}: any) => <h4 className="text-lg font-semibold mt-4 mb-1 text-slate-700" {...props} />,
  p: ({node, ...props}: any) => <p className="my-2.5 leading-relaxed text-slate-600 text-sm" {...props} />,
  ul: ({node, ...props}: any) => <ul className="list-disc pl-6 my-2.5 space-y-1.5 text-slate-600 text-sm" {...props} />,
  ol: ({node, ...props}: any) => <ol className="list-decimal pl-6 my-2.5 space-y-1.5 text-slate-600 text-sm" {...props} />,
  li: ({node, ...props}: any) => <li className="text-slate-600 leading-normal" {...props} />,
  strong: ({node, ...props}: any) => <strong className="font-semibold text-slate-700" {...props} />,
  code: ({node, inline, className, children, ...props}: any) => {
    return !inline ? (
      <pre className={`my-2 p-3 rounded-md bg-slate-100 border border-slate-200 overflow-x-auto text-xs font-mono`} {...props}>
        <code className="text-slate-800">{String(children).replace(/\n$/, '')}</code>
      </pre>
    ) : (
      <code className="px-1.5 py-0.5 bg-slate-200 rounded text-xs text-pink-700 font-mono" {...props}>
        {children}
      </code>
    );
  },
  blockquote: ({node, ...props}: any) => <blockquote className="my-3 pl-4 border-l-4 border-blue-300 bg-blue-50 p-3 text-sm text-blue-700 rounded-r-md" {...props} />,
};

export const GuidePage: React.FC<GuidePageProps> = ({ onBackToApp }) => {
  return (
    <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-lg shadow-xl">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center">
            <LightBulbIcon className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
            Panduan Penggunaan Aplikasi
            </h1>
        </div>
        <button
          onClick={onBackToApp}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Kembali ke Aplikasi
        </button>
      </div>
      <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none">
        <ReactMarkdown components={MarkdownComponents}>
          {guideContent}
        </ReactMarkdown>
      </div>
      <div className="mt-8 pt-6 border-t border-slate-200 text-center">
        <button
          onClick={onBackToApp}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Kembali ke Aplikasi
        </button>
      </div>
    </div>
  );
};
