
import React, { useState, useCallback, useRef, ChangeEvent } from 'react';
import { ParsedCsvData } from '../types';
import { parseCSV, parseExcel, extractTextFromFile, fetchWebsiteContent } from '../services/dataAnalysisService';

import {
  ArrowUpTrayIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  LinkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  DocumentDuplicateIcon, 
  DocumentChartBarIcon, 
  SparklesIcon 
} from '@heroicons/react/24/outline';


type InputMode = 'tabular' | 'document' | 'directText' | 'website';

interface InputSectionProps {
  onTabularFileProcessed: (file: File, parsedData: ParsedCsvData) => void;
  onDocumentOrTextProcessed: (text: string, sourceName: string) => void;
  isLoading: boolean;
  loadingMessage: string;
  setExternalError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setLoadingMessage: (message: string) => void;
}

interface ModeConfig {
  key: InputMode;
  title: string;
  icon: React.ElementType;
  description: string;
  fileTypesText?: string;
  submitButtonText: string;
  acceptAttr?: string;
}

export const InputSection: React.FC<InputSectionProps> = ({
  onTabularFileProcessed,
  onDocumentOrTextProcessed,
  isLoading,
  loadingMessage,
  setExternalError,
  setIsLoading,
  setLoadingMessage,
}) => {
  const [activeMode, setActiveMode] = useState<InputMode>('tabular');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [directText, setDirectText] = useState<string>('');
  const [websiteUrl, setWebsiteUrl] = useState<string>('');
  const [wordCount, setWordCount] = useState<number>(0);
  const [showDocxSimulationWarning, setShowDocxSimulationWarning] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_WORDS = 20000;
  const MAX_FILE_SIZE_TABULAR = 15 * 1024 * 1024; // 15MB
  const MAX_FILE_SIZE_DOCUMENT = 10 * 1024 * 1024; // 10MB

  const resetInputFields = () => {
    setSelectedFile(null);
    setDirectText('');
    setWebsiteUrl('');
    setWordCount(0);
    setExternalError(null);
    setShowDocxSimulationWarning(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; 
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setExternalError(null);
    setShowDocxSimulationWarning(false);
    const file = event.target.files?.[0];

    if (file) {
      const maxSize = activeMode === 'tabular' ? MAX_FILE_SIZE_TABULAR : MAX_FILE_SIZE_DOCUMENT;
      if (file.size > maxSize) {
        setExternalError(`Ukuran file melebihi batas maksimum (${(maxSize / (1024 * 1024)).toFixed(0)}MB).`);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setSelectedFile(file);
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (activeMode === 'document' && fileExtension === 'docx') {
        setShowDocxSimulationWarning(true);
      }
    } else {
      setSelectedFile(null);
    }
  };
  
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setExternalError(null);
    setShowDocxSimulationWarning(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileIcon = (fileName: string): React.ElementType => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'csv': case 'tsv': case 'xls': case 'xlsx':
        return DocumentDuplicateIcon; 
      case 'pdf':
        return DocumentChartBarIcon; 
      case 'docx':
        return SparklesIcon; 
      case 'txt':
        return DocumentTextIcon;
      default:
        return DocumentTextIcon; 
    }
  };

  const handleDirectTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = event.target.value;
    setDirectText(text);
    const words = text.trim().split(/\s+/).filter(Boolean);
    setWordCount(words.length);
    if (words.length > MAX_WORDS) {
      setExternalError(`Input teks melebihi batas maksimum ${MAX_WORDS.toLocaleString('id-ID')} kata.`);
    } else {
      setExternalError(null);
    }
  };

  const handleWebsiteUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setWebsiteUrl(event.target.value);
    setExternalError(null);
  };

  const processTabularFile = async (file: File) => {
    setIsLoading(true);
    setLoadingMessage(`Memproses file tabular ${file.name}...`);
    setExternalError(null);
    try {
      let parsed: ParsedCsvData;
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const fileText = await file.text();

      if (fileExtension === 'csv') {
        const { headers, rows } = parseCSV(fileText, ',');
        parsed = { headers, rows, columnInfos: [], rowCount: rows.length, columnCount: headers.length, sampleRows: [], fileName: file.name };
      } else if (fileExtension === 'tsv') {
        const { headers, rows } = parseCSV(fileText, '\t');
        parsed = { headers, rows, columnInfos: [], rowCount: rows.length, columnCount: headers.length, sampleRows: [], fileName: file.name };
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        parsed = await parseExcel(file); 
      } else {
        throw new Error("Tipe file tabular tidak didukung.");
      }

      if (parsed.rows.length === 0 && parsed.headers.length === 0) {
        throw new Error("File tabular kosong atau gagal diparsing. Pastikan format file benar dan tidak kosong.");
      }
      onTabularFileProcessed(file, parsed);
    } catch (e) {
      console.error("Error processing tabular file:", e);
      setExternalError(`Gagal memproses file tabular: ${e instanceof Error ? e.message : String(e)}`);
      setIsLoading(false);
    }
  };
  
  const processDocumentFile = async (file: File) => {
    setIsLoading(true);
    setLoadingMessage(`Mengekstrak teks dari ${file.name}...`);
    setExternalError(null);
    try {
      const textContent = await extractTextFromFile(file);
      onDocumentOrTextProcessed(textContent, file.name);
    } catch (e) {
      console.error("Error processing document file:", e);
      setExternalError(`Gagal memproses file dokumen: ${e instanceof Error ? e.message : String(e)}`);
      setIsLoading(false);
    }
  };

  const processWebsiteUrl = async (url: string) => {
    if (!url.trim() || !url.trim().toLowerCase().startsWith('http')) {
        setExternalError("Silakan masukkan URL yang valid (dimulai dengan http:// atau https://).");
        return;
    }
    setIsLoading(true);
    setLoadingMessage(`Mengambil dan memproses konten dari ${url}...`);
    setExternalError(null);
    try {
        const textContent = await fetchWebsiteContent(url);
        if (!textContent.trim()) {
          throw new Error("Tidak ada konten teks yang dapat diekstrak dari URL ini atau website kosong.");
        }
        onDocumentOrTextProcessed(textContent, url);
    } catch (e) {
        console.error("Error processing website URL:", e);
        let displayErrorMessage;
        if (e instanceof Error) {
            if (e.message.includes("Gagal mengambil data dari URL") || e.message.includes("Gagal mengambil konten dari URL") || e.message.includes("CORS") || e.message.includes("proxy")) {
                displayErrorMessage = e.message;
            } else {
                displayErrorMessage = `Gagal memproses URL: ${e.message}. Pertimbangkan bahwa ini mungkin disebabkan oleh kebijakan CORS, masalah jaringan, atau website yang tidak dapat diakses. Anda dapat mencoba menyalin teks dari website secara manual dan menggunakan mode 'Teks Langsung'.`;
            }
        } else {
            displayErrorMessage = `Gagal memproses URL: ${String(e)}. Pertimbangkan bahwa ini mungkin disebabkan oleh kebijakan CORS, masalah jaringan, atau website yang tidak dapat diakses. Anda dapat mencoba menyalin teks dari website secara manual dan menggunakan mode 'Teks Langsung'.`;
        }
        setExternalError(displayErrorMessage);
        setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (activeMode === 'tabular' && selectedFile) {
      await processTabularFile(selectedFile);
    } else if (activeMode === 'document' && selectedFile) {
      await processDocumentFile(selectedFile);
    } else if (activeMode === 'directText') {
      if (directText.trim() === '') {
        setExternalError("Input teks tidak boleh kosong.");
        return;
      }
      if (wordCount > MAX_WORDS) {
        setExternalError(`Input teks melebihi batas maksimum ${MAX_WORDS.toLocaleString('id-ID')} kata.`);
        return;
      }
      setIsLoading(true);
      setLoadingMessage("Memproses teks input...");
      setExternalError(null);
      onDocumentOrTextProcessed(directText, "Teks Langsung");
    } else if (activeMode === 'website' && websiteUrl) {
      await processWebsiteUrl(websiteUrl);
    }
  };

  const modeConfigs: ModeConfig[] = [
    {
      key: 'tabular', title: "Data Tabular", icon: DocumentDuplicateIcon,
      description: "Unggah file CSV, TSV, atau Excel Anda untuk dianalisis.",
      fileTypesText: `.csv, .tsv, .xls, .xlsx. Maks: ${(MAX_FILE_SIZE_TABULAR / (1024*1024)).toFixed(0)}MB.`,
      submitButtonText: "Proses File Tabular",
      acceptAttr: ".csv,.tsv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/tab-separated-values",
    },
    {
      key: 'document', title: "Dokumen", icon: DocumentChartBarIcon,
      description: "Unggah file PDF, DOCX (simulasi), atau TXT untuk diringkas dan ditanyai.",
      fileTypesText: `.pdf, .docx (simulasi), .txt. Maks: ${(MAX_FILE_SIZE_DOCUMENT / (1024*1024)).toFixed(0)}MB.`,
      submitButtonText: "Proses File Dokumen",
      acceptAttr: ".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain",
    },
    {
      key: 'directText', title: "Teks Langsung", icon: PencilSquareIcon,
      description: `Ketik atau tempel teks Anda di bawah ini (maks. ${MAX_WORDS.toLocaleString('id-ID')} kata).`,
      submitButtonText: "Proses Teks",
    },
    {
      key: 'website', title: "URL Website", icon: LinkIcon,
      description: "Masukkan URL website untuk diringkas dan ditanyai. Fitur ini memiliki keterbatasan (CORS, konten dinamis) dan mungkin tidak berfungsi untuk semua website.",
      submitButtonText: "Proses URL",
    }
  ];

  const currentConfig = modeConfigs.find(mc => mc.key === activeMode)!;
  const SelectedFileIcon = selectedFile ? getFileIcon(selectedFile.name) : null;


  return (
    <div className="w-full">
      <div className="mb-6 border-b border-slate-200">
        <nav className="-mb-px flex flex-wrap gap-x-1 gap-y-1 sm:gap-x-2" aria-label="Tabs">
          {modeConfigs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveMode(tab.key); resetInputFields(); }}
              className={`
                py-2 px-2 text-xs sm:py-2.5 sm:px-3 sm:text-sm 
                border-b-2 font-medium transition-colors duration-150 flex items-center space-x-1 sm:space-x-1.5
                ${activeMode === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              aria-current={activeMode === tab.key ? 'page' : undefined}
            >
              <tab.icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>{tab.title}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-2">
        <div className="flex items-center space-x-2 mb-1">
            <currentConfig.icon className="w-7 h-7 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-800">{currentConfig.title}</h2>
        </div>
        <p className="text-sm text-slate-600 mb-6">{currentConfig.description}</p>

        {activeMode === 'tabular' || activeMode === 'document' ? (
          <>
            {showDocxSimulationWarning && selectedFile && activeMode === 'document' && (
                <div className="my-4 p-3 rounded-md bg-yellow-50 border border-yellow-300 text-yellow-700 flex items-start space-x-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-sm">Perhatian</h3>
                        <p className="text-xs">Pemrosesan file .docx saat ini disimulasikan. Ringkasan dan tanya jawab akan didasarkan pada konten placeholder. Untuk hasil terbaik, gunakan file .txt, .pdf, atau input teks langsung.</p>
                    </div>
                </div>
            )}
            <label
              htmlFor="file-upload"
              className={`mt-2 flex justify-center items-center w-full h-48 px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md cursor-pointer
                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 bg-slate-50'}`}
            >
              <div className="space-y-1 text-center">
                <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-slate-400" />
                <div className="flex text-sm text-slate-600">
                  <span className="relative font-medium text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                    Unggah file
                  </span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" ref={fileInputRef} onChange={handleFileChange} accept={currentConfig.acceptAttr} disabled={isLoading} />
                  <p className="pl-1">atau seret dan lepas</p>
                </div>
                <p className="text-xs text-slate-500">{currentConfig.fileTypesText}</p>
              </div>
            </label>

            {selectedFile && !isLoading && (
              <div className="mt-4 p-3 border border-slate-200 rounded-md bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {SelectedFileIcon && <SelectedFileIcon className="h-8 w-8 text-blue-500" />}
                    <div>
                      <p className="text-sm font-medium text-slate-700 truncate max-w-xs sm:max-w-md">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleRemoveFile} 
                    className="p-1 text-slate-400 hover:text-red-500 rounded-full"
                    aria-label="Hapus file"
                    title="Hapus file"
                  >
                    <XCircleIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
            {selectedFile && !isLoading && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="mt-6 w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {currentConfig.submitButtonText}
              </button>
            )}
          </>
        ) : activeMode === 'directText' ? (
          <div className="mt-1">
            <textarea
              value={directText}
              onChange={handleDirectTextChange}
              placeholder="Ketik atau tempel teks di sini..."
              rows={8}
              disabled={isLoading}
              className="block w-full shadow-sm sm:text-sm border-slate-300 rounded-md bg-white text-slate-900 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="mt-2 flex justify-between items-center">
              <p className={`text-xs ${wordCount > MAX_WORDS ? 'text-red-600' : 'text-slate-500'}`}>
                Jumlah kata: {wordCount.toLocaleString('id-ID')} / {MAX_WORDS.toLocaleString('id-ID')}
              </p>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || directText.trim() === '' || wordCount > MAX_WORDS}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {currentConfig.submitButtonText}
              </button>
            </div>
          </div>
        ) : activeMode === 'website' ? (
          <div className="mt-1">
            <input
              type="url"
              value={websiteUrl}
              onChange={handleWebsiteUrlChange}
              placeholder="Contoh: https://www.example.com/article"
              disabled={isLoading}
              className="block w-full shadow-sm sm:text-sm border-slate-300 rounded-md bg-white text-slate-900 focus:ring-blue-500 focus:border-blue-500 py-2.5 px-3"
            />
             <div className="mt-3 p-3 rounded-md bg-blue-50 border border-blue-200 text-blue-700 flex items-start space-x-2">
                <InformationCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs">Pengambilan konten website memiliki keterbatasan (misalnya karena CORS atau konten dinamis) dan mungkin tidak berfungsi untuk semua website. Jika gagal, coba salin teks dari website secara manual ke mode 'Teks Langsung'.</p>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || websiteUrl.trim() === ''}
              className="mt-6 w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {currentConfig.submitButtonText}
            </button>
          </div>
        ) : null}

        {isLoading && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center space-x-2 text-slate-600">
              <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{loadingMessage}</span>
            </div>
          </div>
        )}

        {(activeMode === 'tabular' || activeMode === 'document') && !selectedFile && !isLoading && (
           <div className="mt-4 p-3 rounded-md bg-blue-50 border border-blue-200 text-blue-700 flex items-start space-x-2">
              <InformationCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs">Untuk memulai, silakan pilih atau seret file ke area di atas sesuai dengan tipe yang diinginkan.</p>
          </div>
        )}
         {activeMode === 'website' && !websiteUrl && !isLoading && (
             <div className="mt-4 p-3 rounded-md bg-blue-50 border border-blue-200 text-blue-700 flex items-start space-x-2">
                <InformationCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs">Untuk memulai, masukkan URL website yang valid pada kolom di atas.</p>
            </div>
        )}
      </div>
    </div>
  );
};