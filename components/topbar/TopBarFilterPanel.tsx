'use client';

import React from 'react';
import PIFilter from '@/components/PIFilter';
import TreeSelect from '@/components/TreeSelect';
import InsightCategoryFilter from '@/components/InsightCategoryFilter';

type NavItemId = 'team-ai-insights' | 'team-dashboard' | 'pi-dashboard' | 'settings' | 'general-data' | 'create-agent-job' | 'upload-transcripts' | 'users-admin' | 'teams-and-meetings' | 'etl-dashboard' | 'etl-sync' | 'etl-settings';

interface TopBarFilterPanelProps {
  activeNavItem: NavItemId;
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
}

export default function TopBarFilterPanel({
  activeNavItem,
  filters,
}: TopBarFilterPanelProps) {
  // Determine which filters to show based on active nav item
  const showPIFilter = activeNavItem === 'pi-dashboard' || 
                       activeNavItem === 'team-ai-insights' ||
                       activeNavItem === 'upload-transcripts';
  
  const showTeamGroupFilter = activeNavItem === 'team-dashboard' || 
                              activeNavItem === 'team-ai-insights' || 
                              activeNavItem === 'pi-dashboard' ||
                              activeNavItem === 'upload-transcripts';

  const showCategoryFilter = activeNavItem === 'team-ai-insights';

  // If no filters to show, don't render anything
  if (!showPIFilter && !showTeamGroupFilter && !showCategoryFilter) {
    return null;
  }

  return (
    <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 py-3 animate-fadeIn">
      <div className="flex flex-wrap items-center gap-4 px-4">
        {/* PI Filter */}
        {showPIFilter && (
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 w-full md:w-auto">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
              PI:
            </label>
            <div className="w-full md:min-w-[200px] md:max-w-[300px]">
              <PIFilter 
                selectedPI={filters.selectedPI}
                onPIChange={filters.onPIChange}
              />
            </div>
          </div>
        )}
        
        {/* Team/Group Filter */}
        {showTeamGroupFilter && (
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 w-full md:w-auto">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
              Team/Group:
            </label>
            <div className="w-full md:min-w-[200px] md:max-w-[300px]">
              <TreeSelect 
                selectedValue={filters.selectedTreeValue}
                onSelect={filters.onTreeSelect}
                placeholder="Select team or group"
              />
            </div>
          </div>
        )}

        {/* Category Filter - for team-ai-insights view */}
        {showCategoryFilter && (
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 w-full md:w-auto">
            <div className="w-full md:w-auto">
              <InsightCategoryFilter
                selectedCategories={filters.selectedCategories || []}
                onCategoriesChange={filters.onCategoriesChange || (() => {})}
                settingsLoading={filters.settingsLoading}
                hasSavedSettings={filters.hasSavedSettings}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

