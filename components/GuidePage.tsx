
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeftIcon, LightBulbIcon } from '@heroicons/react/24/outline';

interface GuidePageProps {
  onBackToApp: () => void;
}

const guideContent = `
## Selamat Datang di Penganalisis & Evaluator Dokumen AI!
Aplikasi ini dirancang untuk membantu Anda menggali wawasan dari data, memahami dokumen, dan meningkatkan kualitas tulisan dengan bantuan AI.

### A. Navigasi Dasar Aplikasi
*   **Header (Bagian Atas):** Menampilkan judul aplikasi dan tombol **Panduan Penggunaan** (ikon tanda tanya) untuk kembali ke halaman ini.
*   **Area Konten Utama (Tengah):** Tempat semua interaksi dan tampilan fitur berlangsung.
*   **Menu Navigasi (Bagian Bawah Tetap):** Ikon-ikon ini adalah cara utama Anda berpindah antar bagian utama aplikasi:
    *   **Input:** Untuk memulai dengan mengunggah file atau memasukkan teks.
    *   **Ringkasan:** (Khusus data tabular) Menampilkan statistik dan sampel data Anda.
    *   **Visualisasi:** (Khusus data tabular) Membuat grafik dari data Anda.
    *   **Tanya Jawab (QA):** Berinteraksi dengan AI. Untuk data tabular, **wawasan otomatis akan muncul di sini**. Untuk dokumen/teks, ringkasan otomatis akan muncul di sini. Fitur pencarian internet juga ada di sini.
    *   **Evaluasi:** (Khusus dokumen/teks) Menganalisis kualitas tulisan dan mendapatkan referensi.
    *   *Catatan: Beberapa tombol menu mungkin tidak aktif jika belum ada data atau konten yang sesuai.*
*   **Banner Panduan (di bawah Header):** Jika Anda baru pertama kali, akan ada banner yang mengarahkan ke panduan ini.
*   **Modal Selamat Datang (saat kunjungan pertama):** Menawarkan opsi untuk langsung melihat panduan atau melanjutkan ke aplikasi.

### B. Memulai: Tab "Input"
Tab **Input** adalah titik awal Anda. Aplikasi memiliki dua mode utama yang bisa dipilih dari sini:

#### B.1. Mode Input: Dokumen atau Teks Langsung
Ini adalah mode default saat Anda pertama kali membuka tab Input.

*   **Mengunggah File Dokumen (PDF, DOCX, DOC, TXT):**
    1.  Pilih tab "Dokumen" (biasanya sudah aktif).
    2.  Gunakan area "Unggah file atau seret dan lepas" untuk memilih file dari komputer Anda.
    3.  **Format yang Didukung:** \`.pdf\`, \`.docx\`, \`.doc\`, \`.txt\`.
    4.  **Batas Ukuran:** Maksimum sekitar 25 MB.
    5.  **Catatan untuk \`.doc\`:** File Word versi lama (\`.doc\`) mungkin memiliki keterbatasan ekstraksi. Disarankan menggunakan \`.docx\` atau \`.pdf\` untuk hasil terbaik.
    6.  **Setelah Unggah & Proses:**
        *   Teks dari dokumen Anda akan diekstrak.
        *   Anda akan otomatis diarahkan ke tab **Tanya Jawab (QA)**.
        *   Ringkasan singkat dari dokumen (jika berhasil dibuat) akan muncul di bagian atas area chat QA.
        *   Anda dapat langsung bertanya tentang isi dokumen tersebut atau menggunakan fitur pencarian internet.
        *   Anda juga dapat langsung ke tab **Evaluasi** dari menu navigasi bawah untuk analisis lebih lanjut.

*   **Memasukkan Teks Langsung:**
    1.  Pilih tab "Teks Langsung".
    2.  Ketik atau tempel teks Anda ke dalam area yang tersedia.
    3.  **Batas Kata:** Maksimum sekitar 20.000 kata.
    4.  **Setelah Input & Proses:**
        *   Sama seperti unggah dokumen, Anda akan diarahkan ke tab **Tanya Jawab (QA)**.
        *   Ringkasan singkat dari teks (jika berhasil dibuat) akan muncul di area chat QA.
        *   Anda bisa bertanya tentang teks tersebut atau melakukan pencarian internet.
        *   Tab **Evaluasi** juga tersedia untuk analisis teks ini.

#### B.2. Mode Input: Data Tabular
1.  Pilih tab "Data Tabular".
2.  Gunakan area unggah untuk memilih file data dari komputer Anda.
3.  **Format yang Didukung:** \`.csv\`, \`.tsv\`, \`.xls\`, \`.xlsx\`.
4.  **Batas Ukuran:** Maksimum sekitar 25 MB.
5.  **Setelah Unggah & Proses:**
    *   Aplikasi akan menganalisis struktur data Anda (kolom, tipe data, statistik dasar).
    *   Setelah analisis, **wawasan otomatis akan dibuat oleh AI**.
    *   Anda akan otomatis diarahkan ke tab **Tanya Jawab (QA)**, di mana wawasan otomatis tersebut akan ditampilkan di bagian atas.
    *   Dari sini, Anda dapat menggunakan tab **Ringkasan** dan **Visualisasi** jika diperlukan, dan melanjutkan interaksi di tab **Tanya Jawab (QA)**.

### C. Fitur untuk Dokumen dan Teks Langsung

#### C.1. Tab Tanya Jawab (QA) - Mode Dokumen/Teks
*   **Konteks:** Setelah memproses dokumen atau teks dari tab Input, konten tersebut menjadi konteks aktif. Ringkasan otomatis (jika ada) akan ditampilkan di bagian atas.
*   **Bertanya tentang Konten:** Gunakan tombol **"Tanya Dokumen"** (atau "Tanya Teks") di bawah kolom input chat untuk pertanyaan spesifik mengenai isi dokumen/teks yang aktif. Contoh: "Apa poin utama teks ini?".
*   **Pencarian Internet:** Jika Anda mengetik pertanyaan di kolom input utama dan menekan Enter atau tombol **"Cari di Internet"**, AI akan mencari jawaban dari web (lihat bagian E).
*   **Info Tidak Ditemukan:** Jika AI tidak menemukan jawaban dalam dokumen/teks untuk pertanyaan kontekstual, ia akan memberitahu Anda dan mungkin menyarankan untuk mencoba pencarian internet (akan ada tombol "Cari di Internet" di pesan AI tersebut).

#### C.2. Tab Evaluasi
*   **Akses:** Bisa diakses setelah memproses dokumen/teks dari Input, atau Anda bisa mengunggah file baru langsung di sini.
*   **Konten Asli:** Jika ada dokumen/teks yang aktif, pratinjaunya akan ditampilkan.
*   **Proses Evaluasi:** Klik tombol **"Evaluasi dengan Referensi Internet"**.
*   **Hasil Evaluasi AI:**
    1.  **Analisis Kualitas Teks:** Penilaian tentang kejelasan, kelengkapan, potensi akurasi, dan bias.
    2.  **Saran Perbaikan:** Ide konkret untuk meningkatkan tulisan.
    3.  **Referensi Internet:** 2-4 tautan sumber dari internet yang relevan dengan topik utama, ditampilkan di akhir hasil evaluasi.
*   **Saran Pertanyaan Lanjutan:** Di bawah hasil evaluasi, akan ada tombol-tombol saran pertanyaan (lihat bagian F.1).

### D. Fitur untuk Data Tabular

#### D.1. Tab Ringkasan
*   **Informasi Umum:** Nama file, jumlah baris, jumlah kolom, dan estimasi ukuran.
*   **Detail Informasi Kolom:** Tabel yang menampilkan:
    *   Nama Kolom
    *   Tipe Data (number, string, boolean, date)
    *   Jumlah Data Hilang (dan persentasenya)
    *   Jumlah Nilai Unik
    *   Statistik (Mean, Median, Modus, Min, Max) - jika relevan untuk tipe datanya.
*   **Data Sampel:** Tabel yang menampilkan 10 baris pertama dari dataset Anda.

#### D.2. Tab Visualisasi
*   **Jenis Grafik:** Pilih dari berbagai jenis grafik seperti Bar, Line, Area, Pie, Doughnut, Scatter, dan Histogram.
*   **Pemilihan Kolom:**
    *   Pilih kolom untuk sumbu X dan Y (untuk grafik seperti Bar, Line, Scatter, Area).
    *   Pilih kolom kategori untuk grafik Pie atau Doughnut.
    *   Pilih kolom numerik untuk Histogram dan sesuaikan jumlah *bins* (kelompok data).
*   **Interaktif:** Grafik akan otomatis diperbarui saat Anda mengubah pilihan.

#### D.3. Tab Tanya Jawab (QA) - Mode Data Tabular (Termasuk Wawasan Otomatis)
*   **Wawasan Otomatis:** Setelah Anda mengunggah data tabular dan proses analisis selesai, **wawasan otomatis dari AI** akan langsung ditampilkan di bagian atas halaman Tanya Jawab. Ini memberikan temuan menarik, pola, atau anomali dari data Anda.
*   **Konteks:** Dataset yang Anda unggah menjadi konteks aktif.
*   **Bertanya tentang Data:** Gunakan tombol **"Tanya Dataset"** di bawah kolom input chat untuk pertanyaan spesifik tentang dataset. Contoh: "Berapa rata-rata kolom 'Penjualan'?", "Produk mana yang paling banyak terjual?".
*   **Perhitungan Dasar:** Sistem akan mencoba melakukan perhitungan statistik dasar (SUM, AVERAGE, dll.) jika diminta.
*   **Pencarian Internet:** Sama seperti mode dokumen, input utama dan tombol "Cari di Internet" akan menggunakan pencarian web (lihat bagian E).
*   **Info Tidak Ditemukan:** Jika AI tidak bisa menjawab pertanyaan dari data yang ada, ia akan memberitahu Anda dan mungkin menyarankan pencarian internet.

### E. Fitur Tanya Jawab (QA) Lanjutan - Pencarian Internet
Fitur ini tersedia di tab Tanya Jawab, baik saat ada konteks data/dokumen maupun tidak.

#### E.1. Cara Menggunakan:
*   **Pertanyaan Umum:** Ketik pertanyaan Anda di kolom input utama dan tekan Enter atau klik tombol **"Cari di Internet"**. Ini akan memicu pencarian internet.
*   **Pertanyaan Kontekstual:** Jika pertanyaan Anda spesifik untuk data atau dokumen yang sedang aktif, gunakan tombol **"Tanya Dataset"** atau **"Tanya Dokumen"**. Jika AI tidak menemukan jawaban di konteks, ia mungkin memberi opsi untuk mencari di internet.

#### E.2. Jenis Hasil Pencarian Internet:
*   **Pencarian Percakapan (untuk pertanyaan umum):**
    *   AI akan menjawab dalam format naratif yang mengalir.
    *   Jika AI menggunakan informasi dari sumber spesifik, ia akan mencoba **menyematkan tautan ke sumber tersebut secara alami dalam kalimat** (contoh: "Menurut [Wikipedia](URL)..., ..."). Tautan ini bisa diklik dan membuka tab baru.
    *   Daftar **"Sumber Tambahan yang Digunakan AI:"** juga akan muncul di bawah jawaban AI, berisi tautan mentah yang diakses AI.
*   **Pencarian Terstruktur (jika pertanyaan diawali "cari..." atau "carikan..."):**
    *   Contoh: "Carikan artikel tentang manfaat olahraga."
    *   AI akan memberikan daftar sumber yang lebih terstruktur, masing-masing berisi:
        *   **Judul Halaman Web.**
        *   **Tautan Asli:** Tautan langsung yang bisa diklik ke sumbernya.
        *   **Ringkasan Detail:** Penjelasan singkat konten halaman, dengan bagian penting yang mungkin **ditebalkan**.
    *   Daftar **"Sumber Tambahan yang Digunakan AI:"** juga akan muncul.

### F. Fitur Interaktif Umum di Seluruh Aplikasi

#### F.1. Saran Pertanyaan Lanjutan
*   **Tampilan:** Setelah hampir setiap respons AI (ringkasan, QA kontekstual, wawasan, evaluasi, dan semua jenis pencarian internet), akan muncul **pesan AI kedua yang terpisah**. Pesan ini berisi beberapa tombol **"Saran Pertanyaan Lanjutan"**.
*   **Fungsi:** Klik salah satu tombol saran untuk langsung mengirimkannya sebagai pertanyaan baru. Pertanyaan ini umumnya akan dijawab menggunakan pencarian internet.
*   **Tampilan Teks Saran:** Saran pertanyaan ditampilkan sebagai teks biasa tanpa format tebal atau poin.

#### F.2. Tombol "Sederhanakan"
*   **Kapan Muncul:** Jika jawaban AI (misalnya dari hasil analisis, evaluasi, atau bahkan pencarian internet) dirasa cukup panjang atau kompleks, tombol **"Sederhanakan"** mungkin muncul di bawah pesan AI tersebut.
*   **Fungsi:** Klik tombol ini, dan AI akan mencoba menyajikan ulang informasi tersebut dalam bahasa yang lebih ringkas dan mudah dipahami, beserta saran pertanyaan baru.

#### F.3. Penanganan Error
*   Jika terjadi masalah (misalnya, file gagal diproses, API gagal), pesan kesalahan akan muncul di bagian atas layar aplikasi, berwarna merah.
*   Anda dapat menutup pesan error dengan mengklik ikon silang (X).

#### F.4. Notifikasi Toast
*   Untuk beberapa aksi atau peringatan (misalnya, mencoba mengakses tab yang memerlukan data padahal data belum ada), notifikasi singkat (toast) mungkin muncul di bagian atas layar. Beberapa notifikasi mungkin memiliki tombol aksi, seperti "Ke Halaman Input".

### G. Tips Penggunaan & Catatan Tambahan
*   **API Key:** Anda tidak perlu mengatur API Key, aplikasi ini sudah dikonfigurasi secara internal.
*   **Kesabaran:** Proses AI seperti analisis data, evaluasi mendalam, atau pencarian internet yang kompleks mungkin memerlukan beberapa detik. Mohon tunggu hingga proses selesai.
*   **Teks Tebal:** Teks yang **ditebalkan** oleh AI dalam jawabannya hanya akan ditampilkan tebal standar tanpa warna atau latar belakang khusus.

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
