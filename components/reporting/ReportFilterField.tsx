'use client';

import React from 'react';

interface ReportFilterFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

const ReportFilterField: React.FC<ReportFilterFieldProps> = ({ label, children, className = '' }) => {
  return (
    <div className={`flex items-center gap-2 text-xs sm:text-sm ${className}`}>
      <span className="text-gray-700 font-medium whitespace-nowrap">{label}</span>
      <div className="flex-1 min-w-[140px]">{children}</div>
    </div>
  );
};

export default ReportFilterField;
