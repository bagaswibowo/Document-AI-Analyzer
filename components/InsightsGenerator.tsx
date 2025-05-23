
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
    setInsights(null);
    try {
      const result = await onGenerateInsights();
      setInsights(result);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(`Failed to generate insights: ${errorMessage}`);
      setInsights(`Error: ${errorMessage}`);
    }
  };
  
  // Automatically fetch insights when the component is shown with ability to generate
  // but only if insights haven't been fetched yet for the current data.
  // This effect depends on onGenerateInsights which might change if parsedData in App.tsx changes.
  useEffect(() => {
    if (!insights && !isLoading) { // Check if insights are null and not already loading
      // handleFetchInsights(); // Commented out to prevent auto-triggering on tab switch if data hasn't changed. Let user click.
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onGenerateInsights]); // Dependency on onGenerateInsights is important


  return (
    <Card title="AI Powered Insights" icon={SparklesIcon}>
      <button
        onClick={handleFetchInsights}
        disabled={isLoading}
        className="w-full sm:w-auto mb-6 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg shadow-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex items-center justify-center"
      >
        {isLoading ? (
          <>
            <Spinner size="sm" />
            <span className="ml-2">Generating Insights...</span>
          </>
        ) : (
          <>
            <LightBulbIcon className="h-5 w-5 mr-2" />
            Generate Insights
          </>
        )}
      </button>

      {error && <div className="p-3 mb-4 bg-red-700/50 border border-red-500 text-red-200 rounded-md">{error}</div>}
      
      {insights && !isLoading && (
        <div className="prose prose-sm sm:prose-base prose-invert max-w-none p-4 bg-slate-750 rounded-md shadow">
          <ReactMarkdown
            components={{
              h1: ({node, ...props}) => <h1 className="text-2xl font-semibold text-primary-400" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-xl font-semibold text-primary-300" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-primary-200" {...props} />,
              p: ({node, ...props}) => <p className="text-gray-300 my-2" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc list-inside text-gray-300 my-2" {...props} />,
              li: ({node, ...props}) => <li className="my-1" {...props} />,
              strong: ({node, ...props}) => <strong className="font-semibold text-gray-100" {...props} />,
              a: ({node, ...props}) => <a className="text-primary-400 hover:text-primary-300" {...props} />,
            }}
          >
            {insights}
          </ReactMarkdown>
        </div>
      )}
      {!insights && !isLoading && !error && (
         <div className="text-center text-gray-400 py-8">
            <SparklesIcon className="h-12 w-12 mx-auto mb-2 text-primary-500 opacity-50" />
            Click the button above to generate data insights using AI.
          </div>
      )}
    </Card>
  );
};
    