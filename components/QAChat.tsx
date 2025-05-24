import React, { useState, useRef, useEffect, useContext } from 'react';
import { ChatMessage } from '../types';
import type { AppMode } from '../App';
import { ThemeContext } from '../index';
import ReactMarkdown from 'react-markdown';
import { 
  PaperAirplaneIcon, UserIcon, SparklesIcon, ChatBubbleLeftEllipsisIcon, DocumentTextIcon
} from '@heroicons/react/24/solid'; // Use solid for main action icons

interface QAChatProps {
  onQuery: (question: string) => Promise<string>;
  isLoading: boolean;
  currentMode: AppMode;
  documentSummary?: string | null;
  processedTextContent?: string | null; 
  sourceIdentifier?: string; 
}


export const QAChat: React.FC<QAChatProps> = ({ 
    onQuery, 
    isLoading, 
    currentMode, 
    documentSummary,
    sourceIdentifier 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { themeMode } = useContext(ThemeContext);
  const isDarkMode = themeMode === 'dark';

  const ChatMarkdownComponents = {
      p: ({node, ...props}: any) => <p className="mb-1 break-words text-sm" {...props} />,
      ul: ({node, ...props}: any) => <ul className="list-disc pl-5 my-1 text-sm" {...props} />,
      ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 my-1 text-sm" {...props} />,
      li: ({node, ...props}: any) => <li className="mb-0.5 text-sm" {...props} />,
      a: ({node, ...props}: any) => <a className="text-blue-500 hover:underline text-sm" target="_blank" rel="noopener noreferrer" {...props} />,
      strong: ({node, ...props}: any) => <strong className="font-semibold text-sm" {...props} />,
      code: ({node, inline, className, children, ...props}: any) => {
        return !inline ? (
          <pre className={`my-1 p-2 rounded bg-slate-200 dark:bg-slate-700 overflow-x-auto text-xs ${className || ''}`} {...props}>
            <code>{String(children).replace(/\n$/, '')}</code>
          </pre>
        ) : (
          <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-600 rounded text-xs text-pink-600 dark:text-pink-400" {...props}>
            {children}
          </code>
        );
      },
  };
  const SummaryMarkdownComponents = {
      p: ({node, ...props}: any) => <p className="leading-normal text-slate-600 dark:text-slate-400 text-xs m-0" {...props} />,
      ul: ({node, ...props}: any) => <ul className="list-disc pl-3 my-0.5 text-xs text-slate-600 dark:text-slate-400" {...props} />,
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentMode, isLoading]); 

  useEffect(() => {
    setMessages([]);
  }, [currentMode, sourceIdentifier]);


  const handleSendMessage = async () => {
    if (inputValue.trim() === '') return;

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
      const aiMessage: ChatMessage = {
        id: Date.now().toString() + '_ai',
        sender: 'ai',
        text: aiResponseText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      const aiErrorMessage: ChatMessage = {
        id: Date.now().toString() + '_ai_error',
        sender: 'ai',
        text: `Maaf, terjadi kesalahan: ${errorMessage}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiErrorMessage]);
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
  
  const placeholderText = currentMode === 'dataAnalysis'
    ? "Tanya tentang data Anda..."
    : `Tanya tentang ${getContextName()}...`;

  const initialMessageText = currentMode === 'dataAnalysis'
    ? `Ajukan pertanyaan tentang dataset "${getContextName()}".`
    : `Ajukan pertanyaan tentang konten dari ${getContextName()} yang telah Anda berikan.`;
  
  const initialMessageExample = currentMode === 'dataAnalysis'
    ? "Contoh: 'Berapa nilai rata-rata di kolom Penjualan?'"
    : "Contoh: 'Apa poin utama dari konten ini?'";


  return (
    <div className="bg-white dark:bg-slate-800 p-0 rounded-lg shadow-none flex flex-col h-full min-h-[500px]"> {/* No internal padding, App.tsx handles it */}
      <div className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center p-4 border-b border-slate-200 dark:border-slate-700">
        <ChatBubbleLeftEllipsisIcon className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" />
        {cardTitleText}
      </div>

      {currentMode === 'documentQa' && documentSummary && (
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
          <div className="flex items-center mb-1">
              <DocumentTextIcon className="w-5 h-5 mr-2 text-blue-500 dark:text-blue-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Ringkasan Konten
              </span>
          </div>
          <div className="max-h-24 overflow-y-auto prose prose-xs dark:prose-invert">
           <ReactMarkdown components={SummaryMarkdownComponents}>{documentSummary}</ReactMarkdown>
          </div>
        </div>
      )}
      
      <div className="flex-grow flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-700/30">
        <div className="flex-grow p-4 space-y-4 overflow-y-auto">
          {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400 p-4">
                <ChatBubbleLeftEllipsisIcon className="w-16 h-16 mb-4 opacity-50" />
                <h3 className="text-md font-semibold">{initialMessageText}</h3>
                <p className="text-xs">{initialMessageExample}</p>
              </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] p-2.5 rounded-xl shadow-sm
                  ${msg.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-bl-none'
                  }`}
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  {msg.sender === 'user' ? (
                      <UserIcon className="w-4 h-4 p-0.5 bg-blue-400 text-white rounded-full" />
                  ) : (
                      <SparklesIcon className="w-4 h-4 p-0.5 bg-green-400 dark:bg-green-500 text-white rounded-full" />
                  )}
                  <span className="text-xs font-semibold">
                      {msg.sender === 'user' ? 'Anda' : 'Asisten AI'}
                  </span>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none message-content"> {/* Add a class for specific styling */}
                  <ReactMarkdown components={ChatMarkdownComponents}>{msg.text}</ReactMarkdown>
                </div>
                <p className={`text-right mt-1 text-xs ${msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400 dark:text-slate-500'}`}>
                  {msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length -1]?.sender === 'user' && (
            <div className="flex justify-start">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm rounded-bl-none inline-flex items-center space-x-2">
                <svg className="animate-spin h-4 w-4 text-blue-500 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm text-slate-500 dark:text-slate-300">AI sedang berpikir...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800">
          <div className="flex items-center space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && inputValue.trim() !== '' && handleSendMessage()}
                placeholder={placeholderText}
                disabled={isLoading}
                aria-label="Ketik pertanyaan Anda"
                className="flex-grow block w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm 
                           bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                           placeholder-slate-400 dark:placeholder-slate-500 text-sm"
              />
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={isLoading || inputValue.trim() === ''}
                className="p-2.5 rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label={isLoading ? "Mengirim pertanyaan" : "Kirim pertanyaan"}
              >
                {isLoading ? (
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