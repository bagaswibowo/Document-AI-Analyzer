
import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { DataOverview } from './components/DataOverview';
import { DataVisualizer } from './components/DataVisualizer';
import { InsightsGenerator } from './components/InsightsGenerator';
import { QAChat } from './components/QAChat';
import { ParsedCsvData } from './types';
import { parseCSV, analyzeColumns } from './services/dataAnalysisService';
import { generateInsights, answerQuestion } from './services/geminiService';
import { ArrowUpTrayIcon, TableCellsIcon, ChartBarIcon, SparklesIcon, ChatBubbleLeftRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

type ActiveSection = 'upload' | 'overview' | 'visualize' | 'insights' | 'qa';

const App: React.FC = () => {
  const [parsedData, setParsedData] = useState<ParsedCsvData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>('upload');

  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setParsedData(null);
    setActiveSection('upload');

    if (!file.name.endsWith('.csv')) {
      setError("Invalid file type. Please upload a CSV file.");
      setIsLoading(false);
      return;
    }

    try {
      const text = await file.text();
      const rawParsed = parseCSV(text);
      if (rawParsed.rows.length === 0) {
        setError("CSV file is empty or could not be parsed correctly.");
        setIsLoading(false);
        return;
      }
      const columnInfos = analyzeColumns(rawParsed.rows, rawParsed.headers);
      const fullParsedData: ParsedCsvData = {
        ...rawParsed,
        columnInfos,
        rowCount: rawParsed.rows.length,
        columnCount: rawParsed.headers.length,
        sampleRows: rawParsed.rows.slice(0, 10),
        fileName: file.name,
      };
      setParsedData(fullParsedData);
      setActiveSection('overview');
    } catch (e) {
      console.error("Error processing file:", e);
      setError(`Failed to process CSV file: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleGenerateInsights = useCallback(async () => {
    if (!parsedData) return "No data available to generate insights.";
    setIsLoading(true);
    setError(null);
    try {
      const insights = await generateInsights(parsedData);
      return insights;
    } catch (e) {
      console.error("Error generating insights:", e);
      const errorMessage = `Failed to generate insights: ${e instanceof Error ? e.message : String(e)}`;
      setError(errorMessage);
      return errorMessage;
    } finally {
      setIsLoading(false);
    }
  }, [parsedData]);

  const handleQuery = useCallback(async (question: string) => {
    if (!parsedData) return "No data available to answer questions.";
    setIsLoading(true);
    setError(null);
    try {
      const answer = await answerQuestion(parsedData, question);
      return answer;
    } catch (e) {
      console.error("Error answering question:", e);
      const errorMessage = `Failed to answer question: ${e instanceof Error ? e.message : String(e)}`;
      setError(errorMessage);
      return errorMessage;
    } finally {
      setIsLoading(false);
    }
  }, [parsedData]);
  
  const renderSection = () => {
    if (!parsedData && activeSection !== 'upload') {
      return (
        <div className="text-center p-8 bg-slate-700 rounded-xl shadow-lg">
          <ExclamationTriangleIcon className="h-16 w-16 text-yellow-400 mx-auto mb-6" />
          <p className="text-xl text-slate-200 mb-6">Please upload a CSV file first to access this section.</p>
          <button
            onClick={() => setActiveSection('upload')}
            className="mt-4 px-8 py-3 bg-primary-600 text-white font-semibold rounded-lg shadow-md hover:bg-primary-700 transition-all duration-150"
          >
            Go to Upload
          </button>
        </div>
      );
    }

    switch (activeSection) {
      case 'upload':
        return <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading} />;
      case 'overview':
        return parsedData ? <DataOverview data={parsedData} /> : null;
      case 'visualize':
        return parsedData ? <DataVisualizer data={parsedData} /> : null;
      case 'insights':
        return parsedData ? <InsightsGenerator onGenerateInsights={handleGenerateInsights} isLoading={isLoading} /> : null;
      case 'qa':
        return parsedData ? <QAChat onQuery={handleQuery} isLoading={isLoading} /> : null;
      default:
        return <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading} />;
    }
  };
  
  const NavButton: React.FC<{ section: ActiveSection; label: string; icon: React.ElementType }> = ({ section, label, icon: Icon }) => (
    <li className="flex-1">
      <button
        onClick={() => setActiveSection(section)}
        disabled={!parsedData && section !== 'upload'}
        className={`w-full h-full flex flex-col items-center justify-center p-1 md:p-2 
                    focus:outline-none focus:ring-1 focus:ring-primary-500/80 focus:ring-offset-2 focus:ring-offset-slate-800 rounded-md
                    transition-all duration-150 group
                    ${activeSection === section 
                      ? 'text-primary-400 bg-primary-500/10' 
                      : 'text-slate-400 hover:text-primary-300 hover:bg-slate-700/60'}
                    ${!parsedData && section !== 'upload' ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
        aria-current={activeSection === section ? 'page' : undefined}
        aria-label={label}
      >
        <Icon className={`h-5 w-5 md:h-6 md:w-6 mb-0.5 transition-colors ${activeSection === section ? 'text-primary-400' : 'text-slate-400 group-hover:text-primary-300'}`} />
        <span className="text-xs truncate w-full text-center max-w-[80px] md:max-w-none">{label}</span>
      </button>
    </li>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <header className="bg-slate-800/80 backdrop-blur-md shadow-lg p-4 sticky top-0 z-40">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-400">
            Gemini Data Analyzer
          </h1>
        </div>
      </header>

      {error && (
        <div className="bg-red-600/90 text-white p-4 mx-4 mt-4 rounded-lg shadow-md flex justify-between items-center animate-pulse">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 mr-3"/>
            <span>{error}</span>
          </div>
          <button 
            onClick={() => setError(null)} 
            className="ml-4 text-xl font-bold hover:text-red-200 transition-colors"
            aria-label="Close error message"
          >
            &times;
          </button>
        </div>
      )}
      
      {/* Scrollable main content area */}
      <div className="flex-grow overflow-y-auto pb-16 md:pb-20"> {/* Padding for bottom nav height */}
        <div className="container mx-auto p-4">
          <main className="w-full bg-slate-800 p-4 sm:p-6 rounded-xl shadow-2xl">
            {renderSection()}
          </main>
        </div>
        
        <footer className="text-center p-5 text-sm text-slate-400 border-t border-slate-700 mt-8">
          &copy; {new Date().getFullYear()} Bagas Wibowo. All Rights Reserved.
        </footer>
      </div>

      {/* Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 md:h-20 bg-slate-800 border-t border-slate-700 shadow-lg z-50">
        <ul className="flex justify-around items-stretch h-full max-w-screen-md mx-auto px-1 md:px-2">
          <NavButton section="upload" label="Upload" icon={ArrowUpTrayIcon} />
          <NavButton section="overview" label="Overview" icon={TableCellsIcon} />
          <NavButton section="visualize" label="Visualize" icon={ChartBarIcon} />
          <NavButton section="insights" label="Insights" icon={SparklesIcon} />
          <NavButton section="qa" label="Q&A Chat" icon={ChatBubbleLeftRightIcon} />
        </ul>
      </nav>
    </div>
  );
};

export default App;
