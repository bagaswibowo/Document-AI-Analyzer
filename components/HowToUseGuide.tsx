
import React from 'react';
import { ArrowLeftIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';

interface HowToUseGuideProps {
  onBack: () => void;
}

const guideContent = `
# Panduan Penggunaan Aplikasi Penganalisis & Evaluator Dokumen AI

Selamat datang! Aplikasi ini dirancang untuk membantu Anda menganalisis data tabular, memperoleh ringkasan dan jawaban dari berbagai jenis dokumen, serta mengevaluasi kualitas teks menggunakan kecerdasan buatan.

## 1. Menganalisis Data Tabular (File CSV, TSV, Excel)

Fitur ini memungkinkan Anda mengunggah file data tabular dan mendapatkan wawasan mendalam.

1.  **Input Data**:
    *   Pilih tab **"Input"** pada navigasi bawah.
    *   Di halaman Input, pilih mode **"Data Tabular"**.
    *   Klik area unggah atau seret file Anda (.csv, .tsv, .xls, .xlsx) ke dalamnya. Pastikan ukuran file tidak melebihi batas yang ditentukan.
    *   Setelah file dipilih, klik tombol **"Proses File Tabular"**.

2.  **Ringkasan Data (Overview)**:
    *   Setelah pemrosesan berhasil, Anda akan otomatis diarahkan ke tab **"Ringkasan"**.
    *   Di sini, Anda dapat melihat:
        *   Informasi umum tentang dataset (nama file, jumlah baris dan kolom, estimasi ukuran).
        *   Detail statistik untuk setiap kolom (tipe data, data hilang, nilai unik, mean, median, modus, min, maks).
        *   Sampel data (10 baris pertama) untuk memberikan gambaran isi dataset.

3.  **Visualisasi Data**:
    *   Pilih tab **"Visualisasi"** pada navigasi bawah.
    *   Pilih jenis chart yang diinginkan dari opsi yang tersedia (Bar, Line, Area, Pie, Doughnut, Scatter, Histogram).
    *   Berdasarkan jenis chart, pilih kolom yang sesuai untuk sumbu X, sumbu Y (jika numerik), atau kolom kategorikal (untuk Pie/Doughnut/Histogram).
    *   Chart akan secara otomatis diperbarui dan ditampilkan berdasarkan pilihan Anda.

4.  **Wawasan AI (Insights)**:
    *   Pilih tab **"Wawasan"** pada navigasi bawah.
    *   Klik tombol **"Hasilkan Wawasan"**. AI akan menganalisis ringkasan data Anda.
    *   Hasilnya akan berupa poin-poin penting mengenai pola, anomali, atau observasi menarik yang ditemukan dalam dataset Anda, disajikan dalam bahasa yang mudah dipahami.

5.  **Tanya Jawab (Data Tabular)**:
    *   Pilih tab **"Tanya Jawab"** pada navigasi bawah.
    *   Di kolom chat, ketik pertanyaan Anda mengenai data tabular yang telah diunggah (misalnya, "Berapa nilai rata-rata di kolom Penjualan?", "Tampilkan modus untuk kolom Kategori Produk?", "Berapa jumlah data unik di kolom ID Pelanggan?").
    *   AI akan mencoba menjawab pertanyaan Anda berdasarkan ringkasan statistik data dan kemampuan interpretasi perhitungan dasar. Jika sistem dapat melakukan perhitungan (seperti SUM, AVERAGE, MIN, MAX), hasilnya akan disertakan.

## 2. Interaksi dengan Dokumen (PDF, DOCX, DOC, TXT) atau Teks Langsung

Fitur ini memungkinkan Anda mendapatkan ringkasan dan jawaban dari konten teks.

1.  **Input Dokumen/Teks**:
    *   Pilih tab **"Input"** pada navigasi bawah.
    *   **Untuk File Dokumen**: Pilih mode **"Dokumen"**. Unggah file Anda (.pdf, .docx, .doc, .txt). Klik **"Proses File Dokumen"**.
    *   **Untuk Teks Langsung**: Pilih mode **"Teks Langsung"**. Ketik atau tempel teks Anda langsung ke area yang disediakan (perhatikan batas jumlah kata). Klik **"Proses Teks"**.

2.  **Ringkasan & Tanya Jawab (Dokumen/Teks)**:
    *   Setelah pemrosesan berhasil, Anda akan diarahkan ke tab **"Tanya Jawab"**.
    *   Sebuah ringkasan otomatis dari konten dokumen atau teks yang Anda berikan akan ditampilkan di bagian atas halaman Q&A.
    *   Gunakan kolom chat untuk mengetik pertanyaan Anda mengenai isi konten tersebut (misalnya, "Apa poin utama dari dokumen ini?", "Siapa penulis artikel ini?", "Jelaskan konsep XYZ yang disebutkan dalam teks.").
    *   AI akan menjawab berdasarkan informasi yang terkandung dalam teks yang Anda berikan.

## 3. Evaluasi Dokumen dengan Referensi Internet

Fitur ini membantu Anda menilai kualitas sebuah dokumen dan mendapatkan referensi pendukung dari internet.

1.  **Akses Fitur Evaluasi**:
    *   Pilih tab **"Evaluasi"** pada navigasi bawah.

2.  **Input Dokumen untuk Evaluasi**:
    *   **Jika belum ada konten yang diproses**: Anda akan diminta untuk mengunggah file dokumen (PDF, DOCX, DOC, TXT) terlebih dahulu. Unggah file, dan teksnya akan diekstrak secara otomatis. Setelah itu, Anda dapat memulai evaluasi.
    *   **Jika konten sudah ada (dari Input Dokumen/Teks Langsung)**: Konten yang terakhir diproses akan otomatis tersedia untuk dievaluasi.

3.  **Mulai Proses Evaluasi**:
    *   Setelah konten tersedia, klik tombol **"Evaluasi dengan Referensi Internet"**.
    *   AI akan menganalisis teks Anda, memberikan penilaian mengenai kejelasan, kelengkapan, potensi bias, dan saran perbaikan.
    *   AI juga akan mencoba menemukan 2-4 sumber referensi valid dari internet (seperti artikel berita, jurnal ilmiah, laporan organisasi) yang relevan dengan topik utama teks Anda.

4.  **Lihat Hasil Evaluasi**:
    *   Hasil evaluasi akan ditampilkan, meliputi:
        *   Analisis kualitas teks.
        *   Saran-saran perbaikan yang konkret.
        *   Daftar sumber referensi dari internet beserta tautannya, dan penjelasan singkat bagaimana referensi tersebut berhubungan dengan teks Anda (mendukung, mengkontraskan, atau memberi konteks).

## Navigasi dan Fitur Umum

*   **Bilah Navigasi Bawah**: Gunakan ikon-ikon di bagian bawah layar untuk berpindah antar bagian utama aplikasi (Input, Ringkasan, Visualisasi, Wawasan, Tanya Jawab, Evaluasi, Panduan).
*   **Pesan Error**: Jika terjadi kesalahan selama pemrosesan atau interaksi dengan AI, pesan error akan muncul di bagian atas layar untuk memberi tahu Anda.
*   **Tombol "Ke Halaman Input"**: Jika Anda mencoba mengakses bagian yang memerlukan data atau konten yang belum diunggah, pesan akan muncul dengan tombol yang mengarahkan Anda kembali ke halaman Input.
*   **Toast Notifikasi**: Pesan singkat terkadang muncul di bagian atas untuk memberikan informasi atau status tertentu.

---
Semoga panduan ini membantu Anda memanfaatkan semua fitur aplikasi secara maksimal. Selamat mencoba!
`;


export const HowToUseGuide: React.FC<HowToUseGuideProps> = ({ onBack }) => {
  const MarkdownComponents = {
      h1: ({node, ...props}: any) => <h1 className="text-2xl font-bold my-4 text-blue-700 border-b pb-2 border-slate-300 flex items-center"><BookOpenIcon className="w-7 h-7 mr-3 text-blue-600" />{props.children}</h1>,
      h2: ({node, ...props}: any) => <h2 className="text-xl font-semibold my-3 text-slate-800 pt-2" {...props} />,
      h3: ({node, ...props}: any) => <h3 className="text-lg font-medium my-2 text-slate-700" {...props} />,
      p: ({node, ...props}: any) => <p className="my-2 leading-relaxed text-slate-700 text-sm" {...props} />,
      ul: ({node, ...props}: any) => <ul className="list-disc pl-6 my-2 space-y-1 text-slate-700 text-sm" {...props} />,
      ol: ({node, ...props}: any) => <ol className="list-decimal pl-6 my-2 space-y-1 text-slate-700 text-sm" {...props} />,
      li: ({node, ...props}: any) => <li className="text-slate-700 mb-1" {...props} />,
      strong: ({node, ...props}: any) => <strong className="font-semibold text-slate-800" {...props} />,
      em: ({node, ...props}: any) => <em className="italic text-slate-600" {...props} />,
      a: ({node, ...props}: any) => <a className="text-blue-600 hover:text-blue-700 underline" target="_blank" rel="noopener noreferrer" {...props} />,
      code: ({node, inline, className, children, ...props}: any) => {
        return !inline ? (
          <pre className={`my-2 p-2 rounded-md bg-slate-100 text-slate-800 font-mono overflow-x-auto text-xs border border-slate-200 ${className || ''}`} {...props}>
            <code>{String(children).replace(/\n$/, '')}</code>
          </pre>
        ) : (
          <code className="px-1 py-0.5 bg-slate-200 rounded text-xs text-pink-700 font-mono" {...props}>
            {children}
          </code>
        );
      },
      hr: ({node, ...props}: any) => <hr className="my-6 border-slate-300" {...props} />,
  };

  return (
    <div className="bg-white p-0 sm:p-0 rounded-lg shadow-none min-h-[calc(100vh-250px)]">
      <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none">
        <ReactMarkdown components={MarkdownComponents}>
          {guideContent}
        </ReactMarkdown>
      </div>
      <div className="mt-8 mb-4 text-center">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center px-6 py-3 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowLeftIcon className="-ml-1 mr-2 h-5 w-5 text-slate-600" />
          Kembali ke Aplikasi
        </button>
      </div>
    </div>
  );
};
