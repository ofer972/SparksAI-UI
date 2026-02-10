'use client';

import React from 'react';
import { ReportDefinition } from '@/lib/config';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface CustomReportsListProps {
  reports: ReportDefinition[];
  selectedReportId: string | null;
  onSelectReport: (reportId: string) => void;
  onNewReport: () => void;
  onDeleteReport: (reportId: string) => Promise<void>;
  loading?: boolean;
}

export default function CustomReportsList({
  reports,
  selectedReportId,
  onSelectReport,
  onNewReport,
  onDeleteReport,
  loading = false
}: CustomReportsListProps) {
  const [deleteConfirm, setDeleteConfirm] = React.useState<{
    reportId: string;
    reportName: string;
  } | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    
    setDeleting(true);
    try {
      await onDeleteReport(deleteConfirm.reportId);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete report:', err);
      // Error will be handled by parent component
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="h-full flex flex-col border-r border-outline bg-surface-elevated">
        {/* Header */}
        <div className="p-4 border-b border-outline">
          <h2 className="text-lg font-semibold text-content-primary mb-3">
            Custom Reports
          </h2>
          <button
            onClick={onNewReport}
            className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            New Report
          </button>
        </div>

        {/* Reports List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : reports.length === 0 ? (
            <div className="p-4 text-center text-sm text-content-tertiary">
              No custom reports yet.
              <br />
              Create a new report to get started.
            </div>
          ) : (
            <div className="p-2">
              {reports.map((report) => (
                <div
                  key={report.report_id}
                  className={`mb-2 p-3 rounded-md border-2 cursor-pointer transition-all ${
                    selectedReportId === report.report_id
                      ? 'bg-blue-100 dark:bg-blue-950/40 border-blue-500 dark:border-blue-600 shadow-md ring-2 ring-blue-300 dark:ring-blue-700 ring-opacity-50'
                      : 'bg-surface border-outline hover:bg-surface-secondary hover:border-outline-strong'
                  }`}
                  onClick={() => onSelectReport(report.report_id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-content-primary truncate">
                        {report.report_name}
                      </h3>
                      {report.description && (
                        <p className="text-xs text-content-secondary mt-1 line-clamp-2">
                          {report.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-950/40 text-brand rounded text-xs font-medium">
                          {report.chart_type === 'table' ? 'Table' : 
                           report.chart_type === 'bar_chart' ? 'Bar Chart' : 
                           report.chart_type === 'pie_chart' ? 'Pie Chart' : 
                           report.chart_type}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm({
                          reportId: report.report_id,
                          reportName: report.report_name
                        });
                      }}
                      className="text-red-600 hover:text-red-700 p-1 rounded transition-colors"
                      title="Delete report"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        itemName={deleteConfirm?.reportName || 'report'}
        onConfirm={handleDelete}
      />
    </>
  );
}

