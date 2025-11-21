'use client';

import React from 'react';

interface FilterBadge {
  label: string;
  value: string | number;
  filterKey?: string; // The filter key this badge represents (e.g., 'pi', 'team_name')
  isPinned?: boolean; // Whether this filter is pinned (custom/locked)
}

interface ReportCardProps {
  title: string;
  reportId?: string;
  defaultCollapsed?: boolean;
  filters?: React.ReactNode;
  filterBadges?: FilterBadge[]; // New prop for displaying active filters
  actions?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  onRefresh?: () => void;
  onClose?: () => void;
  onTogglePin?: (filterKey: string) => void; // Callback to toggle pin state
  className?: string;
}

const iconStyles = 'h-5 w-5 text-gray-500';

const ReportCard: React.FC<ReportCardProps> = ({
  title,
  reportId,
  defaultCollapsed = false,
  filters,
  filterBadges,
  actions,
  children,
  footer,
  onRefresh,
  onClose,
  onTogglePin,
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
      className={`bg-white rounded-xl flex flex-col h-full relative border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200 ${className} ${collapsed ? 'shadow-md' : ''}`}
    >
      {/* Close Button - Modern Corner Button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-1.5 right-1.5 z-50 w-6 h-6 flex items-center justify-center rounded-lg bg-white border border-gray-300 text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-300 focus:outline-none transition-all duration-200 shadow-sm"
          aria-label="Remove"
          title="Remove this report"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      
      {/* Header with Gradient Background */}
      <div className={`flex items-center justify-between px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-gray-200 ${!collapsed ? 'rounded-t-xl' : 'rounded-xl'}`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleCollapse}
            className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-white border-2 border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 shadow-sm"
            aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
          >
            {collapsed ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
              </svg>
            )}
          </button>
          <h2 className="text-base font-bold text-gray-800">{title}</h2>
        </div>
        <div className="flex items-center gap-1.5 mr-8">
          {actions}
          {filters && (
            <button
              type="button"
              onClick={handleToggleFilters}
              className={`inline-flex items-center justify-center h-7 w-7 rounded-lg bg-white border-2 transition-all duration-200 shadow-sm ${
                !filtersCollapsed 
                  ? 'border-blue-400 text-blue-600 bg-blue-50' 
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              aria-label={filtersCollapsed ? 'Show filters' : 'Hide filters'}
              title={filtersCollapsed ? 'Show filters' : 'Hide filters'}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          )}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-white border-2 border-gray-300 text-gray-600 hover:bg-green-50 hover:text-green-600 hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 shadow-sm"
              aria-label="Refresh"
              title="Refresh"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="flex-1 flex flex-col min-h-0 rounded-b-xl overflow-hidden">
          {/* Active Filter Badges */}
          {filterBadges && filterBadges.length > 0 && (
            <div className="flex-shrink-0 px-4 py-1.5 border-b border-gray-200 bg-gradient-to-r from-blue-25 to-indigo-25">
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs font-semibold text-gray-600 mr-0.5">Active Filters:</span>
                {filterBadges.map((badge, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => badge.filterKey && onTogglePin?.(badge.filterKey)}
                    disabled={!badge.filterKey || !onTogglePin}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border transition-all ${
                      badge.isPinned
                        ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 cursor-pointer'
                        : onTogglePin && badge.filterKey
                        ? 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 cursor-pointer'
                        : 'bg-blue-100 text-blue-800 border-blue-200 cursor-default'
                    }`}
                    title={
                      badge.isPinned
                        ? 'Click to unpin - filter will sync with top bar'
                        : onTogglePin && badge.filterKey
                        ? 'Click to pin - filter will be locked to this value'
                        : undefined
                    }
                  >
                    {badge.isPinned && (
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                      </svg>
                    )}
                    <span className="font-semibold">{badge.label}:</span>
                    <span className="ml-0.5">{badge.value}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {filters && !filtersCollapsed && (
            <div className="flex-shrink-0 px-4 py-3 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
              {filters}
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white">
            <div className="h-full w-full overflow-auto p-4">
              {children}
            </div>
          </div>

          {footer && (
            <div className="flex-shrink-0 px-4 py-3 border-t-2 border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 rounded-b-xl">
              {footer}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportCard;
