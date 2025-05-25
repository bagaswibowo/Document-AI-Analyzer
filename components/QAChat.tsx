

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from '../types';
import type { AppMode } from '../App';
// Fix: Import AiServiceResponse for correct prop typing
import { INFO_NOT_FOUND_MARKER, simplifyText, answerQuestionWithInternetSearch, getConversationalAnswerWithInternetSearch, AiServiceResponse } from '../services/aiService';


import ReactMarkdown from 'react-markdown';
import {
  PaperAirplaneIcon, UserIcon, SparklesIcon, ChatBubbleLeftEllipsisIcon, DocumentTextIcon,
  LanguageIcon, MagnifyingGlassIcon, LinkIcon, ServerStackIcon, GlobeAltIcon
} from '@heroicons/react/24/solid';

interface QAChatProps {
  // Fix: Update onQuery to return Promise<AiServiceResponse>
  onQuery: (question: string) => Promise<AiServiceResponse>; // For context-based queries
  isLoading: boolean; // General loading for initial context query
  currentMode: AppMode;
  documentSummary?: string | null;
  documentSummarySuggestions?: string[];
  processedTextContent?: string | null;
  sourceIdentifier?: string;
  setAppIsLoading: (loading: boolean) => void;
  setAppLoadingMessage: (message: string) => void;
  setAppError: (error: string | null) => void;
}

export const QAChat: React.FC<QAChatProps> = ({
    onQuery,
    isLoading: contextQueryLoading,
    currentMode,
    documentSummary,
    documentSummarySuggestions,
    processedTextContent, 
    sourceIdentifier,
    setAppIsLoading,
    setAppLoadingMessage,
    setAppError
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  const ChatMarkdownComponents = {
      p: ({node, ...props}: any) => <p className="mb-1 break-words text-sm text-current" {...props} />,
      ul: ({node, ...props}: any) => <ul className="list-disc pl-5 my-1 text-sm text-current" {...props} />,
      ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 my-1 text-sm text-current" {...props} />,
      li: ({node, ...props}: any) => <li className="mb-0.5 text-sm text-current" {...props} />,
      a: ({node, ...props}: any) => {
          // Check if the link is part of a user message or an AI message for styling
          // This heuristic might not be perfect if users also send Markdown links
          const parentMessage = messages.find(msg => {
            if (!node?.position?.start?.line) return false;
            // A simple check: if the href is in the raw message text
            return msg.text.includes(node.properties.href);
          });
          const isUserMessageLink = parentMessage?.sender === 'user';

          return <a
            className={`${isUserMessageLink ? 'text-white hover:text-blue-200' : 'text-blue-600 hover:text-blue-700'} underline text-sm`}
            target="_blank" rel="noopener noreferrer" {...props}
          />;
      },
      strong: ({node, ...props}: any) => {
        return <strong className="font-semibold text-current" {...props} />;
      },
      sup: ({node, ...props}: any) => {
        // Standard sup rendering if AI or user uses it.
        return <sup className="mx-0.5 text-blue-600 font-semibold hover:underline" {...props} />;
      },
      code: ({node, inline, className, children, ...props}: any) => {
        const parentMessage = messages.find(msg => {
            if (!node?.position?.start?.line) return false;
            const nodeTextContent = String(children).trim();
            return msg.text.split('\n').some(line => line.includes(nodeTextContent));
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
      blockquote: ({node, ...props}:any) => <blockquote className={`my-1 pl-3 border-l-4 ${messages.find(msg => msg.text.includes(String(node.children[0]?.children[0]?.value)))?.sender === 'user' ? 'border-blue-400' : 'border-slate-300'} italic ${messages.find(msg => msg.text.includes(String(node.children[0]?.children[0]?.value)))?.sender === 'user' ? 'text-blue-100' : 'text-slate-600'} text-sm`} {...props} />
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

  useEffect(scrollToBottom, [messages, isProcessingAction, contextQueryLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentMode, contextQueryLoading, isProcessingAction]);

  useEffect(() => {
    // Reset messages only if sourceIdentifier changes OR if it's documentQa and processedTextContent changes
    if (currentMode === 'dataAnalysis') {
        setMessages([]);
    } else if (currentMode === 'documentQa') {
        setMessages([]);
    }
  }, [currentMode, sourceIdentifier, processedTextContent]);

  const addMessageToList = (sender: 'user' | 'ai', text: string, isInternetSearchResult: boolean = false, sources?: ChatMessage['sources'], suggestedQuestions?: string[], isSimplifiable?: boolean, originalTextForSimplification?: string, suggestsInternetSearch?: boolean, relatedUserQuestion?: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString() + `_${sender}`,
      sender,
      text,
      timestamp: new Date(),
      isInternetSearchResult,
      sources,
      suggestedQuestions,
      isSimplifiable,
      originalTextForSimplification,
      suggestsInternetSearch,
      relatedUserQuestion,
    };
    setMessages(prev => [...prev, newMessage]);
  };
  
  const handleNewAiResponse = (aiResponse: AiServiceResponse, isInternetSearch: boolean = false) => {
    if (aiResponse.mainText) {
      addMessageToList(
        'ai', 
        aiResponse.mainText, 
        isInternetSearch, 
        aiResponse.sources, 
        undefined, // Suggestions will be in a separate message
        // Allow simplification for any AI message if it's long enough
        aiResponse.mainText.length > 100, 
      );
    }
    if (aiResponse.suggestedQuestions && aiResponse.suggestedQuestions.length > 0) {
      // Add a separate message for suggestions
      addMessageToList(
        'ai',
        '', // No main text for suggestion-only message
        isInternetSearch, // Inherit internet search status for the suggestion message
        undefined, // No sources for suggestion-only message
        aiResponse.suggestedQuestions
      );
    }
  };


  const handleQueryContext = async () => {
    if (inputValue.trim() === '') return;
    setAppError(null);

    addMessageToList('user', inputValue);
    const currentInput = inputValue;
    setInputValue('');

    try {
      const aiResponse = await onQuery(currentInput); // aiResponse is AiServiceResponse
      let processedText = aiResponse.mainText;
      let suggestsSearch = false;

      if (aiResponse.mainText.startsWith(INFO_NOT_FOUND_MARKER)) {
        processedText = aiResponse.mainText.substring(INFO_NOT_FOUND_MARKER.length).trim();
        suggestsSearch = true;
      }
      
      handleNewAiResponse({
          mainText: processedText,
          suggestedQuestions: aiResponse.suggestedQuestions,
          sources: aiResponse.sources // Retain sources if onQuery can return them
      }, false);


      if (suggestsSearch) {
         setMessages(prevMessages => {
            const lastAiMsgIndex = prevMessages.map((m, i) => m.sender === 'ai' ? i : -1).filter(i => i !== -1).pop();
            if (lastAiMsgIndex !== undefined && lastAiMsgIndex > -1 && prevMessages[lastAiMsgIndex].text === processedText) { 
                const updatedMessages = [...prevMessages];
                updatedMessages[lastAiMsgIndex] = {
                    ...prevMessages[lastAiMsgIndex], 
                    suggestsInternetSearch: true,
                    relatedUserQuestion: currentInput
                };
                return updatedMessages;
            }
            return prevMessages;
         });
      }


    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setAppError(`Gagal mendapatkan jawaban dari AI (konteks): ${errorMessage}`);
      addMessageToList('ai', `Maaf, terjadi kesalahan saat mencoba mendapatkan jawaban dari konteks: ${errorMessage}`);
    }
  };

  const handleGeneralInternetSearch = async (query: string) => {
    try {
        const { mainText: conversationalText, sources: conversationalSources, suggestedQuestions } = await getConversationalAnswerWithInternetSearch(query);
        handleNewAiResponse({
            mainText: conversationalText,
            sources: conversationalSources,
            suggestedQuestions: suggestedQuestions
        }, true);
    } catch (e) {
        throw e; // Re-throw to be caught by the caller
    }
  };

  const handleStructuredInternetSearch = async (query: string) => {
    try {
        const { mainText: aiRawText, sources, suggestedQuestions } = await answerQuestionWithInternetSearch(query);
        let processedAiText = aiRawText;

        if (sources && sources.length > 0) {
            const lines = aiRawText.split('\n');
            let currentSourceIndex = 0;
            processedAiText = lines.map(line => {
                const match = line.match(/^(\s*\*?\s*\*\*Tautan Asli:\*\*\s*\[)(.*?)(\]\s*)$/);
                if (match && currentSourceIndex < sources.length) {
                    const sourceToUse = sources[currentSourceIndex];
                    // Use placeholder from AI, which client should replace
                    const placeholderTitle = match[2]; // This is what AI generated as "AI akan menuliskan judul..."
                    const newLine = `${match[1]}${sourceToUse.title.replace(/\[|\]/g, '')}${match[3]}(${sourceToUse.uri})`;
                    currentSourceIndex++;
                    return newLine;
                }
                return line;
            }).join('\n');
        }
         handleNewAiResponse({
            mainText: processedAiText,
            sources: sources,
            suggestedQuestions: suggestedQuestions
        }, true);
    } catch (e) {
        throw e; // Re-throw to be caught by the caller
    }
  };


  const handleDirectInternetSearch = async (questionFromButton?: string) => {
    const query = questionFromButton || inputValue;
    if (query.trim() === '') return;
    setAppError(null);
    setIsProcessingAction(true);
    setAppIsLoading(true);
    setAppLoadingMessage(`Mencari di internet: "${query.substring(0,30)}..."`);

    if (!questionFromButton) { // Only add user message if it's a new input, not from a suggestion button
        addMessageToList('user', query);
        setInputValue('');
    }

    try {
      const lowerCaseQuery = query.toLowerCase();
      if (lowerCaseQuery.startsWith('cari ') || lowerCaseQuery.startsWith('carikan ')) {
        await handleStructuredInternetSearch(query);
      } else {
        await handleGeneralInternetSearch(query);
      }

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setAppError(`Gagal mencari di internet: ${errorMessage}`);
      addMessageToList('ai', `Maaf, terjadi kesalahan saat mencari di internet: ${errorMessage}`);
    } finally {
      setIsProcessingAction(false);
      setAppIsLoading(false);
    }
  };


  const handleSimplify = async (messageId: string, textToSimplify: string) => {
    setAppError(null);
    setIsProcessingAction(true);
    setAppIsLoading(true);
    setAppLoadingMessage("Menyederhanakan jawaban...");

    try {
      const simplifiedResponse = await simplifyText(textToSimplify);
      
      setMessages(prev => prev.map(msg => msg.id === messageId ? {...msg, isSimplifiable: false} : msg));
      handleNewAiResponse({
          mainText: simplifiedResponse.mainText,
          suggestedQuestions: simplifiedResponse.suggestedQuestions
      }, false);
      
      // Add original text to the newly created simplified message if needed for context
      setMessages(prevMessages => {
          const lastAiMsgIndex = prevMessages.map((m,i) => m.sender === 'ai' ? i : -1).filter(i => i !== -1).pop();
           // Make sure we're updating the correct, newly added simplified message
          if (lastAiMsgIndex !== undefined && lastAiMsgIndex > -1 && prevMessages[lastAiMsgIndex].text === simplifiedResponse.mainText) {
                const updatedMessages = [...prevMessages];
                updatedMessages[lastAiMsgIndex] = {
                    ...updatedMessages[lastAiMsgIndex],
                    originalTextForSimplification: textToSimplify
                };
                return updatedMessages;
          }
          return prevMessages;
      });


    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setAppError(`Gagal menyederhanakan jawaban: ${errorMessage}`);
    } finally {
      setIsProcessingAction(false);
      setAppIsLoading(false);
    }
  };

  const handleFallbackInternetSearch = async (messageId: string, originalQuestion: string) => {
    if (!originalQuestion) return;
    setMessages(prev => prev.map(msg => msg.id === messageId ? {...msg, suggestsInternetSearch: false} : msg));
    await handleDirectInternetSearch(originalQuestion);
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
  };

  const cardTitleText = `Tanya Jawab AI`;
  const contextSpecificTitle = getContextName();

  const placeholderText = contextQueryLoading || isProcessingAction
    ? "Memproses..."
    : "Ketik pertanyaan Anda di sini untuk pencarian internet...";

  const initialMessageText = `Ajukan pertanyaan apa pun. Saya akan mencoba menjawab menggunakan pencarian internet. Anda juga bisa bertanya spesifik tentang ${currentMode === 'dataAnalysis' ? `dataset "${contextSpecificTitle}"` : `konten "${contextSpecificTitle}"`} menggunakan tombol di bawah.`;

  const initialMessageExample = `Contoh: "Apa berita terbaru tentang AI?", "Jelaskan fotosintesis", atau "Berapa total penjualan di ${contextSpecificTitle}?" (gunakan tombol 'Tanya Dataset').`;


  const contextButtonText = currentMode === 'dataAnalysis' ? "Tanya Dataset" : "Tanya Dokumen";
  const canQueryContext = currentMode === 'dataAnalysis' || (currentMode === 'documentQa' && (processedTextContent || documentSummary));


  return (
    <div className="bg-white p-0 rounded-lg shadow-none flex flex-col h-full min-h-[500px]">
      <div className="text-lg font-semibold text-slate-800 mb-0 flex items-center p-4 border-b border-slate-200">
        <ChatBubbleLeftEllipsisIcon className="w-6 h-6 mr-2 text-cyan-600" />
        {cardTitleText}
        { (sourceIdentifier || (currentMode === 'documentQa' && (processedTextContent || documentSummary))) && canQueryContext &&
          <span className="ml-2 text-sm font-normal text-slate-500 truncate max-w-[calc(100%-150px)]">(Konteks Aktif: {contextSpecificTitle})</span>
        }
      </div>

      {(currentMode === 'documentQa' && (documentSummary || documentSummarySuggestions)) && canQueryContext && (
        <div className="px-4 py-3 border-b border-slate-200">
          {documentSummary && (
            <>
              <div className="flex items-center mb-2">
                  <DocumentTextIcon className="w-5 h-5 mr-2 text-blue-500" />
                  <span className="text-sm font-medium text-slate-700">
                      Ringkasan Konten ({contextSpecificTitle})
                  </span>
              </div>
              <div className="prose prose-sm sm:prose-base max-w-none bg-slate-50 p-3 rounded-md border border-slate-200 mb-2">
              <ReactMarkdown components={EnhancedSummaryMarkdownComponents}>{documentSummary}</ReactMarkdown>
              </div>
            </>
          )}
          {documentSummarySuggestions && documentSummarySuggestions.length > 0 && (
            <div className="mt-2">
                <h4 className="text-xs font-semibold text-slate-600 mb-1">Saran Pertanyaan (Ringkasan):</h4>
                <div className="flex flex-wrap gap-1.5">
                {documentSummarySuggestions.map((q, i) => (
                    <button
                    key={`summary-sugg-${i}`}
                    onClick={() => handleDirectInternetSearch(q)}
                    className="px-2 py-1 text-xs bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-md transition-colors"
                    disabled={isProcessingAction || contextQueryLoading}
                    >
                    {q}
                    </button>
                ))}
                </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-grow flex flex-col overflow-hidden bg-slate-50">
        <div className="flex-grow p-4 space-y-4 overflow-y-auto">
          {messages.length === 0 && !contextQueryLoading && !isProcessingAction && (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-4">
                <ChatBubbleLeftEllipsisIcon className="w-16 h-16 mb-4 opacity-50 text-cyan-400" />
                <h3 className="text-md font-semibold">{initialMessageText}</h3>
                <p className="text-xs">{initialMessageExample}</p>
              </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-2.5 rounded-xl shadow-sm
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
                      {msg.sender === 'user' ? 'Anda' :
                       msg.isInternetSearchResult ? 'Asisten AI (dari Internet)' :
                       msg.originalTextForSimplification ? 'Asisten AI (Disederhanakan)' :
                       currentMode === 'dataAnalysis' ? 'Asisten AI (dari Dataset)' :
                       'Asisten AI (dari Dokumen/Teks)'
                      }
                  </span>
                </div>
                 {msg.text && (
                    <div className={`prose prose-sm max-w-none message-content ${msg.sender === 'user' ? 'text-white' : 'text-slate-800'}`}>
                        <ReactMarkdown components={ChatMarkdownComponents} >
                            {msg.text}
                        </ReactMarkdown>
                    </div>
                )}

                {msg.sender === 'ai' && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <h4 className="text-xs font-semibold text-slate-600 mb-1 flex items-center">
                      <LinkIcon className="w-3 h-3 mr-1" /> Sumber Tambahan yang Digunakan AI:
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
                 {msg.sender === 'ai' && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                  <div className="mt-2 pt-1.5">
                    <h4 className="text-xs font-semibold text-slate-600 mb-1.5">Saran Pertanyaan Lanjutan:</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestedQuestions.map((q, i) => (
                        <button
                          key={`sugg-${msg.id}-${i}`}
                          onClick={() => handleDirectInternetSearch(q)}
                          className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          disabled={isProcessingAction || contextQueryLoading}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {msg.sender === 'ai' && (msg.isSimplifiable || (msg.suggestsInternetSearch && msg.relatedUserQuestion)) && !isProcessingAction && !contextQueryLoading && (
                  <div className="mt-2 pt-2 border-t border-slate-200 space-x-2 flex justify-end">
                    {msg.isSimplifiable && (
                      <button
                        onClick={() => handleSimplify(msg.id, msg.text)}
                        disabled={isProcessingAction || contextQueryLoading}
                        className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
                        title="Sederhanakan jawaban ini"
                      >
                        <LanguageIcon className="w-3.5 h-3.5 mr-1" /> Sederhanakan
                      </button>
                    )}
                    {msg.suggestsInternetSearch && msg.relatedUserQuestion && (
                      <button
                        onClick={() => handleFallbackInternetSearch(msg.id, msg.relatedUserQuestion!)}
                        disabled={isProcessingAction || contextQueryLoading}
                        className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
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
          {(contextQueryLoading || (isProcessingAction && messages[messages.length -1]?.sender === 'user')) && (messages.length === 0 || messages[messages.length -1]?.sender === 'user') && (
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
          <div className="flex items-center space-x-2 mb-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => {
                    if (e.key === 'Enter' && !contextQueryLoading && !isProcessingAction && inputValue.trim() !== '') {
                        handleDirectInternetSearch(); 
                    }
                }}
                placeholder={placeholderText}
                disabled={contextQueryLoading || isProcessingAction}
                aria-label="Ketik pertanyaan Anda"
                className="flex-grow block w-full px-3 py-2.5 border border-slate-300 rounded-md shadow-sm
                           bg-white text-slate-900
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           placeholder-slate-500 text-sm"
              />
          </div>
          <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
             <button
                type="button"
                onClick={handleQueryContext}
                disabled={contextQueryLoading || isProcessingAction || inputValue.trim() === '' || !canQueryContext}
                className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-blue-600 text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-500 disabled:bg-slate-50 transition-colors"
                aria-label={`Tanya konteks: ${contextButtonText}`}
                title={!canQueryContext ? "Tidak ada konteks (data/dokumen) yang dimuat untuk ditanyakan." : `Tanya ${contextButtonText}`}
              >
                <ServerStackIcon className="h-5 w-5 mr-1.5" />
                {contextButtonText}
              </button>
              <button
                type="button"
                onClick={() => handleDirectInternetSearch()}
                disabled={contextQueryLoading || isProcessingAction || inputValue.trim() === ''}
                className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Cari jawaban di Internet"
                title="Cari jawaban di Internet"
              >
                {(isProcessingAction && !contextQueryLoading && messages[messages.length-1]?.text === inputValue) ? (
                   <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                 <GlobeAltIcon className="h-5 w-5 mr-1.5" />
                )}
                Cari di Internet
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};