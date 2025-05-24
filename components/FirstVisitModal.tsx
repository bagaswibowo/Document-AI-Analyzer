
import React from 'react';
import { XMarkIcon, BookOpenIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface FirstVisitModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  onViewGuide: () => void;
}

export const FirstVisitModal: React.FC<FirstVisitModalProps> = ({ isOpen, onDismiss, onViewGuide }) => {
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 z-[101] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out"
        aria-labelledby="first-visit-title"
        role="dialog"
        aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all duration-300 ease-out scale-95 opacity-0 animate-modal-pop-in">
        <div className="p-6 text-center">
          <SparklesIcon className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h2 id="first-visit-title" className="text-2xl font-bold text-slate-800 mb-3">
            Selamat Datang!
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Ini adalah Penganalisis & Evaluator Dokumen AI. Untuk memulai, Anda dapat melihat panduan singkat kami.
          </p>
          <div className="space-y-3 sm:space-y-0 sm:flex sm:space-x-3 justify-center">
            <button
              type="button"
              onClick={onViewGuide}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <BookOpenIcon className="w-5 h-5 mr-2" />
              Lihat Panduan
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-md shadow-sm hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
            >
              <XMarkIcon className="w-5 h-5 mr-2" />
              Nanti Saja
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes modal-pop-in {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-modal-pop-in {
          animation: modal-pop-in 0.3s forwards;
        }
      `}</style>
    </div>
  );
};
