
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { InputSection } from './components/InputSection';
import { DataOverview } from './components/DataOverview';
import { DataVisualizer } from './components/DataVisualizer';
import { InsightsGenerator } from './components/InsightsGenerator';
import { QAChat } from './components/QAChat';
import { ParsedCsvData, ColumnInfo } from './types';
import { parseCSV, analyzeColumns, extractTextFromFile, calculateDynamicStat, SupportedCalculation } from './services/dataAnalysisService';
import { generateInsights, answerQuestion, summarizeContent, answerQuestionFromContent, interpretUserCalculationRequest, CalculationInterpretation } from './services/geminiService';
import { ArrowUpTrayIcon, TableCellsIcon, ChartBarIcon, SparklesIcon, ChatBubbleLeftRightIcon, ExclamationTriangleIcon, DocumentTextIcon, PencilSquareIcon } from '@heroicons/react/24/outline';

type ActiveSection = 'input' | 'overview' | 'visualize' | 'insights' | 'qa';
export type AppMode = 'dataAnalysis' | 'documentQa';
export type ActiveInputType = 'tabular' | 'document' | 'directText';

// Helper function to format data summary once
const formatDataSummaryForAI = (data: ParsedCsvData | null): string => {
    if (!data) return "Tidak ada data tabular yang dimuat.";
    let summary = `Dataset: ${data.fileName}\n`;
    summary += `Total Baris: ${data.rowCount}, Total Kolom: ${data.columnCount}\n\n`;
    summary += "Detail Kolom (Nama Kolom: Tipe Data [Statistik Utama jika relevan]):\n";
    data.columnInfos.forEach(col => {
      summary += `- ${col.name}: ${col.type}`;
      let statsSummary = [];
      if (col.type === 'number') {
        if (col.stats.mean !== undefined) statsSummary.push(`rata-rata=${col.stats.mean.toFixed(2)}`);
        if (col.stats.median !== undefined) statsSummary.push(`median=${col.stats.median.toFixed(2)}`);
        if (col.stats.min !== undefined) statsSummary.push(`min=${col.stats.min}`);
        if (col.stats.max !== undefined) statsSummary.push(`maks=${col.stats.max}`);
        if (col.stats.stdDev !== undefined) statsSummary.push(`stdev=${col.stats.stdDev.toFixed(2)}`);
      }
      if (col.stats.uniqueValues?.length) statsSummary.push(`unik=${col.stats.uniqueValues.length}`);
      if (col.stats.missingCount > 0) statsSummary.push(`hilang=${col.stats.missingCount} (${((col.stats.missingCount / data.rowCount) * 100).toFixed(1)}%)`);
      if (col.stats.mode !== undefined) statsSummary.push(`modus=${col.stats.mode}`);
      
      if (statsSummary.length > 0) summary += ` [${statsSummary.join('; ')}]`;
      summary += `\n`;
    });
  
    if (data.sampleRows.length > 0 && data.headers.length > 0) {
      summary += "\nData Sampel (beberapa baris pertama):\n";
      summary += data.headers.join(', ') + '\n';
      data.sampleRows.slice(0,3).forEach(row => { 
          summary += data.headers.map(h => String(row[h] ?? 'N/A')).join(', ') + '\n';
      });
    } else if (data.headers.length === 0) {
        summary += "\nTidak ada header atau data sampel yang dapat ditampilkan (mungkin file kosong atau format tidak dikenal).\n";
    }
    return summary;
};


const App: React.FC = () => {
  const [parsedData, setParsedData] = useState<ParsedCsvData | null>(null);
  const [processedTextContent, setProcessedTextContent] = useState<string | null>(null);
  const [documentSummary, setDocumentSummary] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('Memproses...');
  const [error, setError] = useState<string | null>(null);
  
  const [activeSection, setActiveSection] = useState<ActiveSection>('input');
  const [currentMode, setCurrentMode] = useState<AppMode>('dataAnalysis'); 

  const dataSummaryForAI = useMemo(() => formatDataSummaryForAI(parsedData), [parsedData]);

  const resetAppStateForNewInput = () => {
    setParsedData(null);
    setProcessedTextContent(null);
    setDocumentSummary(null);
    setError(null);
  };

  const handleTabularFileProcessed = useCallback(async (file: File, parsed: ParsedCsvData) => {
    resetAppStateForNewInput();
    setIsLoading(true);
    setLoadingMessage("Menganalisis kolom data tabular...");
    setCurrentMode('dataAnalysis');
    try {
      const columnInfos = analyzeColumns(parsed.rows, parsed.headers);
      const fullParsedData: ParsedCsvData = {
        ...parsed,
        columnInfos,
        rowCount: parsed.rows.length,
        columnCount: parsed.headers.length,
        sampleRows: parsed.rows.slice(0, 10),
        fileName: file.name,
      };
      setParsedData(fullParsedData);
      setActiveSection('overview');
    } catch (e) {
      console.error("Error analyzing columns:", e);
      setError(`Gagal menganalisis kolom: ${e instanceof Error ? e.message : String(e)}`);
      setActiveSection('input');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const handleDocumentOrTextProcessed = useCallback(async (text: string, sourceName: string) => {
    resetAppStateForNewInput();
    setIsLoading(true);
    setLoadingMessage(`Memproses konten dari ${sourceName} dan membuat ringkasan...`);
    setCurrentMode('documentQa');
    setProcessedTextContent(text);
    try {
      const summary = await summarizeContent(text);
      setDocumentSummary(summary);
      setActiveSection('qa'); 
    } catch (e) {
      console.error("Error summarizing content:", e);
      setError(`Gagal membuat ringkasan: ${e instanceof Error ? e.message : String(e)}`);
      setDocumentSummary(null);
      setActiveSection('input'); 
    } finally {
      setIsLoading(false);
    }
  }, []);


  const handleGenerateInsights = useCallback(async () => {
    if (!parsedData || currentMode !== 'dataAnalysis') return "Tidak ada data tabular untuk menghasilkan wawasan.";
    setIsLoading(true);
    setLoadingMessage("Menghasilkan wawasan AI...");
    setError(null);
    try {
      // Menggunakan dataSummaryForAI yang sudah di-memoize jika formatnya sama
      // atau mengirim parsedData langsung jika generateInsights mengharapkan objek penuh
      const insights = await generateInsights(parsedData); 
      return insights;
    } catch (e) {
      console.error("Error generating insights:", e);
      const errorMessage = `Gagal menghasilkan wawasan: ${e instanceof Error ? e.message : String(e)}`;
      setError(errorMessage);
      return errorMessage;
    } finally {
      setIsLoading(false);
    }
  }, [parsedData, currentMode]);

  const handleQuery = useCallback(async (question: string) => {
    setIsLoading(true);
    setLoadingMessage("Mencari jawaban...");
    setError(null);
    let calculationResultContext: string | undefined = undefined;

    try {
      if (currentMode === 'dataAnalysis' && parsedData) {
        const interpretation = await interpretUserCalculationRequest(question, parsedData.columnInfos);
        let calculatedValue: number | string | null = null;
        let calculationAttempted = false;

        if (interpretation.operation !== "UNKNOWN" && interpretation.columnName && !interpretation.errorMessage) {
          const targetColumnInfo = parsedData.columnInfos.find(c => c.name.toLowerCase() === interpretation.columnName!.toLowerCase());
          
          if (targetColumnInfo) {
            calculationAttempted = true;
            // Coba ambil dari ColumnStats dulu
            const op = interpretation.operation as SupportedCalculation;
            switch (op) {
              case "AVERAGE": calculatedValue = targetColumnInfo.stats.mean ?? null; break;
              case "MEDIAN": calculatedValue = targetColumnInfo.stats.median ?? null; break;
              case "MIN": calculatedValue = targetColumnInfo.stats.min ?? null; break;
              case "MAX": calculatedValue = targetColumnInfo.stats.max ?? null; break;
              case "MODE": calculatedValue = targetColumnInfo.stats.mode ?? null; break;
              case "STDEV": calculatedValue = targetColumnInfo.stats.stdDev ?? null; break;
              case "COUNT":
              case "COUNTA":
                calculatedValue = parsedData.rowCount - targetColumnInfo.stats.missingCount;
                break;
              case "COUNTUNIQUE":
                calculatedValue = targetColumnInfo.stats.uniqueValues?.length ?? null;
                break;
              // SUM dan VAR perlu perhitungan dinamis
              case "SUM":
              case "VAR":
                calculatedValue = calculateDynamicStat(parsedData.rows, targetColumnInfo.name, op, targetColumnInfo.type);
                break;
              default:
                calculationAttempted = false; // Operasi tidak ditangani di sini, biarkan AI
            }

            if (calculatedValue !== null) {
               calculationResultContext = `Sistem melakukan perhitungan ${op} pada kolom "${targetColumnInfo.name}" dan hasilnya adalah ${typeof calculatedValue === 'number' ? calculatedValue.toLocaleString('id-ID', {minimumFractionDigits: 0, maximumFractionDigits: 2}) : calculatedValue}.`;
            } else if(calculationAttempted) { // Kalkulasi dicoba tapi gagal/null
               calculationResultContext = `Sistem mencoba melakukan perhitungan ${op} pada kolom "${targetColumnInfo.name}", tetapi hasilnya tidak dapat ditentukan (mungkin karena tipe data tidak sesuai atau tidak ada data yang valid).`;
            }
          } else { // Kolom tidak ditemukan oleh interpretasi AI
             calculationResultContext = `Sistem mencoba menginterpretasi permintaan untuk kolom "${interpretation.columnName}", tetapi kolom tersebut tidak ditemukan dalam dataset.`;
          }
        } else if (interpretation.errorMessage) {
            calculationResultContext = `Saat mencoba menginterpretasi permintaan Anda ("${question}"), terjadi kendala: ${interpretation.errorMessage}.`;
        }
        
        return await answerQuestion(dataSummaryForAI, question, calculationResultContext);

      } else if (currentMode === 'documentQa' && processedTextContent) {
        return await answerQuestionFromContent(processedTextContent, question);
      }
      return "Konteks tidak tersedia untuk menjawab pertanyaan. Silakan unggah data atau dokumen terlebih dahulu.";
    } catch (e) {
      console.error("Error answering question:", e);
      const errorMessage = `Gagal menjawab pertanyaan: ${e instanceof Error ? e.message : String(e)}`;
      setError(errorMessage);
      return errorMessage;
    } finally {
      setIsLoading(false);
    }
  }, [parsedData, processedTextContent, currentMode, dataSummaryForAI]);
  
  const renderSection = () => {
    const commonDisabledMessage = (
        <div className="text-center p-8 bg-slate-700 rounded-xl shadow-lg">
            <ExclamationTriangleIcon className="h-16 w-16 text-yellow-400 mx-auto mb-6" />
            <p className="text-xl text-slate-200 mb-6">Silakan input data atau dokumen terlebih dahulu untuk mengakses bagian ini.</p>
            <button
                onClick={() => setActiveSection('input')}
                className="mt-4 px-8 py-3 bg-primary-600 text-white font-semibold rounded-lg shadow-md hover:bg-primary-700 transition-all duration-150"
            >
                Ke Halaman Input Data
            </button>
        </div>
    );

    switch (activeSection) {
      case 'input':
        return <InputSection 
                  onTabularFileProcessed={handleTabularFileProcessed}
                  onDocumentOrTextProcessed={handleDocumentOrTextProcessed}
                  isLoading={isLoading} 
                  loadingMessage={loadingMessage}
                  setExternalError={setError}
                  setIsLoading={setIsLoading}
                  setLoadingMessage={setLoadingMessage}
                />;
      case 'overview':
        return currentMode === 'dataAnalysis' && parsedData ? <DataOverview data={parsedData} /> : commonDisabledMessage;
      case 'visualize':
        return currentMode === 'dataAnalysis' && parsedData ? <DataVisualizer data={parsedData} /> : commonDisabledMessage;
      case 'insights':
        return currentMode === 'dataAnalysis' && parsedData ? <InsightsGenerator onGenerateInsights={handleGenerateInsights} isLoading={isLoading} /> : commonDisabledMessage;
      case 'qa':
        return (currentMode === 'dataAnalysis' && parsedData) || (currentMode === 'documentQa' && processedTextContent) ? 
               <QAChat 
                  onQuery={handleQuery} 
                  isLoading={isLoading} 
                  currentMode={currentMode}
                  documentSummary={documentSummary}
                  processedTextContent={processedTextContent}
                  fileName={currentMode === 'dataAnalysis' ? parsedData?.fileName : undefined}
                /> : commonDisabledMessage;
      default:
        return <InputSection 
                  onTabularFileProcessed={handleTabularFileProcessed} 
                  onDocumentOrTextProcessed={handleDocumentOrTextProcessed}
                  isLoading={isLoading} 
                  loadingMessage={loadingMessage}
                  setExternalError={setError}
                  setIsLoading={setIsLoading}
                  setLoadingMessage={setLoadingMessage}
                />;
    }
  };
  
  interface NavButtonProps {
    section: ActiveSection;
    label: string;
    icon: React.ElementType;
    requiredMode?: AppMode; 
  }

  const NavButton: React.FC<NavButtonProps> = ({ section, label, icon: Icon, requiredMode }) => {
    let isDisabled = false;
    if (section !== 'input') {
      if (requiredMode === 'dataAnalysis') {
        if (!parsedData || currentMode !== 'dataAnalysis') {
          isDisabled = true;
        }
      } else if (requiredMode === 'documentQa') {
        if (!processedTextContent || currentMode !== 'documentQa') {
          isDisabled = true;
        }
      // FIX: Corrected logic for QA button disable state
      // The 'else' block handles the 'qa' section which has no 'requiredMode'.
      // It should be disabled if the current mode's required data is not available.
      } else if (section === 'qa') { // Specifically for QA button
        if (currentMode === 'dataAnalysis' && !parsedData) {
             isDisabled = true;
        } else if (currentMode === 'documentQa' && !processedTextContent) {
             isDisabled = true;
        }
      }
    }


    return (
        <li className="flex-1">
        <button
            onClick={() => {
                if (isDisabled) return;
                setActiveSection(section);
            }}
            disabled={isDisabled}
            className={`w-full h-full flex flex-col items-center justify-center p-1 md:p-2 
                        focus:outline-none focus:ring-1 focus:ring-primary-500/80 focus:ring-offset-2 focus:ring-offset-slate-800 rounded-md
                        transition-all duration-150 group
                        ${activeSection === section 
                        ? 'text-primary-400 bg-primary-500/10' 
                        : 'text-slate-400 hover:text-primary-300 hover:bg-slate-700/60'}
                        ${isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
            aria-current={activeSection === section ? 'page' : undefined}
            aria-label={label}
        >
            <Icon className={`h-5 w-5 md:h-6 md:w-6 mb-0.5 transition-colors ${activeSection === section && !isDisabled ? 'text-primary-400' : (isDisabled ? 'text-slate-500' : 'text-slate-400 group-hover:text-primary-300')}`} />
            <span className="text-xs truncate w-full text-center max-w-[80px] md:max-w-none">{label}</span>
        </button>
        </li>
    );
  };


  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <header className="bg-slate-800/80 backdrop-blur-md shadow-lg p-4 sticky top-0 z-40">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-400">
            Penganalisis Data & Dokumen Gemini
          </h1>
        </div>
      </header>

      {error && (
        <div className="bg-red-600/90 text-white p-3 sm:p-4 mx-2 sm:mx-4 mt-4 rounded-lg shadow-md flex justify-between items-center transition-opacity duration-300 ease-in-out opacity-100" role="alert">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 flex-shrink-0"/>
            <span className="text-sm sm:text-base">{error}</span>
          </div>
          <button 
            onClick={() => setError(null)} 
            className="ml-3 sm:ml-4 text-xl sm:text-2xl font-bold hover:text-red-200 transition-colors flex-shrink-0"
            aria-label="Tutup pesan error"
          >
            &times;
          </button>
        </div>
      )}
      
      <div className="flex-grow overflow-y-auto pb-16 md:pb-20"> 
        <div className="container mx-auto p-2 sm:p-4">
          <main className="w-full bg-slate-800 p-3 sm:p-6 rounded-xl shadow-2xl min-h-[calc(100vh-200px)]">
            {renderSection()}
          </main>
        </div>
        
        <footer className="text-center p-5 text-sm text-slate-400 border-t border-slate-700 mt-8">
          &copy; {new Date().getFullYear()} Bagas Wibowo. Hak Cipta Dilindungi.
        </footer>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 h-16 md:h-20 bg-slate-800 border-t border-slate-700 shadow-lg z-50">
        <ul className="flex justify-around items-stretch h-full max-w-screen-md mx-auto px-1 md:px-2">
          <NavButton section="input" label="Input Data" icon={PencilSquareIcon} />
          <NavButton section="overview" label="Ringkasan Data" icon={TableCellsIcon} requiredMode="dataAnalysis"/>
          <NavButton section="visualize" label="Visualisasi" icon={ChartBarIcon} requiredMode="dataAnalysis"/>
          <NavButton section="insights" label="Wawasan AI" icon={SparklesIcon} requiredMode="dataAnalysis"/>
          <NavButton section="qa" label="Tanya Jawab" icon={ChatBubbleLeftRightIcon} />
        </ul>
      </nav>
    </div>
  );
};

export default App;
