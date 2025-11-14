'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ReportDefinition } from '@/lib/config';

interface AddReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableReports: ReportDefinition[];
  currentReportIds: string[];
  onUpdateReports: (reportIds: string[]) => void;
}

export default function AddReportsModal({
  isOpen,
  onClose,
  availableReports,
  currentReportIds,
  onUpdateReports,
}: AddReportsModalProps) {
  // Initialize with currently displayed reports
  const [selectedReports, setSelectedReports] = useState<Set<string>>(() => new Set(currentReportIds));

  // Reset selection when modal opens or currentReportIds change
  useEffect(() => {
    if (isOpen) {
      setSelectedReports(new Set(currentReportIds));
    }
  }, [isOpen, currentReportIds]);

  const handleToggle = (reportId: string) => {
    setSelectedReports((prev) => {
      const next = new Set(prev);
      if (next.has(reportId)) {
        next.delete(reportId);
      } else {
        next.add(reportId);
      }
      return next;
    });
  };

  const handleApply = () => {
    onUpdateReports(Array.from(selectedReports));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Manage Dashboard Reports</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-2">
            {availableReports.map((report) => {
              const isChecked = selectedReports.has(report.report_id);
              const isCurrentlyDisplayed = currentReportIds.includes(report.report_id);
              
              return (
                <label
                  key={report.report_id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    isChecked 
                      ? 'border-blue-300 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(report.report_id)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                      {report.report_name}
                      {isCurrentlyDisplayed && (
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">
                          ✓ On Dashboard
                        </span>
                      )}
                    </div>
                    {report.description && (
                      <div className="text-sm text-gray-500 mt-1">{report.description}</div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      Type: {report.chart_type}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-600">
            {selectedReports.size} report{selectedReports.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

