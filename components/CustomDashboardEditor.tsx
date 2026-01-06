'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@/contexts/UserContext';
import {
  getDashboard,
  updateDashboard,
} from '@/lib/api';
import DraggableResizableGrid from './DraggableResizableGrid';
import {
  LayoutConfig,
  type CustomDashboard,
  type DashboardWidget,
  type UpdateDashboardRequest,
  type DashboardLayoutConfig,
  type CustomDashboardLayoutRow,
} from '@/lib/config';
import WidgetSelectorModal from './WidgetSelectorModal';
import DashboardFiltersPanel from './DashboardFiltersPanel';
import WidgetFiltersPanel from './WidgetFiltersPanel';
import ReportPanel from './ReportPanel';
import InsightCardWidget from './InsightCardWidget';
import InsightTypeWidget from './InsightTypeWidget';
import ReportCard from './reporting/ReportCard';

interface CustomDashboardEditorProps {
  dashboardId: string;
  filters?: {
    selectedPI: string;
    selectedTeam: string;
    selectedTreeValue: string | null;
    selectedTreeLabel: string;
    selectedTreeType: 'team' | 'group';
  };
  onFiltersChange?: (filters: {
    selectedPI: string;
    selectedTeam: string;
    selectedTreeValue: string | null;
    selectedTreeLabel: string;
    selectedTreeType: 'team' | 'group';
  }) => void;
  onDashboardLoaded?: (dashboard: CustomDashboard) => void;
  onClose?: () => void;
  onSave?: () => void;
}

export default function CustomDashboardEditor({ 
  dashboardId, 
  filters: externalFilters,
  onFiltersChange,
  onDashboardLoaded,
  onClose, 
  onSave 
}: CustomDashboardEditorProps) {
  const { user } = useUser();
  const [dashboard, setDashboard] = useState<CustomDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isWidgetSelectorOpen, setIsWidgetSelectorOpen] = useState(false);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [dashboardLayoutConfig, setDashboardLayoutConfig] = useState<DashboardLayoutConfig>({
    layoutConfig: { rows: [] },
    pinnedFilters: {},
    reportFilters: {},
    topBarFilters: {},
  });
  const [newRowIds, setNewRowIds] = useState<Set<string>>(new Set());
  
  // Track if settings have been applied (like team/PI dashboards)
  const settingsAppliedRef = useRef(false);
  
  // Debounce timers for auto-saving filter changes
  const filterSaveTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const prevFiltersRef = useRef<{
    selectedPI: string;
    selectedTeam: string;
    selectedTreeValue: string | null;
    selectedTreeLabel: string;
    selectedTreeType: 'team' | 'group';
  }>({
    selectedPI: '',
    selectedTeam: '',
    selectedTreeValue: null,
    selectedTreeLabel: '',
    selectedTreeType: 'team',
  });
  
  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Listen for open modal event from top bar (like team/PI dashboards)
  useEffect(() => {
    const handleOpenModal = () => {
      setIsWidgetSelectorOpen(true);
    };
    
    window.addEventListener('open-add-reports-modal', handleOpenModal);
    return () => window.removeEventListener('open-add-reports-modal', handleOpenModal);
  }, []);


  // Dashboard form state
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardDescription, setDashboardDescription] = useState('');
  
  // Helper function to extract all widgets from layout config
  const getAllWidgets = useCallback((): DashboardWidget[] => {
    const widgets: DashboardWidget[] = [];
    dashboardLayoutConfig.layoutConfig.rows.forEach(row => {
      row.widgets.forEach(widget => {
        widgets.push(widget);
      });
    });
    return widgets;
  }, [dashboardLayoutConfig]);
  
  // Helper function to convert DashboardLayoutConfig to LayoutConfig for DraggableResizableGrid
  const getLayoutConfigForGrid = useCallback((): LayoutConfig => {
    return {
      rows: dashboardLayoutConfig.layoutConfig.rows.map(row => ({
        id: row.id,
        reportIds: row.widgets.map(w => w.id), // Use widget id for grid
      })),
    };
  }, [dashboardLayoutConfig]);
  
  // Calculate common filters from all widgets in the dashboard
  const commonFilters = React.useMemo(() => {
    const widgets = getAllWidgets();
    if (widgets.length === 0) return {};
    
    // Get all filter keys from all widgets
    const allFilterKeys = new Set<string>();
    widgets.forEach(widget => {
      const widgetFilters = widget.filters || dashboardLayoutConfig.reportFilters?.[widget.id] || {};
      Object.keys(widgetFilters).forEach(key => allFilterKeys.add(key));
    });
    
    // Find common filter values (filters that are the same across all widgets)
    const common: Record<string, any> = {};
    allFilterKeys.forEach(key => {
      const values = widgets.map(widget => {
        const widgetFilters = widget.filters || dashboardLayoutConfig.reportFilters?.[widget.id] || {};
        return widgetFilters[key];
      }).filter(v => v !== undefined && v !== null && v !== '');
      
      // If all widgets have the same value for this filter, it's common
      if (values.length === widgets.length && values.every(v => v === values[0])) {
        common[key] = values[0];
      }
    });
    
    return common;
  }, [dashboardLayoutConfig, getAllWidgets]);
  
  // Merge external filters with dashboard filters and common filters
  // External filters (from TopBar) take precedence over saved topBarFilters
  const effectiveFilters = React.useMemo(() => {
    const topBarFilters = dashboardLayoutConfig.topBarFilters || {};
    const base = { ...commonFilters, ...topBarFilters };
    if (externalFilters) {
      // External filters from TopBar take precedence - use them if they exist, otherwise fall back to saved filters
      // For selectedTreeType, always use externalFilters if it's provided (not undefined)
      // This ensures the current dropdown selection is used, not the saved default
      return {
        ...base,
        selectedPI: externalFilters.selectedPI !== undefined && externalFilters.selectedPI !== '' 
          ? externalFilters.selectedPI 
          : (topBarFilters.selectedPI || ''),
        selectedTeam: externalFilters.selectedTeam !== undefined && externalFilters.selectedTeam !== '' 
          ? externalFilters.selectedTeam 
          : (topBarFilters.selectedTeam || ''),
        selectedTreeValue: externalFilters.selectedTreeValue !== undefined && externalFilters.selectedTreeValue !== null 
          ? externalFilters.selectedTreeValue 
          : (topBarFilters.selectedTreeValue || null),
        selectedTreeLabel: externalFilters.selectedTreeLabel !== undefined && externalFilters.selectedTreeLabel !== '' 
          ? externalFilters.selectedTreeLabel 
          : (topBarFilters.selectedTreeLabel || ''),
        // Always use externalFilters.selectedTreeType if it's provided (not undefined)
        // This ensures the current dropdown selection is used, not the saved default
        selectedTreeType: externalFilters.selectedTreeType !== undefined 
          ? externalFilters.selectedTreeType 
          : (topBarFilters.selectedTreeType || 'team'),
      };
    }
    return base;
  }, [externalFilters, dashboardLayoutConfig, commonFilters]);
  
  // Convert effectiveFilters to format expected by ReportPanel (pi, team_name, isGroup, etc.)
  const reportPanelFilters = React.useMemo(() => {
    const filters: Record<string, any> = {};
    
    // Convert selectedPI to pi
    if (effectiveFilters.selectedPI) {
      filters.pi = effectiveFilters.selectedPI;
    }
    
    // Convert selectedTeam to team_name
    if (effectiveFilters.selectedTeam) {
      filters.team_name = effectiveFilters.selectedTeam;
    }
    
    // Convert selectedTreeType to isGroup
    if (effectiveFilters.selectedTreeType) {
      filters.isGroup = effectiveFilters.selectedTreeType === 'group';
    }
    
    // Include selectedTreeValue and selectedTreeLabel for InsightTypeWidget
    if (effectiveFilters.selectedTreeValue) {
      filters.selectedTreeValue = effectiveFilters.selectedTreeValue;
    }
    if (effectiveFilters.selectedTreeLabel) {
      filters.selectedTreeLabel = effectiveFilters.selectedTreeLabel;
    }
    
    // Add any other filters from effectiveFilters
    // Type assertion needed because effectiveFilters might have additional properties
    const effectiveFiltersAny = effectiveFilters as Record<string, any>;
    Object.keys(effectiveFiltersAny).forEach(key => {
      if (!['selectedPI', 'selectedTeam', 'selectedTreeValue', 'selectedTreeLabel', 'selectedTreeType'].includes(key)) {
        filters[key] = effectiveFiltersAny[key];
      }
    });
    
    return filters;
  }, [effectiveFilters]);

  // Listen for dashboard data collection request (for AI chat button)
  useEffect(() => {
    const handleCollectDashboardData = () => {
      console.log('[CustomDashboardEditor] Dashboard data collection requested');
      
      // Convert widgets to reportIds format for layoutConfig
      const layoutConfig = {
        rows: dashboardLayoutConfig.layoutConfig.rows.map(row => ({
          id: row.id,
          reportIds: row.widgets
            .filter(widget => widget.type === 'report')
            .map(widget => widget.widget_id),
        })).filter(row => row.reportIds.length > 0), // Only include rows with reports
      };
      
      // Merge widget filters with reportPanelFilters for each widget
      const mergedReportFilters: Record<string, Record<string, any>> = {};
      
      // Get all report widgets
      const allWidgets = dashboardLayoutConfig.layoutConfig.rows.flatMap(row => row.widgets || []);
      const reportWidgets = allWidgets.filter(widget => widget.type === 'report');
      
      reportWidgets.forEach(widget => {
        // Use widget.id to get saved filters (widget instance ID)
        const savedWidgetFilters = dashboardLayoutConfig.reportFilters?.[widget.id] || widget.filters || {};
        const savedPinnedFilters = dashboardLayoutConfig.pinnedFilters?.[widget.id] || [];
        
        // Merge: unpinned filters use reportPanelFilters (topbar) values, pinned filters use saved widget values
        const merged: Record<string, any> = { ...savedWidgetFilters };
        Object.entries(reportPanelFilters).forEach(([key, value]) => {
          if (!savedPinnedFilters.includes(key)) {
            merged[key] = value;
          }
        });
        
        // Use widget.widget_id (report ID) as the key for AI chat, not widget.id (widget instance ID)
        mergedReportFilters[widget.widget_id] = merged;
      });
      
      const data = {
        layoutConfig,
        topBarFilters: dashboardLayoutConfig.topBarFilters || {
          selectedPI: externalFilters?.selectedPI || '',
          selectedTeam: externalFilters?.selectedTeam || '',
          selectedTreeValue: externalFilters?.selectedTreeValue || null,
          selectedTreeLabel: externalFilters?.selectedTreeLabel || '',
          selectedTreeType: externalFilters?.selectedTreeType || 'team',
        },
        reportFilters: mergedReportFilters,
        pinnedFilters: dashboardLayoutConfig.pinnedFilters || {},
      };
      
      console.log('[CustomDashboardEditor] Collected dashboard data:', data);
      console.log('[CustomDashboardEditor] Merged report filters (unpinned use topbar):', mergedReportFilters);
      window.dispatchEvent(new CustomEvent('dashboard-data-collected', { detail: data }));
    };
    
    window.addEventListener('collect-dashboard-data', handleCollectDashboardData as EventListener);
    return () => {
      window.removeEventListener('collect-dashboard-data', handleCollectDashboardData as EventListener);
    };
  }, [dashboardLayoutConfig, externalFilters, reportPanelFilters]);

  useEffect(() => {
    if (dashboardId && (user?.id || user?.user_id)) {
      // Reset settings applied flag when dashboard changes
      settingsAppliedRef.current = false;
      loadDashboard();
    }
  }, [dashboardId, user]);
  
  // Apply saved topBarFilters when dashboard loads (like team/PI dashboards)
  // This ensures the topbar shows the correct filters, especially for newly created dashboards
  // Only apply once when dashboard loads to prevent feedback loops
  // Note: app/page.tsx will handle setting filters from saved data with proper team lookup,
  // so we only apply here if filters haven't been set yet
  useEffect(() => {
    if (!dashboard || !onFiltersChange || settingsAppliedRef.current) return;
    
    const topBarFilters = dashboardLayoutConfig.topBarFilters || {};
    if (topBarFilters && Object.keys(topBarFilters).length > 0) {
      // Check if external filters already match the saved filters (app/page.tsx may have set them)
      const currentFilters = externalFilters || {
        selectedPI: '',
        selectedTeam: '',
        selectedTreeValue: null,
        selectedTreeLabel: '',
        selectedTreeType: 'team',
      };
      
      // Check if filters are already set correctly by app/page.tsx
      // We should apply if either team or PI is different from what's saved
      const savedTeam = topBarFilters.selectedTeam || '';
      const savedPI = topBarFilters.selectedPI || '';
      const currentTeam = currentFilters.selectedTeam || '';
      const currentPI = currentFilters.selectedPI || '';
      
      const teamMatches = !savedTeam || currentTeam === savedTeam;
      const piMatches = !savedPI || currentPI === savedPI;
      
      // If both team and PI match (or are not set in saved filters), don't override
      if (teamMatches && piMatches) {
        // Filters already set by app/page.tsx, just mark as applied
        settingsAppliedRef.current = true;
        prevFiltersRef.current = {
          selectedPI: currentPI,
          selectedTeam: currentTeam,
          selectedTreeValue: currentFilters.selectedTreeValue || null,
          selectedTreeLabel: currentFilters.selectedTreeLabel || '',
          selectedTreeType: currentFilters.selectedTreeType || 'team',
        };
        return;
      }
      
      // If PI doesn't match, we need to apply it (even if team matches)
      const needsPIUpdate = savedPI && currentPI !== savedPI;
      const needsTeamUpdate = savedTeam && (
        currentTeam !== savedTeam ||
        currentFilters.selectedTreeValue !== topBarFilters.selectedTreeValue ||
        currentFilters.selectedTreeType !== topBarFilters.selectedTreeType
      );
      
      if (!needsPIUpdate && !needsTeamUpdate) {
        // Nothing to update
        settingsAppliedRef.current = true;
        prevFiltersRef.current = {
          selectedPI: currentPI,
          selectedTeam: currentTeam,
          selectedTreeValue: currentFilters.selectedTreeValue || null,
          selectedTreeLabel: currentFilters.selectedTreeLabel || '',
          selectedTreeType: currentFilters.selectedTreeType || 'team',
        };
        return;
      }
      
      // Filters not set yet, apply saved filters (fallback if app/page.tsx didn't set them)
      const filtersToApply = {
        selectedPI: topBarFilters.selectedPI || '',
        selectedTeam: topBarFilters.selectedTeam || '',
        selectedTreeValue: topBarFilters.selectedTreeValue || null,
        selectedTreeLabel: topBarFilters.selectedTreeLabel || topBarFilters.selectedTeam || '',
        selectedTreeType: topBarFilters.selectedTreeType || 'team',
      };
      
      const isDifferent = 
        currentFilters.selectedPI !== filtersToApply.selectedPI ||
        currentFilters.selectedTeam !== filtersToApply.selectedTeam ||
        currentFilters.selectedTreeValue !== filtersToApply.selectedTreeValue ||
        currentFilters.selectedTreeLabel !== filtersToApply.selectedTreeLabel ||
        currentFilters.selectedTreeType !== filtersToApply.selectedTreeType;
      
      if (isDifferent) {
        console.log('[CustomDashboard] Applying saved topBarFilters (fallback):', filtersToApply);
        onFiltersChange(filtersToApply);
        settingsAppliedRef.current = true;
        prevFiltersRef.current = filtersToApply;
      } else {
        // Filters already match, just mark as applied
        settingsAppliedRef.current = true;
        prevFiltersRef.current = filtersToApply;
      }
    } else if (dashboard) {
      // No saved filters, mark as applied so we can track changes
      settingsAppliedRef.current = true;
    }
  }, [dashboard, dashboardLayoutConfig.topBarFilters, onFiltersChange, externalFilters]);
  
  // Track top bar filters changes (only after settings have been applied and only if actually different from previous)
  // This follows the same pattern as TeamDashboard and PIDashboard
  useEffect(() => {
    if (!settingsAppliedRef.current || !externalFilters || !dashboard) return;
    
    const newFilters = {
      selectedPI: externalFilters.selectedPI,
      selectedTeam: externalFilters.selectedTeam,
      selectedTreeValue: externalFilters.selectedTreeValue,
      selectedTreeLabel: externalFilters.selectedTreeLabel,
      selectedTreeType: externalFilters.selectedTreeType,
    };
    
    const prev = prevFiltersRef.current;
    const isDifferent = 
      prev.selectedPI !== newFilters.selectedPI ||
      prev.selectedTeam !== newFilters.selectedTeam ||
      prev.selectedTreeValue !== newFilters.selectedTreeValue ||
      prev.selectedTreeLabel !== newFilters.selectedTreeLabel ||
      prev.selectedTreeType !== newFilters.selectedTreeType;
    
    if (isDifferent) {
      console.log('[CustomDashboard] Top bar filters changed, updating state');
      
      // Update local state and save in one go
      setDashboardLayoutConfig(prevConfig => {
        const updatedConfig = {
          ...prevConfig,
          topBarFilters: newFilters,
        };
        
        // Update previous ref
        prevFiltersRef.current = newFilters;
        
        // Auto-save the filter changes to the dashboard (debounced)
        if (user) {
          const userId = (user?.id || user?.user_id) as string;
          setTimeout(() => {
            updateDashboard(userId, dashboardId, {
              layout_config: updatedConfig,
            }).catch(err => {
              console.error('[CustomDashboard] Failed to save filter changes:', err);
            });
          }, 1000);
        }
        
        return updatedConfig;
      });
    }
  }, [externalFilters, dashboard, user, dashboardId]);
  
  // Listen for save event from topbar
  useEffect(() => {
    const handleSave = () => {
      handleSaveDashboard();
    };
    
    window.addEventListener('save-custom-dashboard', handleSave);
    return () => window.removeEventListener('save-custom-dashboard', handleSave);
  }, [dashboard, dashboardName, dashboardDescription, dashboardLayoutConfig, user, dashboardId]);

  const loadDashboard = async () => {
    if (!user?.id && !user?.user_id) return;
    
    setLoading(true);
    setError(null);
    try {
      const userId = (user?.id || user?.user_id) as string;
      const dashboardData = await getDashboard(userId, dashboardId);
      
      setDashboard(dashboardData);
      setDashboardName(dashboardData.name);
      setDashboardDescription(dashboardData.description || '');
      
      // Initialize layout config from dashboard or create default
      if (dashboardData.layout_config && typeof dashboardData.layout_config === 'object') {
        // Check if it's the new format (DashboardLayoutConfig)
        if ('layoutConfig' in dashboardData.layout_config) {
          setDashboardLayoutConfig(dashboardData.layout_config as DashboardLayoutConfig);
        } else {
          // Legacy format - migrate it
          const legacyLayout = dashboardData.layout_config as any;
          const migratedConfig: DashboardLayoutConfig = {
            layoutConfig: {
              rows: (legacyLayout.rows || []).map((row: any) => ({
                id: row.id,
                widgets: (row.reportIds || []).map((id: string, idx: number) => ({
                  id: `widget-${Date.now()}-${idx}`,
                  type: 'report' as const,
                  widget_id: id,
                  filters: {},
                })),
              })),
            },
            pinnedFilters: {},
            reportFilters: {},
            topBarFilters: {}, // Legacy dashboards didn't have topBarFilters, start with empty
          };
          setDashboardLayoutConfig(migratedConfig);
        }
      } else {
        // No layout, create default structure
        setDashboardLayoutConfig({
          layoutConfig: { rows: [{ id: `row-${Date.now()}`, widgets: [] }] },
          pinnedFilters: {},
          reportFilters: {},
          topBarFilters: {},
        });
      }
      
      // Notify parent of loaded dashboard
      if (onDashboardLoaded) {
        onDashboardLoaded(dashboardData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDashboard = async () => {
    if (!dashboard || !user?.id && !user?.user_id) return;
    
    setIsSaving(true);
    setError(null);
    try {
      const userId = (user?.id || user?.user_id) as string;
      const updateData: UpdateDashboardRequest = {
        name: dashboardName,
        description: dashboardDescription || undefined,
        layout_config: dashboardLayoutConfig,
      };
      
      await updateDashboard(userId, dashboardId, updateData);
      if (onSave) {
        onSave();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save dashboard');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle adding multiple widgets (like team/PI dashboards - 2 per row)
  // Now supports adding the same item multiple times
  const handleUpdateWidgets = async (widgetIds: Array<{ type: 'report' | 'insight_card' | 'insight_type'; id: string; filters?: Record<string, any> }>) => {
    console.log('[CustomDashboardEditor] handleUpdateWidgets called with:', {
      widgetCount: widgetIds.length,
      widgets: widgetIds,
      insightTypeWidgets: widgetIds.filter(w => w.type === 'insight_type'),
    });
    
    if (!dashboard) {
      setError('Dashboard not loaded');
      return;
    }
    
    try {
      setError(null);
      const currentWidgets = getAllWidgets();
      
      // Count how many of each widget_id we currently have
      const currentWidgetCounts = new Map<string, number>();
      currentWidgets.forEach(w => {
        currentWidgetCounts.set(w.widget_id, (currentWidgetCounts.get(w.widget_id) || 0) + 1);
      });
      
      // Count how many of each widget_id are requested
      const requestedWidgetCounts = new Map<string, number>();
      widgetIds.forEach(w => {
        requestedWidgetCounts.set(w.id, (requestedWidgetCounts.get(w.id) || 0) + 1);
      });
      
      // Calculate widgets to add (all requested widgets, allowing duplicates)
      // For insight_type, only allow one per type
      const widgetsToAdd: Array<{ type: 'report' | 'insight_card' | 'insight_type'; id: string; filters?: Record<string, any> }> = [];
      const insightTypeIds = new Set<string>(); // Track which insight types are already on dashboard
      
      currentWidgets.forEach(w => {
        if (w.type === 'insight_type') {
          insightTypeIds.add(w.widget_id);
        }
      });
      
      requestedWidgetCounts.forEach((count, widgetId) => {
        const widgetInfo = widgetIds.find(w => w.id === widgetId);
        const widgetType = widgetInfo?.type || 'report';
        
        // For insight_type, only add if not already present (one per type)
        if (widgetType === 'insight_type') {
          if (!insightTypeIds.has(widgetId)) {
            widgetsToAdd.push({
              type: widgetType,
              id: widgetId,
              filters: widgetInfo?.filters || {},
            });
            insightTypeIds.add(widgetId);
          }
        } else {
          // For reports and insight_cards, allow multiple
          const currentCount = currentWidgetCounts.get(widgetId) || 0;
          const toAdd = count - currentCount;
          for (let i = 0; i < toAdd; i++) {
            widgetsToAdd.push({ type: widgetType, id: widgetId });
          }
        }
      });
      
      // Calculate widgets to remove (if count decreased)
      const widgetsToRemove: DashboardWidget[] = [];
      currentWidgetCounts.forEach((count, widgetId) => {
        const requestedCount = requestedWidgetCounts.get(widgetId) || 0;
        const toRemove = count - requestedCount;
        if (toRemove > 0) {
          // Get the widgets to remove (remove the last ones)
          const widgetsWithThisId = currentWidgets.filter(w => w.widget_id === widgetId);
          widgetsToRemove.push(...widgetsWithThisId.slice(-toRemove));
        }
      });
      
      // Create new layout config
      const newLayoutConfig: DashboardLayoutConfig = {
        ...dashboardLayoutConfig,
        layoutConfig: {
          rows: dashboardLayoutConfig.layoutConfig.rows.map(row => ({
            ...row,
            widgets: row.widgets.filter(w => !widgetsToRemove.some(wr => wr.id === w.id)),
          })).filter(row => row.widgets.length > 0),
        },
      };
      
      // Add new widgets - 2 per row (like team/PI dashboards)
      if (widgetsToAdd.length > 0) {
        // Track which widgets have been added to which rows
        const rowWidgetCounts = new Map<string, number>();
        newLayoutConfig.layoutConfig.rows.forEach(row => {
          rowWidgetCounts.set(row.id, row.widgets.length);
        });
        
        for (let i = 0; i < widgetsToAdd.length; i++) {
          const widget = widgetsToAdd[i];
          
          // Determine which row to add to (2 per row)
          let targetRow: CustomDashboardLayoutRow | undefined;
          let columnIndex = 0;
          
          // Find a row with space (less than 2 widgets) or create a new one
          if (newLayoutConfig.layoutConfig.rows.length === 0) {
            // No rows exist, create first row
            targetRow = { id: `row-${Date.now()}`, widgets: [] };
            newLayoutConfig.layoutConfig.rows.push(targetRow);
            rowWidgetCounts.set(targetRow.id, 0);
          } else {
            // Find the first row with space (less than 2 widgets)
            for (let j = 0; j < newLayoutConfig.layoutConfig.rows.length; j++) {
              const row = newLayoutConfig.layoutConfig.rows[j];
              const currentCount = rowWidgetCounts.get(row.id) || 0;
              
              if (currentCount < 2) {
                targetRow = row;
                columnIndex = currentCount;
                break;
              }
            }
            
            // If no row has space, create a new one
            if (!targetRow) {
              targetRow = { id: `row-${Date.now()}-${i}`, widgets: [] };
              newLayoutConfig.layoutConfig.rows.push(targetRow);
              rowWidgetCounts.set(targetRow.id, 0);
              columnIndex = 0;
            }
          }
          
          // Create new widget with unique ID
          const newWidget: DashboardWidget = {
            id: `widget-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
            type: widget.type,
            widget_id: widget.id,
            filters: widget.filters || {}, // Include filters for insight_type widgets
          };
          
          console.log('[CustomDashboardEditor] Adding widget:', {
            widgetType: widget.type,
            widgetId: widget.id,
            newWidgetId: newWidget.id,
            filters: widget.filters,
          });
          
          // Add widget to the target row
          if (columnIndex < targetRow.widgets.length) {
            targetRow.widgets.splice(columnIndex, 0, newWidget);
          } else {
            targetRow.widgets.push(newWidget);
          }
          
          // Update the count for this row
          rowWidgetCounts.set(targetRow.id, (rowWidgetCounts.get(targetRow.id) || 0) + 1);
        }
      }
      
      // Ensure at least one row exists
      if (newLayoutConfig.layoutConfig.rows.length === 0) {
        newLayoutConfig.layoutConfig.rows = [{ id: `row-${Date.now()}`, widgets: [] }];
      }
      
      setDashboardLayoutConfig(newLayoutConfig);
      
      // Update dashboard layout
      if (user) {
        const updateData: UpdateDashboardRequest = {
          layout_config: newLayoutConfig,
        };
        await updateDashboard((user?.id || user?.user_id) as string, dashboardId, updateData);
      }
      
      // Close modal after successful update
      setIsWidgetSelectorOpen(false);
    } catch (err: any) {
      console.error('Failed to update widgets:', err);
      setError(err.message || 'Failed to update widgets');
      // Don't close modal on error so user can retry
    }
  };

  const handleRemoveWidget = async (widgetId: string) => {
    try {
      // Find the widget to get its row_id
      const currentWidgets = getAllWidgets();
      const widgetToRemove = currentWidgets.find(w => w.id === widgetId);
      
      // Update layout config - remove widget by its ID
      const updatedLayoutConfig: DashboardLayoutConfig = {
        ...dashboardLayoutConfig,
        layoutConfig: {
          rows: dashboardLayoutConfig.layoutConfig.rows.map(row => ({
            ...row,
            widgets: row.widgets.filter(w => w.id !== widgetId),
          })).filter(row => {
            // Remove empty rows, but keep at least one row if all rows would be removed
            return row.widgets.length > 0;
          }),
        },
      };
      
      // Ensure at least one row exists if all rows were removed
      if (updatedLayoutConfig.layoutConfig.rows.length === 0) {
        updatedLayoutConfig.layoutConfig.rows = [{ id: `row-${Date.now()}`, widgets: [] }];
      }
      
      // Remove widget filters from reportFilters if they exist
      if (updatedLayoutConfig.reportFilters && widgetId in updatedLayoutConfig.reportFilters) {
        const newReportFilters = { ...updatedLayoutConfig.reportFilters };
        delete newReportFilters[widgetId];
        updatedLayoutConfig.reportFilters = newReportFilters;
      }
      
      // Remove widget from pinnedFilters if it exists
      if (updatedLayoutConfig.pinnedFilters && widgetId in updatedLayoutConfig.pinnedFilters) {
        const newPinnedFilters = { ...updatedLayoutConfig.pinnedFilters };
        delete newPinnedFilters[widgetId];
        updatedLayoutConfig.pinnedFilters = newPinnedFilters;
      }
      
      setDashboardLayoutConfig(updatedLayoutConfig);
      
      // Remove from newRowIds if it was a new row
      setNewRowIds(prev => {
        const next = new Set(prev);
        if (widgetToRemove) {
          // Find the row that contained this widget
          const row = dashboardLayoutConfig.layoutConfig.rows.find(r => 
            r.widgets.some(w => w.id === widgetId)
          );
          if (row) {
            // Check if the row is now empty
            const updatedRow = updatedLayoutConfig.layoutConfig.rows.find(r => r.id === row.id);
            if (!updatedRow || updatedRow.widgets.length === 0) {
              next.delete(row.id);
            }
          }
        }
        return next;
      });
      
      // Update dashboard layout config in database
      if (dashboard && user) {
        const updateData: UpdateDashboardRequest = {
          layout_config: updatedLayoutConfig,
        };
        updateDashboard((user?.id || user?.user_id) as string, dashboardId, updateData).catch(err => {
          setError(err.message || 'Failed to update layout after widget removal');
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove widget');
    }
  };

  const handleLayoutChange = useCallback((layout: LayoutConfig) => {
    if (!dashboard) return;
    
    // Convert LayoutConfig (from grid) to DashboardLayoutConfig
    const currentWidgets = getAllWidgets();
    const widgetMap = new Map<string, DashboardWidget>();
    currentWidgets.forEach(w => widgetMap.set(w.id, w));
    
    // Build new DashboardLayoutConfig from the grid layout
    const newLayoutConfig: DashboardLayoutConfig = {
      ...dashboardLayoutConfig,
      layoutConfig: {
        rows: layout.rows.map(row => ({
          id: row.id,
          widgets: row.reportIds
            .map(widgetId => widgetMap.get(widgetId))
            .filter((w): w is DashboardWidget => w !== undefined),
        })).filter(row => row.widgets.length > 0),
      },
    };
    
    // Ensure at least one row exists
    if (newLayoutConfig.layoutConfig.rows.length === 0) {
      newLayoutConfig.layoutConfig.rows = [{ id: `row-${Date.now()}`, widgets: [] }];
    }
    
    // Update local state immediately
    setDashboardLayoutConfig(newLayoutConfig);
    
    // Remove rows from newRowIds if they now have widgets or if they were removed
    setNewRowIds(prev => {
      const next = new Set(prev);
      // Remove rows that no longer exist or have widgets
      prev.forEach(rowId => {
        const row = newLayoutConfig.layoutConfig.rows.find(r => r.id === rowId);
        if (!row || row.widgets.length > 0) {
          next.delete(rowId);
        }
      });
      return next;
    });
    
    // Update dashboard layout in database
    const updateData: UpdateDashboardRequest = {
      layout_config: newLayoutConfig,
    };
    
    updateDashboard((user?.id || user?.user_id) as string, dashboardId, updateData).catch(err => {
      setError(err.message || 'Failed to update layout');
      // On error, reload dashboard to get correct state
      loadDashboard().catch(reloadErr => {
        console.error('Failed to reload dashboard:', reloadErr);
      });
    });
  }, [dashboard, dashboardId, user, dashboardLayoutConfig, getAllWidgets, loadDashboard]);

  const handleUpdateWidgetFilters = (widgetId: string, filters: Record<string, any>) => {
    const currentWidgets = getAllWidgets();
    const widget = currentWidgets.find(w => w.id === widgetId);
    if (!widget) return;
    
    // Update reportFilters in layout_config
    const updatedLayoutConfig: DashboardLayoutConfig = {
      ...dashboardLayoutConfig,
      reportFilters: {
        ...dashboardLayoutConfig.reportFilters,
        [widgetId]: filters,
      },
    };
    
    setDashboardLayoutConfig(updatedLayoutConfig);
    setEditingWidgetId(null);
    
    // Clear existing timer for this widget
    if (filterSaveTimersRef.current[widgetId]) {
      clearTimeout(filterSaveTimersRef.current[widgetId]);
    }
    
    // Debounced auto-save (same pattern as top bar filters)
    if (user) {
      const userId = (user?.id || user?.user_id) as string;
      filterSaveTimersRef.current[widgetId] = setTimeout(() => {
        updateDashboard(userId, dashboardId, {
          layout_config: updatedLayoutConfig,
        }).catch(err => {
          console.error(`[CustomDashboard] Failed to save widget ${widgetId} filter changes:`, err);
        });
        delete filterSaveTimersRef.current[widgetId];
      }, 1000);
    }
  };

  // Convert DashboardLayoutConfig to LayoutConfig for DraggableResizableGrid
  const mergedLayoutConfig: LayoutConfig = React.useMemo(() => {
    return getLayoutConfigForGrid();
  }, [getLayoutConfigForGrid]);


  const renderWidget = (widgetId: string) => {
    // widgetId is the widget's unique ID in the layout
    const currentWidgets = getAllWidgets();
    const widget = currentWidgets.find(w => w.id === widgetId);
    if (!widget) return null;

    // Use the global reportPanelFilters which already includes PI, team_name, and isGroup
    // This ensures all reports get the same global filters (PI, team, etc.) from the TopBar

    // Get widget-specific filters from reportFilters or widget.filters
    const widgetFilters = {
      ...(dashboardLayoutConfig.reportFilters?.[widget.id] || widget.filters || {}),
    };

    if (widget.type === 'report') {
      // Get pinned filters for this widget
      const widgetPinnedFilters = dashboardLayoutConfig.pinnedFilters?.[widget.id] || [];
      
      return (
        <div key={widget.id} className={`h-full ${isMobile ? '' : 'mx-2'}`}>
          <ReportPanel
            reportId={widget.widget_id}
            initialFilters={widgetFilters}
            initialPinnedFilters={widgetPinnedFilters}
            controlledFilters={reportPanelFilters} // Pass global filters as controlled filters
            enabled={true}
            componentProps={{
              onAIChat: () => {
                console.log('[CustomDashboardEditor] Opening AI chat for report:', widget.widget_id);
                
                // Get current dashboard data - match TeamDashboard format exactly
                // Use saved topBarFilters from dashboardLayoutConfig (like TeamDashboard uses dashboardSettings.currentState.topBarFilters)
                const topBarFilters = dashboardLayoutConfig.topBarFilters || {};
                
                // Get saved widget filters and pinned filters
                const savedWidgetFilters = widgetFilters || {};
                const savedPinnedFilters = widgetPinnedFilters || [];
                
                // Merge widget filters with reportPanelFilters (current topbar values)
                // For unpinned filters, use reportPanelFilters (topbar) values
                // For pinned filters, use saved widget filter values
                const mergedReportFilters: Record<string, any> = { ...savedWidgetFilters };
                Object.entries(reportPanelFilters).forEach(([key, value]) => {
                  // If this filter is NOT pinned, use the current topbar value
                  if (!savedPinnedFilters.includes(key)) {
                    mergedReportFilters[key] = value;
                  }
                  // If it IS pinned, keep the saved widget filter value (already in mergedReportFilters)
                });
                
                const data = {
                  layoutConfig: {
                    rows: [{
                      id: 'single-report',
                      reportIds: [widget.widget_id]
                    }]
                  },
                  topBarFilters: topBarFilters,
                  reportFilters: {
                    [widget.widget_id]: mergedReportFilters
                  },
                  pinnedFilters: {
                    [widget.widget_id]: savedPinnedFilters
                  },
                };
                
                console.log('[CustomDashboardEditor] Dispatching report AI chat data:', data);
                console.log('[CustomDashboardEditor] Merged report filters (unpinned use topbar):', mergedReportFilters);
                
                // Dispatch event to open AI chat with this specific report's data
                window.dispatchEvent(new CustomEvent('open-report-ai-chat', { detail: data }));
              },
              onClose: () => handleRemoveWidget(widget.id),
            }}
            onFiltersChange={(filters) => handleUpdateWidgetFilters(widget.id, filters)}
            onPinnedFiltersChange={(pinnedKeys) => {
              const updatedLayoutConfig: DashboardLayoutConfig = {
                ...dashboardLayoutConfig,
                pinnedFilters: {
                  ...dashboardLayoutConfig.pinnedFilters,
                  [widget.id]: pinnedKeys,
                },
              };
              setDashboardLayoutConfig(updatedLayoutConfig);
              
              // Debounced auto-save for pinned filters
              if (user) {
                const userId = (user?.id || user?.user_id) as string;
                const timerKey = `pinned-${widget.id}`;
                if (filterSaveTimersRef.current[timerKey]) {
                  clearTimeout(filterSaveTimersRef.current[timerKey]);
                }
                filterSaveTimersRef.current[timerKey] = setTimeout(() => {
                  updateDashboard(userId, dashboardId, {
                    layout_config: updatedLayoutConfig,
                  }).catch(err => {
                    console.error(`[CustomDashboard] Failed to save pinned filters for widget ${widget.id}:`, err);
                  });
                  delete filterSaveTimersRef.current[timerKey];
                }, 1000);
              }
            }}
          />
        </div>
      );
    } else if (widget.type === 'insight_card') {
      return (
        <div key={widget.id} className={`h-full ${isMobile ? '' : 'mx-2'}`}>
          <InsightCardWidget
            cardId={widget.widget_id}
            filters={{ ...reportPanelFilters, ...widgetFilters }} // Merge global and widget-specific filters for InsightCardWidget
            onClose={() => handleRemoveWidget(widget.id)}
          />
        </div>
      );
    } else if (widget.type === 'insight_type') {
      // Get insight type name from widget filters or fetch it
      // For now, we'll pass the widget_id as insightTypeId and let InsightTypeWidget fetch the name
      console.log('[CustomDashboardEditor] Rendering InsightTypeWidget:', {
        widgetId: widget.id,
        insightTypeId: widget.widget_id,
        widgetFilters,
        reportPanelFilters,
      });
      
      // Get pinned filters for this widget
      const widgetPinnedFilters = dashboardLayoutConfig.pinnedFilters?.[widget.id] || [];
      
      return (
        <div key={widget.id} className="h-full">
          <InsightTypeWidget
            insightTypeId={widget.widget_id}
            filters={widgetFilters} // Widget-specific filters (PI, team_name, group_name)
            globalFilters={reportPanelFilters} // Global dashboard filters (acts as controlledFilters)
            initialPinnedFilters={widgetPinnedFilters} // Saved pinned filter keys
            onClose={() => handleRemoveWidget(widget.id)}
            onFiltersChange={(filters) => handleUpdateWidgetFilters(widget.id, filters)}
            onPinnedFiltersChange={(pinnedKeys) => {
              const updatedLayoutConfig: DashboardLayoutConfig = {
                ...dashboardLayoutConfig,
                pinnedFilters: {
                  ...dashboardLayoutConfig.pinnedFilters,
                  [widget.id]: pinnedKeys,
                },
              };
              setDashboardLayoutConfig(updatedLayoutConfig);
              
              // Debounced auto-save for pinned filters
              if (user) {
                const userId = (user?.id || user?.user_id) as string;
                const timerKey = `pinned-${widget.id}`;
                if (filterSaveTimersRef.current[timerKey]) {
                  clearTimeout(filterSaveTimersRef.current[timerKey]);
                }
                filterSaveTimersRef.current[timerKey] = setTimeout(() => {
                  updateDashboard(userId, dashboardId, {
                    layout_config: updatedLayoutConfig,
                  }).catch(err => {
                    console.error(`[CustomDashboard] Failed to save pinned filters for widget ${widget.id}:`, err);
                  });
                  delete filterSaveTimersRef.current[timerKey];
                }, 1000);
              }
            }}
            widgetId={widget.id}
          />
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <div className="text-sm text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-600">Dashboard not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Error message */}
      {error && (
        <div className="flex-shrink-0 p-2 bg-red-50 border-b border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}


      {/* Content Area */}
      <div className={`flex-1 overflow-auto ${isMobile ? 'p-2' : 'p-4'}`}>
        {mergedLayoutConfig.rows.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No widgets yet</h3>
            <p className="text-sm text-gray-600 mb-4">Click "Manage Dashboard" in the topbar to add widgets</p>
          </div>
        ) : isMobile ? (
          // Mobile: render as single column (same as TeamDashboard)
          <div className="space-y-4">
            {dashboardLayoutConfig.layoutConfig.rows.map((row) =>
              row.widgets.map((widget) => (
                <div key={widget.id}>
                  {renderWidget(widget.id)}
                </div>
              ))
            )}
          </div>
        ) : (
          // Desktop: use draggable and resizable grid
          <DraggableResizableGrid
            layout={mergedLayoutConfig}
            onLayoutChange={handleLayoutChange}
            renderReport={renderWidget}
            onRemoveReport={(widgetId) => {
              // widgetId is the widget's unique ID
              handleRemoveWidget(widgetId);
            }}
            defaultRowHeight={500}
            minRowHeight={500}
            emptyRowIds={Array.from(newRowIds)}
          />
        )}
      </div>

      {/* Widget Selector Modal */}
      <WidgetSelectorModal
        isOpen={isWidgetSelectorOpen}
        onClose={() => setIsWidgetSelectorOpen(false)}
        onUpdateWidgets={handleUpdateWidgets}
        currentWidgetIds={getAllWidgets().map(w => w.widget_id)} // Pass all widget_ids (can have duplicates)
        currentWidgets={getAllWidgets().map(w => ({ 
          widget_id: w.widget_id, 
          widget_type: w.type,
          filters: w.filters, // Include filters for insight_type widgets
        }))} // Pass widget type info
      />

      {/* Widget Filters Panel */}
      {editingWidgetId && (() => {
        const currentWidgets = getAllWidgets();
        const widget = currentWidgets.find(w => w.id === editingWidgetId);
        if (!widget) return null;
        
        // Convert widget to format expected by WidgetFiltersPanel
        const widgetForPanel = {
          id: widget.id,
          widget_id: widget.widget_id,
          widget_type: widget.type,
          widget_config: {
            filters: dashboardLayoutConfig.reportFilters?.[widget.id] || widget.filters || {},
          },
        };
        
        return (
          <WidgetFiltersPanel
            widget={widgetForPanel as any}
            dashboardFilters={dashboardLayoutConfig.topBarFilters || {}}
            onFiltersChange={(filters) => handleUpdateWidgetFilters(editingWidgetId, filters)}
            onClose={() => setEditingWidgetId(null)}
          />
        );
      })()}
    </div>
  );
}

