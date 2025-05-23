
import React, { useState, useCallback } from 'react';
import { ArrowUpTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Spinner } from './common/Spinner';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, isLoading }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onFileUpload(selectedFile);
    }
  };
  
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      setSelectedFile(event.dataTransfer.files[0]);
      // Automatically trigger upload on drop for quicker UX
      onFileUpload(event.dataTransfer.files[0]);
    }
  }, [onFileUpload]);


  return (
    <div className="p-6 bg-slate-700 rounded-lg shadow-xl text-center">
      <h2 className="text-2xl font-semibold mb-6 text-gray-100">Upload CSV File</h2>
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 sm:p-12 transition-colors duration-200 ${dragOver ? 'border-primary-500 bg-slate-600' : 'border-slate-500 hover:border-primary-400'}`}
      >
        <ArrowUpTrayIcon className="h-16 w-16 text-primary-400 mx-auto mb-4" />
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          id="fileInput"
          className="hidden"
        />
        <label
          htmlFor="fileInput"
          className="cursor-pointer text-primary-400 hover:text-primary-300 font-medium"
        >
          Drag & drop your CSV file here, or click to select file.
        </label>
        {selectedFile && (
          <div className="mt-4 text-sm text-gray-300 flex items-center justify-center">
            <DocumentTextIcon className="h-5 w-5 mr-2 text-gray-400" />
            Selected: {selectedFile.name}
          </div>
        )}
      </div>
      
      <button
        onClick={handleUpload}
        disabled={!selectedFile || isLoading}
        className="mt-8 w-full sm:w-auto px-8 py-3 bg-primary-600 text-white font-semibold rounded-lg shadow-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center mx-auto"
      >
        {isLoading ? (
          <>
            <Spinner size="sm" />
            <span className="ml-2">Processing...</span>
          </>
        ) : (
          'Upload and Analyze'
        )}
      </button>
      <p className="mt-4 text-xs text-gray-400">Only .csv files are supported.</p>
    </div>
  );
};
    