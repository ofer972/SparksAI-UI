'use client';

import { useState, useEffect } from 'react';
import { ApiService } from '@/lib/api';
import type { ReportDefinition } from '@/lib/config';
import ReportPanel from '@/components/ReportPanel';

export default function AuditDashboardTab() {
  const [reports, setReports] = useState<ReportDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiService = new ApiService();
        const auditReports = await apiService.getReportDefinitions({ auditOnly: true });
        console.log('[AuditDashboardTab] Fetched reports:', auditReports.length, auditReports.map(r => r.report_id));
        // Sort: audit-logs first, then others
        const sortedReports = [...auditReports].sort((a, b) => {
          if (a.report_id === 'audit-logs') return -1;
          if (b.report_id === 'audit-logs') return 1;
          return 0;
        });
        setReports(sortedReports);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit reports');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-content-muted">Loading audit reports...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-content-muted">No audit reports available.</div>
      </div>
    );
  }

  // Find audit-logs report (should be first)
  const auditLogsReport = reports.find(r => r.report_id === 'audit-logs');
  // Find reports to display side-by-side
  const failedEndpointsReport = reports.find(r => r.report_id === 'audit-failed-endpoints');
  const frequentlyUsedReport = reports.find(r => r.report_id === 'audit-frequently-used-actions');
  const slowActionsReport = reports.find(r => r.report_id === 'audit-slow-actions');
  const tokenUsageReport = reports.find(r => r.report_id === 'audit-token-usage');
  const otherReports = reports.filter(r => 
    r.report_id !== 'audit-logs' &&
    r.report_id !== 'audit-failed-endpoints' && 
    r.report_id !== 'audit-frequently-used-actions' &&
    r.report_id !== 'audit-slow-actions' &&
    r.report_id !== 'audit-token-usage'
  );

  const renderReport = (report: ReportDefinition) => (
    <div key={report.report_id} style={{ height: report.report_id === 'audit-logs' ? '900px' : '600px' }}>
      <ReportPanel
        reportId={report.report_id}
        initialFilters={report.default_filters || {}}
        fallback={<div className="text-red-500 p-4">Report '{report.report_id}' not found in registry</div>}
        errorFallback={(error) => (
          <div className="text-red-500 p-4">
            Error loading '{report.report_id}': {error}
          </div>
        )}
      />
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {/* Audit Logs report first - 50% bigger (900px) */}
          {auditLogsReport && (
            <div key={auditLogsReport.report_id} style={{ height: '900px' }}>
              <ReportPanel
                reportId={auditLogsReport.report_id}
                initialFilters={auditLogsReport.default_filters || {}}
                fallback={<div className="text-red-500 p-4">Report '{auditLogsReport.report_id}' not found in registry</div>}
                errorFallback={(error) => (
                  <div className="text-red-500 p-4">
                    Error loading '{auditLogsReport.report_id}': {error}
                  </div>
                )}
              />
            </div>
          )}
          {/* Side-by-side layout for Failed Endpoints and Frequently Used Actions */}
          {(failedEndpointsReport || frequentlyUsedReport) && (
            <div className="flex flex-row gap-4">
              {failedEndpointsReport && (
                <div className="flex-1 min-w-0" style={{ height: '600px' }}>
                <ReportPanel
                  reportId={failedEndpointsReport.report_id}
                  initialFilters={failedEndpointsReport.default_filters || {}}
                  fallback={<div className="text-red-500 p-4">Report '{failedEndpointsReport.report_id}' not found in registry</div>}
                  errorFallback={(error) => (
                    <div className="text-red-500 p-4">
                      Error loading '{failedEndpointsReport.report_id}': {error}
                    </div>
                  )}
                />
                </div>
              )}
              {frequentlyUsedReport && (
                <div className="flex-1 min-w-0" style={{ height: '600px' }}>
                <ReportPanel
                  reportId={frequentlyUsedReport.report_id}
                  initialFilters={frequentlyUsedReport.default_filters || {}}
                  fallback={<div className="text-red-500 p-4">Report '{frequentlyUsedReport.report_id}' not found in registry</div>}
                  errorFallback={(error) => (
                    <div className="text-red-500 p-4">
                      Error loading '{frequentlyUsedReport.report_id}': {error}
                    </div>
                  )}
                />
                </div>
              )}
            </div>
          )}
          {/* Side-by-side layout for Slow Actions and Token Usage Analysis */}
          {(slowActionsReport || tokenUsageReport) && (
            <div className="flex flex-row gap-4">
              {slowActionsReport && (
                <div className="flex-1 min-w-0" style={{ height: '600px' }}>
                <ReportPanel
                  reportId={slowActionsReport.report_id}
                  initialFilters={slowActionsReport.default_filters || {}}
                  fallback={<div className="text-red-500 p-4">Report '{slowActionsReport.report_id}' not found in registry</div>}
                  errorFallback={(error) => (
                    <div className="text-red-500 p-4">
                      Error loading '{slowActionsReport.report_id}': {error}
                    </div>
                  )}
                />
                </div>
              )}
              {tokenUsageReport && (
                <div className="flex-1 min-w-0" style={{ height: '600px' }}>
                <ReportPanel
                  reportId={tokenUsageReport.report_id}
                  initialFilters={tokenUsageReport.default_filters || {}}
                  fallback={<div className="text-red-500 p-4">Report '{tokenUsageReport.report_id}' not found in registry</div>}
                  errorFallback={(error) => (
                    <div className="text-red-500 p-4">
                      Error loading '{tokenUsageReport.report_id}': {error}
                    </div>
                  )}
                />
                </div>
              )}
            </div>
          )}
          {/* Other reports in vertical stack */}
          {otherReports.map((report) => renderReport(report))}
        </div>
      </div>
    </div>
  );
}

