'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ApiService } from '@/lib/api';
import type { ReportDefinition } from '@/lib/config';
import InsightTypeSelector from './InsightTypeSelector';

interface InsightTypeSelection {
  insightTypeId: number;
  filters: {
    pi?: string;
    team_name?: string;
    group_name?: string;
  };
}

interface WidgetSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWidget?: (widgetType: 'report' | 'insight_card' | 'insight_type', widgetId: string) => void; // Single widget selection (legacy)
  onUpdateWidgets?: (widgets: Array<{ type: 'report' | 'insight_card' | 'insight_type'; id: string; filters?: Record<string, any> }>) => void; // Multiple widget selection (new)
  currentWidgetIds?: string[]; // Current widget IDs (can have duplicates) for counting instances
  currentWidgets?: Array<{ widget_id: string; widget_type: 'report' | 'insight_card' | 'insight_type'; filters?: Record<string, any> }>; // Optional: widget type info to separate reports from insight cards
}

export default function WidgetSelectorModal({
  isOpen,
  onClose,
  onSelectWidget,
  onUpdateWidgets,
  currentWidgetIds = [],
  currentWidgets = [],
}: WidgetSelectorModalProps) {
  const [activeTab, setActiveTab] = useState<'reports' | 'insight_cards'>('reports');
  const [availableReports, setAvailableReports] = useState<ReportDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Count how many instances of each widget_id currently exist on the dashboard
  const getCurrentCounts = () => {
    const reportCounts = new Map<string, number>();
    const insightCardCounts = new Map<string, number>();
    
    // Count current instances (currentWidgetIds can have duplicates)
    currentWidgetIds.forEach(widgetId => {
      // We need to determine if it's a report or insight card
      // For now, we'll assume all are reports unless we have more info
      // This will be updated when we have the widget type info
      reportCounts.set(widgetId, (reportCounts.get(widgetId) || 0) + 1);
    });
    
    return { reportCounts, insightCardCounts };
  };
  
  // Multi-select mode: track desired counts for each widget (allows multiple instances)
  // Separate reports from insight cards based on widget type
  const [reportCounts, setReportCounts] = useState<Map<string, number>>(() => {
    const counts = new Map<string, number>();
    if (currentWidgets.length > 0) {
      // Use widget type info if available
      currentWidgets
        .filter(w => w.widget_type === 'report')
        .forEach(w => {
          counts.set(w.widget_id, (counts.get(w.widget_id) || 0) + 1);
        });
    } else {
      // Fallback: assume all are reports if no type info
      currentWidgetIds.forEach(id => {
        counts.set(id, (counts.get(id) || 0) + 1);
      });
    }
    return counts;
  });
  // Track selected insight types (one per type with filters)
  const [insightTypeSelections, setInsightTypeSelections] = useState<Map<number, InsightTypeSelection>>(() => {
    const selections = new Map<number, InsightTypeSelection>();
    if (currentWidgets.length > 0) {
      // Extract insight type selections from current widgets
      currentWidgets
        .filter(w => w.widget_type === 'insight_type')
        .forEach(w => {
          const typeId = parseInt(w.widget_id, 10);
          if (!isNaN(typeId)) {
            selections.set(typeId, {
              insightTypeId: typeId,
              filters: w.filters || {},
            });
          }
        });
    }
    return selections;
  });
  
  // Track if modal was previously open to avoid resetting selection during interaction
  const prevIsOpenRef = useRef(isOpen);
  
  // Reset counts only when modal transitions from closed to open
  useEffect(() => {
    const wasJustOpened = !prevIsOpenRef.current && isOpen;
    prevIsOpenRef.current = isOpen;
    
    if (wasJustOpened && onUpdateWidgets) {
      // Initialize counts based on current widgets on dashboard
      const reportCountsMap = new Map<string, number>();
      const insightTypeSelectionsMap = new Map<number, InsightTypeSelection>();
      
      if (currentWidgets.length > 0) {
        // Use widget type info to separate reports from insight types
        currentWidgets.forEach(w => {
          if (w.widget_type === 'report') {
            reportCountsMap.set(w.widget_id, (reportCountsMap.get(w.widget_id) || 0) + 1);
          } else if (w.widget_type === 'insight_type') {
            const typeId = parseInt(w.widget_id, 10);
            if (!isNaN(typeId)) {
              insightTypeSelectionsMap.set(typeId, {
                insightTypeId: typeId,
                filters: w.filters || {},
              });
            }
          }
        });
      } else {
        // Fallback: assume all are reports if no type info
        currentWidgetIds.forEach(id => {
          reportCountsMap.set(id, (reportCountsMap.get(id) || 0) + 1);
        });
      }
      
      setReportCounts(reportCountsMap);
      setInsightTypeSelections(insightTypeSelectionsMap);
    }
  }, [isOpen, onUpdateWidgets]); // Removed currentWidgetIds/currentWidgets from dependencies to prevent resets during interaction

  useEffect(() => {
    if (isOpen && activeTab === 'reports') {
      loadReports();
    }
  }, [isOpen, activeTab]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const api = new ApiService();
      const reports = await api.getReportDefinitions();
      setAvailableReports(reports);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = availableReports.filter(report =>
    report.report_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.report_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (report.description && report.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Add Widget</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'reports'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Reports
            </button>
            <button
              onClick={() => setActiveTab('insight_cards')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'insight_cards'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Insight Cards
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'reports' ? (
            <div>
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reports..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Loading reports...</p>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No reports found
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredReports.map((report) => {
                    const currentCount = reportCounts.get(report.report_id) || 0;
                    const hasInstances = currentCount > 0;
                    
                    return (
                      <div
                        key={report.report_id}
                        className={`p-4 border-2 rounded-lg hover:shadow-md transition-all ${
                          hasInstances
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-500'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">{report.report_name}</h3>
                          {onUpdateWidgets && (
                            <div className="flex items-center gap-2">
                              {hasInstances && (
                                <span className="text-xs text-gray-600 mr-1">
                                  {currentCount} on dashboard
                                </span>
                              )}
                              <div className="flex items-center gap-1 border border-gray-300 rounded">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setReportCounts(prev => {
                                      const next = new Map(prev);
                                      const current = next.get(report.report_id) || 0;
                                      if (current > 0) {
                                        next.set(report.report_id, current - 1);
                                        if (current === 1) {
                                          next.delete(report.report_id);
                                        }
                                      }
                                      return next;
                                    });
                                  }}
                                  disabled={currentCount === 0}
                                  className="px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  −
                                </button>
                                <span className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center">
                                  {currentCount}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setReportCounts(prev => {
                                      const next = new Map(prev);
                                      next.set(report.report_id, (next.get(report.report_id) || 0) + 1);
                                      return next;
                                    });
                                  }}
                                  className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        {report.description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{report.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {report.chart_type}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <InsightTypeSelector
              onUpdateSelections={(selections) => {
                console.log('[WidgetSelectorModal] InsightTypeSelector onUpdateSelections called with:', {
                  selectionsSize: selections.size,
                  selections: Array.from(selections.entries()),
                });
                setInsightTypeSelections(selections);
              }}
              currentSelections={insightTypeSelections}
            />
          )}
        </div>
        
        {/* Footer with Apply button for multi-select mode */}
        {onUpdateWidgets && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {Array.from(reportCounts.values()).reduce((sum, count) => sum + count, 0) + 
               insightTypeSelections.size} widget instance(s) total
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onUpdateWidgets) {
                    // Create array with each widget_id repeated according to its count
                    const allWidgets: Array<{ type: 'report' | 'insight_card' | 'insight_type'; id: string; filters?: Record<string, any> }> = [];
                    
                    // Add reports (repeat each report_id by its count)
                    reportCounts.forEach((count, reportId) => {
                      for (let i = 0; i < count; i++) {
                        allWidgets.push({ type: 'report' as const, id: reportId });
                      }
                    });
                    
                    // Add insight types (one per type with filters)
                    console.log('[WidgetSelectorModal] Current insightTypeSelections before adding:', {
                      size: insightTypeSelections.size,
                      entries: Array.from(insightTypeSelections.entries()),
                    });
                    
                    insightTypeSelections.forEach((selection) => {
                      console.log('[WidgetSelectorModal] Adding insight type widget:', {
                        insightTypeId: selection.insightTypeId,
                        filters: selection.filters,
                      });
                      allWidgets.push({
                        type: 'insight_type' as const,
                        id: selection.insightTypeId.toString(),
                        filters: selection.filters,
                      });
                    });
                    
                    console.log('[WidgetSelectorModal] Calling onUpdateWidgets with:', {
                      totalWidgets: allWidgets.length,
                      insightTypeWidgets: allWidgets.filter(w => w.type === 'insight_type').length,
                      allWidgets,
                      insightTypeSelectionsSize: insightTypeSelections.size,
                    });
                    
                    onUpdateWidgets(allWidgets);
                  }
                }}
                disabled={reportCounts.size === 0 && insightTypeSelections.size === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

