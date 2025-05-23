
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

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async () => {
    if (inputValue.trim() === '') return;

    const userMessage: ChatMessage = {
      id: Date.now().toString() + '_user',
      sender: 'user',
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    try {
      const aiResponseText = await onQuery(userMessage.text);
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
        text: `Error: ${errorMessage}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiErrorMessage]);
    }
  };

  return (
    <Card title="Ask Questions About Your Data" icon={ChatBubbleLeftRightIcon}>
      <div className="flex flex-col h-[60vh] bg-slate-750 rounded-lg shadow-inner">
        <div className="flex-grow p-4 space-y-4 overflow-y-auto">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow ${
                  msg.sender === 'user' 
                    ? 'bg-primary-600 text-white rounded-br-none' 
                    : 'bg-slate-600 text-gray-200 rounded-bl-none'
                }`}
              >
                <div className="flex items-center mb-1">
                  {msg.sender === 'user' ? (
                    <UserCircleIcon className="h-5 w-5 mr-2" />
                  ) : (
                    <CpuChipIcon className="h-5 w-5 mr-2" />
                  )}
                  <span className="text-xs font-semibold">{msg.sender === 'user' ? 'You' : 'AI Assistant'}</span>
                </div>
                 <ReactMarkdown 
                    components={{
                        p: ({node, ...props}) => <p className="text-sm" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside text-sm" {...props} />,
                        li: ({node, ...props}) => <li className="text-sm my-0.5" {...props} />,
                        a: ({node, ...props}) => <a className="text-primary-300 hover:underline" {...props} />,
                    }}
                 >{msg.text}</ReactMarkdown>
                <p className="text-xs text-gray-400 mt-1 text-right">{msg.timestamp.toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length -1]?.sender === 'user' && (
            <div className="flex justify-start">
               <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow bg-slate-600 text-gray-200 rounded-bl-none">
                  <div className="flex items-center">
                    <Spinner size="sm" /> <span className="ml-2 text-sm">AI is thinking...</span>
                  </div>
               </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="p-4 border-t border-slate-600">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
              placeholder="Ask something like 'What is the average sales?'"
              className="flex-grow p-3 bg-slate-700 border border-slate-500 rounded-lg text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-shadow"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || inputValue.trim() === ''}
              className="p-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? <Spinner size="sm" /> : <PaperAirplaneIcon className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
};
    