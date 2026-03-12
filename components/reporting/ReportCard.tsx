'use client';

import React from 'react';

/** Context so help dialog can position itself just under the report header. */
export const ReportCardHeaderRectContext = React.createContext<(() => DOMRect | null) | null>(null);

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
 titleSuffix?: React.ReactNode; // Elements to show after title (e.g., date badge, eye icon)
 children?: React.ReactNode;
 footer?: React.ReactNode;
 onRefresh?: () => void;
 onClose?: () => void;
 onTogglePin?: (filterKey: string) => void; // Callback to toggle pin state
 onAIChat?: () => void; // Callback to open AI chat for this specific report
 className?: string;
 isInsightCard?: boolean; // If true, don't add padding to content area
 priorityColor?: string; // Priority color from card data:"Red","Yellow","Green","Gray"
 enableContentOverflow?: boolean; // If true, allows content to overflow (for tooltips)
 readOnly?: boolean; // If true, hides all header buttons (filter, refresh, close, AI chat)
 hideHeader?: boolean; // If true, completely hides the header section
 hideCollapse?: boolean; // If true, hides the collapse/expand button
 compactHeader?: boolean; // If true, use smaller header (padding and title) like the help dialog
}

const iconStyles = 'h-5 w-5 text-content-muted';

// Map priority_color from backend to Tailwind CSS classes
const getPriorityColorFromColor = (priorityColor?: string) => {
 switch (priorityColor) {
 case 'Red':
 return {
 headerGradient: 'bg-gradient-to-r from-red-100 to-red-200 dark:from-red-950/40 dark:to-red-900/40',
 border: 'border-danger-border',
 iconBorder: 'border-red-500 dark:border-red-600',
 text: 'text-danger-text'
 };
 case 'Yellow':
 return {
 headerGradient: 'bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-amber-700/60 dark:to-amber-600/60',
 border: 'border-yellow-200 dark:border-amber-400',
 iconBorder: 'border-yellow-400 dark:border-amber-400',
 text: 'text-yellow-700 dark:text-amber-100'
 };
 case 'Green':
 return {
 headerGradient: 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-800/50 dark:to-green-700/50',
 border: 'border-positive-border',
 iconBorder: 'border-green-400 dark:border-green-500',
 text: 'text-green-700 dark:text-green-200'
 };
 default: // Gray or undefined
 return {
 headerGradient: 'bg-gradient-to-r from-gray-50 to-gray-100 from-surface to-surface-elevated',
 border: 'border-outline',
 iconBorder: 'border-outline-strong dark:border-slate-600',
 text: 'text-content-secondary'
 };
 }
};

// Get icon based on priority_color for header title
const getPriorityColorIcon = (priorityColor?: string) => {
 switch (priorityColor) {
 case 'Red':
 return '🚨'; // Red alarm/siren icon
 case 'Yellow':
 return '⚠️'; // Yellow warning triangle
 case 'Green':
 return '✅'; // Green checkmark
 default: // Gray or undefined
 return 'ℹ️'; // Info icon
 }
};

const ReportCard: React.FC<ReportCardProps> = ({
 title,
 reportId,
 defaultCollapsed = false,
 filters,
 filterBadges,
 actions,
 titleSuffix,
 children,
 footer,
 onRefresh,
 onClose,
 onTogglePin,
 onAIChat,
 className = '',
 isInsightCard = false,
 priorityColor,
 enableContentOverflow = false,
 readOnly = false,
 hideHeader = false,
 hideCollapse = false,
 compactHeader = false,
}) => {
 const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
 const [filtersCollapsed, setFiltersCollapsed] = React.useState(true);
 
 // Get priority color styles and icon for insight cards
 const priorityColors = isInsightCard && priorityColor ? getPriorityColorFromColor(priorityColor) : null;
 const priorityIcon = isInsightCard && priorityColor ? getPriorityColorIcon(priorityColor) : null;

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
 const headerRef = React.useRef<HTMLDivElement>(null);
 const getHeaderRect = React.useCallback(() => headerRef.current?.getBoundingClientRect() ?? null, []);

 return (
 <ReportCardHeaderRectContext.Provider value={getHeaderRect}>
 <div
 className={`bg-surface rounded-xl flex flex-col h-full relative border-2 border-outline border-outline shadow-lg hover:shadow-xl transition-all duration-200 ${className} ${collapsed ? 'shadow-md' : ''}`}
 >
 {/* Close Button - Modern Corner Button */}
 {!hideHeader && !readOnly && onClose && (
 <button
 type="button"
 onClick={onClose}
 className="absolute top-1.5 right-1.5 z-50 w-6 h-6 flex items-center justify-center rounded-lg bg-surface-elevated border border-outline-strong text-content-muted hover:text-red-600 hover:bg-red-50 hover:border-red-300 focus:outline-none transition-all duration-200 shadow-sm"
 aria-label="Remove"
 title="Remove this report"
 >
 <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 )}
 
 {/* Header with Gradient Background */}
 {!hideHeader && (
 <div ref={headerRef} className={`flex items-center justify-between ${compactHeader ? 'px-3 py-1.5' : 'px-4 py-2'} ${isInsightCard && priorityColors ? priorityColors.headerGradient : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40'} border-b-2 border-outline ${!collapsed ? 'rounded-t-xl' : 'rounded-xl'} relative z-40`}>
 <div className="flex items-center gap-2">
 {!hideCollapse && (
 <button
 type="button"
 onClick={handleToggleCollapse}
 className={`inline-flex items-center justify-center rounded-lg bg-surface-elevated border-2 border-blue-300 border-blue-700 text-brand hover:bg-brand/10 hover:border-brand focus:outline-none focus:ring-2 focus:ring-brand transition-all duration-200 shadow-sm relative z-40 ${compactHeader ? 'h-6 w-6' : 'h-7 w-7'}`}
 aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
 >
 {collapsed ? (
 <svg className={compactHeader ? 'h-3.5 w-3.5' : 'h-4 w-4'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9" />
 </svg>
 ) : (
 <svg className={compactHeader ? 'h-3.5 w-3.5' : 'h-4 w-4'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
 </svg>
 )}
 </button>
 )}
 {priorityIcon && (
 <span className={`flex-shrink-0 ${compactHeader ? 'text-base' : 'text-lg'}`} aria-label={`Priority: ${priorityColor}`}>
 {priorityIcon}
 </span>
 )}
 <h2 className={`font-bold text-content-primary ${compactHeader ? 'text-sm' : 'text-base'}`}>{title}</h2>
 </div>
 <div className={`flex items-center gap-1.5 relative z-40 ${!readOnly ? 'mr-8' : ''}`}>
 {titleSuffix}
{!readOnly && filters && (
 <button
 type="button"
 onClick={handleToggleFilters}
 className={`inline-flex items-center justify-center rounded-lg bg-surface-elevated border-2 transition-all duration-200 shadow-sm ${compactHeader ? 'h-6 w-6' : 'h-7 w-7'} ${
 !filtersCollapsed
 ? 'border-brand text-brand bg-blue-50'
 : 'border-outline-strong text-content-tertiary hover:bg-surface-secondary hover:border-outline-strong'
 } focus:outline-none focus:ring-2 focus:ring-brand`}
 aria-label={filtersCollapsed ? 'Show filters' : 'Hide filters'}
 title={filtersCollapsed ? 'Show filters' : 'Hide filters'}
 >
 <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
 </svg>
 </button>
 )}
 {!readOnly && onRefresh && (
 <button
 type="button"
 onClick={onRefresh}
 className={`inline-flex items-center justify-center rounded-lg bg-surface-elevated border-2 border-outline-strong text-content-tertiary hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-600 hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 shadow-sm ${compactHeader ? 'h-6 w-6' : 'h-7 w-7'}`}
 aria-label="Refresh"
 title="Refresh"
 >
 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
 <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
 </svg>
 </button>
 )}
 {!readOnly && actions}
 {!readOnly && onAIChat && (
 <button
 type="button"
 onClick={onAIChat}
 className={`inline-flex items-center justify-center rounded-lg bg-surface-elevated border-2 border-outline-strong text-content-tertiary hover:bg-surface-secondary hover:border-outline-strong focus:outline-none focus:ring-2 focus:ring-brand transition-all duration-200 shadow-sm ${compactHeader ? 'h-6 w-6' : 'h-7 w-7'}`}
 aria-label="AI Chat for this report"
 title="Open AI chat for this report"
 >
 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
 <path d="M10 3.5a1.5 1.5 0 011.5 1.5v1.5a1.5 1.5 0 01-3 0V5a1.5 1.5 0 011.5-1.5zM5.5 11a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 003 0V12.5a1.5 1.5 0 00-1.5-1.5zM14.5 11a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 003 0V12.5a1.5 1.5 0 00-1.5-1.5zM10 9a1 1 0 00-1 1v1a1 1 0 002 0v-1a1 1 0 00-1-1z" />
 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0 2a10 10 0 100-20 10 10 0 000 20z" clipRule="evenodd" />
 </svg>
 </button>
 )}
 </div>
 </div>
 )}

    {(hideHeader || !collapsed) && (
      <div className="flex-1 flex flex-col min-h-0 rounded-b-xl overflow-hidden">
        {/* Title bar with optional filter badges - shown when header is hidden OR when there are filter badges */}
        {(hideHeader || (filterBadges && filterBadges.length > 0)) && (
          <div className="flex-shrink-0 px-4 py-1.5 border-b border-outline bg-gradient-to-r from-blue-25 to-indigo-25">
            <div className="flex flex-wrap gap-1.5 items-center">
              {/* Show report title when header is hidden, otherwise show "Active Filters:" */}
              <span className={`text-xs mr-0.5 ${hideHeader ? 'font-bold text-content-primary' : 'font-semibold text-content-tertiary'}`}>
                {hideHeader ? title : 'Active Filters:'}
              </span>
              {filterBadges && filterBadges.map((badge, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => badge.filterKey && onTogglePin?.(badge.filterKey)}
                  disabled={!badge.filterKey || !onTogglePin}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border transition-all ${
                    badge.isPinned
                      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-900/60 cursor-pointer'
                      : onTogglePin && badge.filterKey
                      ? 'bg-brand/20 text-blue-800 dark:text-blue-300 border-blue-200 border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-900/60 cursor-pointer'
                      : 'bg-brand/20 text-blue-800 dark:text-blue-300 border-blue-200 border-blue-700 cursor-default'
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
 <div className="flex-shrink-0 px-4 py-3 border-b-2 border-outline bg-gradient-to-r from-surface to-surface-elevated">
 {filters}
 </div>
 )}

<div className={`flex-1 min-h-0 overflow-hidden flex flex-col ${isInsightCard ? 'bg-gradient-to-r from-surface to-surface-elevated' : 'bg-surface'}`}>
<div className={`flex-1 w-full flex flex-col overflow-hidden min-h-0 ${isInsightCard ? '' : 'p-4'}`}>
{children}
</div>
</div>

 {footer && (
 <div className="flex-shrink-0 px-4 py-3 border-t-2 border-outline bg-gradient-to-r from-surface to-surface-elevated rounded-b-xl">
 {footer}
 </div>
 )}
 </div>
 )}
 </div>
 </ReportCardHeaderRectContext.Provider>
 );
};

export default ReportCard;
