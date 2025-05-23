import React, { useState, useCallback, ChangeEvent } from 'react';
import { ArrowUpTrayIcon, DocumentPlusIcon, PencilIcon, CheckCircleIcon, InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Spinner } from './common/Spinner';
import { ParsedCsvData } from '../types';
import { parseCSV, parseExcel, extractTextFromFile } from '../services/dataAnalysisService';

type InputMode = 'tabular' | 'document' | 'directText';

interface InputSectionProps {
  onTabularFileProcessed: (file: File, parsedData: ParsedCsvData) => void;
  onDocumentOrTextProcessed: (text: string, sourceName: string) => void;
  isLoading: boolean;
  loadingMessage: string;
  setExternalError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setLoadingMessage: (message: string) => void;
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
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [wordCount, setWordCount] = useState<number>(0);
  const [showDocxSimulationWarning, setShowDocxSimulationWarning] = useState<boolean>(false);

  const MAX_WORDS = 2000;
  const MAX_FILE_SIZE_TABULAR = 10 * 1024 * 1024; // 10MB
  const MAX_FILE_SIZE_DOCUMENT = 5 * 1024 * 1024; // 5MB (PDFs can be larger, but text content is key)

  const resetInputFields = () => {
    setSelectedFile(null);
    setDirectText('');
    setWordCount(0);
    setExternalError(null);
    setShowDocxSimulationWarning(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      let maxSize = activeMode === 'tabular' ? MAX_FILE_SIZE_TABULAR : MAX_FILE_SIZE_DOCUMENT;
      if (file.size > maxSize) {
        setExternalError(`Ukuran file melebihi batas maksimum (${(maxSize / (1024*1024)).toFixed(0)}MB).`);
        setSelectedFile(null);
        setShowDocxSimulationWarning(false);
        if (event.target) event.target.value = ''; // Reset file input
        return;
      }
      setSelectedFile(file);
      setExternalError(null); 
      
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (activeMode === 'document' && fileExtension === 'docx') {
        setShowDocxSimulationWarning(true);
      } else {
        setShowDocxSimulationWarning(false);
      }
    }
  };

  const handleDirectTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = event.target.value;
    setDirectText(text);
    const words = text.trim().split(/\s+/).filter(Boolean);
    setWordCount(words.length);
    if (words.length > MAX_WORDS) {
      setExternalError(`Input teks melebihi batas maksimum ${MAX_WORDS} kata.`);
    } else {
      setExternalError(null);
    }
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

      if (parsed.rows.length === 0) {
        throw new Error("File tabular kosong atau gagal diparsing.");
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
        setExternalError(`Input teks melebihi batas maksimum ${MAX_WORDS} kata.`);
        return;
      }
      setIsLoading(true); 
      setLoadingMessage("Memproses teks input...");
      setExternalError(null);
      onDocumentOrTextProcessed(directText, "Teks Langsung");
    }
  };
  
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    if (isLoading) return;
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      const file = event.dataTransfer.files[0];
      let maxSize = activeMode === 'tabular' ? MAX_FILE_SIZE_TABULAR : MAX_FILE_SIZE_DOCUMENT;
      if (file.size > maxSize) {
        setExternalError(`Ukuran file melebihi batas maksimum (${(maxSize / (1024*1024)).toFixed(0)}MB).`);
        setSelectedFile(null);
        setShowDocxSimulationWarning(false);
        return;
      }
      setSelectedFile(file);
      setExternalError(null);

      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (activeMode === 'document' && fileExtension === 'docx') {
        setShowDocxSimulationWarning(true);
      } else {
        setShowDocxSimulationWarning(false);
      }
    }
  }, [isLoading, activeMode, onTabularFileProcessed, onDocumentOrTextProcessed]); // Dependencies updated

  const acceptedFileTypes = {
    tabular: ".csv,.tsv,.xls,.xlsx",
    document: ".pdf,.doc,.docx,.txt", // .doc tidak benar-benar didukung
    directText: "" 
  };

  const modeConfigs = {
    tabular: {
      title: "Analisis Data Tabular",
      icon: ArrowUpTrayIcon,
      description: "Unggah file CSV, TSV, atau Excel Anda untuk dianalisis.",
      fileTypesText: ".csv, .tsv, .xls, .xlsx. Maks: 10MB.",
      uploadButtonText: "Proses File Tabular",
    },
    document: {
      title: "Ringkasan & Tanya Jawab Dokumen",
      icon: DocumentPlusIcon,
      description: "Unggah file PDF, DOCX, atau TXT untuk diringkas dan ditanyai.",
      fileTypesText: ".pdf, .docx, .txt. Maks: 5MB.",
      uploadButtonText: "Proses File Dokumen",
    },
    directText: {
      title: "Ringkasan & Tanya Jawab Teks Langsung",
      icon: PencilIcon,
      description: `Ketik atau tempel teks Anda di bawah ini (maks. ${MAX_WORDS} kata).`,
      fileTypesText: "",
      uploadButtonText: "Proses Teks",
    }
  };
  
  const currentConfig = modeConfigs[activeMode];

  return (
    <div className="space-y-8">
      <div className="flex space-x-1 sm:space-x-2 rounded-lg bg-slate-700 p-1 shadow-md">
        {(Object.keys(modeConfigs) as InputMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => { setActiveMode(mode); resetInputFields();}}
            className={`w-full px-3 py-2.5 text-sm font-medium leading-5 rounded-md
                        focus:outline-none focus:ring-2 ring-offset-2 ring-offset-slate-700 ring-primary-500
                        transition-all duration-150
                        ${activeMode === mode 
                          ? 'bg-primary-600 text-white shadow-lg' 
                          : 'text-slate-300 hover:bg-slate-600/70 hover:text-slate-100'}`}
          >
            {modeConfigs[mode].title}
          </button>
        ))}
      </div>

      <div className="bg-slate-700 p-6 sm:p-8 rounded-xl shadow-xl">
        <div className="flex items-center text-2xl font-semibold mb-2 text-slate-100">
          <currentConfig.icon className="h-8 w-8 mr-3 text-primary-400" />
          <h2>{currentConfig.title}</h2>
        </div>
        <p className="text-slate-400 mb-6 text-sm">{currentConfig.description}</p>

        {activeMode === 'tabular' || activeMode === 'document' ? (
          <>
            {showDocxSimulationWarning && selectedFile && activeMode === 'document' && (
              <div className="mb-4 p-3 bg-yellow-600/20 border border-yellow-500 text-yellow-300 rounded-lg text-sm flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0"/>
                <div>
                    <strong>Perhatian:</strong> Pemrosesan file <strong>.docx</strong> saat ini disimulasikan.
                    Ringkasan dan tanya jawab akan didasarkan pada konten placeholder. 
                    Untuk hasil terbaik dengan analisis dokumen, gunakan file <strong>.txt</strong>, <strong>.pdf</strong>, atau <strong>input teks langsung</strong>.
                </div>
              </div>
            )}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`mt-4 border-2 border-dashed rounded-lg p-6 sm:p-10 text-center transition-all duration-200 ease-in-out group
                          ${dragOver 
                            ? 'border-primary-500 bg-slate-600/50 scale-102 shadow-inner' 
                            : 'border-slate-500 hover:border-primary-400 bg-slate-650'}`}
              role="button"
              tabIndex={0}
              aria-label={`Seret & lepas file ${currentConfig.fileTypesText} atau klik untuk memilih`}
            >
              <ArrowUpTrayIcon className={`h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 transition-colors duration-200 ${dragOver ? 'text-primary-400' : 'text-slate-400 group-hover:text-primary-300'}`} />
              <input
                type="file"
                accept={acceptedFileTypes[activeMode]}
                onChange={handleFileChange}
                id={`fileInput-${activeMode}`}
                className="sr-only"
                disabled={isLoading}
              />
              <label
                htmlFor={`fileInput-${activeMode}`}
                className="cursor-pointer text-primary-400 hover:text-primary-300 font-medium text-base sm:text-lg"
              >
                Seret & lepas file di sini
              </label>
              <p className="text-slate-400 mt-1 text-xs sm:text-sm">atau klik untuk memilih file</p>
              <p className="mt-3 text-xs text-slate-500">Tipe file yang didukung: {currentConfig.fileTypesText}</p>
              
              {selectedFile && !isLoading && (
                <div className="mt-4 text-sm text-green-400 flex items-center justify-center bg-slate-700/50 p-2 rounded-md">
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  <span>Terpilih: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>
            {selectedFile && !isLoading && (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="mt-8 w-full sm:w-auto px-10 py-3 bg-primary-600 text-white font-semibold rounded-lg shadow-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center mx-auto transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
              >
                {currentConfig.uploadButtonText}
              </button>
            )}
          </>
        ) : (
          <div className="mt-4">
            <textarea
              value={directText}
              onChange={handleDirectTextChange}
              placeholder="Ketik atau tempel teks di sini..."
              className="w-full h-48 sm:h-60 p-4 bg-slate-600 border border-slate-500 rounded-lg text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all duration-150 shadow-sm resize-y"
              disabled={isLoading}
              aria-label="Area input teks langsung"
            ></textarea>
            <div className="flex justify-between items-center mt-2 text-sm">
              <p className={`text-xs ${wordCount > MAX_WORDS ? 'text-red-400' : 'text-slate-400'}`}>
                Jumlah kata: {wordCount} / {MAX_WORDS}
              </p>
              <button
                onClick={handleSubmit}
                disabled={isLoading || directText.trim() === '' || wordCount > MAX_WORDS}
                className="px-8 py-2.5 bg-primary-600 text-white font-semibold rounded-lg shadow-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
              >
                {currentConfig.uploadButtonText}
              </button>
            </div>
          </div>
        )}
        
        {isLoading && (
          <div className="mt-8 flex flex-col items-center justify-center text-center">
            <Spinner size="md" color="text-primary-400" />
            <p className="mt-3 text-slate-300 text-sm">{loadingMessage}</p>
          </div>
        )}
        
        {(activeMode === 'tabular' || activeMode === 'document') && !selectedFile && !isLoading && (
            <div className="mt-6 p-3 bg-sky-700/20 border border-sky-600 rounded-lg text-sm text-sky-300 flex items-start">
                <InformationCircleIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0"/>
                <span>Untuk memulai, silakan pilih atau seret file ke area di atas sesuai dengan tipe yang diinginkan.</span>
            </div>
        )}
      </div>
    </div>
  );
};