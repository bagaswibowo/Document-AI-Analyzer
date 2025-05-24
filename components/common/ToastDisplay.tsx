
import React, { useEffect } from 'react';
import { XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/solid';

export interface ToastConfig {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  duration?: number; // in milliseconds
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastDisplayProps {
  config: ToastConfig;
  onClose: () => void;
}

export const ToastDisplay: React.FC<ToastDisplayProps> = ({ config, onClose }) => {
  const { message, type, duration = 5000, action } = config;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  let bgColor = 'bg-slate-700';
  let textColor = 'text-white';
  let IconComponent = InformationCircleIcon;
  let iconColor = 'text-blue-300';
  let actionButtonClass = 'bg-slate-600 hover:bg-slate-500';

  switch (type) {
    case 'success':
      bgColor = 'bg-green-500';
      IconComponent = InformationCircleIcon; // Or CheckCircleIcon if you have it
      iconColor = 'text-green-100';
      actionButtonClass = 'bg-green-600 hover:bg-green-700';
      break;
    case 'warning':
      bgColor = 'bg-amber-500';
      IconComponent = ExclamationTriangleIcon;
      iconColor = 'text-amber-100';
      actionButtonClass = 'bg-amber-600 hover:bg-amber-700';
      break;
    case 'error':
      bgColor = 'bg-red-600';
      IconComponent = XCircleIcon;
      iconColor = 'text-red-100';
      actionButtonClass = 'bg-red-700 hover:bg-red-800';
      break;
    case 'info':
    default:
      bgColor = 'bg-blue-600';
      IconComponent = InformationCircleIcon;
      iconColor = 'text-blue-100';
      actionButtonClass = 'bg-blue-700 hover:bg-blue-800';
      break;
  }

  return (
    <div 
      className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-[100] w-full max-w-md p-4 rounded-md shadow-lg ${bgColor} ${textColor} flex items-start space-x-3 transition-all duration-300 ease-in-out`}
      role="alert"
    >
      <div className="flex-shrink-0 pt-0.5">
        <IconComponent className={`w-6 h-6 ${iconColor}`} aria-hidden="true" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
        {action && (
          <button
            onClick={() => {
              action.onClick();
              onClose(); // Close toast after action
            }}
            className={`mt-2 px-3 py-1.5 text-xs font-semibold text-white rounded-md ${actionButtonClass} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-current focus:ring-white`}
          >
            {action.label}
          </button>
        )}
      </div>
      <div className="flex-shrink-0">
        <button
          onClick={onClose}
          className={`p-1 rounded-full hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-white`}
          aria-label="Tutup notifikasi"
        >
          <XCircleIcon className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
