'use client';

import React from 'react';
import DashboardAIMenu from '@/components/DashboardAIMenu';
import UserDropdownMenu from '../UserDropdownMenu';

import type { BreadcrumbItem, NavItemId } from '@/lib/nav';

interface FilterBadge {
 label: string;
 value: string;
}

interface InsightsTopBarContentProps {
 activeNavItem: NavItemId;
 viewTitle: string;
 breadcrumbs?: BreadcrumbItem[];
 insightSettings?: {
 hasChanges: boolean;
 isSaving: boolean;
 onSave: () => void;
 };
 filters: {
 selectedPI: string;
 onPIChange: (pi: string) => void;
 selectedTreeValue: string | null;
 onTreeSelect: (value: string | null, label: string, type: 'team' | 'group') => void;
 selectedCategories?: string[];
 onCategoriesChange?: (categories: string[]) => void;
 settingsLoading?: boolean;
 hasSavedSettings?: boolean;
 };
 insightChat?: {
 onOpenChat: () => void;
 };
 kpiDashboardChat?: {
 onOpenChat: () => void;
 };
 dashboardChat?: {
 onOpenChat: (dashboardData?: any) => void;
 prompts: any[];
 selectedPrompt: string;
 onPromptChange: (prompt: string) => void;
 loadingPrompts: boolean;
 };
 currentUser: any;
 onLogout: () => void;
 onToggleFilters: () => void;
 filtersCollapsed: boolean;
 filterBadges: FilterBadge[];
 hasFilters: boolean;
 onNavigateToSettings?: () => void;
}

export default function InsightsTopBarContent({
 activeNavItem,
 viewTitle,
 breadcrumbs,
 insightSettings,
 filters,
 insightChat,
 kpiDashboardChat,
 dashboardChat,
 currentUser,
 onLogout,
 onToggleFilters,
 filtersCollapsed,
 filterBadges,
 hasFilters,
 onNavigateToSettings,
}: InsightsTopBarContentProps) {
 return (
 <div className="flex flex-col md:flex-row md:items-end gap-0 md:gap-3 flex-1 min-w-0 pr-3 md:px-0 md:py-2 w-full">
 {/* Mobile: Title, Actions, and Badges */}
 <div className="flex md:hidden flex-col w-full py-1">
 {breadcrumbs && breadcrumbs.length > 0 ? (
 <div className="flex items-center gap-1 text-[10px] text-content-muted mb-0.5">
 {breadcrumbs.map((b, idx) => (
 <React.Fragment key={`${b.label}-${idx}`}>
 {idx > 0 ? <span className="text-gray-300 text-content-muted">/</span> : null}
 {b.onClick ? (
 <button
 type="button"
 onClick={b.onClick}
 className="hover:text-content-primary transition-colors"
 >
 {b.label}
 </button>
 ) : (
 <span className="text-content-tertiary">{b.label}</span>
 )}
 </React.Fragment>
 ))}
 </div>
 ) : null}
 <div className="flex items-center justify-between w-full">
 {/* View title */}
 <h1 className="text-lg font-semibold text-content-primary whitespace-nowrap truncate mr-2">
 {viewTitle}
 </h1>
 
 {/* Mobile Actions */}
 <div className="flex items-center gap-1.5 flex-shrink-0">
 {/* Filter Toggle Button (Mobile) - Only show if view has filters */}
 {hasFilters && (
 <button
 onClick={onToggleFilters}
 className={`inline-flex items-center justify-center h-7 w-7 rounded-lg border transition-all ${
 !filtersCollapsed 
 ? 'border-brand text-brand bg-brand/10' 
 : 'border-outline-strong text-content-muted active:bg-surface-secondary dark:active:bg-slate-800'
 }`}
 title={filtersCollapsed ? 'Show filters' : 'Hide filters'}
 >
 <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
 </svg>
 </button>
 )}

 {/* AI Chat Button (Mobile) - Only show if insightChat is provided */}
 {insightChat && (
 <button
 onClick={insightChat.onOpenChat}
 className="flex items-center space-x-2 px-3 py-1 rounded-lg hover:bg-surface-secondary text-content-tertiary focus:outline-none focus:ring-2 focus:ring-brand transition-colors"
 aria-label="AI Chat for this insight"
 title="Open AI chat for this insight"
 >
 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
 <path d="M10 3.5a1.5 1.5 0 011.5 1.5v1.5a1.5 1.5 0 01-3 0V5a1.5 1.5 0 011.5-1.5zM5.5 11a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 003 0V12.5a1.5 1.5 0 00-1.5-1.5zM14.5 11a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 003 0V12.5a1.5 1.5 0 00-1.5-1.5zM10 9a1 1 0 00-1 1v1a1 1 0 002 0v-1a1 1 0 00-1-1z" />
 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0 2a10 10 0 100-20 10 10 0 000 20z" clipRule="evenodd" />
 </svg>
 <span className="text-sm font-medium">AI</span>
 </button>
 )}

 {/* AI Chat Button (Mobile) - For KPI Dashboard */}
 {kpiDashboardChat && (
 <button
 onClick={kpiDashboardChat.onOpenChat}
 className="flex items-center space-x-2 px-3 py-1 rounded-lg hover:bg-surface-secondary text-content-tertiary focus:outline-none focus:ring-2 focus:ring-brand transition-colors"
 aria-label="AI Chat for this KPI"
 title="Open AI chat for this KPI"
 >
 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
 <path d="M10 3.5a1.5 1.5 0 011.5 1.5v1.5a1.5 1.5 0 01-3 0V5a1.5 1.5 0 011.5-1.5zM5.5 11a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 003 0V12.5a1.5 1.5 0 00-1.5-1.5zM14.5 11a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 003 0V12.5a1.5 1.5 0 00-1.5-1.5zM10 9a1 1 0 00-1 1v1a1 1 0 002 0v-1a1 1 0 00-1-1z" />
 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0 2a10 10 0 100-20 10 10 0 000 20z" clipRule="evenodd" />
 </svg>
 <span className="text-sm font-medium">AI</span>
 </button>
 )}

 {/* Dashboard AI Menu (Mobile) - For team-dashboard and pi-dashboard */}
 {dashboardChat && (
 <DashboardAIMenu
 onOpenAIChat={dashboardChat.onOpenChat}
 prompts={dashboardChat.prompts}
 selectedPrompt={dashboardChat.selectedPrompt}
 onPromptChange={dashboardChat.onPromptChange}
 loadingPrompts={dashboardChat.loadingPrompts}
 onCollectDashboardData={() => {
 return new Promise<any>((resolve) => {
 const handler = (e: Event) => {
 const customEvent = e as CustomEvent;
 window.removeEventListener('dashboard-data-collected', handler);
 resolve(customEvent.detail);
 };
 window.addEventListener('dashboard-data-collected', handler);
 window.dispatchEvent(new CustomEvent('collect-dashboard-data'));
 setTimeout(() => {
 window.removeEventListener('dashboard-data-collected', handler);
 resolve(null);
 }, 1000);
 });
 }}
 />
 )}

          {/* Mobile User Menu */}
          <div className="mr-2">
            <UserDropdownMenu onOpenSettings={onNavigateToSettings} />
          </div>
 </div>
 </div>

 {/* Filter Badges (Mobile) - Second Line */}
 {filterBadges.length > 0 && (
 <div className="flex overflow-x-auto no-scrollbar gap-1 mt-1 pb-1 w-full">
 {filterBadges.map((badge, index) => (
 <span
 key={index}
 className="inline-flex items-center flex-shrink-0 gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-brand/20 text-blue-800 dark:text-blue-300 border border-blue-200 border-blue-700 whitespace-nowrap"
 >
 <span>{badge.label}:</span>
 <span className="truncate max-w-[100px]">{badge.value}</span>
 </span>
 ))}
 </div>
 )}
 </div>
 
 {/* Desktop: View title */}
 <div className="hidden md:flex flex-col min-w-0">
 {breadcrumbs && breadcrumbs.length > 0 ? (
 <div className="flex items-center gap-1 text-[11px] text-content-muted mb-1">
 {breadcrumbs.map((b, idx) => (
 <React.Fragment key={`${b.label}-${idx}`}>
 {idx > 0 ? <span className="text-gray-300 text-content-muted">/</span> : null}
 {b.onClick ? (
 <button
 type="button"
 onClick={b.onClick}
 className="hover:text-content-primary transition-colors"
 >
 {b.label}
 </button>
 ) : (
 <span className="text-content-tertiary">{b.label}</span>
 )}
 </React.Fragment>
 ))}
 </div>
 ) : null}
 <h1 className="text-xl font-semibold text-content-primary whitespace-nowrap tracking-tight leading-none m-0">
 {viewTitle}
 </h1>
 </div>

 {/* Filter Badges - Always display active filters */}
 {filterBadges.length > 0 && (
 <div className="hidden md:flex flex-wrap gap-1.5 items-center">
 {filterBadges.map((badge, index) => (
 <span
 key={index}
 className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-brand/20 text-blue-800 dark:text-blue-300 border border-blue-200 border-blue-700 m-0"
 >
 <span className="font-semibold">{badge.label}:</span>
 <span>{badge.value}</span>
 </span>
 ))}
 </div>
 )}

 {/* Spacer to push actions to the right */}
 <div className="flex-1"></div>

 {/* Right side: filter button, save button (for insights), user info, logout */}
 <div className="hidden md:flex items-center gap-2">
 {/* Filter Toggle Button - Only show if view has filters */}
 {hasFilters && (
 <button
 onClick={onToggleFilters}
 className={`inline-flex items-center justify-center h-7 w-7 rounded-lg border-2 transition-all ${
 !filtersCollapsed 
 ? 'border-brand text-brand bg-brand/10' 
 : 'border-outline-strong text-content-tertiary hover:bg-surface-elevated hover:border-outline-strong hover:border-outline-strong'
 } focus:outline-none focus:ring-2 focus:ring-brand`}
 title={filtersCollapsed ? 'Show filters' : 'Hide filters'}
 aria-label={filtersCollapsed ? 'Show filters' : 'Hide filters'}
 >
 <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
 </svg>
 </button>
 )}
 
 {/* AI Chat Button (Desktop) - Only show if insightChat is provided */}
 {insightChat && (
 <button
 onClick={insightChat.onOpenChat}
 className="flex items-center space-x-2 px-3 py-1 rounded-lg hover:bg-surface-secondary text-content-tertiary focus:outline-none focus:ring-2 focus:ring-brand transition-colors"
 aria-label="AI Chat for this insight"
 title="Open AI chat for this insight"
 >
 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
 <path d="M10 3.5a1.5 1.5 0 011.5 1.5v1.5a1.5 1.5 0 01-3 0V5a1.5 1.5 0 011.5-1.5zM5.5 11a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 003 0V12.5a1.5 1.5 0 00-1.5-1.5zM14.5 11a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 003 0V12.5a1.5 1.5 0 00-1.5-1.5zM10 9a1 1 0 00-1 1v1a1 1 0 002 0v-1a1 1 0 00-1-1z" />
 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0 2a10 10 0 100-20 10 10 0 000 20z" clipRule="evenodd" />
 </svg>
 <span className="text-sm font-medium">AI</span>
 </button>
 )}

 {/* AI Chat Button (Desktop) - For KPI Dashboard */}
 {kpiDashboardChat && (
 <button
 onClick={kpiDashboardChat.onOpenChat}
 className="flex items-center space-x-2 px-3 py-1 rounded-lg hover:bg-surface-secondary text-content-tertiary focus:outline-none focus:ring-2 focus:ring-brand transition-colors"
 aria-label="AI Chat for this KPI"
 title="Open AI chat for this KPI"
 >
 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
 <path d="M10 3.5a1.5 1.5 0 011.5 1.5v1.5a1.5 1.5 0 01-3 0V5a1.5 1.5 0 011.5-1.5zM5.5 11a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 003 0V12.5a1.5 1.5 0 00-1.5-1.5zM14.5 11a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 003 0V12.5a1.5 1.5 0 00-1.5-1.5zM10 9a1 1 0 00-1 1v1a1 1 0 002 0v-1a1 1 0 00-1-1z" />
 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0 2a10 10 0 100-20 10 10 0 000 20z" clipRule="evenodd" />
 </svg>
 <span className="text-sm font-medium">AI</span>
 </button>
 )}

 {/* Dashboard AI Menu (Desktop) - For team-dashboard and pi-dashboard */}
 {dashboardChat && (
 <DashboardAIMenu
 onOpenAIChat={dashboardChat.onOpenChat}
 prompts={dashboardChat.prompts}
 selectedPrompt={dashboardChat.selectedPrompt}
 onPromptChange={dashboardChat.onPromptChange}
 loadingPrompts={dashboardChat.loadingPrompts}
 onCollectDashboardData={() => {
 return new Promise<any>((resolve) => {
 const handler = (e: Event) => {
 const customEvent = e as CustomEvent;
 window.removeEventListener('dashboard-data-collected', handler);
 resolve(customEvent.detail);
 };
 window.addEventListener('dashboard-data-collected', handler);
 window.dispatchEvent(new CustomEvent('collect-dashboard-data'));
 setTimeout(() => {
 window.removeEventListener('dashboard-data-collected', handler);
 resolve(null);
 }, 1000);
 });
 }}
 />
 )}
 
          {/* User Dropdown Menu */}
          <div className="mr-3">
            <UserDropdownMenu onOpenSettings={onNavigateToSettings} />
          </div>
 </div>
 </div>
 );
}

