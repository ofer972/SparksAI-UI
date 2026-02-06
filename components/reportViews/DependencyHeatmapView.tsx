'use client';

import React, { useMemo, useState, useCallback } from 'react';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import TeamGroupFilter from '../TeamGroupFilter';
import PIFilter from '../PIFilter';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
import IssuesDialog from './IssuesDialog';
import { getEpicsByPiSummary, getDependencyHeatmapStories } from '@/lib/api';
import { API_CONFIG } from '@/lib/config';
import type { Column } from '../DataTable';
import { getPITerminology, getPITerminologyPlural, piLabel } from '@/lib/piTerminology';

interface HeatmapCell {
  owning_team: string;
  blocking_team: string;
  total_issues: number;
  completed_issues: number;
  completion_percentage: number;
  status: string; // "completed" | "low" | "medium" | "critical" | "none"
  icon_indication: boolean; // true if total_issues >= threshold
}

interface LegendItem {
  status: string;
  label: string;
}

interface EpicCount {
  total_epics: number;
  epics_with_dependencies: number;
}

interface HeatmapData {
  heatmap_data: HeatmapCell[];
  owning_teams: string[];
  blocking_teams: string[];
  epic_counts?: Record<string, EpicCount>; // Dictionary: owning_team -> {total_epics, epics_with_dependencies}
  count: number;
  legend?: LegendItem[];
  pi?: string;
  team_name?: string;
  group_name?: string;
  teams_in_group?: string[];
}

interface DependencyHeatmapViewProps {
  data: HeatmapData | null;
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

const DependencyHeatmapView: React.FC<DependencyHeatmapViewProps> = ({
  data: heatmapData,
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
  const { groups, teams } = useTeamsGroups();

  // Extract filters
  const pi = (filters?.pi as string) || '';
  const teamName = (filters?.team_name as string) || undefined;
  const isGroup = (filters?.isGroup as boolean) ?? false;

  // Toggle state for switching rows/columns (local state, not a filter)
  const [transposed, setTransposed] = useState<boolean>(false);
  
  // Dialog state for epics list
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  
  // Dialog state for dependent stories
  const [storiesDialogOpen, setStoriesDialogOpen] = useState<boolean>(false);
  const [selectedCell, setSelectedCell] = useState<{
    owning_team: string;
    blocking_team: string;
  } | null>(null);

  // Team/Group value for TeamGroupFilter
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

  // Handle PI change
  const handlePIChange = (piValue: string) => {
    setFilters?.((prev) => ({
      ...prev,
      pi: piValue || null,
    }));
  };

  // Handle team/group change
  const handleTeamGroupChange = (value: string | null, type: 'group' | 'team', name: string) => {
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
  };

  // Get cell color based on backend status value
  const getCellColor = (status: string, totalIssues: number): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-700 text-white'; // Dark green for 100% completion
      case 'low':
        return 'bg-yellow-200 text-gray-800 dark:text-gray-900'; // Light yellow for low volume, darker text in dark mode
      case 'medium':
        return 'bg-orange-500 text-white'; // Orange for medium risk
      case 'critical':
        return 'bg-red-500 text-black'; // Red for critical/high risk
      case 'none':
        return 'bg-surface-secondary text-content-tertiary'; // Theme-aware for no dependencies
      default:
        return 'bg-gray-300 text-gray-700'; // Default fallback
    }
  };

  // Create matrix for heatmap (with transpose support)
  const { heatmapMatrix, rowTeams, columnTeams, rowLabel, columnLabel } = useMemo(() => {
    if (!heatmapData) return { heatmapMatrix: null, rowTeams: [], columnTeams: [], rowLabel: '', columnLabel: '' };

    const matrix: Map<string, Map<string, HeatmapCell>> = new Map();
    
    // Determine which teams go on rows vs columns based on transpose state
    const rowTeamList = transposed ? (heatmapData.blocking_teams || []) : (heatmapData.owning_teams || []);
    const columnTeamList = transposed ? (heatmapData.owning_teams || []) : (heatmapData.blocking_teams || []);
    
    // Initialize matrix with all team combinations
    rowTeamList.forEach(rowTeam => {
      const row = new Map<string, HeatmapCell>();
      columnTeamList.forEach(columnTeam => {
        row.set(columnTeam, {
          owning_team: transposed ? columnTeam : rowTeam,
          blocking_team: transposed ? rowTeam : columnTeam,
          total_issues: 0,
          completed_issues: 0,
          completion_percentage: 0,
          status: 'none', // Default for empty cells
          icon_indication: false,
        });
      });
      matrix.set(rowTeam, row);
    });

    // Fill in actual data
    (heatmapData.heatmap_data || []).forEach(cell => {
      const rowKey = transposed ? cell.blocking_team : cell.owning_team;
      const colKey = transposed ? cell.owning_team : cell.blocking_team;
      const row = matrix.get(rowKey);
      if (row) {
        row.set(colKey, cell);
      }
    });

    return {
      heatmapMatrix: matrix,
      rowTeams: rowTeamList,
      columnTeams: columnTeamList,
      rowLabel: transposed ? 'Blocking Teams (Who are they waiting for?)' : 'Owning Teams (Who is waiting?)',
      columnLabel: transposed ? 'Owning Teams (Who is waiting?)' : 'Blocking Teams (Who are they waiting for?)',
    };
  }, [heatmapData, transposed]);

  // Filters UI
  const filtersContent = (
    <ReportFiltersRow>
      <ReportFilterField label={getPITerminology()}>
        <PIFilter
          selectedPI={pi || ''}
          onPIChange={handlePIChange}
        />
      </ReportFilterField>

      <ReportFilterField label="Team/Group">
        <TeamGroupFilter
          value={teamValue}
          onChange={handleTeamGroupChange}
          placeholder="Select team or group"
          allowClear={true}
        />
      </ReportFilterField>

      <ReportFilterField label="View">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={transposed}
            onChange={(e) => setTransposed(e.target.checked)}
            className="w-4 h-4 text-brand rounded focus:ring-brand"
          />
          <span className="text-sm text-content-primary">Switch Rows/Columns</span>
        </label>
      </ReportFilterField>
    </ReportFiltersRow>
  );

  // Fetch function for epics dialog
  const fetchEpics = useCallback(async () => {
    if (!pi || !selectedTeam) {
      return { success: false, message: 'PI and team are required' };
    }
    
    try {
      const response = await getEpicsByPiSummary(pi, selectedTeam, false);
      
      // Transform response: epics -> issues, epic_key -> issue_key
      // Results are already sorted by dependent_issues_total descending from backend
      const transformedEpics = (response.data?.epics || []).map(epic => ({
        ...epic,
        issue_key: epic.epic_key,
      }));
      
      return {
        success: true,
        data: {
          issues: transformedEpics,
        },
        message: response.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch epics',
      };
    }
  }, [pi, selectedTeam]);

  // Columns for epics dialog
  const epicColumns: Column<any>[] = useMemo(() => [
    {
      key: 'issue_key',
      label: 'Epic Key',
      width: '10%',
      sortable: true,
    },
    {
      key: 'epic_name',
      label: 'Summary',
      width: '40%',
      align: 'left',
      sortable: true,
    },
    {
      key: 'epic_status_category',
      label: 'Status',
      width: '12%',
      sortable: true,
    },
    {
      key: 'dependent_issues_total',
      label: 'Dependent Issues',
      width: '15%',
      sortable: true,
      render: (value: number) => value > 0 ? value : '',
    },
  ], []);

  // Fetch function for dependent stories dialog
  const fetchDependentStories = useCallback(async () => {
    if (!pi || !selectedCell) {
      return { success: false, message: 'PI and cell selection are required' };
    }
    
    try {
      const response = await getDependencyHeatmapStories(
        pi,
        selectedCell.owning_team,
        selectedCell.blocking_team
      );
      
      return {
        success: true,
        data: {
          issues: response.data?.issues || [],
        },
        message: response.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch stories',
      };
    }
  }, [pi, selectedCell]);

  // Columns for stories dialog
  const storyColumns: Column<any>[] = useMemo(() => [
    {
      key: 'parent_key',
      label: 'Epic Key',
      width: '10%',
      sortable: true,
    },
    {
      key: 'parent_name',
      label: 'Epic Name',
      width: '22%',
      align: 'left',
      sortable: true,
    },
    {
      key: 'issue_key',
      label: 'Dependent Issue Key',
      width: '13%',
      sortable: true,
    },
    {
      key: 'summary',
      label: 'Dependent Issue Summary',
      width: '28%',
      align: 'left',
      sortable: true,
    },
    {
      key: 'issue_type',
      label: 'Issue Type',
      width: '7%',
      sortable: true,
    },
    {
      key: 'status_category',
      label: 'Status',
      width: '20%',
      sortable: true,
    },
  ], []);

  // Generate filter badges for active filters
  const filterBadges = useMemo(() => {
    const badges: { label: string; value: string; filterKey: string; isPinned: boolean }[] = [];
    
    if (pi) {
      badges.push({
        label: getPITerminology(),
        value: pi,
        filterKey: 'pi',
        isPinned: pinnedFilters.includes('pi'),
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
  }, [pi, teamName, isGroup, pinnedFilters]);

  return (
    <ReportCard
      title="Dependency Heatmap"
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
      {loading && !heatmapData && (
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <div className="text-sm text-content-secondary">Loading heatmap data...</div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!pi && !loading && !error && (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-content-tertiary text-sm">
              Please select a PI to view the dependency heatmap.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && pi && heatmapData && heatmapMatrix && rowTeams && columnTeams && (
        <div className="flex flex-col h-full" style={{ minHeight: '600px', height: '600px' }}>
          {/* Legend - moved to top */}
          {heatmapData.legend && (
            <div className="flex-shrink-0 mb-2 p-2 bg-surface-secondary rounded-lg">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {heatmapData.legend.map((item, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    {item.status === 'icon' ? (
                      <span className="flex items-center justify-center w-3 h-3 rounded-full bg-red-600 text-white font-bold text-[8px] leading-none">!</span>
                    ) : (
                      <div className={`w-3 h-3 rounded ${
                        item.status === 'completed' ? 'bg-green-700' :
                        item.status === 'low' ? 'bg-yellow-200' :
                        item.status === 'medium' ? 'bg-orange-500' :
                        item.status === 'critical' ? 'bg-red-500' :
                        item.status === 'none' ? 'bg-surface-secondary border-2 border-gray-400 dark:border-gray-300' : 'bg-gray-300'
                      }`}></div>
                    )}
                    <span className="text-content-secondary text-xs">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Heatmap - scrollable */}
          <div className="flex-1 min-h-0 overflow-auto">
            <div className="inline-block min-w-full">
              <table className="border-collapse">
                <thead>
                  <tr>
                    <th rowSpan={2} className="sticky left-0 z-10 bg-surface-elevated border border-outline dark:border-outline-strong p-2 text-left font-semibold text-content-primary">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl text-brand flex items-center justify-center">↓</div>
                        <div>
                          <div className="text-sm font-semibold text-content-primary">
                            {transposed ? 'Blocking Team' : 'Owning Team'}
                          </div>
                          <div className="text-sm text-content-tertiary">
                            {transposed ? '(Who are they waiting for?)' : '(Who is waiting?)'}
                          </div>
                        </div>
                      </div>
                    </th>
                    {!transposed && (
                      <>
                        <th rowSpan={2} className="border border-outline dark:border-outline-strong p-2 text-center align-top font-semibold text-content-primary bg-surface-elevated" style={{ width: '80px', minWidth: '80px', maxWidth: '80px' }}>
                          <div className="text-sm">Epics</div>
                          <div className="text-xs font-normal text-content-tertiary mt-1">Owned</div>
                        </th>
                        <th rowSpan={2} className="border border-outline dark:border-outline-strong p-2 text-center align-top font-semibold text-content-primary bg-surface-elevated" style={{ width: '80px', minWidth: '80px', maxWidth: '80px' }}>
                          <div className="text-sm">Epics</div>
                          <div className="text-xs font-normal text-content-tertiary mt-1">w/ Depend.</div>
                        </th>
                      </>
                    )}
                    {columnTeams.map(columnTeam => (
                      <th
                        key={columnTeam}
                        colSpan={2}
                        className="border border-outline dark:border-outline-strong p-2 text-center align-top font-semibold text-content-primary bg-surface-elevated"
                        title={columnTeam}
                      >
                        <div className="break-words leading-tight text-sm">
                          {columnTeam}
                        </div>
                        <div className="text-xs font-normal text-content-tertiary mt-1">
                          {transposed ? '(Owning)' : '(Blocking)'}
                        </div>
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {columnTeams.map(columnTeam => (
                      <React.Fragment key={columnTeam}>
                        <th
                          className="border border-outline dark:border-outline-strong p-1 text-center text-xs font-medium text-content-secondary bg-surface-elevated"
                          style={{ width: '56px', minWidth: '56px', maxWidth: '56px' }}
                        >
                          Total
                        </th>
                        <th
                          className="border border-outline dark:border-outline-strong p-1 text-center text-xs font-medium text-content-secondary bg-surface-elevated"
                          style={{ width: '56px', minWidth: '56px', maxWidth: '56px' }}
                        >
                          Comp.
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rowTeams.map(rowTeam => {
                    const row = heatmapMatrix.get(rowTeam);
                    if (!row) return null;

                    return (
                      <tr key={rowTeam} className="h-16">
                        <td className="sticky left-0 z-10 bg-surface-elevated border border-outline dark:border-outline-strong p-2 font-medium text-content-primary h-16">
                          <div className="break-words leading-tight max-w-[200px] line-clamp-2 text-sm">
                            {rowTeam}
                          </div>
                        </td>
                        {!transposed && (
                          <>
                            <td 
                              className="border border-outline dark:border-outline-strong p-2 text-center text-sm bg-surface-elevated h-16 cursor-pointer hover:bg-surface-secondary transition-colors"
                              onClick={() => {
                                setSelectedTeam(rowTeam);
                                setDialogOpen(true);
                              }}
                            >
                              <div className="font-semibold text-content-primary">
                                {heatmapData.epic_counts?.[rowTeam]?.total_epics ?? 0}
                              </div>
                            </td>
                            <td 
                              className="border border-outline dark:border-outline-strong p-2 text-center text-sm bg-surface-elevated h-16 cursor-pointer hover:bg-surface-secondary transition-colors"
                              onClick={() => {
                                setSelectedTeam(rowTeam);
                                setDialogOpen(true);
                              }}
                            >
                              <div className="font-semibold text-content-primary">
                                {heatmapData.epic_counts?.[rowTeam]?.epics_with_dependencies ?? 0}
                              </div>
                            </td>
                          </>
                        )}
                        {columnTeams.map(columnTeam => {
                          const cell = row.get(columnTeam);
                          if (!cell) {
                            return (
                              <React.Fragment key={`${rowTeam}-${columnTeam}`}>
                                <td className="border border-outline dark:border-outline-strong p-1 text-center text-sm h-16 bg-surface-secondary">
                                  <div className="flex items-center justify-center h-full">-</div>
                                </td>
                                <td className="border border-outline dark:border-outline-strong p-1 text-center text-sm h-16 bg-surface-secondary">
                                  <div className="flex items-center justify-center h-full">-</div>
                                </td>
                              </React.Fragment>
                            );
                          }

                          // Use status from backend, fallback to default if not present
                          const cellStatus = cell.status || 'none';
                          const colorClass = getCellColor(cellStatus, cell.total_issues);

                          // Handle cell click - both Total and Completed cells behave the same
                          const handleCellClick = () => {
                            if (cell.total_issues > 0) {
                              const owningTeam = transposed ? cell.blocking_team : cell.owning_team;
                              const blockingTeam = transposed ? cell.owning_team : cell.blocking_team;
                              setSelectedCell({
                                owning_team: owningTeam,
                                blocking_team: blockingTeam,
                              });
                              setStoriesDialogOpen(true);
                            }
                          };

                          return (
                            <React.Fragment key={`${rowTeam}-${columnTeam}`}>
                              <td
                                className={`border border-outline dark:border-gray-500 p-1 text-center text-sm relative h-16 ${colorClass} ${cell.total_issues > 0 ? 'cursor-pointer hover:opacity-90' : ''}`}
                                title={`${transposed ? cell.blocking_team : cell.owning_team} → ${transposed ? cell.owning_team : cell.blocking_team}: ${cell.total_issues} total, ${cell.completed_issues} completed (${cell.completion_percentage}%)`}
                                onClick={handleCellClick}
                              >
                                <div className="flex items-center justify-center h-full">
                                  {cell.total_issues > 0 ? (
                                    <div className="font-semibold">{cell.total_issues}</div>
                                  ) : (
                                    <div className="text-content-tertiary">-</div>
                                  )}
                                </div>
                              </td>
                              <td
                                className={`border border-outline dark:border-gray-500 p-1 text-center text-sm relative h-16 ${colorClass} ${cell.total_issues > 0 ? 'cursor-pointer hover:opacity-90' : ''}`}
                                title={`${transposed ? cell.blocking_team : cell.owning_team} → ${transposed ? cell.owning_team : cell.blocking_team}: ${cell.total_issues} total, ${cell.completed_issues} completed (${cell.completion_percentage}%)`}
                                onClick={handleCellClick}
                              >
                                <div className="flex items-center justify-center h-full">
                                  {cell.total_issues > 0 ? (
                                    <div className="font-semibold">{cell.completed_issues}</div>
                                  ) : (
                                    <div className="text-content-tertiary">-</div>
                                  )}
                                </div>
                                {cell.icon_indication && (
                                  <span 
                                    className="absolute top-1/2 -translate-y-1/2 left-0 -translate-x-1/2 flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white font-bold text-sm leading-none z-10" 
                                    title="High dependency volume (≥5 total dependencies)"
                                  >
                                    !
                                  </span>
                                )}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Epics Dialog */}
      <IssuesDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedTeam(null);
        }}
        title={selectedTeam ? `Epics Owned by ${selectedTeam}` : 'Epics Owned'}
        columns={epicColumns}
        fetchFunction={fetchEpics}
        jiraUrl={meta?.jira_url || API_CONFIG.jiraUrl}
        emptyMessage="No epics found for this team."
        rowKey={(row) => row.epic_key || row.issue_key}
      />

      {/* Dependent Stories Dialog */}
      <IssuesDialog
        isOpen={storiesDialogOpen}
        onClose={() => {
          setStoriesDialogOpen(false);
          setSelectedCell(null);
        }}
        title={selectedCell 
          ? `Dependent Stories: ${selectedCell.owning_team} → ${selectedCell.blocking_team}`
          : 'Dependent Stories'
        }
        columns={storyColumns}
        fetchFunction={fetchDependentStories}
        jiraUrl={meta?.jira_url || API_CONFIG.jiraUrl}
        emptyMessage="No dependent stories found for this cell."
        rowKey={(row) => row.issue_key}
      />
    </ReportCard>
  );
};

export default DependencyHeatmapView;

