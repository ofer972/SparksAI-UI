'use client';

import React from 'react';
import DashboardTopBarContent from './topbar/DashboardTopBarContent';
import InsightsTopBarContent from './topbar/InsightsTopBarContent';
import MobileControlsPanel from './topbar/MobileControlsPanel';

type NavItemId = 'team-ai-insights' | 'team-dashboard' | 'pi-quarter' | 'pi-dashboard' | 'settings' | 'general-data' | 'create-agent-job' | 'upload-transcripts' | 'users-admin' | 'teams-and-meetings';

interface TopBarProps {
  // Navigation
  activeNavItem: NavItemId;
  navigationItems: Array<{id: string; label: string}>;
  onToggleMobileSidebar: () => void;
  
  // Dashboard-specific (team-dashboard, pi-dashboard)
  dashboardSettings?: {
    hasChanges: boolean;
    isSaving: boolean;
    onSave: () => void;
    onReset: () => void;
  };
  
  // Insights-specific (team-ai-insights, pi-quarter)
  insightSettings?: {
    hasChanges: boolean;
    isSaving: boolean;
    onSave: () => void;
  };
  
  // Filters
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
  
  // AI Chat & Prompts (for dashboards only)
  aiChat?: {
    onOpenChat: () => void;
    prompts: any[];
    selectedPrompt: string;
    onPromptChange: (prompt: string) => void;
    loadingPrompts: boolean;
  };
  
  // User
  currentUser: any;
  onLogout: () => void;
}

export default function TopBar({
  activeNavItem,
  navigationItems,
  onToggleMobileSidebar,
  dashboardSettings,
  insightSettings,
  filters,
  aiChat,
  currentUser,
  onLogout,
}: TopBarProps) {
  const isDashboardView = activeNavItem === 'team-dashboard' || activeNavItem === 'pi-dashboard';
  const viewTitle = navigationItems.find(item => item.id === activeNavItem)?.label || 'SparksAI';

  return (
    <div className="md:contents bg-gradient-to-r from-white to-gray-50 border-b border-l-0 border-gray-200 md:border-0 flex-shrink-0 relative z-30 overflow-visible">
      <div className="flex flex-wrap md:flex-nowrap items-center gap-0 md:gap-4 h-[40px] md:h-auto md:py-0 pl-3 md:pl-0 md:flex-1">
        {/* Mobile hamburger */}
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 rounded hover:bg-gray-100 text-gray-600"
          aria-label="Open sidebar"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Conditional rendering based on view type */}
        {isDashboardView && dashboardSettings && aiChat ? (
          <DashboardTopBarContent
            activeNavItem={activeNavItem}
            viewTitle={viewTitle}
            dashboardSettings={dashboardSettings}
            filters={filters}
            aiChat={aiChat}
            currentUser={currentUser}
            onLogout={onLogout}
          />
        ) : (
          <InsightsTopBarContent
            activeNavItem={activeNavItem}
            viewTitle={viewTitle}
            insightSettings={insightSettings}
            filters={filters}
            currentUser={currentUser}
            onLogout={onLogout}
          />
        )}
      </div>

      {/* Mobile controls panel */}
      <MobileControlsPanel
        activeNavItem={activeNavItem}
        filters={filters}
      />
    </div>
  );
}

