'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Column } from '@/components/DataTable';
import { Chart as ChartJS } from 'chart.js';
import { registerChartComponents } from '@/utils/chartRegistration';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { getCleanJiraUrl } from '@/lib/config';
import type { ReportDefinition } from '@/lib/config';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import TeamGroupFilter from '../TeamGroupFilter';
import PIFilter from '../PIFilter';
import { ApiService } from '@/lib/api';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
import { getPITerminology } from '@/lib/piTerminology';
import GenericReportVisualization from './GenericReportVisualization';

registerChartComponents(false);
ChartJS.register(ChartDataLabels);

interface ReportField {
  column_name: string;
  display_name: string;
  type: string;
}

interface FilterableField extends ReportField {
  filter_type: 'dropdown' | 'text' | 'boolean' | 'date' | 'number';
  values?: string[];
  operator?: string[];
}

interface GenericReportViewProps {
  data: any;
  loading: boolean;
  error: string | null;
  definition: ReportDefinition | null;
  meta?: Record<string, any>;
  filters?: Record<string, any>;
  refresh?: () => void;
  reportId?: string;
  setFilters?: (updater: any) => void;
  togglePin?: (filterKey: string) => void;
  pinnedFilters?: string[];
  componentProps?: Record<string, any>;
}

export default function GenericReportView({
  data,
  loading,
  error,
  definition,
  meta,
  filters = {},
  refresh,
  reportId,
  setFilters,
  togglePin,
  pinnedFilters = [],
  componentProps,
}: GenericReportViewProps) {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [isDark, setIsDark] = useState(false);
  const [displayableFields, setDisplayableFields] = useState<ReportField[]>([]);
  const [filterableFields, setFilterableFields] = useState<FilterableField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [dropdownValues, setDropdownValues] = useState<Record<string, string[]>>({});
  const [loadingDropdownValues, setLoadingDropdownValues] = useState<Record<string, boolean>>({});
  
  // Extract buildConfig early (before useEffect that uses it)
  const buildConfig = definition?.meta_schema?.build_report_config;
  
  // Extract filters from buildConfig.filters (filters defined during Build Report)
  interface BuildReportFilter {
    field: string;
    operator: string;
    values: string[] | string;
  }
  const [buildReportFilters, setBuildReportFilters] = useState<BuildReportFilter[]>([]);
  
  // Track if filters have been initialized to prevent infinite loops and preserve user changes
  const filtersInitializedRef = React.useRef(false);
  const reportIdRef = React.useRef<string | undefined>(reportId);
  
  // Sync buildReportFilters when buildConfig changes OR when reportId changes (new report)
  // Following system report pattern: filters come from props (initialFilters), not initialized here
  useEffect(() => {
    // If reportId changed, reset initialization state
    if (reportIdRef.current !== reportId) {
      filtersInitializedRef.current = false;
      reportIdRef.current = reportId;
    }
    
    if (!buildConfig?.filters) {
      // Only clear if we haven't initialized yet or report changed
      if (!filtersInitializedRef.current) {
        setBuildReportFilters([]);
        filtersInitializedRef.current = true;
      }
      return;
    }
    
    // Only initialize buildReportFilters state for UI rendering (not for setFilters)
    // Following system report pattern: filters come from props via ReportPanel
    if (!filtersInitializedRef.current) {
      const configFilters = buildConfig.filters || [];
      const initialFilters = configFilters.map((f: any) => ({
        field: f.field || '',
        operator: f.operator || 'equals',
        values: Array.isArray(f.values) ? f.values : (f.values ? [f.values] : []),
      }));
      
      setBuildReportFilters(initialFilters);
      
      // Initialize filter_overrides in filters to match stored filters
      // This ensures the backend uses the stored filters initially
      // Note: team_name, isGroup, and pi are handled by initialFilters from CustomDashboardEditor
      if (setFilters && initialFilters.length > 0) {
        const filterOverrides = initialFilters.map(f => ({
          field: f.field,
          operator: f.operator,
          values: Array.isArray(f.values) ? f.values : (f.values ? [f.values] : []),
        }));
        
        setFilters((prevFilters: any) => ({
          ...prevFilters,
          filter_overrides: filterOverrides,
        }));
      }
      
      filtersInitializedRef.current = true;
    }
    // If already initialized, don't reset buildReportFilters - preserve user changes
  }, [buildConfig, reportId, setFilters]); // Removed definition, refresh from deps - following system pattern
  
  const { teams, groups } = useTeamsGroups();
  const apiService = React.useMemo(() => new ApiService(), []);

  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Load fields on mount
  useEffect(() => {
    const loadFields = async () => {
      setLoadingFields(true);
      try {
        const fieldsData = await apiService.getReportFields();
        setDisplayableFields(fieldsData.displayable_fields);
        // Filter out quarter_pi and team_name from filterable fields (they're default filters)
        const filteredFields = fieldsData.filterable_fields.filter(
          f => f.column_name !== 'quarter_pi' && f.column_name !== 'team_name'
        );
        setFilterableFields(filteredFields);
      } catch (err) {
        console.error('Error loading fields:', err);
      } finally {
        setLoadingFields(false);
      }
    };
    loadFields();
  }, [apiService]);

  // Load dropdown values for filters that need them
  useEffect(() => {
    if (!buildReportFilters.length || loadingFields) return;
    
    const dropdownFields = buildReportFilters
      .map(f => f.field)
      .filter(fieldName => {
        const fieldInfo = filterableFields.find(f => f.column_name === fieldName);
        return fieldInfo?.filter_type === 'dropdown' && !dropdownValues[fieldName];
      });
    
    if (dropdownFields.length > 0) {
      dropdownFields.forEach(fieldName => {
        setLoadingDropdownValues(prev => ({ ...prev, [fieldName]: true }));
      });
      
      apiService.getFilterDropdownValues(dropdownFields)
        .then(values => {
          setDropdownValues(prev => ({ ...prev, ...values }));
        })
        .catch(err => {
          console.error('Error loading dropdown values:', err);
        })
        .finally(() => {
          dropdownFields.forEach(fieldName => {
            setLoadingDropdownValues(prev => {
              const newState = { ...prev };
              delete newState[fieldName];
              return newState;
            });
          });
        });
    }
  }, [buildReportFilters, filterableFields, loadingFields, apiService]);

  // Extract values safely (handle undefined definition)
  // Note: buildConfig is already defined earlier (line 86)
  const chartType = definition?.chart_type;
  const jiraUrl = meta?.jira_url || getCleanJiraUrl();
  // Calculate reportName before conditional returns (needed for loading/error states)
  const reportName = definition?.report_name || reportId || 'Custom Report';
  const selectedFields = buildConfig?.selected_fields || [];

  // Get team/group filter values from filters prop
  // Merge with default_filters from definition as fallback (only for missing values)
  // This ensures custom reports use their saved default_filters when not overridden
  const defaultFilters = definition?.default_filters || {};
  const teamName = filters?.team_name || defaultFilters.team_name;
  const isGroup = filters?.isGroup !== undefined 
    ? filters.isGroup 
    : (defaultFilters.isGroup !== undefined ? defaultFilters.isGroup : false);
  const piValue = filters?.pi || defaultFilters.pi;
  
  // Convert team_name and isGroup to TeamGroupFilter format: "group:ID" or "team:ID"
  // TeamGroupFilter expects a string like "group:123" or "team:456", not an object
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

  // Handle issue_key click - must be called unconditionally
  const handleIssueKeyClick = React.useCallback((issueKey: string) => {
    if (!jiraUrl) return;
    window.open(`${jiraUrl}/browse/${issueKey}`, '_blank', 'noopener,noreferrer');
  }, [jiraUrl]);

  // Prepare table columns - must be called unconditionally (hooks rule)
  const tableColumns: Column<any>[] = useMemo(() => {
    if (chartType !== 'table' || !selectedFields.length) return [];
    return selectedFields.map(fieldName => {
      const field = displayableFields.find(f => f.column_name === fieldName);
      const isIssueKey = fieldName === 'issue_key';
      
      return {
        key: fieldName,
        label: field?.display_name || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        sortable: true,
        align: 'left' as const,
        render: isIssueKey && jiraUrl ? (value) => {
          return (
            <button
              onClick={() => handleIssueKeyClick(value)}
              className="text-brand hover:text-blue-800 hover:underline cursor-pointer font-medium"
              title={`Open ${value} in Jira`}
            >
              {value}
            </button>
          );
        } : undefined,
      };
    });
  }, [chartType, selectedFields, displayableFields, jiraUrl, handleIssueKeyClick]);

  // Generate filter badges
  const filterBadges = useMemo(() => {
    const badges: { label: string; value: string; filterKey: string; isPinned: boolean }[] = [];
    
    if (teamName) {
      badges.push({
        label: isGroup ? 'Group' : 'Team',
        value: teamName,
        filterKey: 'team_name',
        isPinned: pinnedFilters?.includes('team_name') || false,
      });
    }
    
    if (filters?.pi) {
      badges.push({
        label: 'PI',
        value: String(filters.pi),
        filterKey: 'pi',
        isPinned: pinnedFilters?.includes('pi') || false,
      });
    }
    
    return badges;
  }, [teamName, isGroup, filters?.pi, pinnedFilters]);

  // Get filter field info helper
  const getFilterFieldInfo = React.useCallback((fieldName: string): FilterableField | undefined => {
    return filterableFields.find(f => f.column_name === fieldName);
  }, [filterableFields]);

  // Handle filter change - update local state and send to backend via setFilters
  const handleFilterChange = React.useCallback((fieldName: string, updates: Partial<BuildReportFilter>) => {
    setBuildReportFilters(prev => {
      const index = prev.findIndex(f => f.field === fieldName);
      if (index === -1) return prev;
      
      const oldFilter = prev[index];
      const newFilter = { ...oldFilter, ...updates };
      
      // Check if filter actually changed
      const hasChanged = JSON.stringify(oldFilter) !== JSON.stringify(newFilter);
      if (!hasChanged) return prev;
      
      const newFilters = [...prev];
      newFilters[index] = newFilter;
      
      // Send filter overrides to backend via setFilters
      // The backend will merge these with stored filters
      if (setFilters) {
        const filterOverrides = newFilters.map(f => ({
          field: f.field,
          operator: f.operator,
          values: Array.isArray(f.values) ? f.values : (f.values ? [f.values] : []),
        }));
        
        setFilters((prevFilters: any) => {
          // Check if filter_overrides actually changed
          const prevOverrides = prevFilters.filter_overrides || [];
          if (JSON.stringify(prevOverrides) === JSON.stringify(filterOverrides)) {
            return prevFilters;
          }
          return {
            ...prevFilters,
            filter_overrides: filterOverrides,
          };
        });
        
        // Trigger refresh only if filter actually changed
        if (refresh && hasChanged) {
          setTimeout(() => refresh(), 0);
        }
      }
      
      return newFilters;
    });
  }, [setFilters, refresh]);

  // Build filters content
  const filtersContent = useMemo(() => {
    return (
      <ReportFiltersRow>
        {/* PI Filter */}
        <ReportFilterField label={getPITerminology()}>
          <PIFilter
            selectedPI={piValue || ''}
            onPIChange={(pi) => {
              if (!setFilters) return;
              setFilters((prev: any) => {
                // Only update if value actually changed
                if (prev.pi === (pi || null)) return prev;
                return { ...prev, pi: pi || null };
              });
              // Trigger refresh when PI changes
              if (refresh) {
                setTimeout(() => refresh(), 0);
              }
            }}
          />
        </ReportFilterField>
        
        {/* Team/Group Filter */}
        <ReportFilterField label="Team/Group">
          <TeamGroupFilter
            value={teamValue}
            onChange={(value, type, name) => {
              if (!setFilters) return;
              setFilters((prev: any) => {
                if (value === null) {
                  // Only update if values actually changed
                  if (prev.team_name === null && prev.isGroup === false) return prev;
                  return {
                    ...prev,
                    team_name: null,
                    isGroup: false,
                  };
                } else {
                  // Only update if values actually changed
                  if (prev.team_name === name && prev.isGroup === (type === 'group')) return prev;
                  return {
                    ...prev,
                    team_name: name,
                    isGroup: type === 'group',
                  };
                }
              });
              // Trigger refresh when Team/Group changes
              if (refresh) {
                setTimeout(() => refresh(), 0);
              }
            }}
            placeholder="Select team or group"
            allowClear={true}
          />
        </ReportFilterField>
        
        {/* Build Report Filters (filters defined during Build Report) */}
        {buildReportFilters.map((filter) => {
          const fieldInfo = getFilterFieldInfo(filter.field);
          if (!fieldInfo) return null;
          
          const isDropdown = fieldInfo.filter_type === 'dropdown';
          const isBoolean = fieldInfo.filter_type === 'boolean';
          const isDate = fieldInfo.filter_type === 'date';
          const isNumber = fieldInfo.filter_type === 'number';
          const isText = fieldInfo.filter_type === 'text';
          
          return (
            <ReportFilterField key={filter.field} label={fieldInfo.display_name}>
              <div className="flex gap-2 items-center w-full">
                {/* Operator (for text, date, and number fields) */}
                {(isText || isDate || isNumber) && fieldInfo.operator && (
                  <select
                    value={filter.operator || (isDate ? 'greater_than' : isNumber ? 'equals' : 'equals')}
                    onChange={(e) => handleFilterChange(filter.field, { operator: e.target.value })}
                    className="w-32 px-2 py-1.5 border border-outline rounded-md text-sm bg-surface text-content-primary focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    {fieldInfo.operator.map(op => (
                      <option key={op} value={op}>
                        {op === 'greater_than' ? 'Greater Than' : op === 'less_than' ? 'Less Than' : op === 'equals' ? 'Equals' : op === 'contains' ? 'Contains' : op}
                      </option>
                    ))}
                  </select>
                )}

                {/* Value Input - Boolean Dropdown */}
                {isBoolean ? (
                  <select
                    value={typeof filter.values === 'string' ? filter.values : (Array.isArray(filter.values) ? filter.values[0] || '' : '')}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleFilterChange(filter.field, { values: value || '' });
                    }}
                    className="flex-1 px-2 py-1.5 border border-outline rounded-md text-sm bg-surface text-content-primary focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : isDate ? (
                  <input
                    type="date"
                    value={typeof filter.values === 'string' ? filter.values : (Array.isArray(filter.values) ? filter.values[0] || '' : '')}
                    onChange={(e) => handleFilterChange(filter.field, { values: e.target.value })}
                    className="flex-1 px-2 py-1.5 border border-outline rounded-md text-sm bg-surface text-content-primary focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                ) : isNumber ? (
                  <input
                    type="number"
                    value={typeof filter.values === 'string' ? filter.values : (Array.isArray(filter.values) ? filter.values[0] || '' : '')}
                    onChange={(e) => handleFilterChange(filter.field, { values: e.target.value })}
                    placeholder="Enter number..."
                    className="flex-1 px-2 py-1.5 border border-outline rounded-md text-sm bg-surface text-content-primary focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                ) : isDropdown ? (
                  <select
                    value={Array.isArray(filter.values) && filter.values.length > 0 ? filter.values[0] : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleFilterChange(filter.field, { values: value ? [value] : [] });
                    }}
                    disabled={loadingDropdownValues[filter.field]}
                    className="flex-1 px-2 py-1.5 border border-outline rounded-md text-sm bg-surface text-content-primary focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">{loadingDropdownValues[filter.field] ? 'Loading...' : 'All'}</option>
                    {dropdownValues[filter.field]?.map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={typeof filter.values === 'string' ? filter.values : (Array.isArray(filter.values) ? filter.values[0] || '' : '')}
                    onChange={(e) => handleFilterChange(filter.field, { values: e.target.value })}
                    placeholder="Enter value..."
                    className="flex-1 px-2 py-1.5 border border-outline rounded-md text-sm bg-surface text-content-primary focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                )}
              </div>
            </ReportFilterField>
          );
        })}
      </ReportFiltersRow>
    );
  }, [teamValue, piValue, buildReportFilters, filterableFields, dropdownValues, loadingDropdownValues, getFilterFieldInfo, handleFilterChange, setFilters]);

  // Handle issue_key click for "Open all in Jira" button - must be before conditional returns
  const handleOpenAllInJira = React.useCallback(() => {
    if (!jiraUrl || !Array.isArray(data) || data.length === 0) return;
    
    const issueKeys = data
      .map(row => row.issue_key)
      .filter((key): key is string => Boolean(key));
    
    if (issueKeys.length === 0) return;
    
    const keysParam = issueKeys.join(',');
    const jql = encodeURIComponent(`key IN (${keysParam})`);
    const jiraLink = `${jiraUrl}/issues/?jql=${jql}`;
    window.open(jiraLink, '_blank', 'noopener,noreferrer');
  }, [jiraUrl, data]);

  // NOW we can do conditional returns after all hooks are called
  if (!definition) {
    // Show loading state if still loading, otherwise show error
    if (loading) {
      return (
        <ReportCard
          title={reportName}
          reportId={reportId}
          filters={null}
          filterBadges={[]}
          onRefresh={refresh}
          onTogglePin={togglePin}
          onClose={componentProps?.onClose}
          onAIChat={componentProps?.onAIChat}
          readOnly={componentProps?.readOnly}
          hideHeader={componentProps?.hideHeader}
          hideCollapse={componentProps?.hideCollapse}
        >
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <div className="text-sm text-content-tertiary">Loading report...</div>
            </div>
          </div>
        </ReportCard>
      );
    }
    
    // If not loading and no definition, it's an error
    return (
      <ReportCard
        title={reportName}
        reportId={reportId}
        filters={null}
        filterBadges={[]}
        onRefresh={refresh}
        onTogglePin={togglePin}
        onClose={componentProps?.onClose}
        onAIChat={componentProps?.onAIChat}
        readOnly={componentProps?.readOnly}
        hideHeader={componentProps?.hideHeader}
        hideCollapse={componentProps?.hideCollapse}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-content-tertiary p-4">Report definition not found</div>
        </div>
      </ReportCard>
    );
  }

  // Render using shared component
  return (
    <ReportCard
      title={reportName}
      reportId={reportId}
      filters={filtersContent}
      filterBadges={filterBadges}
      onRefresh={refresh}
      onTogglePin={togglePin}
      onClose={componentProps?.onClose}
      onAIChat={componentProps?.onAIChat}
      readOnly={componentProps?.readOnly}
      hideHeader={componentProps?.hideHeader}
      hideCollapse={componentProps?.hideCollapse}
    >
      <GenericReportVisualization
        chartType={chartType as 'table' | 'bar_chart' | 'pie_chart'}
        data={data}
        loading={loading}
        error={error}
        tableColumns={tableColumns}
        xAxisField={chartType === 'bar_chart' ? (typeof buildConfig?.x_axis === 'string' ? buildConfig.x_axis : 'x_value') : undefined}
        yAxisField={chartType === 'bar_chart' ? (buildConfig?.y_axis || 'count') : undefined}
        filterableFields={filterableFields}
        isDark={isDark}
        jiraUrl={chartType === 'table' ? jiraUrl : undefined}
        onOpenAllInJira={chartType === 'table' ? handleOpenAllInJira : undefined}
      />
    </ReportCard>
  );
}

