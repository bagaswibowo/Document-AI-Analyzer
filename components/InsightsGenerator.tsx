
import React, { useState } from 'react';

import ReactMarkdown from 'react-markdown';
import { LightBulbIcon, BeakerIcon } from '@heroicons/react/24/outline'; 

interface InsightsGeneratorProps {
  onGenerateInsights: () => Promise<string>;
  isLoading: boolean;
}

export const InsightsGenerator: React.FC<InsightsGeneratorProps> = ({ onGenerateInsights, isLoading }) => {
  const [insights, setInsights] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  

  const MarkdownComponents = {
      h1: ({node, ...props}: any) => <h1 className="text-2xl font-bold my-4 text-blue-600 border-b pb-2 border-slate-300" {...props} />,
      h2: ({node, ...props}: any) => <h2 className="text-xl font-semibold my-3 text-slate-700" {...props} />,
      h3: ({node, ...props}: any) => <h3 className="text-lg font-medium my-2 text-slate-600" {...props} />,
      p: ({node, ...props}: any) => <p className="my-2 leading-relaxed text-slate-700" {...props} />,
      ul: ({node, ...props}: any) => <ul className="list-disc pl-5 my-2 space-y-1 text-slate-700" {...props} />,
      ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 my-2 space-y-1 text-slate-700" {...props} />,
      li: ({node, ...props}: any) => <li className="text-slate-700" {...props} />,
      strong: ({node, ...props}: any) => <strong className="font-semibold text-green-800 bg-green-100 px-1 py-0.5 rounded-sm" {...props} />,
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
  };


  const handleFetchInsights = async () => {
    setError(null);
    setInsights(null);
    try {
      const result = await onGenerateInsights();
      if (result.startsWith("Error:") || result.startsWith("Gagal")) {
          setError(result);
      } else {
          setInsights(result);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(`Gagal menghasilkan wawasan: ${errorMessage}`);
    }
  };
  
  return (
    <div className="bg-white p-0 rounded-lg shadow-none min-h-[calc(100vh-250px)]">
      <div className="text-lg font-semibold text-slate-800 mb-6 flex items-center">
        <LightBulbIcon className="w-6 h-6 mr-2 text-amber-600" />
        Wawasan Berbasis AI (Data Tabular)
      </div>
      
      <div className="text-center mb-6">
        <button
          type="button"
          onClick={handleFetchInsights}
          disabled={isLoading}
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Menghasilkan...
            </>
          ) : (
            <>
              <BeakerIcon className="-ml-1 mr-2 h-5 w-5" />
              Hasilkan Wawasan
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-md bg-red-50 border border-red-200 text-red-700" role="alert">
            <h3 className="font-semibold">Error</h3>
            <p className="text-sm">{error}</p>
        </div>
      )}
      
      {insights && !isLoading && (
        <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none p-4 border border-slate-200 rounded-lg bg-slate-50">
          <ReactMarkdown components={MarkdownComponents}>
            {insights}
          </ReactMarkdown>
        </div>
      )}
      {!insights && !isLoading && !error && (
         <div className="p-8 text-center bg-slate-50 rounded-lg">
          <LightBulbIcon className="w-16 h-16 text-amber-400 opacity-60 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Klik tombol di atas untuk menghasilkan wawasan.</h3>
          <p className="text-sm text-slate-600">
            Temukan pola, anomali, dan observasi menarik dalam dataset Anda.
          </p>
        </div>
      )}
    </div>
  );
};