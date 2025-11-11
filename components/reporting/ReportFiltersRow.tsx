'use client';

import React from 'react';

interface ReportFiltersRowProps {
  children: React.ReactNode;
  className?: string;
}

const ReportFiltersRow: React.FC<ReportFiltersRowProps> = ({ children, className = '' }) => {
  return (
    <div className={`flex flex-wrap items-center gap-4 ${className}`}>
      {children}
    </div>
  );
};

export default ReportFiltersRow;
