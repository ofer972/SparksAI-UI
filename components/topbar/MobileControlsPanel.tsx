'use client';

import React from 'react';
import PIFilter from '@/components/PIFilter';
import TreeSelect from '@/components/TreeSelect';
import InsightCategoryFilter from '@/components/InsightCategoryFilter';

type NavItemId = 'team-ai-insights' | 'team-dashboard' | 'pi-dashboard' | 'custom-dashboards' | 'custom-dashboard-editor' | 'settings' | 'general-data' | 'create-agent-job' | 'upload-transcripts' | 'users-admin' | 'teams-and-meetings' | 'etl-dashboard' | 'etl-sync' | 'etl-settings' | 'user-settings' | 'pi-goals' | 'sprint-goals';

interface MobileControlsPanelProps {
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

export default function MobileControlsPanel({
  activeNavItem,
  filters,
}: MobileControlsPanelProps) {
  return (
    <div className="md:hidden border-t border-gray-200 bg-gradient-to-b from-white to-gray-50 pl-3 pr-3 pt-2 pb-2 space-y-2 -mt-[1px] overflow-visible">
      {/* Filters */}
      <div className="flex flex-col gap-2">
        {/* Team/Group Filter */}
        {(activeNavItem === 'team-ai-insights' || activeNavItem === 'team-dashboard' || activeNavItem === 'pi-dashboard' || activeNavItem === 'upload-transcripts') && (
          <TreeSelect 
            selectedValue={filters.selectedTreeValue}
            onSelect={filters.onTreeSelect}
            placeholder="Select team or group"
          />
        )}
        
        {/* Insight Category Filter (Focus) */}
        {(activeNavItem === 'team-ai-insights') && (
          <InsightCategoryFilter
            selectedCategories={filters.selectedCategories || []}
            onCategoriesChange={filters.onCategoriesChange || (() => {})}
            settingsLoading={filters.settingsLoading}
            hasSavedSettings={filters.hasSavedSettings}
          />
        )}
        
        {/* PI Filter - shown last, after Focus (Category Filter) */}
        {(activeNavItem === 'pi-dashboard' || activeNavItem === 'team-ai-insights' || activeNavItem === 'upload-transcripts') && (
          <PIFilter 
            selectedPI={filters.selectedPI}
            onPIChange={filters.onPIChange}
          />
        )}
      </div>

      {/* Dashboard controls - removed duplicate AI menu on mobile */}

      {/* Search removed on mobile */}
    </div>
  );
}

