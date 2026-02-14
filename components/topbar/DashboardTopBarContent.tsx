'use client';

import React from 'react';
import DashboardAIMenu from '@/components/DashboardAIMenu';
import UserDropdownMenu from '../UserDropdownMenu';

import type { BreadcrumbItem, NavItemId } from '@/lib/nav';

interface FilterBadge {
 label: string;
 value: string;
}

interface DashboardTopBarContentProps {
 activeNavItem: NavItemId;
 viewTitle: string;
 breadcrumbs?: BreadcrumbItem[];
 dashboardSettings: {
 hasChanges: boolean;
 isSaving: boolean;
 onSave: () => void;
 onReset: () => void;
 };
 filters: {
 selectedPI: string;
 onPIChange: (pi: string) => void;
 selectedTreeValue: string | null;
 onTreeSelect: (value: string | null, label: string, type: 'team' | 'group') => void;
 };
 aiChat: {
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
 // Public dashboard toggle (custom-dashboard-editor only)
 isPublic?: boolean;
 onTogglePublic?: () => void;
}

export default function DashboardTopBarContent({
 activeNavItem,
 viewTitle,
 breadcrumbs,
 dashboardSettings,
 filters,
 aiChat,
 currentUser,
 onLogout,
 onToggleFilters,
 filtersCollapsed,
 filterBadges,
 hasFilters,
 onNavigateToSettings,
 isPublic,
 onTogglePublic,
}: DashboardTopBarContentProps) {
 return (
 <div className="flex flex-col md:flex-row md:items-center gap-0 md:gap-4 flex-1 min-w-0 pr-3 md:px-0 md:py-2 w-full">
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
 {/* Filter Toggle Button (Mobile) - Hidden for team-dashboard and pi-dashboard */}
 {hasFilters && activeNavItem !== 'team-dashboard' && activeNavItem !== 'pi-dashboard' && (
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

 {/* Manage Reports Button - Hidden for team-dashboard and pi-dashboard */}
 {activeNavItem !== 'team-dashboard' && activeNavItem !== 'pi-dashboard' && (
 <button
 onClick={(e) => {
 e.preventDefault();
 e.stopPropagation();
 console.log('Manage Reports button clicked (mobile)');
 window.dispatchEvent(new CustomEvent('open-add-reports-modal'));
 }}
 className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-outline-strong text-content-muted active:text-green-600 dark:active:text-green-400 active:border-green-400 dark:active:border-green-600 active:bg-green-50 dark:active:bg-green-900/30 transition-all touch-manipulation"
 title="Manage dashboard reports"
 aria-label="Manage reports"
 type="button"
 >
 <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
 </svg>
 </button>
 )}

 {/* Public Toggle (Mobile) - custom-dashboard-editor only */}
 {activeNavItem === 'custom-dashboard-editor' && onTogglePublic && (
 <button
 onClick={onTogglePublic}
 className={`inline-flex items-center justify-center h-7 w-7 rounded-lg border transition-all ${
   isPublic
     ? 'border-emerald-400 dark:border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
     : 'border-outline-strong text-content-muted hover:text-content-secondary hover:border-outline-strong'
 }`}
 title={isPublic ? 'Dashboard is public — click to make private' : 'Dashboard is private — click to make public'}
 aria-label="Toggle public visibility"
 type="button"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
   <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
 </svg>
 </button>
 )}
 
 {/* AI Chat Button */}
 <DashboardAIMenu
 onOpenAIChat={aiChat.onOpenChat}
 prompts={aiChat.prompts}
 selectedPrompt={aiChat.selectedPrompt}
 onPromptChange={aiChat.onPromptChange}
 loadingPrompts={aiChat.loadingPrompts}
 onCollectDashboardData={() => {
 // Wait for response event
 return new Promise<any>((resolve) => {
 const handler = (e: Event) => {
 const customEvent = e as CustomEvent;
 window.removeEventListener('dashboard-data-collected', handler);
 console.log('[DashboardTopBarContent] Received dashboard data:', customEvent.detail);
 resolve(customEvent.detail);
 };
 // Add listener FIRST
 window.addEventListener('dashboard-data-collected', handler);
 // Then dispatch event to collect dashboard data
 console.log('[DashboardTopBarContent] Dispatching collect-dashboard-data event');
 window.dispatchEvent(new CustomEvent('collect-dashboard-data'));
 // Timeout after 1 second
 setTimeout(() => {
 console.log('[DashboardTopBarContent] Timeout reached, resolving with null');
 window.removeEventListener('dashboard-data-collected', handler);
 resolve(null);
 }, 1000);
 });
 }}
 />
 
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

 {/* Desktop: Full Layout */}
 <div className="hidden md:flex md:items-end md:gap-3 w-full">
 {/* Title + breadcrumbs */}
 <div className="flex flex-col min-w-0">
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

 {/* Filter Badges */}
 {filterBadges.length > 0 && (
 <div className="flex flex-wrap gap-1.5 items-center">
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

 {/* Spacer to push actions to the right on desktop */}
 <div className="flex-1 min-w-0"></div>

      {/* Desktop Actions: Dashboard buttons, AI Chat, User, Logout */}
      <div className="flex items-center gap-2">
        {/* Filter Toggle Button - Hidden for team-dashboard and pi-dashboard */}
        {hasFilters && activeNavItem !== 'team-dashboard' && activeNavItem !== 'pi-dashboard' && (
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
        
        {/* Manage Reports Button - Hidden for team-dashboard and pi-dashboard */}
        {activeNavItem !== 'team-dashboard' && activeNavItem !== 'pi-dashboard' && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Manage Reports button clicked (desktop)');
            window.dispatchEvent(new CustomEvent('open-add-reports-modal'));
          }}
          className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-outline-strong text-content-muted hover:text-green-600 dark:hover:text-green-400 hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600 transition-all"
          title="Manage dashboard reports"
          aria-label="Manage reports"
          type="button"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
        )}

        {/* Public Toggle (Desktop) - custom-dashboard-editor only */}
        {activeNavItem === 'custom-dashboard-editor' && onTogglePublic && (
          <button
            onClick={onTogglePublic}
            className={`inline-flex items-center justify-center h-7 rounded-lg border transition-all gap-1.5 px-2 ${
              isPublic
                ? 'border-emerald-400 dark:border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
                : 'border-outline-strong text-content-muted hover:text-content-secondary hover:border-outline-strong hover:bg-surface-elevated'
            } focus:outline-none focus:ring-2 focus:ring-emerald-500`}
            title={isPublic ? 'Dashboard is public — click to make private' : 'Dashboard is private — click to make public'}
            aria-label="Toggle public visibility"
            type="button"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
            <span className="hidden md:inline text-xs font-medium">{isPublic ? 'Public' : 'Private'}</span>
          </button>
        )}
        
        {/* Save Settings Button - Hidden for team-dashboard and pi-dashboard */}
        {activeNavItem !== 'custom-dashboard-editor' && activeNavItem !== 'team-dashboard' && activeNavItem !== 'pi-dashboard' && (
          <button
            onClick={dashboardSettings.onSave}
            disabled={!dashboardSettings.hasChanges || dashboardSettings.isSaving}
            className={`hidden md:inline-flex items-center justify-center h-7 w-7 rounded-lg border transition-all ${
              dashboardSettings.hasChanges && !dashboardSettings.isSaving
                ? 'border-blue-500 dark:border-blue-600 text-brand hover:text-blue-700 hover:text-blue-300 hover:border-blue-600 dark:hover:border-blue-500 hover:bg-brand/10 focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer' 
                : 'border-outline-strong text-content-muted cursor-not-allowed'
            }`}
            title={dashboardSettings.isSaving ? 'Saving...' : dashboardSettings.hasChanges ? 'Save dashboard layout and filters' : 'No changes to save'}
            aria-label="Save dashboard settings"
          >
            {dashboardSettings.isSaving ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            )}
          </button>
        )}
        
        {/* Reset to Defaults Button - Removed for team-dashboard and pi-dashboard */}
 
 {/* AI Chat Button */}
 <DashboardAIMenu
 onOpenAIChat={aiChat.onOpenChat}
 prompts={aiChat.prompts}
 selectedPrompt={aiChat.selectedPrompt}
 onPromptChange={aiChat.onPromptChange}
 loadingPrompts={aiChat.loadingPrompts}
 onCollectDashboardData={() => {
 // Wait for response event
 return new Promise<any>((resolve) => {
 const handler = (e: Event) => {
 const customEvent = e as CustomEvent;
 window.removeEventListener('dashboard-data-collected', handler);
 console.log('[DashboardTopBarContent] Received dashboard data:', customEvent.detail);
 resolve(customEvent.detail);
 };
 // Add listener FIRST
 window.addEventListener('dashboard-data-collected', handler);
 // Then dispatch event to collect dashboard data
 console.log('[DashboardTopBarContent] Dispatching collect-dashboard-data event');
 window.dispatchEvent(new CustomEvent('collect-dashboard-data'));
 // Timeout after 1 second
 setTimeout(() => {
 console.log('[DashboardTopBarContent] Timeout reached, resolving with null');
 window.removeEventListener('dashboard-data-collected', handler);
 resolve(null);
 }, 1000);
 });
 }}
 />
 
          {/* User Dropdown Menu */}
          <div className="mr-3">
            <UserDropdownMenu onOpenSettings={onNavigateToSettings} />
          </div>
 </div>
 </div>
 </div>
 );
}

