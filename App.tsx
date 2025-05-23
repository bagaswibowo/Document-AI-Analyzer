
import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { DataOverview } from './components/DataOverview';
import { DataVisualizer } from './components/DataVisualizer';
import { InsightsGenerator } from './components/InsightsGenerator';
import { QAChat } from './components/QAChat';
import { ParsedCsvData, ColumnInfo } from './types';
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
        <div className="text-center p-8">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-xl text-gray-700">Please upload a CSV file first to access this section.</p>
          <button
            onClick={() => setActiveSection('upload')}
            className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition duration-150"
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
    <button
      onClick={() => setActiveSection(section)}
      disabled={!parsedData && section !== 'upload'}
      className={`flex flex-col items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150
                  ${activeSection === section ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-primary-100 hover:text-primary-700'}
                  ${!parsedData && section !== 'upload' ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <Icon className="h-5 w-5 mb-1" />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-gray-100 flex flex-col">
      <header className="bg-slate-900/80 backdrop-blur-md shadow-lg p-4 sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-pink-500">
            Gemini Data Analyzer
          </h1>
        </div>
      </header>

      {error && (
        <div className="bg-red-500 text-white p-4 m-4 rounded-md shadow-md flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 text-xl font-bold">&times;</button>
        </div>
      )}
      
      <div className="container mx-auto p-2 sm:p-4 flex-grow flex flex-col md:flex-row gap-4">
        <nav className="md:w-1/5 lg:w-1/6 bg-slate-800/70 backdrop-blur-sm p-3 rounded-lg shadow-md md:sticky md:top-24 self-start">
          <ul className="space-y-2">
            <li><NavButton section="upload" label="Upload Data" icon={ArrowUpTrayIcon} /></li>
            <li><NavButton section="overview" label="Data Overview" icon={TableCellsIcon} /></li>
            <li><NavButton section="visualize" label="Visualize" icon={ChartBarIcon} /></li>
            <li><NavButton section="insights" label="AI Insights" icon={SparklesIcon} /></li>
            <li><NavButton section="qa" label="Q&A Chat" icon={ChatBubbleLeftRightIcon} /></li>
          </ul>
        </nav>

        <main className="md:w-4/5 lg:w-5/6 bg-slate-800/70 backdrop-blur-sm p-4 sm:p-6 rounded-lg shadow-md flex-grow">
          {renderSection()}
        </main>
      </div>
      
      <footer className="text-center p-4 text-sm text-gray-400 border-t border-slate-700 mt-auto">
        Copyright &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default App;
    