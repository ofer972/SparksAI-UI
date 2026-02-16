'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ApiService } from '@/lib/api';
import DataTable, { Column } from '@/components/DataTable';
import ErrorModal from '@/components/ErrorModal';
import { getCleanJiraUrl } from '@/lib/config';
import GenericReportVisualization from './reportViews/GenericReportVisualization';
import { sortFieldsSelectedFirst } from './BuildReportTab.helpers';
import FieldSelector, { type ReportField as FieldSelectorReportField } from './BuildReportTab.FieldSelector';
import FilterConfigPanel, { type FilterableField as FilterConfigFilterableField, type Filter as FilterConfigFilter } from './BuildReportTab.FilterConfigPanel';
import { BUILD_REPORT_BAR_COLORS, BUILD_REPORT_MULTI_BAR_METRICS } from './buildReport/constants';
import BuildReportBarColorSelect from './buildReport/BarColorSelect';
import BuildReportStackBySelect from './buildReport/StackBySelect';
import BuildReportColoredSelect from './buildReport/ColoredSelect';
import TeamGroupSelect from '@/components/filters/TeamGroupSelect';
import { getPITerminology } from '@/lib/piTerminology';
import { useUser } from '@/contexts/UserContext';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
import SaveReportModal from './SaveReportModal';
import CustomReportsList from './CustomReportsList';
import Toast from './Toast';
import { ReportDefinition } from '@/lib/config';


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

interface Filter {
  field: string;
  operator: string;
  values: string[] | string;
}

export default function BuildReportTab() {
  const [reportType, setReportType] = useState('table');
  const [xAxisBar, setXAxisBar] = useState<string>(''); // Single value for bar charts
  const [xAxisPie, setXAxisPie] = useState<string[]>([]); // Array for pie charts
  const [yAxis, setYAxis] = useState<string>('count');
  // Bar chart: optional stack by and bar color
  const [barChartStackBy, setBarChartStackBy] = useState<string>('');
  const [barChartBarColor, setBarChartBarColor] = useState<string>(BUILD_REPORT_BAR_COLORS[0].value);
  // Multi-bar (time-based)
  const [multiBarPeriod, setMultiBarPeriod] = useState<'month' | 'week' | 'day'>('month');
  const [multiBarMonths, setMultiBarMonths] = useState<number>(6);
  const [multiBarMetric1, setMultiBarMetric1] = useState<string>('');
  const [multiBarMetric2, setMultiBarMetric2] = useState<string>('');
  const [multiBarBar1Color, setMultiBarBar1Color] = useState<string>(BUILD_REPORT_BAR_COLORS[0].value);
  const [multiBarBar2Color, setMultiBarBar2Color] = useState<string>(BUILD_REPORT_BAR_COLORS[1].value);
  const [multiBarStackBy, setMultiBarStackBy] = useState<string>('');
  
  // Dark mode detection
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  const [displayableFields, setDisplayableFields] = useState<ReportField[]>([]);
  const [filterableFields, setFilterableFields] = useState<FilterableField[]>([]);
  const [dropdownValues, setDropdownValues] = useState<Record<string, string[]>>({}); // Cache for dropdown values
  const [loadingDropdownValues, setLoadingDropdownValues] = useState<Record<string, boolean>>({});
  const [selectedFields, setSelectedFields] = useState<string[]>(['issue_key', 'status', 'issue_type', 'summary']);
  const [selectedFilterFields, setSelectedFilterFields] = useState<string[]>([]); // Fields selected for filtering
  const [filters, setFilters] = useState<Filter[]>([]);
  const [reportData, setReportData] = useState<any[] | Record<string, any[]>>([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [jiraUrl, setJiraUrl] = useState<string>('');
  
  // Default filters
  const [selectedPI, setSelectedPI] = useState<string | null>(null);
  const [selectedTeamGroup, setSelectedTeamGroup] = useState<string | null>(null);
  const [selectedTeamGroupName, setSelectedTeamGroupName] = useState<string>('');
  const [isGroup, setIsGroup] = useState<boolean>(false);

  // Default sort (table reports only, saved with report)
  const [defaultSortColumn, setDefaultSortColumn] = useState<string | null>(null);
  const [defaultSortDirection, setDefaultSortDirection] = useState<'asc' | 'desc'>('asc');
  const [availablePIs, setAvailablePIs] = useState<Array<{ pi_name: string }>>([]);
  const [loadingPIs, setLoadingPIs] = useState(true);

  // Custom reports state
  const [customReports, setCustomReports] = useState<ReportDefinition[]>([]);
  const [loadingCustomReports, setLoadingCustomReports] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [currentReportDefinition, setCurrentReportDefinition] = useState<ReportDefinition | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // Get user preferences for default team/group
  const { preferences } = useUser();
  const { teams, groups, loading: teamsLoading } = useTeamsGroups();

  const apiService = new ApiService();

  // Get effective Jira URL (from API response or config)
  const effectiveJiraUrl = useMemo(() => {
    return jiraUrl || getCleanJiraUrl();
  }, [jiraUrl]);

  // Load fields on mount
  useEffect(() => {
    const loadFields = async () => {
      setLoadingFields(true);
      setError(null);
      try {
        const fieldsData = await apiService.getReportFields();
        setDisplayableFields(fieldsData.displayable_fields);
        // Filter out quarter_pi and team_name from filterable fields (they're default filters)
        const filteredFields = fieldsData.filterable_fields.filter(
          f => f.column_name !== 'quarter_pi' && f.column_name !== 'team_name'
        );
        setFilterableFields(filteredFields);
        
        // Ensure default fields are selected if they exist
        const defaultFields = ['issue_key', 'status', 'issue_type', 'summary'];
        const availableDefaultFields = defaultFields.filter(field => 
          fieldsData.displayable_fields.some(f => f.column_name === field)
        );
        if (availableDefaultFields.length > 0) {
          setSelectedFields(prev => {
            // Only set if not already set (preserve user selections if component re-renders)
            return prev.length === 0 ? availableDefaultFields : prev;
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load fields';
        setError(errorMessage);
        setErrorModal(errorMessage);
      } finally {
        setLoadingFields(false);
      }
    };

    loadFields();
  }, []);

  // Load custom reports on mount
  useEffect(() => {
    const loadCustomReports = async () => {
      setLoadingCustomReports(true);
      try {
        const reports = await apiService.getCustomReports();
        setCustomReports(reports);
      } catch (err) {
        console.error('Error loading custom reports:', err);
      } finally {
        setLoadingCustomReports(false);
      }
    };
    loadCustomReports();
  }, []);

  // Load PIs and set default
  useEffect(() => {
    const loadPIs = async () => {
      setLoadingPIs(true);
      try {
        const pisData = await apiService.getPIs();
        if (pisData.pis) {
          setAvailablePIs(pisData.pis);
          
          // Set default to current PI if not already set
          if (!selectedPI) {
            try {
              const currentPIs = await apiService.getCurrentAndNextPIs();
              const currentPIsList = (currentPIs as any).current_pis || [];
              if (currentPIsList.length > 0) {
                setSelectedPI(currentPIsList[0].pi_name);
              } else if (pisData.pis.length > 0) {
                setSelectedPI(pisData.pis[0].pi_name);
              }
            } catch (err) {
              // If current PI fetch fails, use first available PI
              if (pisData.pis.length > 0) {
                setSelectedPI(pisData.pis[0].pi_name);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error loading PIs:', err);
      } finally {
        setLoadingPIs(false);
      }
    };
    
    loadPIs();
  }, []);


  // Load default team/group from user preferences
  useEffect(() => {
    // Don't set defaults when loading a custom report
    if (isLoadingReport) return;
    // Wait for teams/groups to load
    if (teamsLoading) return;
    // Only set default if not already set and preferences are available
    if (!selectedTeamGroup && preferences?.default_team_or_group && preferences.default_type) {
      let teamGroupName = preferences.default_team_or_group;
      
      // Clean the team/group name (in case it has tree value format from old data)
      if (teamGroupName.includes(':')) {
        // Handle old format like "team:Engineering" -> extract "Engineering"
        teamGroupName = teamGroupName.split(':')[1] || teamGroupName;
      }
      
      // Find the team or group by name and get its key
      if (preferences.default_type === 'group') {
        const group = groups.find(g => g.group_name === teamGroupName);
        if (group) {
          const treeValue = `group:${group.group_key}`;
          setSelectedTeamGroup(treeValue);
          setSelectedTeamGroupName(teamGroupName);
          setIsGroup(true);
        }
      } else if (preferences.default_type === 'team') {
        const team = teams.find(t => t.team_name === teamGroupName);
        if (team) {
          const treeValue = `team:${team.team_key}`;
          setSelectedTeamGroup(treeValue);
          setSelectedTeamGroupName(teamGroupName);
          setIsGroup(false);
        }
      }
    }
  }, [preferences, selectedTeamGroup, teams, groups, teamsLoading, isLoadingReport]);

  // Handle field selection
  const handleFieldToggle = (columnName: string) => {
    setSelectedFields(prev => {
      if (prev.includes(columnName)) {
        return prev.filter(f => f !== columnName);
      } else {
        return [...prev, columnName];
      }
    });
  };

  // Handle filter field selection (checkboxes)
  const handleFilterFieldToggle = async (columnName: string) => {
    setSelectedFilterFields(prev => {
      if (prev.includes(columnName)) {
        // Remove filter field - also remove from active filters
        setFilters(prevFilters => prevFilters.filter(f => f.field !== columnName));
        return prev.filter(f => f !== columnName);
      } else {
        // Add filter field - create new filter entry
        const fieldInfo = getFilterFieldInfo(columnName);
        // Set default operator based on filter type
        let defaultOperator = 'equals';
        if (fieldInfo?.filter_type === 'date') {
          defaultOperator = 'greater_than';
        } else if (fieldInfo?.filter_type === 'number') {
          defaultOperator = 'equals';
        } else if (fieldInfo?.filter_type === 'dropdown') {
          defaultOperator = 'equals';
        }
        
        const newFilter: Filter = {
          field: columnName,
          operator: defaultOperator,
          values: fieldInfo?.filter_type === 'dropdown' ? [] : ''
        };
        setFilters(prevFilters => [...prevFilters, newFilter]);
        
        // Fetch dropdown values if it's a dropdown field and not already cached
        if (fieldInfo?.filter_type === 'dropdown' && !dropdownValues[columnName]) {
          setLoadingDropdownValues(prev => ({ ...prev, [columnName]: true }));
          apiService.getFilterDropdownValues([columnName])
            .then(values => {
              setDropdownValues(prev => ({ ...prev, ...values }));
            })
            .catch(err => {
              console.error(`Failed to load dropdown values for ${columnName}:`, err);
            })
            .finally(() => {
              setLoadingDropdownValues(prev => {
                const newState = { ...prev };
                delete newState[columnName];
                return newState;
              });
            });
        }
        
        return [...prev, columnName];
      }
    });
  };

  // Handle filter value changes
  const handleFilterChange = (fieldName: string, field: Partial<Filter>) => {
    setFilters(prev => {
      const newFilters = [...prev];
      const index = newFilters.findIndex(f => f.field === fieldName);
      if (index >= 0) {
        newFilters[index] = { ...newFilters[index], ...field };
      }
      return newFilters;
    });
  };

  const removeFilter = (fieldName: string) => {
    setSelectedFilterFields(prev => prev.filter(f => f !== fieldName));
    setFilters(prev => prev.filter(f => f.field !== fieldName));
  };

  // Reorder fields: move selected fields to top
  const reorderFieldsToShowSelectedFirst = () => {
    const sorted = sortFieldsSelectedFirst(displayableFields, selectedFields);
    setDisplayableFields(sorted);
  };

  // Reorder filterable fields: move selected filter fields to top
  const reorderFilterFieldsToShowSelectedFirst = () => {
    const sorted = sortFieldsSelectedFirst(filterableFields, selectedFilterFields);
    setFilterableFields(sorted);
  };

  // Move field up in the list
  const moveFieldUp = (columnName: string) => {
    const currentIndex = displayableFields.findIndex(f => f.column_name === columnName);
    if (currentIndex > 0) {
      const newFields = [...displayableFields];
      [newFields[currentIndex - 1], newFields[currentIndex]] = [newFields[currentIndex], newFields[currentIndex - 1]];
      setDisplayableFields(newFields);
    }
  };

  // Move field down in the list
  const moveFieldDown = (columnName: string) => {
    const currentIndex = displayableFields.findIndex(f => f.column_name === columnName);
    if (currentIndex < displayableFields.length - 1) {
      const newFields = [...displayableFields];
      [newFields[currentIndex], newFields[currentIndex + 1]] = [newFields[currentIndex + 1], newFields[currentIndex]];
      setDisplayableFields(newFields);
    }
  };

  // Build report
  const handleBuildReport = async () => {
    if (reportType === 'table' && selectedFields.length === 0) {
      setErrorModal('Please select at least one field');
      return;
    }
    if (reportType === 'bar_chart' && !xAxisBar) {
      setErrorModal('Please select an X-axis field');
      return;
    }
    if (reportType === 'pie_chart' && xAxisPie.length === 0) {
      setErrorModal('Please select at least one Group By field');
      return;
    }
    if (reportType === 'multi_bar' && (!multiBarMetric1 || !multiBarMetric2)) {
      setErrorModal('Please select both Bar 1 and Bar 2 metrics');
      return;
    }

    // Reorder fields: move selected to top
    reorderFieldsToShowSelectedFirst();
    
    // Reorder filter fields: move selected filters to top
    reorderFilterFieldsToShowSelectedFirst();

    // Get selected fields in their current order (as they appear in displayableFields)
    const orderedSelectedFields = displayableFields
      .filter(f => selectedFields.includes(f.column_name))
      .map(f => f.column_name);

    // Validate filters
    const validFilters = filters.filter(f => f.field && f.values && 
      (Array.isArray(f.values) ? f.values.length > 0 : f.values.toString().trim() !== ''));

    // Build filters array including PI filter if selected
    const allFilters = [...validFilters];
    if (selectedPI) {
      allFilters.push({
        field: 'quarter_pi',
        operator: 'equals',
        values: [selectedPI]
      });
    }

    setLoadingReport(true);
    setError(null);
    try {
      const result = await apiService.buildReport({
        report_type: reportType,
        selected_fields: reportType === 'table' ? orderedSelectedFields : undefined,
        x_axis: (reportType === 'bar_chart' || reportType === 'pie_chart')
          ? (reportType === 'pie_chart' ? xAxisPie : xAxisBar)
          : undefined,
        y_axis: reportType === 'bar_chart' ? yAxis : undefined,
        stack_by: reportType === 'bar_chart' && barChartStackBy ? barChartStackBy : reportType === 'multi_bar' && multiBarStackBy ? multiBarStackBy : undefined,
        bar_color: reportType === 'bar_chart' ? barChartBarColor : undefined,
        period: reportType === 'multi_bar' ? multiBarPeriod : undefined,
        lookback_months: reportType === 'multi_bar' ? multiBarMonths : undefined,
        bar_1_metric: reportType === 'multi_bar' ? multiBarMetric1 : undefined,
        bar_2_metric: reportType === 'multi_bar' ? multiBarMetric2 : undefined,
        filters: allFilters.map(f => {
          // Ensure operator is always set (default to 'equals' if missing)
          const operator = f.operator || 'equals';
          return {
            field: f.field,
            operator: operator,
            values: Array.isArray(f.values) ? f.values : [f.values]
          };
        }),
        team_name: selectedTeamGroupName || undefined,
        isGroup: isGroup
      });
      // result structure from API service (after extraction):
      // For pie charts: { data: {field1: [...], field2: [...]}, count: ..., columns: ..., meta: ... }
      // For other types: { data: [...], count: ..., columns: ..., meta: ... }
      if (reportType === 'pie_chart') {
        // For pie charts, data is always an object with field names as keys
        // Check if result.data exists and is an object (not array)
        if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
          // Multiple pie charts - data is an object with field names as keys
          setReportData(result.data);
        } else {
          // Fallback: set empty object
          setReportData({});
        }
      } else {
        // Table or bar chart - data is an array
        setReportData(Array.isArray(result.data) ? result.data : []);
      }
      
      // Extract Jira URL from response meta if available
      if (result.meta?.jira_url) {
        setJiraUrl(result.meta.jira_url);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to build report';
      setError(errorMessage);
      setErrorModal(errorMessage);
      setReportData(reportType === 'pie_chart' ? {} : []);
    } finally {
      setLoadingReport(false);
    }
  };

  // Get filter field info
  const getFilterFieldInfo = (fieldName: string): FilterableField | undefined => {
    return filterableFields.find(f => f.column_name === fieldName);
  };

  // Handle issue key click - open in Jira
  const handleIssueKeyClick = useCallback((issueKey: string) => {
    if (effectiveJiraUrl && issueKey) {
      window.open(`${effectiveJiraUrl}/browse/${issueKey}`, '_blank');
    }
  }, [effectiveJiraUrl]);

  // Auto-build when report is loaded and state is ready
  useEffect(() => {
    if (!isLoadingReport || !selectedReportId) return;
    if (loadingFields || displayableFields.length === 0) return;
    
    // Check if we have minimum required fields for the report type
    const canBuild = 
      (reportType === 'table' && selectedFields.length > 0) ||
      (reportType === 'bar_chart' && xAxisBar) ||
      (reportType === 'pie_chart' && xAxisPie.length > 0);
    
    if (canBuild) {
      // Wait a bit more to ensure all state updates are complete
      const timer = setTimeout(() => {
        handleBuildReport();
        setIsLoadingReport(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoadingReport, selectedReportId, loadingFields, displayableFields.length, reportType, selectedFields.length, xAxisBar, xAxisPie.length]);

  // Load a custom report
  const handleLoadCustomReport = async (reportId: string) => {
    try {
      setIsLoadingReport(true);
      // Clear report data immediately to prevent showing stale data
      setReportData([]);
      const report = await apiService.getCustomReport(reportId);
      setCurrentReportDefinition(report);
      setSelectedReportId(reportId);
      
      // Extract build_report_config from meta_schema
      const buildConfig = report.meta_schema?.build_report_config;
      if (!buildConfig) {
        setErrorModal('Invalid report configuration');
        setIsLoadingReport(false);
        return;
      }
      
      // Set report type
      setReportType(buildConfig.report_type || 'table');
      
      // Set fields based on report type
      if (buildConfig.report_type === 'table' && buildConfig.selected_fields) {
        setSelectedFields(buildConfig.selected_fields);
      } else if (buildConfig.report_type === 'bar_chart' && buildConfig.x_axis) {
        setXAxisBar(typeof buildConfig.x_axis === 'string' ? buildConfig.x_axis : '');
        if (buildConfig.y_axis) {
          setYAxis(buildConfig.y_axis);
        }
        setBarChartStackBy(buildConfig.stack_by ?? '');
        if (buildConfig.bar_color && BUILD_REPORT_BAR_COLORS.some(c => c.value === buildConfig.bar_color)) {
          setBarChartBarColor(buildConfig.bar_color);
        }
      } else if (buildConfig.report_type === 'pie_chart' && buildConfig.x_axis) {
        setXAxisPie(Array.isArray(buildConfig.x_axis) ? buildConfig.x_axis : [buildConfig.x_axis]);
      } else if (buildConfig.report_type === 'multi_bar') {
        setMultiBarPeriod((buildConfig.period === 'week' ? 'week' : buildConfig.period === 'day' ? 'day' : 'month'));
        setMultiBarMonths(buildConfig.lookback_months ?? 6);
        setMultiBarMetric1(buildConfig.bar_1_metric ?? '');
        setMultiBarMetric2(buildConfig.bar_2_metric ?? '');
        if (buildConfig.bar_1_color && BUILD_REPORT_BAR_COLORS.some(c => c.value === buildConfig.bar_1_color)) {
          setMultiBarBar1Color(buildConfig.bar_1_color);
        }
        if (buildConfig.bar_2_color && BUILD_REPORT_BAR_COLORS.some(c => c.value === buildConfig.bar_2_color)) {
          setMultiBarBar2Color(buildConfig.bar_2_color);
        }
        setMultiBarStackBy(buildConfig.stack_by ?? '');
      }
      
      // Load default filters from default_filters column (like system reports)
      if (report.default_filters) {
        // Set PI filter
        setSelectedPI(report.default_filters.pi || null);
        
        // Set team/group filter
        if (report.default_filters.team_name) {
          setSelectedTeamGroupName(report.default_filters.team_name);
          setIsGroup(report.default_filters.isGroup || false);
          // Try to find team/group in the tree value format
          if (report.default_filters.isGroup) {
            const group = groups.find(g => g.group_name === report.default_filters.team_name);
            if (group) {
              setSelectedTeamGroup(`group:${group.group_key}`);
            } else {
              setSelectedTeamGroup(null);
            }
          } else {
            const team = teams.find(t => t.team_name === report.default_filters.team_name);
            if (team) {
              setSelectedTeamGroup(`team:${team.team_key}`);
            } else {
              setSelectedTeamGroup(null);
            }
          }
        } else {
          setSelectedTeamGroup(null);
          setSelectedTeamGroupName('');
          setIsGroup(false);
        }
      } else {
        // No default filters set
        setSelectedPI(null);
        setSelectedTeamGroup(null);
        setSelectedTeamGroupName('');
        setIsGroup(false);
      }
      
      // Load regular filters from build_report_config.filters (excluding PI and team_name)
      const regularFilters = (buildConfig.filters || []).filter(
        (f: Filter) => f.field !== 'quarter_pi' && f.field !== 'team_name'
      );
      setFilters(regularFilters);
      setSelectedFilterFields(regularFilters.map((f: Filter) => f.field));

      // Load default sort (table reports)
      const ds = buildConfig.default_sort;
      if (ds && typeof ds === 'object' && ds.key) {
        setDefaultSortColumn(ds.key);
        setDefaultSortDirection((ds.direction === 'desc' ? 'desc' : 'asc'));
      } else {
        setDefaultSortColumn(null);
        setDefaultSortDirection('asc');
      }

      // Fetch dropdown values for any dropdown-type filters so the filter dropdowns show options in preview.
      // We only populate dropdownValues when adding a filter via handleFilterFieldToggle; when loading a report
      // we set filters/selectedFilterFields directly, so options were never fetched. Custom dashboard works
      // because GenericReportView has a useEffect that fetches dropdown values when buildReportFilters change.
      // After the save fix that persists all filter fields, more dropdown filters are restored on load, which
      // made the missing options visible here.
      const dropdownFieldNames = regularFilters
        .map((f: Filter) => f.field)
        .filter((fieldName: string) => getFilterFieldInfo(fieldName)?.filter_type === 'dropdown');
      if (dropdownFieldNames.length > 0) {
        setLoadingDropdownValues((prev) => {
          const next = { ...prev };
          dropdownFieldNames.forEach((fieldName: string) => { next[fieldName] = true; });
          return next;
        });
        apiService.getFilterDropdownValues(dropdownFieldNames)
          .then((values) => {
            setDropdownValues((prev) => ({ ...prev, ...values }));
          })
          .catch((err) => {
            console.error('Failed to load dropdown values for loaded report:', err);
          })
          .finally(() => {
            setLoadingDropdownValues((prev) => {
              const next = { ...prev };
              dropdownFieldNames.forEach((fieldName: string) => delete next[fieldName]);
              return next;
            });
          });
      }

      // The useEffect will handle auto-building when state is ready
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load report';
      setErrorModal(errorMessage);
      setIsLoadingReport(false);
    }
  };
  
  // Handle new report
  const handleNewReport = () => {
    setIsLoadingReport(false);
    setSelectedReportId(null);
    setCurrentReportDefinition(null);
    setReportType('table');
    setXAxisBar('');
    setXAxisPie([]);
    setYAxis('count');
    setSelectedFields(['issue_key', 'status', 'issue_type', 'summary']);
    setSelectedFilterFields([]);
    setFilters([]);
    setSelectedPI(null);
    setSelectedTeamGroup(null);
    setSelectedTeamGroupName('');
    setIsGroup(false);
    setDefaultSortColumn(null);
    setDefaultSortDirection('asc');
    setReportData([]);
    setError(null);
  };
  
  // Handle save report
  const handleSaveReport = async (name: string, description: string) => {
    // Get current configuration
    const orderedSelectedFields = displayableFields
      .filter(f => selectedFields.includes(f.column_name))
      .map(f => f.column_name);
    
    // Include ALL selected filter fields in the save payload (including empty values)
    // so they are persisted and restored when the report is loaded.
    const filtersToSave: Array<{ field: string; operator: string; values: string[] }> = selectedFilterFields.map(
      (fieldName) => {
        const existing = filters.find((f) => f.field === fieldName);
        const operator = existing?.operator || 'equals';
        let values: string[] = [];
        if (existing?.values != null) {
          values = Array.isArray(existing.values) ? existing.values : [String(existing.values)];
        }
        return { field: fieldName, operator, values };
      }
    );
    if (selectedPI) {
      filtersToSave.push({
        field: 'quarter_pi',
        operator: 'equals',
        values: [selectedPI]
      });
    }
    
    const config = {
      report_name: name,
      description: description || undefined,
      report_type: reportType,
      selected_fields: reportType === 'table' ? orderedSelectedFields : undefined,
      x_axis: (reportType === 'bar_chart' || reportType === 'pie_chart')
        ? (reportType === 'pie_chart' ? xAxisPie : xAxisBar)
        : undefined,
      y_axis: reportType === 'bar_chart' ? yAxis : undefined,
      filters: filtersToSave,
      team_name: selectedTeamGroupName || undefined,
      isGroup: isGroup,
      ...(reportType === 'table' && {
        default_sort: defaultSortColumn
          ? { key: defaultSortColumn, direction: defaultSortDirection }
          : null,
      }),
      ...(reportType === 'bar_chart' && {
        stack_by: barChartStackBy || undefined,
        bar_color: barChartBarColor,
      }),
      ...(reportType === 'multi_bar' && {
        period: multiBarPeriod,
        lookback_months: multiBarMonths,
        bar_1_metric: multiBarMetric1,
        bar_2_metric: multiBarMetric2,
        bar_1_color: multiBarBar1Color,
        bar_2_color: multiBarBar2Color,
        ...(multiBarStackBy ? { stack_by: multiBarStackBy } : {}),
      }),
    };
    
    if (selectedReportId && currentReportDefinition) {
      // Update existing report
      const updated = await apiService.updateCustomReport(selectedReportId, config as Parameters<ApiService['updateCustomReport']>[1]);
      setCurrentReportDefinition(updated);
      // Refresh custom reports list
      const reports = await apiService.getCustomReports();
      setCustomReports(reports);
      // Show success toast
      setToastType('success');
      setToastMessage(`Report "${name}" updated successfully`);
      setTimeout(() => setToastMessage(null), 3000);
    } else {
      // Save new report
      const saved = await apiService.saveCustomReport(config as Parameters<ApiService['saveCustomReport']>[0]);
      setCurrentReportDefinition(saved);
      setSelectedReportId(saved.report_id);
      // Refresh custom reports list
      const reports = await apiService.getCustomReports();
      setCustomReports(reports);
      // Show success toast
      setToastType('success');
      setToastMessage(`Report "${name}" saved successfully`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };
  
  // Handle delete report
  const handleDeleteReport = async (reportId: string) => {
    try {
      await apiService.deleteCustomReport(reportId);
      // Refresh custom reports list
      const reports = await apiService.getCustomReports();
      setCustomReports(reports);
      // If deleted report was selected, reset to new report
      if (selectedReportId === reportId) {
        handleNewReport();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete report';
      setErrorModal(errorMessage);
    }
  };

  // Handle open all in Jira
  const handleOpenAllInJira = useCallback(() => {
    // Only for table reports (reportData is array)
    if (!effectiveJiraUrl || !Array.isArray(reportData) || reportData.length === 0) return;
    
    const issueKeys = reportData
      .map(row => row.issue_key)
      .filter((key): key is string => Boolean(key));
    
    if (issueKeys.length === 0) return;
    
    const keysParam = issueKeys.join(',');
    const jql = encodeURIComponent(`key IN (${keysParam})`);
    const jiraLink = `${effectiveJiraUrl}/issues/?jql=${jql}`;
    window.open(jiraLink, '_blank', 'noopener,noreferrer');
  }, [effectiveJiraUrl, reportData]);

  // Build DataTable columns from selected fields in the order they appear in displayableFields
  const tableColumns = useMemo<Column<any>[]>(() => {
    // Get selected fields in the order they appear in displayableFields (not the order they were selected)
    const orderedSelectedFields = displayableFields
      .filter(f => selectedFields.includes(f.column_name))
      .map(f => f.column_name);
    
    return orderedSelectedFields.map(fieldName => {
      const field = displayableFields.find(f => f.column_name === fieldName);
      const isIssueKey = fieldName === 'issue_key';
      
      return {
        key: fieldName,
        label: field?.display_name || fieldName,
        sortable: true,
        align: 'left' as const,
        // Make issue_key clickable if Jira URL is available
        render: isIssueKey && effectiveJiraUrl ? (value) => {
          return (
            <button
              onClick={() => handleIssueKeyClick(value)}
              className="text-brand hover:text-blue-800 hover:underline cursor-pointer font-medium"
              title={`Open ${value} in Jira`}
            >
              {value}
            </button>
          );
        } : undefined
      };
    });
  }, [selectedFields, displayableFields, effectiveJiraUrl, handleIssueKeyClick]);

  if (loadingFields) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <div className="text-sm text-content-tertiary">Loading fields...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage(null)} />
      
      {errorModal && (
        <ErrorModal
          message={errorModal}
          onClose={() => setErrorModal(null)}
          title="Error"
        />
      )}
      
      <SaveReportModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveReport}
        initialName={currentReportDefinition?.report_name || ''}
        initialDescription={currentReportDefinition?.description || ''}
        isUpdate={!!selectedReportId}
      />
      
      <div className="h-full flex min-h-0">
        {/* Left Panel - Custom Reports List */}
        <div className="w-1/4 flex-shrink-0">
          <CustomReportsList
            reports={customReports}
            selectedReportId={selectedReportId}
            onSelectReport={handleLoadCustomReport}
            onNewReport={handleNewReport}
            onDeleteReport={handleDeleteReport}
            loading={loadingCustomReports}
          />
        </div>
        
        {/* Right Panel - Build Report Interface */}
        <div className="flex-1 min-w-0 flex flex-col space-y-4 pl-4">
          {/* Header - Show current report status */}
          <div className="flex-shrink-0 pb-3 border-b border-outline">
            <div className="flex items-center gap-2">
              {selectedReportId && currentReportDefinition ? (
                <>
                  <div className="px-3 py-1.5 bg-blue-100 dark:bg-blue-950/40 text-brand rounded text-sm font-medium">
                    Editing
                  </div>
                  <h2 className="text-lg font-semibold text-content-primary">
                    {currentReportDefinition.report_name}
                  </h2>
                </>
              ) : (
                <>
                  <div className="px-3 py-1.5 bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 rounded text-sm font-medium">
                    New Report
                  </div>
                  <h2 className="text-lg font-semibold text-content-primary">
                    Create New Report
                  </h2>
                </>
              )}
            </div>
            {selectedReportId && currentReportDefinition?.description && (
              <p className="text-sm text-content-secondary mt-1">
                {currentReportDefinition.description}
              </p>
            )}
          </div>
          
        {/* Report Type - Label, Dropdown, Preview Report Button, and Group By (for pie charts) on One Row */}
        <div className="flex-shrink-0 flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium text-content-primary whitespace-nowrap">
            Report Type:
          </label>
          <select
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value);
              // Clear report data when report type changes (unless loading a report)
              if (!isLoadingReport) {
                setReportData(e.target.value === 'pie_chart' ? {} : []);
                setError(null);
              }
            }}
            className="w-48 px-3 py-2 border border-outline rounded-md text-sm bg-surface-elevated text-content-primary focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="table">Table</option>
            <option value="bar_chart">Bar Chart</option>
            <option value="pie_chart">Pie Chart</option>
            <option value="multi_bar">Multi-Bar</option>
          </select>
          <div className="w-6"></div>
          <button
            onClick={handleBuildReport}
            disabled={loadingReport || (reportType === 'table' ? selectedFields.length === 0 : reportType === 'bar_chart' ? !xAxisBar : reportType === 'pie_chart' ? xAxisPie.length === 0 : !multiBarMetric1 || !multiBarMetric2)}
            className="px-3 py-1.5 text-sm bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loadingReport ? 'Loading Report...' : 'Preview Report'}
          </button>
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={loadingReport || (reportType === 'table' ? selectedFields.length === 0 : reportType === 'bar_chart' ? !xAxisBar : reportType === 'pie_chart' ? xAxisPie.length === 0 : !multiBarMetric1 || !multiBarMetric2)}
            className="px-3 py-1.5 text-sm bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-600 text-white rounded transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {selectedReportId ? 'Update Report' : 'Save Report'}
          </button>
        </div>

        {/* Default sort (table only) */}
        {reportType === 'table' && (
          <div className="flex-shrink-0 flex items-center gap-3">
            <label className="text-sm font-medium text-content-primary whitespace-nowrap">
              Default sort:
            </label>
            <select
              value={defaultSortColumn ?? ''}
              onChange={(e) => setDefaultSortColumn(e.target.value || null)}
              className="w-40 px-2 py-1.5 border border-outline rounded-md text-sm bg-surface text-content-primary focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">None</option>
              {displayableFields
                .filter((f) => selectedFields.includes(f.column_name))
                .map((f) => (
                  <option key={f.column_name} value={f.column_name}>
                    {f.display_name}
                  </option>
                ))}
            </select>
            <select
              value={defaultSortDirection}
              onChange={(e) => setDefaultSortDirection(e.target.value as 'asc' | 'desc')}
              disabled={!defaultSortColumn}
              className="w-24 px-2 py-1.5 border border-outline rounded-md text-sm bg-surface text-content-primary focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
            >
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </div>
        )}

        {/* Bar Chart: X-Axis (Bar) + Bar color first, then Y-Axis, Stack by */}
        {reportType === 'bar_chart' && (
          <div className="flex-shrink-0 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-content-primary whitespace-nowrap">
                X-Axis (Bar):
              </label>
              <BuildReportColoredSelect
                value={xAxisBar}
                onChange={(v) => { setXAxisBar(v); if (!isLoadingReport) { setReportData([]); setError(null); } }}
                options={[
                  { value: 'team_name', label: 'Team name' },
                  ...filterableFields
                    .filter(f => f.filter_type === 'dropdown')
                    .map(f => ({ value: f.column_name, label: f.display_name })),
                ]}
                color={barChartBarColor}
                placeholder="Select field..."
                selectClassName="w-48 px-3 py-2 border border-outline rounded-md text-sm bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <BuildReportBarColorSelect
              label="Bar color:"
              value={barChartBarColor}
              onChange={(v) => { setBarChartBarColor(v); if (!isLoadingReport) setReportData([]); }}
              disabled={!!barChartStackBy}
            />
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-content-primary whitespace-nowrap">
                Y-Axis:
              </label>
              <select
                value={yAxis}
                onChange={(e) => setYAxis(e.target.value)}
                className="w-48 px-3 py-2 border border-outline rounded-md text-sm bg-surface-elevated text-content-primary focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="count">Count</option>
                <option value="sum" disabled>Sum of [field] (Coming Soon)</option>
                <option value="avg" disabled>Average of [field] (Coming Soon)</option>
              </select>
            </div>
            <BuildReportStackBySelect
              value={barChartStackBy}
              onChange={(v) => { setBarChartStackBy(v); if (!isLoadingReport) { setReportData([]); setError(null); } }}
              filterableFields={filterableFields}
              placeholder="Don't stack"
            />
          </div>
        )}

        {/* Multi-Bar: row 1 = Period, Lookback, Stack by; row 2 = Bar 1, Bar 2, Bar 1 color, Bar 2 color */}
        {reportType === 'multi_bar' && (
          <div className="flex-shrink-0 flex flex-col gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-content-primary whitespace-nowrap">Period:</label>
                <select
                  value={multiBarPeriod}
                  onChange={(e) => { setMultiBarPeriod(e.target.value as 'month' | 'week' | 'day'); if (!isLoadingReport) { setReportData([]); setError(null); } }}
                  className="w-32 px-3 py-2 border border-outline rounded-md text-sm bg-surface-elevated text-content-primary focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="month">Month</option>
                  <option value="week">Week</option>
                  <option value="day">Day</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-content-primary whitespace-nowrap">Lookback:</label>
                <select
                  value={multiBarMonths}
                  onChange={(e) => { setMultiBarMonths(Number(e.target.value)); if (!isLoadingReport) { setReportData([]); setError(null); } }}
                  className="w-28 px-3 py-2 border border-outline rounded-md text-sm bg-surface-elevated text-content-primary focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value={1}>1 month</option>
                  <option value={2}>2 months</option>
                  <option value={3}>3 months</option>
                  <option value={4}>4 months</option>
                  <option value={6}>6 months</option>
                  <option value={9}>9 months</option>
                  <option value={12}>12 months</option>
                </select>
              </div>
              <BuildReportStackBySelect
                value={multiBarStackBy}
                onChange={(v) => { setMultiBarStackBy(v); if (!isLoadingReport) { setReportData([]); setError(null); } }}
                filterableFields={filterableFields}
                placeholder="Don't stack"
              />
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-content-primary whitespace-nowrap">Bar 1:</label>
                <BuildReportColoredSelect
                  value={multiBarMetric1}
                  onChange={(v) => { setMultiBarMetric1(v); if (!isLoadingReport) { setReportData([]); setError(null); } }}
                  options={BUILD_REPORT_MULTI_BAR_METRICS}
                  color={multiBarBar1Color}
                  placeholder="Select metric..."
                  selectClassName="w-44 px-3 py-2 border border-outline rounded-md text-sm bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <BuildReportBarColorSelect
                label="Bar 1 color:"
                value={multiBarBar1Color}
                onChange={(v) => { setMultiBarBar1Color(v); if (!isLoadingReport) setReportData([]); }}
              />
              <div className="w-24 flex-shrink-0" aria-hidden="true" />
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-content-primary whitespace-nowrap">Bar 2:</label>
                <BuildReportColoredSelect
                  value={multiBarMetric2}
                  onChange={(v) => { setMultiBarMetric2(v); if (!isLoadingReport) { setReportData([]); setError(null); } }}
                  options={BUILD_REPORT_MULTI_BAR_METRICS}
                  color={multiBarBar2Color}
                  placeholder="Select metric..."
                  selectClassName="w-44 px-3 py-2 border border-outline rounded-md text-sm bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <BuildReportBarColorSelect
                label="Bar 2 color:"
                value={multiBarBar2Color}
                onChange={(v) => { setMultiBarBar2Color(v); if (!isLoadingReport) setReportData([]); }}
              />
            </div>
          </div>
        )}

        {/* Field Selector / Group By, Filter Selector, and Filter Values - Three Columns */}
        <div className="flex-shrink-0 flex gap-4">
          {/* Field Selector or Group By - 25% width */}
          <div className="w-1/4">
            {reportType === 'pie_chart' ? (
              <>
                <label className="block text-sm font-medium text-content-primary mb-2">
                  Group By (Select up to 3 fields)
                </label>
                <div className="border border-outline rounded-md bg-surface-elevated max-h-[196px] overflow-y-auto">
                  {filterableFields
                    .filter(f => f.filter_type === 'dropdown')
                    .length === 0 ? (
                    <div className="p-2 text-sm text-content-tertiary">No dropdown fields available</div>
                  ) : (
                    <div className="p-1">
                      {(() => {
                        // Sort: selected fields first (in current order), then unselected fields alphabetically
                        const dropdownFields = filterableFields.filter(f => f.filter_type === 'dropdown');
                        const sortedFields = sortFieldsSelectedFirst(dropdownFields, xAxisPie);
                        
                        return sortedFields.map(field => {
                          const isSelected = xAxisPie.includes(field.column_name);
                          return (
                            <label
                              key={field.column_name}
                              className={`flex items-center gap-2 p-1.5 hover:bg-surface-secondary rounded cursor-pointer ${
                                isSelected ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    if (xAxisPie.length >= 3) {
                                      setErrorModal('Maximum 3 Group By fields allowed');
                                      return;
                                    }
                                    setXAxisPie([...xAxisPie, field.column_name]);
                                    // Clear report data when Group By changes (unless loading a report)
                                    if (!isLoadingReport) {
                                      setReportData({});
                                      setError(null);
                                    }
                                  } else {
                                    setXAxisPie(xAxisPie.filter(f => f !== field.column_name));
                                    // Clear report data when Group By changes (unless loading a report)
                                    if (!isLoadingReport) {
                                      setReportData({});
                                      setError(null);
                                    }
                                  }
                                }}
                                className="w-4 h-4 text-brand focus:ring-brand rounded border-outline"
                              />
                              <span className="text-sm text-content-primary">{field.display_name}</span>
                            </label>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
                {xAxisPie.length > 0 && (
                  <div className="mt-1 text-xs text-content-tertiary">
                    {xAxisPie.length} of 3 fields selected
                  </div>
                )}
              </>
            ) : (
              <>
                <label className="block text-sm font-medium text-content-primary mb-2">
                  Select Fields to Display
                </label>
                <FieldSelector
                  fields={displayableFields as FieldSelectorReportField[]}
                  selectedFields={selectedFields}
                  onToggle={handleFieldToggle}
                  disabled={reportType === 'bar_chart' || reportType === 'multi_bar'}
                  showReorderButtons={true}
                  onMoveUp={moveFieldUp}
                  onMoveDown={moveFieldDown}
                />
              </>
            )}
          </div>

          {/* Filter Selector - 25% width */}
          <div className="w-1/4">
            <label className="block text-sm font-medium text-content-primary mb-2">
              Select Filters
            </label>
            <div className="border border-outline rounded-md bg-surface-elevated max-h-[196px] overflow-y-auto">
              {filterableFields.length === 0 ? (
                <div className="p-2 text-sm text-content-tertiary">No filterable fields available</div>
              ) : (
                <div className="p-1">
                  {sortFieldsSelectedFirst(filterableFields, selectedFilterFields).map((field) => (
                    <label
                      key={field.column_name}
                      className="flex items-center px-2 py-1 hover:bg-surface-secondary cursor-pointer rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFilterFields.includes(field.column_name)}
                        onChange={() => handleFilterFieldToggle(field.column_name)}
                        className="w-4 h-4 text-brand border-outline-strong rounded focus:ring-brand"
                      />
                      <span className="ml-2 text-sm text-content-secondary">{field.display_name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Filter Values - 50% width */}
          <FilterConfigPanel
            selectedFilterFields={selectedFilterFields}
            filters={filters as FilterConfigFilter[]}
            filterableFields={filterableFields as FilterConfigFilterableField[]}
            dropdownValues={dropdownValues}
            loadingDropdownValues={loadingDropdownValues}
            getFilterFieldInfo={getFilterFieldInfo}
            onFilterChange={handleFilterChange}
            onRemoveFilter={removeFilter}
            // Default filters: PI and Team/Group
            defaultFilters={{
              pi: {
                field: 'quarter_pi',
                displayName: `${getPITerminology()}:`,
                value: selectedPI,
                onChange: (value) => setSelectedPI(value || null),
                options: availablePIs.map(pi => ({ value: pi.pi_name, label: pi.pi_name })),
                loading: loadingPIs,
                allowAll: true
              },
              teamGroup: {
                field: 'team_name',
                displayName: 'Team/Group:',
                value: selectedTeamGroup,
                onChange: (value, type, name) => {
                  setSelectedTeamGroup(value);
                  setSelectedTeamGroupName(name || '');
                  setIsGroup(value ? type === 'group' : false);
                },
                teamGroupSelect: true
              }
            }}
          />
        </div>

        {/* Results */}
        <div className="flex-1 min-h-0">
          {loadingReport ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <div className="text-sm text-content-tertiary">Building report...</div>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="bg-danger-bg border border-danger-border rounded-lg p-4 text-sm text-danger-text max-w-md">
                {error}
              </div>
            </div>
          ) : (!loadingReport && reportData && (Array.isArray(reportData) ? reportData.length > 0 : Object.keys(reportData).length > 0)) ? (
            <GenericReportVisualization
              chartType={reportType as 'table' | 'bar_chart' | 'pie_chart' | 'multi_bar'}
              data={reportData}
              loading={false}
              error={null}
              tableColumns={tableColumns}
              xAxisField={reportType === 'bar_chart' ? xAxisBar : undefined}
              yAxisField={reportType === 'bar_chart' ? yAxis : undefined}
              filterableFields={filterableFields}
              isDark={isDark}
              jiraUrl={reportType === 'table' ? effectiveJiraUrl : undefined}
              onOpenAllInJira={reportType === 'table' ? handleOpenAllInJira : undefined}
              initialSortConfig={reportType === 'table' && defaultSortColumn ? { key: defaultSortColumn, direction: defaultSortDirection } : undefined}
              bar1Label={reportType === 'multi_bar' ? BUILD_REPORT_MULTI_BAR_METRICS.find(m => m.value === multiBarMetric1)?.label : undefined}
              bar2Label={reportType === 'multi_bar' ? BUILD_REPORT_MULTI_BAR_METRICS.find(m => m.value === multiBarMetric2)?.label : undefined}
              bar1Color={reportType === 'multi_bar' ? multiBarBar1Color : undefined}
              bar2Color={reportType === 'multi_bar' ? multiBarBar2Color : undefined}
              barColor={reportType === 'bar_chart' ? barChartBarColor : undefined}
            />
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-content-muted">No report data. Select fields and click "Preview Report" to generate a report.</div>
            </div>
          )}
        </div>
        </div>
      </div>
    </>
  );
}

