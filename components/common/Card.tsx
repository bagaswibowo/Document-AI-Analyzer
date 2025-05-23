
import React from 'react';

interface CardProps {
  title?: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, icon: Icon, children, className = '' }) => {
  return (
    <div className={`bg-slate-700/80 backdrop-blur-md shadow-xl rounded-lg p-4 sm:p-6 ${className}`}>
      {title && (
        <div className="flex items-center mb-4 pb-2 border-b border-slate-600">
          {Icon && <Icon className="h-6 w-6 mr-3 text-primary-400" />}
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-100">{title}</h2>
        </div>
      )}
      {children}
    </div>
  );
};
    