
import React, { useState, useEffect } from 'react';
import { Card } from './common/Card';
import { Spinner } from './common/Spinner';
import { LightBulbIcon, SparklesIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';

interface InsightsGeneratorProps {
  onGenerateInsights: () => Promise<string>;
  isLoading: boolean;
}

export const InsightsGenerator: React.FC<InsightsGeneratorProps> = ({ onGenerateInsights, isLoading }) => {
  const [insights, setInsights] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetchInsights = async () => {
    setError(null);
    // setInsights(null); // Keep old insights visible while loading new ones for better UX
    try {
      const result = await onGenerateInsights();
      setInsights(result);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(`Failed to generate insights: ${errorMessage}`);
      // Do not set insights to error message here, keep previous insights or show error separately
    }
  };
  
  // User may want to re-generate insights for the same data, so auto-fetch might not be ideal.
  // Removed auto-fetch on mount.
  // useEffect(() => {
  //   if (!insights && !isLoading) { 
  //     // handleFetchInsights(); 
  //   }
  // }, [onGenerateInsights, insights, isLoading]);


  return (
    <Card title="AI Powered Insights" icon={SparklesIcon}>
      <button
        onClick={handleFetchInsights}
        disabled={isLoading}
        className="w-full sm:w-auto mb-6 px-8 py-3 bg-primary-600 text-white font-semibold rounded-lg shadow-md hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 transform hover:scale-105"
        aria-live="polite"
        aria-label="Generate AI powered insights from the data"
      >
        {isLoading ? (
          <>
            <Spinner size="sm" color="text-white" />
            <span className="ml-3">Generating Insights...</span>
          </>
        ) : (
          <>
            <LightBulbIcon className="h-6 w-6 mr-2" />
            Generate Insights
          </>
        )}
      </button>

      {error && <div className="p-4 mb-4 bg-red-700/30 border border-red-500 text-red-300 rounded-md shadow animate-fade-in">{error}</div>}
      
      {insights && !isLoading && (
        <div className="prose prose-sm sm:prose-base prose-invert max-w-none p-5 bg-slate-750 rounded-lg shadow-inner">
          <ReactMarkdown
            components={{
              h1: ({node, ...props}) => <h1 className="text-2xl font-semibold text-primary-400 mb-3 border-b border-slate-600 pb-2" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-xl font-semibold text-primary-300 mt-4 mb-2" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-sky-400 mt-3 mb-1" {...props} />,
              p: ({node, ...props}) => <p className="text-slate-300 my-2 leading-relaxed" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc list-outside ml-5 text-slate-300 my-3 space-y-1" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-5 text-slate-300 my-3 space-y-1" {...props} />,
              li: ({node, ...props}) => <li className="my-1.5" {...props} />,
              strong: ({node, ...props}) => <strong className="font-semibold text-slate-100" {...props} />,
              em: ({node, ...props}) => <em className="text-sky-300" {...props} />,
              a: ({node, ...props}) => <a className="text-primary-400 hover:text-primary-300 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
              code: ({node, inline, ...props}) => inline 
                ? <code className="bg-slate-600 text-sky-300 px-1 py-0.5 rounded text-sm" {...props} />
                : <pre className="bg-slate-800 p-3 rounded-md overflow-x-auto text-sm"><code className="text-sky-300" {...props} /></pre>,
              pre: ({node, ...props}) => <pre className="bg-slate-800 p-3 rounded-md overflow-x-auto" {...props} />,
              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary-500 pl-4 italic text-slate-400 my-3" {...props} />,
            }}
          >
            {insights}
          </ReactMarkdown>
        </div>
      )}
      {!insights && !isLoading && !error && (
         <div className="text-center text-slate-400 py-10 bg-slate-750 rounded-lg shadow-inner">
            <SparklesIcon className="h-16 w-16 mx-auto mb-4 text-primary-500 opacity-60" />
            <p className="text-lg">Click the button above to generate data insights using AI.</p>
            <p className="text-sm text-slate-500 mt-1">Discover patterns, anomalies, and interesting observations in your dataset.</p>
          </div>
      )}
    </Card>
  );
};
