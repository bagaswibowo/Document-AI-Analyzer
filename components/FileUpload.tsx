
import React, { useState, useCallback } from 'react';
import { ArrowUpTrayIcon, DocumentTextIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
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
      const file = event.target.files[0];
      setSelectedFile(file);
      // Optionally auto-upload on select, or wait for button click
      // onFileUpload(file); 
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
      const file = event.dataTransfer.files[0];
      setSelectedFile(file);
      onFileUpload(file); // Automatically trigger upload on drop
    }
  }, [onFileUpload]);


  return (
    <div className="p-6 sm:p-8 bg-slate-700 rounded-xl shadow-xl text-center">
      <h2 className="text-2xl font-semibold mb-8 text-slate-100">Upload CSV File</h2>
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 sm:p-12 transition-all duration-300 ease-in-out
                    ${dragOver 
                      ? 'border-primary-500 bg-slate-600 scale-105 shadow-2xl' 
                      : 'border-slate-500 hover:border-primary-400 bg-slate-750'}`}
        role="button"
        tabIndex={0}
        aria-label="Drag and drop CSV file or click to select"
      >
        <ArrowUpTrayIcon className={`h-16 w-16 mx-auto mb-4 transition-colors duration-200 ${dragOver ? 'text-primary-400' : 'text-slate-400'}`} />
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          id="fileInput"
          className="sr-only" // Hidden, but accessible
        />
        <label
          htmlFor="fileInput"
          className="cursor-pointer text-primary-400 hover:text-primary-300 font-medium text-lg"
        >
          Drag & drop CSV file here
        </label>
        <p className="text-slate-400 mt-2 text-sm">or click to select file</p>

        {selectedFile && !isLoading && (
          <div className="mt-6 text-sm text-green-400 flex items-center justify-center">
            <CheckCircleIcon className="h-6 w-6 mr-2" />
            <span>Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
          </div>
        )}
         {selectedFile && isLoading && (
          <div className="mt-6 text-sm text-slate-300 flex items-center justify-center">
            <Spinner size="sm" color="text-primary-400" />
            <span className="ml-2">Processing: {selectedFile.name}...</span>
          </div>
        )}
      </div>
      
      {selectedFile && !isLoading && (
        <button
          onClick={handleUpload}
          disabled={isLoading}
          className="mt-8 w-full sm:w-auto px-10 py-3 bg-primary-600 text-white font-semibold rounded-lg shadow-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center mx-auto transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
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
      )}
      <p className="mt-6 text-xs text-slate-500">Only .csv files are supported. Max file size: 5MB (example limit).</p>
    </div>
  );
};
