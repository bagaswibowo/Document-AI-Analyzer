
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { InputSection } from './components/InputSection';
import { DataOverview } from './components/DataOverview';
import { DataVisualizer } from './components/DataVisualizer';
import { InsightsGenerator } from './components/InsightsGenerator';
import { QAChat } from './components/QAChat';
import { DocumentEvaluator } from './components/DocumentEvaluator';
import { GuidePage } from './components/GuidePage';
import { FirstVisitModal } from './components/FirstVisitModal';
import { GuideBanner } from './components/GuideBanner';
import { ParsedCsvData } from './types';
import { analyzeColumns, SupportedCalculation as SupportedCalculationType } from './services/dataAnalysisService';
import { generateInsights, answerQuestion, summarizeContent, answerQuestionFromContent, interpretUserCalculationRequest, evaluateDocumentWithReferences } from './services/aiService';
import { ToastDisplay, ToastConfig } from './components/common/ToastDisplay';

import {
  ArrowDownTrayIcon,
  TableCellsIcon,
  ChartBarIcon,
  LightBulbIcon,
  ChatBubbleLeftEllipsisIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClipboardDocumentCheckIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

type ActiveSection = 'input' | 'overview' | 'visualize' | 'insights' | 'qa' | 'evaluate';
export type AppMode = 'dataAnalysis' | 'documentQa';
export type ActiveInputType = 'tabular' | 'document' | 'directText';
type CurrentView = 'app' | 'guide';

const LOCAL_STORAGE_KEYS = {
  HAS_VISITED_BEFORE: 'appHasVisitedBefore',
};

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
  const [activeInputSourceIdentifier, setActiveInputSourceIdentifier] = useState<string | undefined>(undefined);
  
  const [isLoading, setIsLoading] = useState<boolean>(false); // General loading for page-level operations
  const [loadingMessage, setLoadingMessage] = useState<string>('Memproses...');
  const [error, setError] = useState<string | null>(null);
  
  const [activeSection, setActiveSection] = useState<ActiveSection>('input');
  const [currentMode, setCurrentMode] = useState<AppMode>('dataAnalysis'); 

  const [documentEvaluation, setDocumentEvaluation] = useState<string | null>(null);
  const [evaluationLoading, setEvaluationLoading] = useState<boolean>(false);
  const [toastConfig, setToastConfig] = useState<ToastConfig | null>(null);
  
  const [currentView, setCurrentView] = useState<CurrentView>('app');
  const [showFirstVisitModal, setShowFirstVisitModal] = useState<boolean>(false);


  useEffect(() => {
    const hasVisited = localStorage.getItem(LOCAL_STORAGE_KEYS.HAS_VISITED_BEFORE);
    if (!hasVisited) {
      setShowFirstVisitModal(true);
    }
  }, []);

  const handleDismissFirstVisitModal = useCallback(() => {
    setShowFirstVisitModal(false);
    localStorage.setItem(LOCAL_STORAGE_KEYS.HAS_VISITED_BEFORE, 'true');
  }, []);

  const handleNavigateToGuide = useCallback(() => {
    setCurrentView('guide');
    if (showFirstVisitModal) {
        handleDismissFirstVisitModal(); 
    }
  }, [showFirstVisitModal, handleDismissFirstVisitModal]);

  const handleNavigateToApp = useCallback(() => {
    setCurrentView('app');
  }, []);


  const dataSummaryForAI = useMemo(() => formatDataSummaryForAI(parsedData), [parsedData]);

  const resetAppStateForNewInput = (keepCurrentMode: boolean = false) => {
    setParsedData(null);
    setProcessedTextContent(null);
    setDocumentSummary(null);
    setDocumentEvaluation(null); 
    setActiveInputSourceIdentifier(undefined);
    setError(null);
    if (!keepCurrentMode) {
        setCurrentMode('dataAnalysis'); 
    }
  };

  const handleTabularFileProcessed = useCallback(async (file: File, parsed: ParsedCsvData) => {
    resetAppStateForNewInput();
    setIsLoading(true);
    setLoadingMessage("Menganalisis kolom data tabular...");
    setCurrentMode('dataAnalysis');
    setActiveInputSourceIdentifier(file.name);
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
      setActiveInputSourceIdentifier(undefined);
      setActiveSection('input');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const handleDocumentOrTextProcessed = useCallback(async (text: string, sourceName: string, navigateToEvaluation: boolean = false) => {
    resetAppStateForNewInput(true); 
    setIsLoading(true);
    setLoadingMessage(`Memproses konten dari ${sourceName} dan membuat ringkasan...`);
    setCurrentMode('documentQa');
    setProcessedTextContent(text);
    setActiveInputSourceIdentifier(sourceName);
    try {
      const summary = await summarizeContent(text);
      setDocumentSummary(summary);
      setActiveSection(navigateToEvaluation ? 'evaluate' : 'qa'); 
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
    setIsLoading(true); // Use main loading for this section's primary action
    setLoadingMessage("Menghasilkan wawasan AI...");
    setError(null);
    try {
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
    setIsLoading(true); // Use main loading for initial query in QAChat
    setLoadingMessage("Mencari jawaban...");
    setError(null);
    let calculationResultContext: string | undefined = undefined;

    try {
      if (currentMode === 'dataAnalysis' && parsedData) {
        const interpretation = await interpretUserCalculationRequest(question, parsedData.columnInfos);
        let calculatedValue: number | string | null = null;
        let calculationAttempted = false;
        const { calculateDynamicStat } = await import('./services/dataAnalysisService');

        if (interpretation.operation !== "UNKNOWN" && interpretation.columnName && !interpretation.errorMessage) {
          const targetColumnInfo = parsedData.columnInfos.find(c => c.name.toLowerCase() === interpretation.columnName!.toLowerCase());
          
          if (targetColumnInfo) {
            calculationAttempted = true;
            const op = interpretation.operation as SupportedCalculationType;
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
              case "SUM":
              case "VAR":
                calculatedValue = calculateDynamicStat(parsedData.rows, targetColumnInfo.name, op, targetColumnInfo.type);
                break;
              default:
                calculationAttempted = false; 
            }

            if (calculatedValue !== null) {
               calculationResultContext = `Sistem melakukan perhitungan ${op} pada kolom "${targetColumnInfo.name}" dan hasilnya adalah ${typeof calculatedValue === 'number' ? calculatedValue.toLocaleString('id-ID', {minimumFractionDigits: 0, maximumFractionDigits: 2}) : calculatedValue}.`;
            } else if(calculationAttempted) { 
               calculationResultContext = `Sistem mencoba melakukan perhitungan ${op} pada kolom "${targetColumnInfo.name}", tetapi hasilnya tidak dapat ditentukan (mungkin karena tipe data tidak sesuai atau tidak ada data yang valid).`;
            }
          } else { 
             calculationResultContext = `Sistem mencoba menginterpretasi permintaan untuk kolom "${interpretation.columnName}", tetapi kolom tersebut tidak ditemukan dalam dataset.`;
          }
        } else if (interpretation.errorMessage) {
            calculationResultContext = `Saat mencoba menginterpretasi permintaan Anda ("${question}"), terjadi kendala: ${interpretation.errorMessage}.`;
        }
        
        return await answerQuestion(dataSummaryForAI, question, calculationResultContext);

      } else if (currentMode === 'documentQa' && processedTextContent) {
        return await answerQuestionFromContent(processedTextContent, question);
      }
      return "Konteks tidak tersedia untuk menjawab pertanyaan. Silakan unggah data, dokumen, atau URL terlebih dahulu.";
    } catch (e) {
      console.error("Error answering question:", e);
      const errorMessage = `Gagal menjawab pertanyaan: ${e instanceof Error ? e.message : String(e)}`;
      setError(errorMessage); // Set main error for query failures
      return errorMessage;
    } finally {
      setIsLoading(false);
    }
  }, [parsedData, processedTextContent, currentMode, dataSummaryForAI]);
  
  const handleEvaluateDocument = useCallback(async () => {
    if (currentMode !== 'documentQa' || !processedTextContent) {
      setError("Tidak ada konten dokumen untuk dievaluasi.");
      return;
    }
    setEvaluationLoading(true);
    setError(null);
    setDocumentEvaluation(null);
    try {
      const evaluation = await evaluateDocumentWithReferences(processedTextContent);
      setDocumentEvaluation(evaluation);
    } catch (e) {
      console.error("Error evaluating document:", e);
      const errorMessage = `Gagal mengevaluasi dokumen: ${e instanceof Error ? e.message : String(e)}`;
      setError(errorMessage);
      setDocumentEvaluation(null); 
    } finally {
      setEvaluationLoading(false);
    }
  }, [processedTextContent, currentMode]);


  const commonDisabledMessage = (message: string, showInputButton: boolean = true) => (
    <div className="text-center p-8 mt-4 bg-white rounded-lg shadow">
      <ExclamationTriangleIcon className="w-16 h-16 text-amber-500 mx-auto mb-4" />
      <h2 className="text-xl font-semibold mb-4 text-slate-700">
        {message}
      </h2>
      {showInputButton && (
          <button
              type="button"
              onClick={() => setActiveSection('input')}
              className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-150"
          >
              Ke Halaman Input
          </button>
      )}
    </div>
  );
  
  const renderSection = () => {
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
        return currentMode === 'dataAnalysis' && parsedData ? <DataOverview data={parsedData} /> : commonDisabledMessage("Silakan input data tabular terlebih dahulu untuk mengakses bagian ini.");
      case 'visualize':
        return currentMode === 'dataAnalysis' && parsedData ? <DataVisualizer data={parsedData} /> : commonDisabledMessage("Silakan input data tabular terlebih dahulu untuk mengakses bagian ini.");
      case 'insights':
        return currentMode === 'dataAnalysis' && parsedData ? <InsightsGenerator onGenerateInsights={handleGenerateInsights} isLoading={isLoading} /> : commonDisabledMessage("Silakan input data tabular terlebih dahulu untuk mengakses bagian ini.");
      case 'qa':
        return (currentMode === 'dataAnalysis' && parsedData) || (currentMode === 'documentQa' && processedTextContent) ? 
               <QAChat 
                  onQuery={handleQuery} 
                  isLoading={isLoading} // This is for the initial query
                  currentMode={currentMode}
                  documentSummary={documentSummary}
                  processedTextContent={processedTextContent}
                  sourceIdentifier={activeInputSourceIdentifier}
                  setAppIsLoading={setIsLoading} // For actions within chat like simplify/search
                  setAppLoadingMessage={setLoadingMessage}
                  setAppError={setError}
                /> : commonDisabledMessage("Silakan input data, dokumen, atau teks terlebih dahulu untuk mengakses bagian ini.");
      case 'evaluate':
        return <DocumentEvaluator
                  originalContent={processedTextContent}
                  onEvaluate={handleEvaluateDocument}
                  isLoading={evaluationLoading} 
                  evaluationResult={documentEvaluation}
                  sourceIdentifier={activeInputSourceIdentifier}
                  onDocumentUploadedAndProcessed={handleDocumentOrTextProcessed} 
                  setAppIsLoading={setIsLoading} 
                  setAppLoadingMessage={setLoadingMessage}
                  setAppError={setError}
               />;
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
  
  interface NavItem {
    key: ActiveSection;
    label: string;
    icon: React.ElementType; 
    requiredMode?: AppMode; 
    disabled?: boolean;
    
  }

  const navItems: NavItem[] = useMemo(() => {
    const baseItems: Array<{ key: ActiveSection; label: string; icon: React.ElementType; requiredMode?: AppMode }> = [
      { key: 'input', label: "Input", icon: ArrowDownTrayIcon },
      { key: 'overview', label: "Ringkasan", icon: TableCellsIcon, requiredMode: 'dataAnalysis' },
      { key: 'visualize', label: "Visualisasi", icon: ChartBarIcon, requiredMode: 'dataAnalysis' },
      { key: 'insights', label: "Wawasan", icon: LightBulbIcon, requiredMode: 'dataAnalysis' },
      { key: 'qa', label: "Tanya Jawab", icon: ChatBubbleLeftEllipsisIcon },
      { key: 'evaluate', label: "Evaluasi", icon: ClipboardDocumentCheckIcon }, 
    ];

    return baseItems.map((item): NavItem => {
      let isDisabled = false;
      if (item.key !== 'input' && item.key !== 'evaluate') { 
          if (item.requiredMode === 'dataAnalysis') {
              if (!parsedData || currentMode !== 'dataAnalysis') isDisabled = true;
          } else if (item.requiredMode === 'documentQa') { 
              if (!processedTextContent || currentMode !== 'documentQa') isDisabled = true;
          } else if (item.key === 'qa') { 
              if (currentMode === 'dataAnalysis' && !parsedData) isDisabled = true;
              else if (currentMode === 'documentQa' && !processedTextContent && item.requiredMode !== 'dataAnalysis') isDisabled = true; 
          }
      }
      return { ...item, disabled: isDisabled };
    });
  }, [parsedData, processedTextContent, currentMode]);

  const handleMenuClick = (key: ActiveSection) => {
    const item = navItems.find(i => i.key === key);
    if (item) {
      if (item.disabled) {
        setToastConfig({
          id: Date.now().toString(),
          message: `Silakan input data terlebih dahulu untuk mengakses bagian "${item.label}".`,
          type: 'warning',
          action: {
            label: 'Ke Halaman Input',
            onClick: () => {
              setActiveSection('input');
              setToastConfig(null);
            }
          }
        });
      } else {
        if (activeSection === 'evaluate' && key !== 'evaluate') {
          // No specific action needed here for now
        }
        if (key === 'evaluate' && !processedTextContent) {
          setCurrentMode('documentQa'); 
        }
        setActiveSection(key);
        setToastConfig(null); 
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-100">
      {toastConfig && (
          <ToastDisplay
            config={toastConfig}
            onClose={() => setToastConfig(null)}
          />
      )}
      <FirstVisitModal 
        isOpen={showFirstVisitModal}
        onDismiss={handleDismissFirstVisitModal}
        onViewGuide={handleNavigateToGuide}
      />
      
      <header 
        className="sticky top-0 z-50 w-full flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-slate-200 shadow-sm"
      >
        <h1 className="text-xl sm:text-2xl font-bold text-blue-600 truncate">
          Penganalisis & Evaluator Dokumen AI
        </h1>
        <button
          onClick={handleNavigateToGuide}
          className="p-2 text-slate-600 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full"
          aria-label="Buka panduan penggunaan"
          title="Panduan Penggunaan"
        >
          <QuestionMarkCircleIcon className="w-6 h-6" />
        </button>
      </header>

      {currentView === 'app' && !showFirstVisitModal && (
         <GuideBanner 
            onViewGuide={handleNavigateToGuide}
         />
      )}
      
      <main className="flex-grow p-4 sm:p-6 overflow-y-auto mb-20">
        {error && currentView === 'app' && (
          <div
            className="mb-4 p-4 rounded-md bg-red-50 border border-red-200 text-red-700 flex items-start justify-between break-words"
            role="alert"
          >
            <div>
                <h3 className="font-semibold">Error</h3>
                <p className="text-sm">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-2 p-1 text-red-500 hover:text-red-700 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500">
                <XCircleIcon className="w-5 h-5" />
            </button>
          </div>
        )}
        
        {currentView === 'app' ? (
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg min-h-[calc(100vh-250px)]">
            {renderSection()}
          </div>
        ) : (
          <GuidePage onBackToApp={handleNavigateToApp} />
        )}
      </main>
      
      {currentView === 'app' && (
        <footer 
          className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-top"
        >
          <nav className="flex justify-around items-center h-16 max-w-2xl mx-auto px-2">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => handleMenuClick(item.key)}
                disabled={item.disabled} 
                className={`flex flex-col items-center justify-center p-2 rounded-md w-1/5 text-xs sm:text-sm transition-colors duration-150
                  ${activeSection === item.key 
                    ? 'text-blue-600' 
                    : item.disabled ? 'text-slate-400 cursor-not-allowed' : 'text-slate-600 hover:text-blue-500'}
                  ${item.disabled ? 'opacity-70 cursor-not-allowed' : 'hover:bg-slate-100'}`}
                aria-current={activeSection === item.key ? 'page' : undefined}
                aria-disabled={item.disabled}
              >
                <item.icon className={`w-5 h-5 sm:w-6 sm:h-6 mb-0.5 
                  ${activeSection === item.key ? 'text-blue-600' : item.disabled ? 'text-slate-400' : 'text-slate-600'}`} 
                />
                {item.label}
              </button>
            ))}
          </nav>
        </footer>
      )}
       <div className="text-center py-3 px-6 text-xs text-slate-700 bg-slate-200">
         &copy; 2025 Bagas Wibowo. Hak Cipta Dilindungi.
      </div>
    </div>
  );
};
export default App;