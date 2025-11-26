'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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

  // Prevent immediate close on mobile
  const [justOpened, setJustOpened] = useState(false);
  
  // Track if modal was previously open to avoid resetting selection during interaction
  const prevIsOpenRef = useRef(isOpen);

  // Reset selection only when modal transitions from closed to open
  useEffect(() => {
    const wasJustOpened = !prevIsOpenRef.current && isOpen;
    prevIsOpenRef.current = isOpen;
    
    if (wasJustOpened) {
      console.log('AddReportsModal: Modal opened, initializing selection');
      setSelectedReports(new Set(currentReportIds));
      // Lock body scroll on mobile when modal is open
      document.body.style.overflow = 'hidden';
      // Set flag to prevent immediate close
      setJustOpened(true);
      setTimeout(() => setJustOpened(false), 300);
    } else if (!isOpen) {
      // Restore body scroll when modal closes
      document.body.style.overflow = '';
      setJustOpened(false);
    }
    
    return () => {
      if (!isOpen) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen]); // Removed currentReportIds from dependencies

  const handleToggle = (reportId: string) => {
    console.log('AddReportsModal: handleToggle called for reportId:', reportId);
    setSelectedReports((prev) => {
      const next = new Set(prev);
      if (next.has(reportId)) {
        console.log('AddReportsModal: Removing report:', reportId);
        next.delete(reportId);
      } else {
        console.log('AddReportsModal: Adding report:', reportId);
        next.add(reportId);
      }
      console.log('AddReportsModal: New selection:', Array.from(next));
      return next;
    });
  };

  const handleApply = () => {
    onUpdateReports(Array.from(selectedReports));
    onClose();
  };

  console.log('AddReportsModal: Render called, isOpen:', isOpen);
  
  if (!isOpen) {
    console.log('AddReportsModal: Modal is closed, not rendering', { isOpen });
    return null;
  }

  console.log('AddReportsModal: Modal IS OPEN - Rendering modal - SHOULD BE VISIBLE NOW');
  console.log('Available reports:', availableReports.length);
  console.log('Available reports details:', availableReports.map(r => ({ id: r.report_id, name: r.report_name })));
  console.log('Current report IDs:', currentReportIds);
  console.log('Selected reports:', Array.from(selectedReports));

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Prevent immediate close on mobile (touch events can trigger click immediately)
    if (justOpened) {
      console.log('AddReportsModal: Prevented immediate close (just opened)');
      return;
    }
    console.log('AddReportsModal: Backdrop clicked, closing modal');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4" 
      onClick={handleBackdropClick}
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
      }}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] md:max-h-[80vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 1000000 }}
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
            {availableReports.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No reports available
              </div>
            ) : (
              availableReports.map((report) => {
                const isChecked = selectedReports.has(report.report_id);
                const isCurrentlyDisplayed = currentReportIds.includes(report.report_id);
                
                return (
                  <div
                    key={report.report_id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      isChecked 
                        ? 'border-blue-300 bg-blue-50' 
                        : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      console.log('AddReportsModal: Div clicked for report:', report.report_id);
                      handleToggle(report.report_id);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      readOnly
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer pointer-events-none"
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
                </div>
                );
              })
            )}
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

