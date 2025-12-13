'use client';

import React from 'react';
import PIFilter from '@/components/PIFilter';
import TreeSelect from '@/components/TreeSelect';
import InsightCategoryFilter from '@/components/InsightCategoryFilter';

type NavItemId = 'team-ai-insights' | 'team-dashboard' | 'pi-quarter' | 'pi-dashboard' | 'settings' | 'general-data' | 'create-agent-job' | 'upload-transcripts' | 'users-admin' | 'teams-and-meetings';

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
                       activeNavItem === 'pi-quarter' || 
                       activeNavItem === 'upload-transcripts';
  
  const showTeamGroupFilter = activeNavItem === 'team-dashboard' || 
                              activeNavItem === 'team-ai-insights' || 
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
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
              PI:
            </label>
            <div style={{ minWidth: '200px', maxWidth: '300px' }}>
              <PIFilter 
                selectedPI={filters.selectedPI}
                onPIChange={filters.onPIChange}
              />
            </div>
          </div>
        )}
        
        {/* Team/Group Filter */}
        {showTeamGroupFilter && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
              Team/Group:
            </label>
            <div style={{ minWidth: '200px', maxWidth: '300px' }}>
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
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
              Categories:
            </label>
            <div>
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

