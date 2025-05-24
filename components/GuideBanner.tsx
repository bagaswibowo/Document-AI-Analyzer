
import React from 'react';
import { InformationCircleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface GuideBannerProps {
  onViewGuide: () => void;
}

export const GuideBanner: React.FC<GuideBannerProps> = ({ onViewGuide }) => {
  return (
    <div className="bg-blue-50 border-b border-t border-blue-200 text-blue-800 print:hidden">
      <div className="max-w-7xl mx-auto py-2.5 px-3 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          {/* Text Section */}
          <div className="flex items-center flex-grow">
            <span className="flex p-1.5 rounded-lg bg-blue-100 flex-shrink-0">
              <InformationCircleIcon className="h-5 w-5 text-blue-600" aria-hidden="true" />
            </span>
            <p className="ml-2.5 text-xs sm:text-sm font-medium text-blue-700">
              <span className="sm:hidden">Baru di sini? Lihat panduan kami!</span>
              <span className="hidden sm:inline">Baru menggunakan aplikasi ini? Lihat panduan penggunaan untuk memaksimalkan pengalaman Anda.</span>
            </p>
          </div>
          {/* Button Section */}
          <div className="w-full sm:w-auto flex-shrink-0">
            <button
              onClick={onViewGuide}
              className="w-full sm:w-auto flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-50 focus:ring-white transition-colors duration-150"
            >
              Lihat Panduan
              <ArrowRightIcon className="ml-1.5 h-4 w-4"/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
