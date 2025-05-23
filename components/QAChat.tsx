
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Card } from './common/Card';
import { Spinner } from './common/Spinner';
import { PaperAirplaneIcon, UserCircleIcon, CpuChipIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';

interface QAChatProps {
  onQuery: (question: string) => Promise<string>;
  isLoading: boolean;
}

export const QAChat: React.FC<QAChatProps> = ({ onQuery, isLoading }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
      const aiResponseText = await onQuery(currentInput); // Use currentInput as inputValue is cleared
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
        text: `Sorry, I encountered an error: ${errorMessage}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiErrorMessage]);
    }
  };

  return (
    <Card title="Ask Questions About Your Data" icon={ChatBubbleLeftRightIcon}>
      <div className="flex flex-col h-[calc(70vh - 100px)] min-h-[400px] max-h-[600px] bg-slate-750 rounded-lg shadow-inner overflow-hidden">
        <div className="flex-grow p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-750">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <ChatBubbleLeftRightIcon className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg">Ask questions about your dataset.</p>
              <p className="text-sm">e.g., "What is the average value in the 'Sales' column?"</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-lg lg:max-w-xl px-5 py-3 rounded-xl shadow-md ${
                  msg.sender === 'user' 
                    ? 'bg-primary-600 text-white rounded-br-none' 
                    : 'bg-slate-600 text-slate-100 rounded-bl-none'
                }`}
              >
                <div className="flex items-center mb-1.5">
                  {msg.sender === 'user' ? (
                    <UserCircleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                  ) : (
                    <CpuChipIcon className="h-5 w-5 mr-2 flex-shrink-0 text-primary-400" />
                  )}
                  <span className={`text-xs font-semibold ${msg.sender === 'user' ? 'text-primary-100' : 'text-slate-300'}`}>
                    {msg.sender === 'user' ? 'You' : 'AI Assistant'}
                  </span>
                </div>
                 <ReactMarkdown 
                    className="prose prose-sm prose-invert max-w-none"
                    components={{
                        p: ({node, ...props}) => <p className="text-sm leading-normal" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-outside ml-4 text-sm space-y-0.5" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-4 text-sm space-y-0.5" {...props} />,
                        li: ({node, ...props}) => <li className="text-sm my-0.5" {...props} />,
                        a: ({node, ...props}) => <a className="text-sky-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-medium" {...props} />,
                    }}
                 >{msg.text}</ReactMarkdown>
                <p className="text-xs text-slate-400 mt-2 text-right">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length -1]?.sender === 'user' && (
            <div className="flex justify-start">
               <div className="max-w-xs lg:max-w-md px-5 py-3 rounded-xl shadow-md bg-slate-600 text-slate-100 rounded-bl-none">
                  <div className="flex items-center">
                    <Spinner size="sm" color="text-primary-400" /> <span className="ml-3 text-sm">AI is thinking...</span>
                  </div>
               </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="p-4 border-t border-slate-600 bg-slate-700">
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center space-x-3">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about your data... (e.g., 'average sales')"
              className="flex-grow p-3 bg-slate-600 border border-slate-500 rounded-lg text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all duration-150 shadow-sm"
              disabled={isLoading}
              aria-label="Type your question about the data"
            />
            <button
              type="submit"
              disabled={isLoading || inputValue.trim() === ''}
              className="p-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
              aria-label={isLoading ? "Sending question" : "Send question"}
            >
              {isLoading ? <Spinner size="sm" color="text-white" /> : <PaperAirplaneIcon className="h-6 w-6" />}
            </button>
          </form>
        </div>
      </div>
    </Card>
  );
};
