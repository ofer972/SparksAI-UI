'use client';

import React from 'react';
import DashboardAIMenu from '@/components/DashboardAIMenu';

type NavItemId = 'team-ai-insights' | 'team-dashboard' | 'pi-quarter' | 'pi-dashboard' | 'settings' | 'general-data' | 'create-agent-job' | 'upload-transcripts' | 'users-admin' | 'teams-and-meetings' | 'etl-dashboard' | 'etl-sync' | 'etl-settings';

interface FilterBadge {
  label: string;
  value: string;
}

interface DashboardTopBarContentProps {
  activeNavItem: NavItemId;
  viewTitle: string;
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
}

export default function DashboardTopBarContent({
  activeNavItem,
  viewTitle,
  dashboardSettings,
  filters,
  aiChat,
  currentUser,
  onLogout,
  onToggleFilters,
  filtersCollapsed,
  filterBadges,
  hasFilters,
}: DashboardTopBarContentProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-0 md:gap-4 flex-1 min-w-0 pr-3 md:px-0 md:py-2 w-full">
      {/* Mobile: Title, Actions, and Badges */}
      <div className="flex md:hidden flex-col w-full py-1">
        <div className="flex items-center justify-between w-full">
        {/* View title */}
          <h1 className="text-lg font-semibold text-gray-900 whitespace-nowrap truncate mr-2">
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
                    ? 'border-blue-400 text-blue-600 bg-blue-50' 
                    : 'border-gray-300 text-gray-500 active:bg-gray-100'
                }`}
                title={filtersCollapsed ? 'Show filters' : 'Hide filters'}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
            )}

            {/* Manage Reports Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Manage Reports button clicked (mobile)');
              window.dispatchEvent(new CustomEvent('open-add-reports-modal'));
            }}
            className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-gray-300 text-gray-500 active:text-green-600 active:border-green-400 active:bg-green-50 transition-all touch-manipulation"
            title="Manage dashboard reports"
            aria-label="Manage reports"
            type="button"
          >
            <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          
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
          
          {/* Mobile Logout Button */}
          <button
            onClick={onLogout}
            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100 text-gray-700"
            title="Logout"
          >
            Logout
          </button>
        </div>
        </div>

        {/* Filter Badges (Mobile) - Second Line */}
        {filterBadges.length > 0 && (
          <div className="flex overflow-x-auto no-scrollbar gap-1 mt-1 pb-1 w-full">
            {filterBadges.map((badge, index) => (
              <span
                key={index}
                className="inline-flex items-center flex-shrink-0 gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap"
              >
                <span>{badge.label}:</span>
                <span className="truncate max-w-[100px]">{badge.value}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Desktop: Full Layout */}
      <div className="hidden md:flex md:items-center md:gap-4 w-full">
        {/* View title */}
        <h1 className="text-xl font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent whitespace-nowrap tracking-tight">
          {viewTitle}
        </h1>

        {/* Filter Badges - Always display active filters */}
        {filterBadges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            {filterBadges.map((badge, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
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
          {/* Manage Reports Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Manage Reports button clicked (desktop)');
              window.dispatchEvent(new CustomEvent('open-add-reports-modal'));
            }}
            className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-gray-300 text-gray-500 hover:text-green-600 hover:border-green-400 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
            title="Manage dashboard reports"
            aria-label="Manage reports"
            type="button"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          
          {/* Save Settings Button - for dashboards */}
          <button
            onClick={dashboardSettings.onSave}
            disabled={!dashboardSettings.hasChanges || dashboardSettings.isSaving}
            className={`hidden md:inline-flex items-center justify-center h-7 w-7 rounded-lg border transition-all ${
              dashboardSettings.hasChanges && !dashboardSettings.isSaving
                ? 'border-blue-500 text-blue-600 hover:text-blue-700 hover:border-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer' 
                : 'border-gray-300 text-gray-400 cursor-not-allowed'
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
          
          {/* Reset to Defaults Button - for dashboards only */}
          {(['team-dashboard', 'pi-dashboard'].includes(activeNavItem)) && (
            <button
              onClick={dashboardSettings.onReset}
              disabled={dashboardSettings.isSaving}
              className="hidden md:inline-flex items-center justify-center h-7 w-7 rounded-lg border border-gray-300 text-gray-500 hover:text-red-600 hover:border-red-400 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Reset dashboard to defaults"
              aria-label="Reset to defaults"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
          )}
          
          {/* Divider */}
          {(['team-dashboard', 'pi-dashboard'].includes(activeNavItem)) && (
            <div className="h-6 w-px bg-gray-300 mx-1"></div>
          )}
          
          {/* Filter Toggle Button - Only show if view has filters */}
          {hasFilters && (
            <button
              onClick={onToggleFilters}
              className={`inline-flex items-center justify-center h-7 w-7 rounded-lg border-2 transition-all ${
                !filtersCollapsed 
                  ? 'border-blue-400 text-blue-600 bg-blue-50' 
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              title={filtersCollapsed ? 'Show filters' : 'Hide filters'}
              aria-label={filtersCollapsed ? 'Show filters' : 'Hide filters'}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
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
          
          <div className="flex items-center space-x-3 text-sm text-gray-700">
            {(() => {
              if (!currentUser) return <span>Signed in</span>;
              const fullName = (currentUser.name || '').trim();
              const firstName = fullName ? fullName.split(/\s+/)[0] : (currentUser.email ? String(currentUser.email).split('@')[0] : 'Signed in');
              const desktopLabel = currentUser.name && currentUser.email ? `${currentUser.name} (${currentUser.email})` : (currentUser.name || currentUser.email || 'Signed in');
              return (
                <>
                  {/* Mobile: first name only, no email */}
                  <span className="md:hidden truncate max-w-[120px]" title={fullName || ''}>{firstName}</span>
                  {/* Desktop: name (email) */}
                  <span className="hidden md:inline" title={currentUser.email || ''}>{desktopLabel}</span>
                </>
              );
            })()}
            <button
              onClick={onLogout}
              className="px-2 py-1 border rounded hover:bg-gray-50"
              title="Logout"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

