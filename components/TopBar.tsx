'use client';

import React, { useState, useCallback, useMemo } from 'react';
import DashboardTopBarContent from './topbar/DashboardTopBarContent';
import InsightsTopBarContent from './topbar/InsightsTopBarContent';
import TopBarFilterPanel from './topbar/TopBarFilterPanel';

type NavItemId = 'team-ai-insights' | 'team-dashboard' | 'pi-dashboard' | 'custom-dashboards' | 'custom-dashboard-editor' | 'settings' | 'general-data' | 'create-agent-job' | 'upload-transcripts' | 'users-admin' | 'teams-and-meetings' | 'etl-dashboard' | 'etl-sync' | 'etl-settings' | 'user-settings' | 'pi-goals' | 'sprint-goals';

interface FilterBadge {
  label: string;
  value: string;
}

interface TopBarProps {
  // Navigation
  activeNavItem: NavItemId;
  navigationItems: Array<{id: string; label: string}>;
  customViewTitle?: string; // Optional custom title override
  onToggleMobileSidebar: () => void;
  
  // Dashboard-specific (team-dashboard, pi-dashboard)
  dashboardSettings?: {
    hasChanges: boolean;
    isSaving: boolean;
    onSave: () => void;
    onReset: () => void;
  };
  
  // Insights-specific (team-ai-insights)
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
    selectedTreeLabel?: string; // Add label to filters prop
    onTreeSelect: (value: string | null, label: string, type: 'team' | 'group') => void;
    selectedCategories?: string[];
    onCategoriesChange?: (categories: string[]) => void;
    settingsLoading?: boolean;
    hasSavedSettings?: boolean;
    currentPIName?: string; // Current PI name for badge display in AI Insights
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
  onNavigateToSettings?: () => void;
}

export default function TopBar({
  activeNavItem,
  navigationItems,
  customViewTitle,
  onToggleMobileSidebar,
  dashboardSettings,
  insightSettings,
  filters,
  aiChat,
  currentUser,
  onLogout,
  onNavigateToSettings,
}: TopBarProps) {
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  
  const isDashboardView = activeNavItem === 'team-dashboard' || activeNavItem === 'pi-dashboard' || activeNavItem === 'custom-dashboard-editor';
  const viewTitle = customViewTitle || navigationItems.find(item => item.id === activeNavItem)?.label || 'SparksAI';

  // Close filters when switching views
  React.useEffect(() => {
    setFiltersCollapsed(true);
  }, [activeNavItem]);

  const handleToggleFilters = useCallback(() => {
    setFiltersCollapsed((prev) => !prev);
  }, []);

  // Determine if current view has filters
  const hasFilters = useMemo(() => {
    const viewsWithFilters = [
      'team-dashboard',
      'pi-dashboard',
      'team-ai-insights',
      'upload-transcripts',
      'custom-dashboard-editor',
    ];
    return viewsWithFilters.includes(activeNavItem);
  }, [activeNavItem]);

  // Generate filter badges for active filters - only show badges for filters used in current view
  const filterBadges = useMemo((): FilterBadge[] => {
    const badges: FilterBadge[] = [];

    // Determine which filters are applicable for current view
    const showPIFilter = activeNavItem === 'pi-dashboard' || 
                         activeNavItem === 'team-ai-insights' ||
                         activeNavItem === 'upload-transcripts' ||
                         activeNavItem === 'custom-dashboard-editor';
    
    const showTeamGroupFilter = activeNavItem === 'team-dashboard' || 
                                activeNavItem === 'team-ai-insights' || 
                                activeNavItem === 'pi-dashboard' ||
                                activeNavItem === 'upload-transcripts' ||
                                activeNavItem === 'custom-dashboard-editor';

    // Add Team/Group filter badge if selected AND applicable to current view
    if (filters.selectedTreeValue && filters.selectedTreeLabel && showTeamGroupFilter) {
      const type = filters.selectedTreeValue.startsWith('group:') ? 'Group' : 'Team';
      badges.push({
        label: type,
        value: filters.selectedTreeLabel,
      });
    }

    // Add PI filter badge if selected AND applicable to current view (shown last, after Team/Group)
    if (filters.selectedPI && showPIFilter) {
      // For AI Insights, only show badge if currentPIName is set (to avoid showing saved PI before current PI loads)
      if (activeNavItem === 'team-ai-insights') {
        if (filters.currentPIName) {
          badges.push({
            label: 'Current PI',
            value: filters.currentPIName,
          });
        }
        // Don't show badge if currentPIName is not set yet (waiting for API response)
      } else {
        badges.push({
          label: 'PI',
          value: filters.selectedPI,
        });
      }
    }

    return badges;
  }, [filters.selectedPI, filters.currentPIName, filters.selectedTreeValue, filters.selectedTreeLabel, activeNavItem]);

  return (
    <div className="flex-shrink-0 w-full">
      {/* Top Bar Container */}
      <div className="w-full">
        {/* Main TopBar Content - Fixed height with bottom border */}
        <div className="bg-gradient-to-r from-white to-gray-50 border-b border-gray-200">
          <div className="flex flex-wrap md:flex-nowrap items-start md:items-center gap-0 md:gap-4 min-h-[40px] md:h-[57px] pl-3 md:pl-0 md:flex-1">
        {/* Mobile hamburger */}
        <button
          onClick={onToggleMobileSidebar}
              className="md:hidden p-2 rounded hover:bg-gray-100 text-gray-600 mt-0.5"
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
                onToggleFilters={handleToggleFilters}
                filtersCollapsed={filtersCollapsed}
                filterBadges={filterBadges}
                hasFilters={hasFilters}
                onNavigateToSettings={onNavigateToSettings}
              />
            ) : (
              <InsightsTopBarContent
                activeNavItem={activeNavItem}
                viewTitle={viewTitle}
                insightSettings={insightSettings}
                filters={filters}
                currentUser={currentUser}
                onLogout={onLogout}
                onToggleFilters={handleToggleFilters}
                filtersCollapsed={filtersCollapsed}
                filterBadges={filterBadges}
                hasFilters={hasFilters}
                onNavigateToSettings={onNavigateToSettings}
              />
            )}
      </div>

          {/* Filter Panel Cell - Separate cell below main TopBar */}
          {!filtersCollapsed && (
            <TopBarFilterPanel
        activeNavItem={activeNavItem}
        filters={filters}
      />
          )}
        </div>
      </div>
    </div>
  );
}

