'use client';

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import type { BurndownDataPoint } from '@/lib/api';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import { getIssueTypes } from '@/lib/issueTypes';
import { ApiService } from '@/lib/api';
import BurndownViewBase from './BurndownViewBase';
import ReportFilterField from '../reporting/ReportFilterField';

interface ReleaseBurndownViewProps {
  data: BurndownDataPoint[];
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta?: Record<string, any>;
  componentProps?: Record<string, any>;
  togglePin?: (filterKey: string) => void;
  pinnedFilters?: string[];
}

const ReleaseBurndownView: React.FC<ReleaseBurndownViewProps> = ({
  data,
  loading,
  error,
  filters,
  setFilters,
  refresh,
  meta,
  componentProps,
  togglePin,
  pinnedFilters = [],
}) => {
  const issueType = (filters?.issue_type as string) ?? 'all';
  const releaseName = (filters?.release as string) ?? '';
  const teamName = (filters?.team_name as string) ?? '';
  const isGroup = (filters?.isGroup as boolean) ?? false;

  const issueTypeOptions = useMemo(() => {
    const allTypes = getIssueTypes();
    return [
      { value: 'all', label: 'All Issues' },
      ...allTypes.filter(type => 
        ['Epic', 'Story', 'Bug', 'Task'].includes(type.value)
      )
    ];
  }, []);

  const apiService = React.useMemo(() => new ApiService(), []);

  const availableReleases = useMemo(() => {
    if (meta && Array.isArray(meta.available_releases)) {
      return meta.available_releases as string[];
    }
    return [];
  }, [meta]);

  const hasAutoSelectedRef = useRef(false);

  const handleFilterChange = useCallback((key: string, value: string | null) => {
    setFilters?.((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, [setFilters]);

  // Auto-select first release if available and no release is selected
  useEffect(() => {
    // Skip if still loading or no available releases
    if (loading || availableReleases.length === 0) {
      return;
    }

    // Auto-select the first release (most recent) if no release is selected and we haven't auto-selected yet
    if (!releaseName && !hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = true;
      handleFilterChange('release', availableReleases[0]);
    }
  }, [availableReleases, releaseName, handleFilterChange, loading]);

  // Custom filters for Release Burndown
  const customFilters = [
    {
      type: 'other' as const,
      component: (
        <ReportFilterField label="Release">
          <select
            value={releaseName}
            onChange={(event) => handleFilterChange('release', event.target.value || null)}
            className="px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand min-w-[140px]"
          >
            <option value="">Select Release</option>
            {availableReleases.map((release) => (
              <option key={release} value={release}>
                {release}
              </option>
            ))}
          </select>
        </ReportFilterField>
      ),
    },
    {
      type: 'issueType' as const,
      component: (
        <ReportFilterField label="Issue Type">
          <select
            value={issueType}
            onChange={(event) => handleFilterChange('issue_type', event.target.value || null)}
            className="px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {issueTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </ReportFilterField>
      ),
    },
  ];

  // Generate filter badges for active filters
  const filterBadges = useMemo(() => {
    const badges: { label: string; value: string; filterKey: string; isPinned: boolean }[] = [];
    
    if (releaseName) {
      badges.push({
        label: 'Release',
        value: releaseName,
        filterKey: 'release',
        isPinned: pinnedFilters.includes('release'),
      });
    }
    
    if (issueType && issueType !== 'all') {
      badges.push({
        label: 'Issue Type',
        value: issueType,
        filterKey: 'issue_type',
        isPinned: pinnedFilters.includes('issue_type'),
      });
    }
    
    if (teamName) {
      badges.push({
        label: isGroup ? 'Group' : 'Team',
        value: teamName,
        filterKey: 'team_name',
        isPinned: pinnedFilters.includes('team_name'),
      });
    }
    
    return badges;
  }, [releaseName, issueType, teamName, isGroup, pinnedFilters]);

  // Handle chart click
  const handleChartClick = useCallback((clickData: { date: string; metricType: string; dataIndex: number }) => {
    const release = meta?.release || releaseName;
    if (!release) {
      console.warn('Release name not available in meta or filters');
    }
  }, [meta, releaseName]);

  // Fetch function factory for dialog
  const fetchReleaseBurndownIssuesFactory = useCallback((selectedDate: string, selectedMetricType: string) => {
    return async () => {
      const release = meta?.release || releaseName;
      if (!release) {
        return { success: false, message: 'Release name not available' };
      }

      return await apiService.getReleaseBurndownIssues(
        selectedDate,
        release,
        selectedMetricType,
        teamName || undefined,
        isGroup,
        issueType !== 'all' ? issueType : undefined
      );
    };
  }, [meta?.release, releaseName, teamName, isGroup, issueType, apiService]);

  // Date display for Release
  const dateDisplay = (meta?.release_start_date || meta?.release_end_date) ? (
    <div className="mt-2 text-xs text-content-tertiary text-center">
      {meta?.release_start_date && meta?.release_end_date && (
        <span>
          Dates: {meta.release_start_date} – {meta.release_end_date}
        </span>
      )}
    </div>
  ) : undefined;

  return (
    <BurndownViewBase
      data={data}
      loading={loading}
      error={error}
      filters={filters}
      setFilters={setFilters}
      refresh={refresh}
      meta={meta}
      componentProps={componentProps}
      togglePin={togglePin}
      pinnedFilters={pinnedFilters}
      title="Release Burndown"
      customFilters={customFilters}
      filterBadges={filterBadges}
      chartTitle={meta?.release ? `Release Burndown: ${meta.release}` : undefined}
      dateDisplay={dateDisplay}
      onChartClick={handleChartClick}
      fetchIssuesFunctionFactory={fetchReleaseBurndownIssuesFactory}
    />
  );
};

export default ReleaseBurndownView;

