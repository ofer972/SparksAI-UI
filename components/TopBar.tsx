'use client';

import React, { useState, useCallback, useMemo } from 'react';
import DashboardTopBarContent from './topbar/DashboardTopBarContent';
import InsightsTopBarContent from './topbar/InsightsTopBarContent';
import TopBarFilterPanel from './topbar/TopBarFilterPanel';

type NavItemId = 'team-ai-insights' | 'team-dashboard' | 'pi-dashboard' | 'settings' | 'general-data' | 'create-agent-job' | 'upload-transcripts' | 'users-admin' | 'teams-and-meetings' | 'etl-dashboard' | 'etl-sync' | 'etl-settings';

interface FilterBadge {
  label: string;
  value: string;
}

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
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  
  const isDashboardView = activeNavItem === 'team-dashboard' || activeNavItem === 'pi-dashboard';
  const viewTitle = navigationItems.find(item => item.id === activeNavItem)?.label || 'SparksAI';

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
    ];
    return viewsWithFilters.includes(activeNavItem);
  }, [activeNavItem]);

  // Generate filter badges for active filters - only show badges for filters used in current view
  const filterBadges = useMemo((): FilterBadge[] => {
    const badges: FilterBadge[] = [];

    // Determine which filters are applicable for current view
    const showPIFilter = activeNavItem === 'pi-dashboard' || 
                         activeNavItem === 'team-ai-insights' ||
                         activeNavItem === 'upload-transcripts';
    
    const showTeamGroupFilter = activeNavItem === 'team-dashboard' || 
                                activeNavItem === 'team-ai-insights' || 
                                activeNavItem === 'pi-dashboard' ||
                                activeNavItem === 'upload-transcripts';

    // Add PI filter badge if selected AND applicable to current view
    if (filters.selectedPI && showPIFilter) {
      badges.push({
        label: 'PI',
        value: filters.selectedPI,
      });
    }

    // Add Team/Group filter badge if selected AND applicable to current view
    if (filters.selectedTreeValue && filters.selectedTreeLabel && showTeamGroupFilter) {
      const type = filters.selectedTreeValue.startsWith('group:') ? 'Group' : 'Team';
      badges.push({
        label: type,
        value: filters.selectedTreeLabel,
      });
    }

    return badges;
  }, [filters.selectedPI, filters.selectedTreeValue, filters.selectedTreeLabel, activeNavItem]);

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

