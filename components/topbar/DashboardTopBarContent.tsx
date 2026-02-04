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

 {/* Filter Badges (Mobile) - Second Line - Hidden for team-dashboard and pi-dashboard */}
 {filterBadges.length > 0 && activeNavItem !== 'team-dashboard' && activeNavItem !== 'pi-dashboard' && (
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
 <div className="hidden md:flex md:items-end md:gap-4 w-full">
 {/* Title + breadcrumbs */}
 <div className="flex flex-col min-w-0 pb-0.5">
 {breadcrumbs && breadcrumbs.length > 0 ? (
 <div className="flex items-center gap-1 text-[11px] text-content-muted">
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
 <h1 className="text-xl font-semibold text-content-primary whitespace-nowrap tracking-tight">
 {viewTitle}
 </h1>
 </div>

 {/* Filter Badges - Hidden for team-dashboard and pi-dashboard */}
 {filterBadges.length > 0 && activeNavItem !== 'team-dashboard' && activeNavItem !== 'pi-dashboard' && (
 <div className="flex flex-wrap gap-1.5 items-center pb-1">
 {filterBadges.map((badge, index) => (
 <span
 key={index}
 className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-brand/20 text-blue-800 dark:text-blue-300 border border-blue-200 border-blue-700"
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

