'use client';

import React from 'react';

interface ReportCardProps {
  title: string;
  reportId?: string;
  defaultCollapsed?: boolean;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  onRefresh?: () => void;
  onClose?: () => void;
  className?: string;
}

const iconStyles = 'h-5 w-5 text-gray-500';

const ReportCard: React.FC<ReportCardProps> = ({
  title,
  reportId,
  defaultCollapsed = false,
  filters,
  actions,
  children,
  footer,
  onRefresh,
  onClose,
  className = '',
}) => {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
  const [filtersCollapsed, setFiltersCollapsed] = React.useState(true);

  const handleToggleCollapse = React.useCallback(() => {
    setCollapsed((prev) => {
      const newCollapsed = !prev;
      
      // Emit custom event for collapse state change (for dashboard layout)
      if (reportId) {
        const event = new CustomEvent('report-collapse', {
          detail: { reportId, collapsed: newCollapsed },
        });
        window.dispatchEvent(event);
      }
      
      return newCollapsed;
    });
  }, [reportId]);

  const handleToggleFilters = React.useCallback(() => {
    setFiltersCollapsed((prev) => !prev);
  }, []);

  return (
    <div
      className={`bg-white rounded-lg flex flex-col h-full relative ${className} ${!collapsed ? 'shadow-sm' : ''}`}
    >
      {/* Close Button - Corner Square */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-0 right-0 z-50 w-6 h-6 flex items-center justify-center border-l border-b border-gray-300 bg-transparent text-gray-400 hover:text-gray-700 focus:outline-none transition-colors"
          style={{ borderRadius: '0 0.5rem 0 0.25rem' }}
          aria-label="Remove"
          title="Remove this report"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      
      <div className={`flex items-center justify-between px-4 py-3 border border-gray-200 ${!collapsed ? 'rounded-t-lg' : 'rounded-lg'}`}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleCollapse}
            className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
          >
            {collapsed ? (
              <svg className={iconStyles} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9" />
              </svg>
            ) : (
              <svg className={iconStyles} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
              </svg>
            )}
          </button>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        <div className="flex items-center gap-2 mr-6">
          {actions}
          {filters && (
            <button
              type="button"
              onClick={handleToggleFilters}
              className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={filtersCollapsed ? 'Show filters' : 'Hide filters'}
              title={filtersCollapsed ? 'Show filters' : 'Hide filters'}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          )}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Refresh"
              title="Refresh"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="flex-1 flex flex-col min-h-0 border-b border-l border-r border-gray-200 rounded-b-lg">
          {filters && !filtersCollapsed && (
            <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 bg-gray-50">
              {filters}
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="h-full w-full overflow-auto">
              {children}
            </div>
          </div>

          {footer && (
            <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 bg-gray-50">
              {footer}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportCard;
