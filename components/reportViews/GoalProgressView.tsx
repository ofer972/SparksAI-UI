'use client';

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import TeamGroupFilter from '../TeamGroupFilter';
import PIFilter from '../PIFilter';
import GoalsPanel from '../GoalsPanel';
import { transformGoalsToHierarchy } from '../pigoals/utils';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
import { ApiService } from '@/lib/api';

interface GoalProgressViewProps {
  data: any;
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  setFilters: (updater: ReportFiltersUpdater) => void;
  refresh: () => void;
  meta: Record<string, any> | null;
  componentProps?: Record<string, any>;
  togglePin?: (filterKey: string) => void;
  pinnedFilters?: string[];
}

const GoalProgressView: React.FC<GoalProgressViewProps> = ({
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
  const { teams, groups } = useTeamsGroups();
  const apiService = useMemo(() => new ApiService(), []);
  
  const scopeType = (filters?.scope_type as string) || 'pi';
  const piName = (filters.pi_name || filters.pi) as string | undefined;
  const sprintName = (filters?.sprint_name as string) || undefined;
  const teamName = (filters?.team_name as string) || undefined;
  const isGroup = (filters?.isGroup as boolean) || false;

  // State for fetched sprints
  const [fetchedSprints, setFetchedSprints] = useState<Array<{value: string, label: string}>>([]);
  const [loadingSprints, setLoadingSprints] = useState(false);
  
  // Track previous scopeType to detect changes (initialize with current scopeType)
  const prevScopeTypeRef = useRef<string>((filters?.scope_type as string) || 'pi');

  // Get sprint ID from meta if available
  const sprintId = meta?.sprint_id as number | undefined;

  // Transform data to hierarchy format
  const hierarchyData = useMemo(() => {
    if (!data) {
      console.log('[GoalProgressView] No data provided');
      return [];
    }
    console.log('[GoalProgressView] Transforming data:', data);
    const transformed = transformGoalsToHierarchy(data, 'goal-progress');
    console.log('[GoalProgressView] Transformed hierarchy data:', transformed);
    return transformed;
  }, [data]);

  // Team/Group filter value
  const teamValue = useMemo(() => {
    if (!teamName) return null;
    
    if (isGroup) {
      const group = groups.find(g => g.group_name === teamName);
      return group ? `group:${group.group_key}` : null;
    } else {
      const team = teams.find(t => t.team_name === teamName);
      return team ? `team:${team.team_key}` : null;
    }
  }, [teamName, isGroup, groups, teams]);

  // Sprint options from meta or fetched
  const sprintOptions = useMemo(() => {
    // First try meta
    if (meta && Array.isArray(meta.available_sprints)) {
      return meta.available_sprints.map((name: string) => ({
        value: name,
        label: name,
      }));
    }
    // Fallback to fetched sprints
    return fetchedSprints;
  }, [meta?.available_sprints, fetchedSprints]);

  // Fetch sprints when scope is sprint and team/group is selected
  useEffect(() => {
    if (scopeType === 'sprint' && teamName) {
      const fetchSprints = async () => {
        try {
          setLoadingSprints(true);
          const response = await apiService.getAvailableSprints(teamName, isGroup);
          if (response.success && response.data?.sprints) {
            // Filter to current and upcoming sprints (within 14 days)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const filteredSprints = response.data.sprints
              .filter((sprint: any) => {
                if (!sprint.start_date || !sprint.end_date) return false;
                const startDate = new Date(sprint.start_date);
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(sprint.end_date);
                endDate.setHours(0, 0, 0, 0);
                
                const isCurrent = startDate <= today && today <= endDate;
                const fourteenDaysBeforeStart = new Date(startDate);
                fourteenDaysBeforeStart.setDate(fourteenDaysBeforeStart.getDate() - 14);
                const isUpcoming = today >= fourteenDaysBeforeStart && today < startDate;
                
                return isCurrent || isUpcoming;
              })
              .sort((a: any, b: any) => {
                if (!a.start_date || !b.start_date) return 0;
                return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
              })
              .map((sprint: any) => ({
                value: sprint.sprint_name,
                label: sprint.sprint_name,
              }));
            
            setFetchedSprints(filteredSprints);
          }
        } catch (err) {
          console.error('Error fetching sprints:', err);
          setFetchedSprints([]);
        } finally {
          setLoadingSprints(false);
        }
      };
      
      fetchSprints();
    } else {
      setFetchedSprints([]);
    }
  }, [scopeType, teamName, isGroup, apiService]);

  // Auto-select current PI or first sprint when switching scope type
  useEffect(() => {
    const scopeTypeChanged = prevScopeTypeRef.current !== scopeType;
    
    // Only auto-select when scope type actually changes (not on initial load)
    if (scopeTypeChanged) {
      if (scopeType === 'pi' && !piName) {
        // Fetch current PI from backend when switching to PI scope
        const fetchCurrentPI = async () => {
          try {
            const piResponse = await apiService.getCurrentAndNextPIs();
            const currentPIs = (piResponse as any).current_pis || [];
            if (currentPIs.length > 0) {
              const currentPIName = currentPIs[0].pi_name;
              setFilters?.((prev) => ({
                ...prev,
                pi_name: currentPIName,
                pi: currentPIName,
              }));
            }
          } catch (err) {
            console.error('Error fetching current PI:', err);
          }
        };
        
        fetchCurrentPI();
      } else if (scopeType === 'sprint' && !sprintName && sprintOptions.length > 0) {
        // Select first sprint when switching to Sprint scope
        const firstSprint = sprintOptions[0].value;
        setFilters?.((prev) => ({
          ...prev,
          sprint_name: firstSprint,
        }));
      }
    }
    
    // Update ref after processing
    prevScopeTypeRef.current = scopeType;
  }, [scopeType, piName, sprintName, sprintOptions, setFilters, apiService]);

  // Auto-select first sprint when sprint options become available (if scope is sprint and no sprint selected)
  useEffect(() => {
    // Only auto-select if scope is sprint, no sprint is selected, and options are available
    // This handles the case where sprints load after scope type change
    if (scopeType === 'sprint' && !sprintName && sprintOptions.length > 0) {
      const firstSprint = sprintOptions[0].value;
      setFilters?.((prev) => ({
        ...prev,
        sprint_name: firstSprint,
      }));
    }
  }, [scopeType, sprintName, sprintOptions, setFilters]);

  // Handlers
  const handleScopeTypeChange = useCallback((value: string) => {
    setFilters?.((prev) => {
      const updated: Record<string, any> = { ...prev, scope_type: value };
      // Clear scope-specific filters when switching
      if (value === 'pi') {
        delete updated.sprint_name;
      } else if (value === 'sprint') {
        delete updated.pi_name;
        delete updated.pi;
      }
      return updated;
    });
  }, [setFilters]);

  const handlePIChange = useCallback((pi: string) => {
    setFilters?.((prev) => ({
      ...prev,
      pi_name: pi || null,
      pi: pi || null,
    }));
  }, [setFilters]);

  const handleSprintChange = useCallback((value: string) => {
    setFilters?.((prev) => ({
      ...prev,
      sprint_name: value || null,
    }));
  }, [setFilters]);

  const handleTeamGroupChange = useCallback((value: string | null, type: 'group' | 'team', name: string) => {
    if (value === null) {
      setFilters?.((prev) => ({
        ...prev,
        team_name: null,
        isGroup: false,
      }));
    } else {
      setFilters?.((prev) => ({
        ...prev,
        team_name: name,
        isGroup: type === 'group',
      }));
    }
  }, [setFilters]);

  // Filters UI
  const filtersContent = (
    <ReportFiltersRow>
      <ReportFilterField label="Scope Type">
        <select
          value={scopeType}
          onChange={(e) => handleScopeTypeChange(e.target.value)}
          className="px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand"
        >
          <option value="pi">PI Goals</option>
          <option value="sprint">Sprint Goals</option>
        </select>
      </ReportFilterField>

      {scopeType === 'pi' && (
        <ReportFilterField label="PI">
          <PIFilter
            selectedPI={piName || ''}
            onPIChange={handlePIChange}
          />
        </ReportFilterField>
      )}

      {scopeType === 'sprint' && (
        <ReportFilterField label="Sprint">
          <select
            value={sprintName || ''}
            onChange={(e) => handleSprintChange(e.target.value)}
            disabled={loadingSprints}
            className="px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-surface-secondary disabled:cursor-not-allowed"
          >
            <option value="">
              {loadingSprints ? 'Loading sprints...' : 'Select Sprint'}
            </option>
            {sprintOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </ReportFilterField>
      )}

      <ReportFilterField label="Team/Group">
        <TeamGroupFilter
          value={teamValue}
          onChange={handleTeamGroupChange}
          placeholder="Select team or group"
          allowClear={true}
        />
      </ReportFilterField>
    </ReportFiltersRow>
  );

  // Filter badges
  const filterBadges = useMemo(() => {
    const badges: { label: string; value: string; filterKey: string; isPinned: boolean }[] = [];
    
    badges.push({
      label: 'Scope',
      value: scopeType === 'pi' ? 'PI Goals' : 'Sprint Goals',
      filterKey: 'scope_type',
      isPinned: pinnedFilters.includes('scope_type'),
    });

    if (scopeType === 'pi' && piName) {
      badges.push({
        label: 'PI',
        value: piName,
        filterKey: 'pi_name',
        isPinned: pinnedFilters.includes('pi_name') || pinnedFilters.includes('pi'),
      });
    }

    if (scopeType === 'sprint' && sprintName) {
      badges.push({
        label: 'Sprint',
        value: sprintName,
        filterKey: 'sprint_name',
        isPinned: pinnedFilters.includes('sprint_name'),
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
  }, [scopeType, piName, sprintName, teamName, isGroup, pinnedFilters]);

  // Calculate dynamic panel title based on scope type and selected PI/Sprint
  const panelTitle = useMemo(() => {
    const scopeLabel = scopeType === 'pi' ? 'PI Goal Progress' : 'Sprint Goal Progress';
    const name = scopeType === 'pi' ? piName : sprintName;
    
    // If name exists, show in parentheses
    if (name) {
      return `${scopeLabel} (${name})`;
    }
    
    // Fallback: show scope label without name (edge case)
    return scopeLabel;
  }, [scopeType, piName, sprintName]);

  return (
    <ReportCard
      title="Goal Progress"
      reportId={componentProps?.reportId}
      filters={filtersContent}
      filterBadges={filterBadges}
      onTogglePin={togglePin}
      onRefresh={refresh}
      onClose={componentProps?.onClose}
      onAIChat={componentProps?.onAIChat}
      readOnly={componentProps?.readOnly}
      hideHeader={componentProps?.hideHeader}
      hideCollapse={componentProps?.hideCollapse}
    >
      {loading && (
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <div className="text-sm text-content-secondary">Loading goal progress...</div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="h-full min-h-[400px]">
          {hierarchyData.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-content-tertiary text-sm">
                  No goals found for the selected filters.
                </p>
                <p className="text-content-muted text-xs mt-2">
                  {scopeType === 'pi' 
                    ? 'Please select a PI and optionally a team/group.'
                    : 'Please select a sprint and optionally a team/group.'}
                </p>
              </div>
            </div>
          ) : (
            <GoalsPanel
              title={panelTitle}
              hierarchyData={hierarchyData}
              type="user"
              loading={loading}
              error={error}
              scopeType={scopeType as 'pi' | 'sprint' | 'release'}
              piName={piName}
              sprintId={sprintId}
              teamName={teamName}
              isGroup={isGroup}
              actionOptions={{
                allowEdit: false,
                allowDelete: false,
                allowConnect: false,
                allowDisconnect: false,
                allowCreate: false,
              }}
            />
          )}
        </div>
      )}
    </ReportCard>
  );
};

export default GoalProgressView;
