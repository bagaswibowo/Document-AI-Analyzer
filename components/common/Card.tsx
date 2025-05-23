
import React from 'react';

interface CardProps {
  title?: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, icon: Icon, children, className = '' }) => {
  return (
    <div className={`bg-slate-700 shadow-xl rounded-xl ${className}`}>
      {title && (
        <div className="flex items-center p-5 border-b border-slate-600">
          {Icon && <Icon className="h-7 w-7 mr-3 text-primary-400 flex-shrink-0" />}
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 truncate">{title}</h2>
        </div>
      )}
      <div className="p-5 sm:p-6">
        {children}
      </div>
    </div>
  );
};
