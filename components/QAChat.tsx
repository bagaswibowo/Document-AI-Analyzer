
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from '../types';
import type { AppMode } from '../App';
import { INFO_NOT_FOUND_MARKER, simplifyText, answerQuestionWithInternetSearch } from '../services/aiService';


import ReactMarkdown from 'react-markdown';
import { 
  PaperAirplaneIcon, UserIcon, SparklesIcon, ChatBubbleLeftEllipsisIcon, DocumentTextIcon,
  LanguageIcon, MagnifyingGlassIcon, ChevronDownIcon, LinkIcon
} from '@heroicons/react/24/solid';

interface QAChatProps {
  onQuery: (question: string) => Promise<string>;
  isLoading: boolean; // General loading for initial query
  currentMode: AppMode;
  documentSummary?: string | null;
  processedTextContent?: string | null; 
  sourceIdentifier?: string;
  setAppIsLoading: (loading: boolean) => void; // For actions within chat
  setAppLoadingMessage: (message: string) => void;
  setAppError: (error: string | null) => void;
}

export const QAChat: React.FC<QAChatProps> = ({ 
    onQuery, 
    isLoading: initialQueryLoading, 
    currentMode, 
    documentSummary,
    sourceIdentifier,
    setAppIsLoading,
    setAppLoadingMessage,
    setAppError
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false); // Loading for simplify/search

  const ChatMarkdownComponents = {
      p: ({node, ...props}: any) => <p className="mb-1 break-words text-sm text-current" {...props} />,
      ul: ({node, ...props}: any) => <ul className="list-disc pl-5 my-1 text-sm text-current" {...props} />,
      ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 my-1 text-sm text-current" {...props} />,
      li: ({node, ...props}: any) => <li className="mb-0.5 text-sm text-current" {...props} />,
      a: ({node, ...props}: any) => {
          const isUserMessageLink = node.position?.start.line !== undefined && messages.find(msg => msg.sender === 'user' && msg.text.includes(node.properties.href));
          return <a 
            className={`${isUserMessageLink ? 'text-white hover:text-blue-200' : 'text-blue-600 hover:text-blue-700'} underline text-sm`} 
            target="_blank" rel="noopener noreferrer" {...props} 
          />;
      },
      strong: ({node, ...props}: any) => <strong className="font-semibold text-current" {...props} />,
      code: ({node, inline, className, children, ...props}: any) => {
        const parentMessage = messages.find(msg => {
            const msgTextLines = msg.text.split('\n');
            const nodeText = String(children).trim();
            return msgTextLines.some(line => line.includes(nodeText));
        });
        const isUserCode = parentMessage?.sender === 'user';

        return !inline ? (
          <pre 
            className={`my-1 p-2 rounded ${isUserCode ? 'bg-black/20' : 'bg-slate-100'} overflow-x-auto text-xs ${className || ''}`} 
            {...props}
          >
            <code className={isUserCode ? 'text-white' : 'text-slate-800'}>{String(children).replace(/\n$/, '')}</code> 
          </pre>
        ) : (
          <code 
            className={`px-1 py-0.5 rounded text-xs ${isUserCode ? 'bg-black/20 text-white' : 'bg-slate-200 text-pink-600'}`} 
            {...props}
           >
            {children}
          </code>
        );
      },
  };

  const EnhancedSummaryMarkdownComponents = {
    h1: ({node, ...props}: any) => <h1 className="text-2xl font-bold my-3 text-blue-600 border-b pb-1 border-slate-300" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-xl font-semibold my-2 text-slate-700" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-lg font-medium my-1 text-slate-600" {...props} />,
    p: ({node, ...props}: any) => <p className="my-1.5 leading-relaxed text-slate-700" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 my-1.5 space-y-0.5 text-slate-700" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 my-1.5 space-y-0.5 text-slate-700" {...props} />,
    li: ({node, ...props}: any) => <li className="text-slate-700" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-semibold text-sky-800 bg-sky-100 px-1 py-0.5 rounded-sm" {...props} />,
    em: ({node, ...props}: any) => <em className="italic text-slate-600" {...props} />,
    a: ({node, ...props}: any) => <a className="text-blue-600 hover:text-blue-700 underline" target="_blank" rel="noopener noreferrer" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
      const match = /language-(\w+)/.exec(className || '');
      return !inline ? (
        <pre className={`my-2 p-2 rounded-md bg-slate-100 overflow-x-auto text-xs ${className || ''}`} {...props}>
          <code className={`language-${match ? match[1] : 'text'}`}>{String(children).replace(/\n$/, '')}</code>
        </pre>
      ) : (
        <code className="px-1 py-0.5 bg-slate-200 rounded text-xs text-pink-600" {...props}>
          {children}
        </code>
      );
    },
    blockquote: ({node, ...props}: any) => <blockquote className="my-1.5 pl-3 border-l-4 border-slate-300 italic text-slate-600" {...props} />,
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isProcessingAction]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentMode, initialQueryLoading, isProcessingAction]); 

  useEffect(() => {
    setMessages([]);
  }, [currentMode, sourceIdentifier]);

  const handleSendMessage = async () => {
    if (inputValue.trim() === '') return;
    setAppError(null);

    const userMessage: ChatMessage = {
      id: Date.now().toString() + '_user',
      sender: 'user',
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');

    try {
      const aiResponseText = await onQuery(currentInput);
      let processedText = aiResponseText;
      let suggestsSearch = false;
      if (aiResponseText.startsWith(INFO_NOT_FOUND_MARKER)) {
        processedText = aiResponseText.substring(INFO_NOT_FOUND_MARKER.length).trim();
        suggestsSearch = true;
      }

      const aiMessage: ChatMessage = {
        id: Date.now().toString() + '_ai',
        sender: 'ai',
        text: processedText,
        timestamp: new Date(),
        isSimplifiable: !suggestsSearch && processedText.length > 50, // Heuristic for simplifiable
        suggestsInternetSearch: suggestsSearch,
        relatedUserQuestion: suggestsSearch ? currentInput : undefined,
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setAppError(`Gagal mendapatkan jawaban dari AI: ${errorMessage}`);
      const aiErrorMessage: ChatMessage = {
        id: Date.now().toString() + '_ai_error',
        sender: 'ai',
        text: `Maaf, terjadi kesalahan saat mencoba mendapatkan jawaban: ${errorMessage}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiErrorMessage]);
    }
  };

  const handleSimplify = async (messageId: string, textToSimplify: string) => {
    setAppError(null);
    setIsProcessingAction(true);
    setAppIsLoading(true);
    setAppLoadingMessage("Menyederhanakan jawaban...");

    try {
      const simplifiedText = await simplifyText(textToSimplify);
      const newAiMessage: ChatMessage = {
        id: Date.now().toString() + '_ai_simplified',
        sender: 'ai',
        text: simplifiedText,
        timestamp: new Date(),
        isSimplifiable: false,
        originalTextForSimplification: textToSimplify,
        isInternetSearchResult: false,
      };
      setMessages(prev => prev.map(msg => msg.id === messageId ? {...msg, isSimplifiable: false} : msg));
      setMessages(prev => [...prev, newAiMessage]);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setAppError(`Gagal menyederhanakan jawaban: ${errorMessage}`);
      // Optionally add an error message to chat
    } finally {
      setIsProcessingAction(false);
      setAppIsLoading(false);
    }
  };

  const handleInternetSearch = async (messageId: string, originalQuestion: string) => {
    if (!originalQuestion) return;
    setAppError(null);
    setIsProcessingAction(true);
    setAppIsLoading(true);
    setAppLoadingMessage(`Mencari jawaban di internet untuk: "${originalQuestion.substring(0,30)}..."`);

    try {
      const { text, sources } = await answerQuestionWithInternetSearch(originalQuestion);
      const newAiMessage: ChatMessage = {
        id: Date.now().toString() + '_ai_internet',
        sender: 'ai',
        text: text,
        timestamp: new Date(),
        isSimplifiable: text.length > 50,
        isInternetSearchResult: true,
        sources: sources,
      };
      setMessages(prev => prev.map(msg => msg.id === messageId ? {...msg, suggestsInternetSearch: false} : msg));
      setMessages(prev => [...prev, newAiMessage]);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setAppError(`Gagal mencari di internet: ${errorMessage}`);
    } finally {
      setIsProcessingAction(false);
      setAppIsLoading(false);
    }
  };


  const getContextName = () => {
    if (currentMode === 'dataAnalysis') {
      return sourceIdentifier || 'Dataset Anda';
    }
    if (currentMode === 'documentQa') {
      if (sourceIdentifier?.toLowerCase().startsWith('http')) {
        try { return `Website (${new URL(sourceIdentifier).hostname})`; }
        catch { return sourceIdentifier || 'URL Anda';}
      }
      return sourceIdentifier || 'Dokumen/Teks Anda';
    }
    return 'Konteks Anda';
  }

  const cardTitleText = `Tanya Jawab: ${getContextName()}`;
  
  const placeholderText = initialQueryLoading || isProcessingAction
    ? "Memproses..."
    : currentMode === 'dataAnalysis'
    ? "Tanya tentang data Anda..."
    : `Tanya tentang ${getContextName()}...`;

  const initialMessageText = currentMode === 'dataAnalysis'
    ? `Ajukan pertanyaan tentang dataset "${getContextName()}".`
    : `Ajukan pertanyaan tentang konten dari ${getContextName()} yang telah Anda berikan.`;
  
  const initialMessageExample = currentMode === 'dataAnalysis'
    ? "Contoh: 'Berapa nilai rata-rata di kolom Penjualan?'"
    : "Contoh: 'Apa poin utama dari konten ini?' atau 'Apa itu fotosintesis?'";


  return (
    <div className="bg-white p-0 rounded-lg shadow-none flex flex-col h-full min-h-[500px]">
      <div className="text-lg font-semibold text-slate-800 mb-0 flex items-center p-4 border-b border-slate-200">
        <ChatBubbleLeftEllipsisIcon className="w-6 h-6 mr-2 text-cyan-600" />
        {cardTitleText}
      </div>

      {currentMode === 'documentQa' && documentSummary && (
        <div className="px-4 py-3 border-b border-slate-200">
          <div className="flex items-center mb-2">
              <DocumentTextIcon className="w-5 h-5 mr-2 text-blue-500" />
              <span className="text-sm font-medium text-slate-700">
                  Ringkasan Konten
              </span>
          </div>
          <div className="prose prose-sm sm:prose-base max-w-none bg-slate-50 p-3 rounded-md border border-slate-200">
           <ReactMarkdown components={EnhancedSummaryMarkdownComponents}>{documentSummary}</ReactMarkdown>
          </div>
        </div>
      )}
      
      <div className="flex-grow flex flex-col overflow-hidden bg-slate-50">
        <div className="flex-grow p-4 space-y-4 overflow-y-auto">
          {messages.length === 0 && !initialQueryLoading && !isProcessingAction && (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-4">
                <ChatBubbleLeftEllipsisIcon className="w-16 h-16 mb-4 opacity-50 text-cyan-400" />
                <h3 className="text-md font-semibold">{initialMessageText}</h3>
                <p className="text-xs">{initialMessageExample}</p>
              </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] p-2.5 rounded-xl shadow-sm
                  ${msg.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white text-slate-800 rounded-bl-none border border-slate-200'
                  }`}
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  {msg.sender === 'user' ? (
                      <UserIcon className="w-4 h-4 p-0.5 bg-blue-400 text-white rounded-full" />
                  ) : (
                      <SparklesIcon className="w-4 h-4 p-0.5 bg-green-400 text-white rounded-full" />
                  )}
                  <span className={`text-xs font-semibold ${msg.sender === 'user' ? 'text-white' : 'text-slate-800'}`}>
                      {msg.sender === 'user' ? 'Anda' : msg.isInternetSearchResult ? 'Asisten AI (dari Internet)' : msg.originalTextForSimplification ? 'Asisten AI (Disederhanakan)' : 'Asisten AI'}
                  </span>
                </div>
                <div className={`prose prose-sm max-w-none message-content ${msg.sender === 'user' ? 'text-white' : 'text-slate-800'}`}>
                  <ReactMarkdown components={ChatMarkdownComponents}>{msg.text}</ReactMarkdown>
                </div>
                {msg.sender === 'ai' && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <h4 className="text-xs font-semibold text-slate-600 mb-1 flex items-center">
                      <LinkIcon className="w-3 h-3 mr-1" /> Sumber:
                    </h4>
                    <ul className="list-none pl-0 space-y-0.5">
                      {msg.sources.map((source, index) => (
                        <li key={index}>
                          <a
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-700 hover:underline truncate block"
                            title={source.uri}
                          >
                            {index+1}. {source.title || new URL(source.uri).hostname}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {msg.sender === 'ai' && (msg.isSimplifiable || msg.suggestsInternetSearch) && !isProcessingAction && (
                  <div className="mt-2 pt-2 border-t border-slate-200 space-x-2 flex justify-end">
                    {msg.isSimplifiable && (
                      <button
                        onClick={() => handleSimplify(msg.id, msg.text)}
                        disabled={isProcessingAction}
                        className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md flex items-center"
                        title="Sederhanakan jawaban ini"
                      >
                        <LanguageIcon className="w-3.5 h-3.5 mr-1" /> Sederhanakan
                      </button>
                    )}
                    {msg.suggestsInternetSearch && msg.relatedUserQuestion && (
                      <button
                        onClick={() => handleInternetSearch(msg.id, msg.relatedUserQuestion!)}
                        disabled={isProcessingAction}
                        className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md flex items-center"
                        title="Cari jawaban ini di Internet"
                      >
                        <MagnifyingGlassIcon className="w-3.5 h-3.5 mr-1" /> Cari di Internet
                      </button>
                    )}
                  </div>
                )}
                <p className={`text-right mt-1 text-xs ${msg.sender === 'user' ? 'text-blue-200' : 'text-slate-500'}`}>
                  {msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {(initialQueryLoading || isProcessingAction) && messages[messages.length -1]?.sender === 'user' && (
            <div className="flex justify-start">
              <div className="p-2.5 rounded-xl bg-white text-slate-800 shadow-sm rounded-bl-none inline-flex items-center space-x-2 border border-slate-200">
                <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm text-slate-600">AI sedang berpikir...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
          <div className="flex items-center space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !initialQueryLoading && !isProcessingAction && inputValue.trim() !== '' && handleSendMessage()}
                placeholder={placeholderText}
                disabled={initialQueryLoading || isProcessingAction}
                aria-label="Ketik pertanyaan Anda"
                className="flex-grow block w-full px-3 py-2.5 border border-slate-300 rounded-md shadow-sm 
                           bg-white text-slate-900 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                           placeholder-slate-600 text-sm"
              />
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={initialQueryLoading || isProcessingAction || inputValue.trim() === ''}
                className="p-2.5 rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label={(initialQueryLoading || isProcessingAction) ? "Mengirim pertanyaan" : "Kirim pertanyaan"}
              >
                {(initialQueryLoading || isProcessingAction) ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <PaperAirplaneIcon className="h-5 w-5" />
                )}
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};