
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeftIcon, LightBulbIcon } from '@heroicons/react/24/outline';

interface GuidePageProps {
  onBackToApp: () => void;
}

const guideContent = `
## Panduan Singkat: Penganalisis & Evaluator Dokumen AI
Aplikasi ini membantu Anda menganalisis data, memahami dokumen, dan meningkatkan tulisan dengan AI.

### A. Navigasi Utama
*   **Header:** Judul aplikasi & tombol **Panduan** (ikon ?).
*   **Konten Utama:** Area interaksi utama.
*   **Menu Bawah:** Pindah antar bagian: Input, Ringkasan (data tabular), Visualisasi (data tabular), Tanya Jawab (QA), Evaluasi (dokumen/teks).
    *   *Beberapa menu mungkin nonaktif jika belum ada data yang sesuai.*

### B. Memulai: Tab "Input"
Pilih mode input Anda:

#### B.1. Input Dokumen/Teks Langsung
*   **Unggah Dokumen (PDF, DOCX, DOC, TXT):**
    1.  Di tab "Dokumen", unggah file (Maks: 25 MB).
    2.  *Catatan untuk \`.doc\`: Hasil mungkin kurang optimal. Gunakan \`.docx\` atau \`.pdf\` jika bisa.*
    3.  **Setelah Proses:** Anda akan diarahkan ke tab **QA**. Ringkasan & saran pertanyaan dari AI akan muncul di sana. Tab **Evaluasi** juga aktif.
*   **Teks Langsung:**
    1.  Di tab "Teks Langsung", ketik/tempel teks (Maks: 20.000 kata).
    2.  **Setelah Proses:** Sama seperti unggah dokumen, Anda ke tab **QA** dengan ringkasan & saran dari AI. Tab **Evaluasi** aktif.

#### B.2. Input Data Tabular (CSV, TSV, Excel)
1.  Di tab "Data Tabular", unggah file (Maks: 25 MB).
2.  **Setelah Proses:** Analisis data & wawasan otomatis dari AI akan muncul di tab **QA**, beserta saran pertanyaan. Tab **Ringkasan** & **Visualisasi** juga aktif.

### C. Fitur Dokumen & Teks Langsung

#### C.1. Tab Tanya Jawab (QA)
*   **Konteks Aktif:** Dokumen/teks yang diproses. Ringkasan & saran pertanyaan dari AI muncul di atas area chat.
*   **Interaksi:**
    *   **Tanya Dokumen/Teks:** Tombol untuk pertanyaan spesifik ke konten aktif.
    *   **Cari di Internet:** Kolom input utama & tombol untuk pencarian web.
    *   Jika info tak ada di konteks, AI akan menyarankan pencarian web.

#### C.2. Tab Evaluasi
*   **Akses:** Setelah memproses dokumen/teks dari Input, atau unggah file baru langsung di sini (Maks: 25 MB, sama seperti input dokumen).
*   **Proses:** Klik tombol **"Evaluasi dengan Referensi Internet"**.
*   **Hasil AI:** Analisis kualitas teks, saran perbaikan, & referensi internet terkait.
*   **Saran Pertanyaan:** Muncul di bawah hasil, mengarah ke QA untuk pencarian web.

### D. Fitur Data Tabular

#### D.1. Tab Ringkasan
*   Menampilkan info umum (nama file, jumlah baris & kolom) dan statistik detail per kolom, termasuk sampel data.

#### D.2. Tab Visualisasi
*   Memungkinkan Anda membuat berbagai jenis grafik (Bar, Line, Pie, dll.) dari data dengan memilih kolom yang relevan.

#### D.3. Tab Tanya Jawab (QA)
*   **Wawasan Otomatis:** Setelah unggah data tabular, wawasan AI & saran pertanyaan terkait akan muncul di atas area chat.
*   **Interaksi:**
    *   **Tanya Dataset:** Tombol untuk pertanyaan spesifik ke data Anda.
    *   **Cari di Internet:** Kolom input utama & tombol untuk pencarian web.
    *   Jika info tak ada di data, AI menyarankan pencarian web.

### E. Tanya Jawab (QA) - Pencarian Internet Lanjutan
Fitur ini tersedia di tab Tanya Jawab untuk semua mode.
*   **Cara:** Ketik pertanyaan di input utama & tekan Enter / tombol "Cari di Internet", atau melalui saran dari AI saat info tidak ditemukan di konteks.
*   **Hasil:**
    *   **Percakapan (umum):** Jawaban naratif dengan tautan sumber disematkan langsung dalam teks.
    *   **Terstruktur (jika pertanyaan diawali "cari..." atau "carikan..."):** Daftar sumber terstruktur dengan judul, ringkasan, dan tautan.
    *   Semua hasil pencarian internet juga akan menyertakan daftar **"Sumber Tambahan yang Digunakan AI"**.

### F. Fitur Interaktif Umum
*   **Saran Pertanyaan Lanjutan:** Tombol saran pertanyaan muncul setelah respons AI di QA, pada ringkasan/wawasan awal, dan setelah hasil evaluasi. Mengkliknya akan mengirimkan pertanyaan ke QA.
*   **Tombol "Sederhanakan":** Jika jawaban AI (dari konteks atau internet) dirasa panjang/kompleks, tombol ini mungkin muncul di QA untuk menyederhanakannya.
*   **Penanganan Error & Notifikasi:** Pesan error (merah) atau notifikasi singkat (toast) akan muncul jika ada masalah atau info penting.

### G. Tips & Catatan
*   **API Key:** Tidak perlu diatur oleh Anda; sudah terkonfigurasi.
*   **Kesabaran:** Proses AI (analisis, evaluasi, pencarian) mungkin memerlukan beberapa detik.
*   **Teks Tebal:** Untuk penekanan, teks yang ditebalkan AI dalam jawabannya akan ditampilkan tebal, terkadang dengan gaya khusus pada ringkasan/wawasan/evaluasi.

Semoga panduan ini membantu Anda!
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
