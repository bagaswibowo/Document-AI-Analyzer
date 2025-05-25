
import React, { useState, useRef, ChangeEvent, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
    ClipboardDocumentCheckIcon, 
    InformationCircleIcon, 
    MagnifyingGlassIcon,
    ArrowUpTrayIcon,
    DocumentTextIcon as FileIconGeneric, 
    DocumentDuplicateIcon as DocxFileIcon, 
    DocumentChartBarIcon as PdfFileIcon, 
    XCircleIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { extractTextFromFile } from '../services/dataAnalysisService';

interface DocumentEvaluatorProps {
  originalContent: string | null; 
  onEvaluate: () => Promise<{ mainText: string; suggestedQuestions?: string[], sources?: Array<{ uri: string; title: string }> }>;
  isLoading: boolean; 
  evaluationResult: string | null;
  evaluationSuggestions?: string[];
  evaluationSources?: Array<{ uri: string; title: string }>;
  sourceIdentifier?: string;
  onDocumentUploadedAndProcessed: (text: string, sourceName: string, navigateToEvaluation?: boolean) => void;
  setAppIsLoading: (loading: boolean) => void;
  setAppLoadingMessage: (message: string) => void;
  setAppError: (error: string | null) => void;
  onSuggestedQuestionClick?: (question: string) => void;
}

const MAX_FILE_SIZE_DOCUMENT = 25 * 1024 * 1024; 

export const DocumentEvaluator: React.FC<DocumentEvaluatorProps> = ({
  originalContent,
  onEvaluate,
  isLoading,
  evaluationResult,
  evaluationSuggestions,
  // evaluationSources, // Sources are now part of evaluationResult text from AI service
  sourceIdentifier,
  onDocumentUploadedAndProcessed,
  setAppIsLoading,
  setAppLoadingMessage,
  setAppError,
  onSuggestedQuestionClick,
}) => {
  const [internalSelectedFile, setInternalSelectedFile] = useState<File | null>(null);
  const [internalFileError, setInternalFileError] = useState<string | null>(null);
  const [isProcessingInternalFile, setIsProcessingInternalFile] = useState<boolean>(false);
  const internalFileInputRef = useRef<HTMLInputElement>(null);
   const [docxWarning, setDocxWarning] = useState<boolean>(false);


  const MarkdownComponents = {
      h1: ({node, ...props}: any) => <h1 className="text-2xl font-bold my-4 text-blue-600 border-b pb-2 border-slate-300" {...props} />,
      h2: ({node, ...props}: any) => <h2 className="text-xl font-semibold my-3 text-slate-700" {...props} />,
      h3: ({node, ...props}: any) => <h3 className="text-lg font-medium my-2 text-slate-600" {...props} />,
      p: ({node, ...props}: any) => <p className="my-2 leading-relaxed text-slate-700" {...props} />,
      ul: ({node, ...props}: any) => <ul className="list-disc pl-5 my-2 space-y-1 text-slate-700" {...props} />,
      ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 my-2 space-y-1 text-slate-700" {...props} />,
      li: ({node, ...props}: any) => <li className="text-slate-700" {...props} />,
      strong: ({node, ...props}: any) => <strong className="font-semibold text-current" {...props} />,
      em: ({node, ...props}: any) => <em className="italic text-slate-600" {...props} />,
      a: ({node, ...props}: any) => <a className="text-blue-600 hover:text-blue-700 underline" target="_blank" rel="noopener noreferrer" {...props} />,
      code: ({node, inline, className, children, ...props}: any) => {
        const match = /language-(\w+)/.exec(className || '');
        return !inline ? (
          <pre className={`my-3 p-3 rounded-md bg-slate-100 overflow-x-auto text-sm ${className || ''}`} {...props}>
            <code className={`language-${match ? match[1] : 'text'}`}>{String(children).replace(/\n$/, '')}</code>
          </pre>
        ) : (
          <code className="px-1 py-0.5 bg-slate-200 rounded text-sm text-pink-600" {...props}>
            {children}
          </code>
        );
      },
      blockquote: ({node, ...props}: any) => <blockquote className="my-2 pl-4 border-l-4 border-slate-300 italic text-slate-600" {...props} />,
      hr: ({node, ...props}: any) => <hr className="my-4 border-slate-300" {...props} />,
  };
  
  const getContextName = () => {
    if (sourceIdentifier?.toLowerCase().startsWith('http')) {
        try { return `Website (${new URL(sourceIdentifier).hostname})`; }
        catch { return sourceIdentifier || 'URL Anda';}
    }
    return sourceIdentifier || 'Dokumen/Teks Anda';
  };

  const handleInternalFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setAppError(null); 
    setInternalFileError(null);
    setDocxWarning(false);
    const file = event.target.files?.[0];

    if (file) {
      if (file.size > MAX_FILE_SIZE_DOCUMENT) {
        setInternalFileError(`Ukuran file melebihi batas maksimum (${(MAX_FILE_SIZE_DOCUMENT / (1024 * 1024)).toFixed(0)} MB).`);
        setInternalSelectedFile(null);
        if (internalFileInputRef.current) internalFileInputRef.current.value = "";
        return;
      }
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension === 'doc') { 
          setDocxWarning(true);
      }
      setInternalSelectedFile(file);
    } else {
      setInternalSelectedFile(null);
    }
  };

  const handleRemoveInternalFile = () => {
    setInternalSelectedFile(null);
    setInternalFileError(null);
    setDocxWarning(false);
    if (internalFileInputRef.current) {
      internalFileInputRef.current.value = "";
    }
  };

  const getDisplayFileIconElement = (fileName: string): React.ElementType => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return PdfFileIcon;
      case 'docx': case 'doc': return DocxFileIcon;
      case 'txt': return FileIconGeneric;
      default: return FileIconGeneric;
    }
  };
   const getDisplayFileIconColor = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'text-red-500';
      case 'docx': case 'doc': return 'text-blue-500';
      case 'txt': return 'text-slate-500';
      default: return 'text-gray-500';
    }
  };

  const SelectedInternalFileIconElement = internalSelectedFile ? getDisplayFileIconElement(internalSelectedFile.name) : null;
  const selectedInternalFileIconColor = internalSelectedFile ? getDisplayFileIconColor(internalSelectedFile.name) : 'text-gray-500';


  const handleProcessInternalFile = useCallback(async () => {
    if (!internalSelectedFile) {
      setInternalFileError("Tidak ada file yang dipilih.");
      return;
    }
    setInternalFileError(null);
    setAppError(null); 
    setIsProcessingInternalFile(true); 
    setAppIsLoading(true); 
    setAppLoadingMessage(`Mengekstrak teks dari ${internalSelectedFile.name}...`);

    try {
      const textContent = await extractTextFromFile(internalSelectedFile);
      onDocumentUploadedAndProcessed(textContent, internalSelectedFile.name, true); 
      setInternalSelectedFile(null); 
      if (internalFileInputRef.current) internalFileInputRef.current.value = "";
    } catch (e) {
      console.error("Error processing document file internally:", e);
      const errorMsg = `Gagal memproses file dokumen: ${e instanceof Error ? e.message : String(e)}`;
      setAppError(errorMsg); 
      setInternalFileError(errorMsg); 
    } finally {
      setIsProcessingInternalFile(false);
      setAppIsLoading(false); 
    }
  }, [internalSelectedFile, onDocumentUploadedAndProcessed, setAppIsLoading, setAppLoadingMessage, setAppError]);


  if (!originalContent && !isLoading) { 
    return (
      <div className="bg-white p-0 rounded-lg shadow-none min-h-[calc(100vh-250px)] space-y-6">
        <div className="text-lg font-semibold text-slate-800 flex items-center">
          <ClipboardDocumentCheckIcon className="w-6 h-6 mr-2 text-fuchsia-600" />
          Evaluasi Dokumen
        </div>
        <p className="text-sm text-slate-600">
          Unggah file dokumen (PDF, DOCX, DOC, TXT) untuk dievaluasi kualitasnya dan mendapatkan referensi.
        </p>

        {docxWarning && internalSelectedFile && (
            <div className="my-4 p-3 rounded-md bg-yellow-50 border border-yellow-300 text-yellow-800 flex items-start space-x-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-semibold text-sm">Catatan untuk file .doc</h3>
                    <p className="text-xs">Dukungan untuk format .doc (Word 97-2003) mungkin terbatas, terutama untuk file dengan tata letak kompleks. Hasil ekstraksi teks mungkin tidak sempurna. Untuk hasil terbaik, disarankan menggunakan format .docx atau .pdf.</p>
                </div>
            </div>
        )}

        <label
          htmlFor="internal-file-upload"
          className={`mt-2 flex justify-center items-center w-full h-48 px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md cursor-pointer
            ${isProcessingInternalFile ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 bg-slate-50'}`}
        >
          <div className="space-y-1 text-center">
            <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-slate-500" />
            <div className="flex text-sm text-slate-600">
              <span className="relative font-medium text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                Unggah file
              </span>
              <input id="internal-file-upload" name="internal-file-upload" type="file" className="sr-only" ref={internalFileInputRef} onChange={handleInternalFileChange} accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" disabled={isProcessingInternalFile} />
              <p className="pl-1">atau seret dan lepas</p>
            </div>
            <p className="text-xs text-slate-600">.pdf, .docx, .doc, .txt. Maks: ${(MAX_FILE_SIZE_DOCUMENT / (1024 * 1024)).toFixed(0)} MB.</p>
          </div>
        </label>

        {internalFileError && (
            <div className="mt-2 p-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs" role="alert">
                {internalFileError}
            </div>
        )}

        {internalSelectedFile && !isProcessingInternalFile && (
          <div className="mt-4 p-3 border border-slate-200 rounded-md bg-slate-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {SelectedInternalFileIconElement && <SelectedInternalFileIconElement className={`h-8 w-8 ${selectedInternalFileIconColor}`} />}
                <div>
                  <p className="text-sm font-medium text-slate-700 truncate max-w-xs sm:max-w-md">{internalSelectedFile.name}</p>
                  <p className="text-xs text-slate-600">{(internalSelectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
              <button 
                onClick={handleRemoveInternalFile} 
                className="p-1 text-slate-500 hover:text-red-600 rounded-full"
                aria-label="Hapus file"
                title="Hapus file"
              >
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
        
        {internalSelectedFile && (
          <button
            type="button"
            onClick={handleProcessInternalFile}
            disabled={isProcessingInternalFile || !internalSelectedFile}
            className="mt-6 w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {isProcessingInternalFile ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memproses File...
              </>
            ) : (
              "Proses File & Lanjutkan ke Evaluasi"
            )}
          </button>
        )}
         {!internalSelectedFile && !isProcessingInternalFile && (
             <div className="mt-4 p-3 rounded-md bg-blue-50 border border-blue-200 text-blue-800 flex items-start space-x-2">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs">Untuk memulai evaluasi, silakan pilih atau seret file dokumen ke area di atas.</p>
            </div>
         )}
      </div>
    );
  }
  return (
    <div className="bg-white p-0 rounded-lg shadow-none min-h-[calc(100vh-250px)] space-y-6">
      <div className="text-lg font-semibold text-slate-800 flex items-center">
        <ClipboardDocumentCheckIcon className="w-6 h-6 mr-2 text-fuchsia-600" />
        Evaluasi Dokumen: {getContextName()}
      </div>

      {originalContent && (
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            <h3 className="text-md font-semibold text-slate-700 mb-2">Konten Asli Dokumen:</h3>
            <div className="max-w-none h-48 overflow-y-auto bg-white p-3 rounded border border-slate-300">
              <pre className="whitespace-pre-wrap break-words text-xs text-slate-900">{originalContent}</pre>
            </div>
          </div>
      )}

      <div className="text-center">
        <button
          type="button"
          onClick={onEvaluate}
          disabled={isLoading || !originalContent} 
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? ( 
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Mengevaluasi...
            </>
          ) : (
            <>
              <MagnifyingGlassIcon className="-ml-1 mr-2 h-5 w-5" /> 
              Evaluasi dengan Referensi Internet
            </>
          )}
        </button>
      </div>
      
      {evaluationResult && !isLoading && (
        <div className="mt-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
           <h3 className="text-md font-semibold text-slate-700 mb-2">Hasil Evaluasi:</h3>
          <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none">
            <ReactMarkdown components={MarkdownComponents}>
              {evaluationResult}
            </ReactMarkdown>
          </div>
        </div>
      )}
      {evaluationSuggestions && evaluationSuggestions.length > 0 && onSuggestedQuestionClick && !isLoading && (
          <div className="mt-4 p-3 bg-slate-100 rounded-md">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Saran Pertanyaan Lanjutan (Evaluasi):</h4>
              <div className="flex flex-wrap gap-2">
                  {evaluationSuggestions.map((q, i) => (
                      <button
                          key={`eval-sugg-${i}`}
                          onClick={() => onSuggestedQuestionClick(q)}
                          className="px-2.5 py-1.5 text-xs bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-md transition-colors"
                      >
                          {q}
                      </button>
                  ))}
              </div>
          </div>
      )}

      {!evaluationResult && !isLoading && originalContent && (
         <div className="p-8 text-center bg-slate-50 rounded-lg">
          <InformationCircleIcon className="w-16 h-16 text-fuchsia-400 opacity-60 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Siap untuk Evaluasi</h3>
          <p className="text-sm text-slate-600">
            Klik tombol di atas untuk mengevaluasi kualitas dokumen ini dan mendapatkan saran perbaikan beserta referensi dari internet.
          </p>
        </div>
      )}
    </div>
  );
};
