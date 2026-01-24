'use client';

import React, { useState } from 'react';

interface Dashboard {
 id: string;
 name: string;
}

interface DashboardTreeProps {
 dashboards: Dashboard[];
 selectedDashboardId: string | null;
 onSelectDashboard: (dashboardId: string) => void;
 onSelectParent: () => void;
 isParentActive: boolean;
 width?: string; // Width of the tree (should match sidebar width)
}

export default function DashboardTree({
 dashboards,
 selectedDashboardId,
 onSelectDashboard,
 onSelectParent,
 isParentActive,
 width = 'w-full',
}: DashboardTreeProps) {
 const [isExpanded, setIsExpanded] = useState(true);
 
 // Fixed height to show up to 6 items (each item ~36px, plus padding)
 // 6 items * 36px = 216px, plus parent item ~36px, plus padding ~16px = ~268px
 const maxHeight = '268px';
 const itemHeight = '36px';

 const handleParentClick = () => {
 if (isExpanded) {
 // If expanded, clicking should collapse it (like other collapsible panels)
 setIsExpanded(false);
 } else {
 // If collapsed, clicking should expand it and navigate to the parent view
 setIsExpanded(true);
 onSelectParent();
 }
 };

 return (
 <div className={`${width} flex flex-col overflow-x-auto overflow-y-hidden`} style={{ height: maxHeight, minWidth: 0 }}>
 {/* Parent: My Dashboards */}
 <button
 onClick={handleParentClick}
 className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-all duration-200 flex-shrink-0 min-w-max ${
 isParentActive
 ? 'bg-gradient-to-br from-indigo-50 via-indigo-50 to-purple-50 dark:from-indigo-900/40 dark:via-indigo-900/40 dark:to-purple-900/40 text-indigo-700 dark:text-indigo-300 shadow-md border border-indigo-200/60 dark:border-indigo-700/60'
 : 'text-content-secondary hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 dark:hover:from-slate-700 dark:hover:to-slate-600 hover:text-content-primary hover:shadow-sm'
 }`}
 title="My Dashboards"
 >
 <svg 
 className={`w-3 h-3 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
 fill="none" 
 stroke="currentColor" 
 viewBox="0 0 24 24"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
 </svg>
 <svg 
 className="w-4 h-4 flex-shrink-0" 
 fill="none" 
 viewBox="0 0 24 24" 
 stroke="currentColor"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
 </svg>
 <span className="text-xs font-medium whitespace-nowrap">My Dashboards</span>
 </button>

 {/* Children: Individual Dashboards */}
 {isExpanded && (
 <div className="mt-1 space-y-1 overflow-y-auto overflow-x-visible flex-1 min-h-0" style={{ maxHeight: `calc(${maxHeight} - ${itemHeight} - 8px)`, WebkitOverflowScrolling: 'touch' }}>
 {dashboards.length === 0 ? (
 <div className="px-3 py-2 text-xs text-content-muted italic flex-shrink-0 min-w-max">
 No dashboards
 </div>
 ) : (
 dashboards.map((dashboard) => {
 const isActive = selectedDashboardId === dashboard.id;
 return (
 <button
 key={dashboard.id}
 onClick={() => onSelectDashboard(dashboard.id)}
 className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all duration-200 flex-shrink-0 min-w-max ${
 isActive
 ? 'bg-gradient-to-br from-indigo-50 via-indigo-50 to-purple-50 dark:from-indigo-900/40 dark:via-indigo-900/40 dark:to-purple-900/40 text-indigo-700 dark:text-indigo-300 shadow-md border border-indigo-200/60 dark:border-indigo-700/60'
 : 'text-content-secondary hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 dark:hover:from-slate-700 dark:hover:to-slate-600 hover:text-content-primary hover:shadow-sm'
 }`}
 title={dashboard.name}
 >
 <span className="w-3 flex-shrink-0"></span>
 <svg 
 className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-content-tertiary'}`}
 fill="none" 
 viewBox="0 0 24 24" 
 stroke="currentColor"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
 </svg>
 <span className="text-xs font-medium whitespace-nowrap">{dashboard.name}</span>
 </button>
 );
 })
 )}
 </div>
 )}
 </div>
 );
}

