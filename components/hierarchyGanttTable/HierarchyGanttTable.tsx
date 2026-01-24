'use client';

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  ExpandedState,
} from '@tanstack/react-table';
import type { HierarchyItem } from '@/lib/config';
import type { ColumnConfig, TreeNode } from '../hierarchyTable/types';
import { buildTree, flattenTree, getStatusCategoryColor, getTypeColor, getProgressColor } from '../hierarchyTable/utils';
import type { HierarchyGanttTableProps, GanttViewMode, TimelineDate, GanttConfig, PIData, ReleaseData } from './types';
import {
  getTimelineDates,
  calculateBarPosition,
  getProgress,
  getBarColor,
} from './utils';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, differenceInDays } from 'date-fns';

const DEFAULT_ROW_HEIGHT = 40;
const HEADER_HEIGHT = 40;
const GANTT_COLUMN_WIDTH_MONTH = 120; // pixels per month
const GANTT_COLUMN_WIDTH_WEEK = 80; // pixels per week
const GANTT_COLUMN_WIDTH_SPRINT = 135; // pixels per sprint (10% smaller: 150 * 0.9 = 135)
const PROGRESS_FIELD_NAME = 'Progress %'; // Field name for progress percentage

export default function HierarchyGanttTable({
  data,
  columns,
  defaultExpanded = false,
  onRowClick,
  className = '',
  expanded: externalExpanded,
  onExpandedChange,
  showControls = false,
  jiraUrl,
  mode = 'hierarchy',
  ganttConfig,
  ganttViewMode = 'month',
  onGanttViewModeChange,
  sprints = [],
  pis = [],
  releases = [],
  leftPanelWidth: initialLeftPanelWidth = 400,
  minLeftPanelWidth = 200,
  maxLeftPanelWidth = 800,
}: HierarchyGanttTableProps) {
  const [internalExpanded, setInternalExpanded] = useState<ExpandedState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [leftPanelWidth, setLeftPanelWidth] = useState(initialLeftPanelWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [currentGanttViewMode, setCurrentGanttViewMode] = useState<GanttViewMode>(ganttViewMode);
  const [showMilestones, setShowMilestones] = useState(false);
  const [rowHeights, setRowHeights] = useState<Map<string, number>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const leftTableBodyRef = useRef<HTMLTableSectionElement>(null);
  const isScrollingRef = useRef(false);
  const expandedRef = useRef<ExpandedState>({});

  // Use external expanded state if provided, otherwise use internal state
  const expanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  
  // Update ref whenever expanded changes
  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);
  
  // Create a unified setter that handles both internal and external state
  const setExpanded = useCallback((updater: ExpandedState | ((prev: ExpandedState) => ExpandedState)) => {
    if (onExpandedChange) {
      const newValue = typeof updater === 'function' ? updater(expandedRef.current) : updater;
      onExpandedChange(newValue as Record<string, boolean>);
    } else {
      setInternalExpanded(updater);
    }
  }, [onExpandedChange]);

  // Build tree first
  // Process data to add milestone row with PIs and Releases if showMilestones is true
  const processedData = useMemo(() => {
    if (!showMilestones) {
      return data;
    }
    
    // Create PIs row that contains all PIs (for rendering all bars on one row)
    const pisRow: HierarchyItem = {
      key: 'PIs',
      parent: 'Milestone',
      Key: 'PIs',
      'Issue Summary': 'PIs',
      Summary: 'PIs',
      Type: 'PIs',
      Status: '', // Empty status for PIs
      'Hierarchy Level': 1,
      'Start Date': null,
      'End Date': null,
      isPIsRow: true, // Flag to identify PIs row
      pisData: pis || [], // Store all PIs data for rendering
    } as HierarchyItem;
    
    // Create Releases row with releases data
    const releasesRow: HierarchyItem = {
      key: 'Releases',
      parent: 'Milestone',
      Key: 'Releases',
      'Issue Summary': 'Releases',
      Summary: 'Releases',
      Type: 'Releases',
      Status: '', // Empty status for Releases
      'Hierarchy Level': 1,
      'Start Date': null,
      'End Date': null,
      isReleasesRow: true, // Flag to identify Releases row
      releasesData: releases || [], // Store all releases data for rendering
    } as HierarchyItem;
    
    // Create milestone row
    const milestoneItem: HierarchyItem = {
      key: 'Milestone',
      parent: null,
      Key: 'Milestone',
      'Issue Summary': 'Milestone',
      Summary: 'Milestone',
      Type: 'Milestone',
      Status: 'Milestone',
      'Hierarchy Level': 0,
      'Start Date': null,
      'End Date': null,
      isMilestone: true, // Flag to identify milestone row
    } as HierarchyItem;
    
    // Combine milestone, PIs row, Releases row, and original data
    return [milestoneItem, pisRow, releasesRow, ...data];
  }, [data, showMilestones, pis, releases]);

  const tree = useMemo(() => buildTree(processedData), [processedData]);

  // Initialize expanded state - expand everything except Hierarchy Level 0 (stories)
  // Also expand milestone row if showMilestones is true
  useEffect(() => {
    if (showMilestones && tree.length > 0) {
      // Find milestone in the tree
      const findMilestone = (nodes: TreeNode[]): TreeNode | null => {
        for (const node of nodes) {
          if ((node as any).isMilestone && node.key) {
            return node;
          }
          if (node.children) {
            const found = findMilestone(node.children);
            if (found) return found;
          }
        }
        return null;
      };
      
      const milestoneNode = findMilestone(tree);
      if (milestoneNode && milestoneNode.key) {
        setExpanded((prev) => ({
          ...(prev as Record<string, boolean>),
          [milestoneNode.key!]: true,
        }));
      }
    }
  }, [showMilestones, tree, setExpanded]);

  // Initialize expanded state for defaultExpanded
  useEffect(() => {
    if (defaultExpanded && processedData.length > 0) {
      const expandedState: ExpandedState = {};
      
      // Recursively expand all nodes where Hierarchy Level > 0 (not stories)
      const expandNodes = (nodes: TreeNode[]) => {
        nodes.forEach((node) => {
          // Use Hierarchy Level field from data
          const hierarchyLevel = (node as any)['Hierarchy Level'];
          // Expand if Hierarchy Level > 0 (Epic, Portfolio Epic, Initiative, etc.)
          if (node.key && hierarchyLevel !== undefined && hierarchyLevel !== null && hierarchyLevel > 0) {
            // Only expand if it has children
            if (node.children && node.children.length > 0) {
              expandedState[node.key] = true;
              // Recursively expand children
              expandNodes(node.children);
            }
          }
        });
      };
      
      expandNodes(tree);
      setExpanded(expandedState);
    }
  }, [processedData, defaultExpanded, setExpanded, tree, showMilestones]);

  const expandedKeys = useMemo(() => {
    const keys = new Set<string>();
    Object.entries(expanded).forEach(([key, value]) => {
      if (value) {
        keys.add(key);
      }
    });
    return keys;
  }, [expanded]);

  const flatData = useMemo(() => flattenTree(tree, expandedKeys), [tree, expandedKeys]);

  // Toggle expanded state
  const toggleExpanded = useCallback((key: string) => {
    setExpanded((prev) => ({
      ...(prev as Record<string, boolean>),
      [key]: !(prev as Record<string, boolean>)[key],
    }));
  }, [setExpanded]);

  const toggleAllExpanded = useCallback(() => {
    if (Object.keys(expanded).length === 0 || Object.values(expanded).every((v) => !v)) {
      const allKeys: ExpandedState = {};
      const collectKeys = (nodes: TreeNode[]) => {
        nodes.forEach((node) => {
          if (node.children && node.children.length > 0 && node.key) {
            allKeys[node.key] = true;
            collectKeys(node.children);
          }
        });
      };
      collectKeys(tree);
      setExpanded(allKeys);
    } else {
      setExpanded({});
    }
  }, [expanded, tree, setExpanded]);

  // Handle Gantt view mode change
  const handleGanttViewModeChange = useCallback((mode: GanttViewMode) => {
    setCurrentGanttViewMode(mode);
    onGanttViewModeChange?.(mode);
  }, [onGanttViewModeChange]);

  // Measure row heights from left panel and sync to right panel
  useEffect(() => {
    if (mode !== 'hierarchy-gantt' || !leftTableBodyRef.current) {
      return;
    }

    const measureRowHeights = () => {
      const tbody = leftTableBodyRef.current;
      if (!tbody) return;

      const rows = tbody.querySelectorAll('tr');
      const newRowHeights = new Map<string, number>();

      rows.forEach((row, index) => {
        // Use flatData directly instead of table.getRowModel().rows
        const rowData = flatData[index];
        if (rowData) {
          const key = rowData.key || `row-${index}`;
          const height = row.getBoundingClientRect().height;
          if (height > 0) {
            newRowHeights.set(key, height);
          }
        }
      });

      if (newRowHeights.size > 0) {
        setRowHeights(newRowHeights);
      }
    };

    // Measure after render with multiple attempts to catch all updates
    const timeoutId1 = setTimeout(measureRowHeights, 0);
    const timeoutId2 = setTimeout(measureRowHeights, 50);
    const timeoutId3 = setTimeout(measureRowHeights, 200);

    // Also measure when content changes
    const observer = new ResizeObserver(() => {
      measureRowHeights();
    });

    if (leftTableBodyRef.current) {
      observer.observe(leftTableBodyRef.current);
    }

    // Also observe individual rows for height changes
    const rowObserver = new MutationObserver(() => {
      measureRowHeights();
    });

    if (leftTableBodyRef.current) {
      rowObserver.observe(leftTableBodyRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
    }

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      observer.disconnect();
      rowObserver.disconnect();
    };
  }, [mode, flatData, expanded]);

  // Sync vertical scrolling between left and right panels
  useEffect(() => {
    const leftPanel = leftPanelRef.current;
    const rightPanel = rightPanelRef.current;
    
    if (!leftPanel || !rightPanel || mode !== 'hierarchy-gantt') {
      return;
    }
    
    const handleLeftScroll = () => {
      if (isScrollingRef.current) return;
      isScrollingRef.current = true;
      if (rightPanel.scrollTop !== leftPanel.scrollTop) {
        rightPanel.scrollTop = leftPanel.scrollTop;
      }
      requestAnimationFrame(() => {
        isScrollingRef.current = false;
      });
    };
    
    const handleRightScroll = () => {
      if (isScrollingRef.current) return;
      isScrollingRef.current = true;
      if (leftPanel.scrollTop !== rightPanel.scrollTop) {
        leftPanel.scrollTop = rightPanel.scrollTop;
      }
      requestAnimationFrame(() => {
        isScrollingRef.current = false;
      });
    };
    
    leftPanel.addEventListener('scroll', handleLeftScroll, { passive: true });
    rightPanel.addEventListener('scroll', handleRightScroll, { passive: true });
    
    return () => {
      leftPanel.removeEventListener('scroll', handleLeftScroll);
      rightPanel.removeEventListener('scroll', handleRightScroll);
    };
  }, [mode, flatData]);

  // Resize handler for left panel
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = e.clientX - containerRect.left;
        setLeftPanelWidth(Math.max(minLeftPanelWidth, Math.min(maxLeftPanelWidth, newWidth)));
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minLeftPanelWidth, maxLeftPanelWidth]);

  // Calculate timeline dates for Gantt
  const timelineDates = useMemo(() => {
    if (mode !== 'hierarchy-gantt' || !ganttConfig) {
      return [];
    }
    return getTimelineDates(data, ganttConfig, currentGanttViewMode, sprints);
  }, [mode, ganttConfig, data, currentGanttViewMode, sprints]);

  // Get column width based on view mode
  const columnWidth = useMemo(() => {
    if (currentGanttViewMode === 'month') {
      return GANTT_COLUMN_WIDTH_MONTH;
    } else if (currentGanttViewMode === 'sprint') {
      return GANTT_COLUMN_WIDTH_SPRINT;
    } else {
      return GANTT_COLUMN_WIDTH_WEEK;
    }
  }, [currentGanttViewMode]);

  // Get timeline start date for bar position calculations
  const timelineStart = useMemo(() => {
    if (timelineDates.length === 0) {
      return new Date();
    }
    return timelineDates[0].date;
  }, [timelineDates]);

  // Column definitions (reuse HierarchyTable pattern)
  const columnDefs = useMemo<ColumnDef<TreeNode>[]>(() => {
    return columns.map((col: ColumnConfig) => {
      const accessorKey = col.accessorKey || col.id;
      return {
        id: col.id,
        accessorKey,
        header: typeof col.header === 'function' ? col.header : () => col.header,
        cell: ({ getValue, row, column }) => {
          const value = getValue();
          const item = row.original;
          const level = item.level || 0;
          
          // Custom cell renderer
          if (col.cell) {
            return col.cell({ getValue, row, column });
          }

          // Link renderer (Key column - Jira link like HierarchyTable)
          if (col.renderer === 'link' || col.id === 'key' || col.id === 'Key') {
            let linkUrl = col.linkBuilder ? col.linkBuilder(item as HierarchyItem) : `#${item.key}`;

            // For Key column, build JIRA URL
            if ((col.id === 'key' || col.id === 'Key') && item.key && jiraUrl) {
              linkUrl = `${jiraUrl}/browse/${item.key}`;
            }

            return (
              <div
                className="text-[13px] text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if ((col.id === 'key' || col.id === 'Key') && item.key && jiraUrl) {
                    // Open JIRA link in new tab
                    window.open(`${jiraUrl}/browse/${item.key}`, '_blank');
                  } else if (onRowClick) {
                    onRowClick(item as HierarchyItem);
                  } else if (col.linkBuilder) {
                    window.open(linkUrl, '_blank');
                  }
                }}
                style={{ paddingLeft: `${level * 20}px` }}
              >
                {value || item[accessorKey] || '-'}
              </div>
            );
          }
          
          // Badge renderer with color mapping
          if (col.renderer === 'badge' || col.id === 'status' || col.id === 'Status' || col.id === 'type' || col.id === 'Type') {
            const colIdLower = String(col.id || '').toLowerCase();
            let badgeColor: string;
            
            if (col.colorMap && value) {
              // Explicit color map takes precedence
              badgeColor = col.colorMap[String(value)] || 'bg-gray-100 text-gray-800 border-gray-200';
            } else if (colIdLower === 'status' || col.id === 'Status') {
              // Status should use status_category colors
              const statusCategory =
                item.status_category ||
                item['Status Category'] ||
                item['status_category'] ||
                item['Status Category of Epic'];
              badgeColor = getStatusCategoryColor(String(statusCategory || ''));
            } else if (colIdLower === 'type' || col.id === 'Type') {
              // Type badges (Epic, Story, Task, Bug, etc.) use dedicated type colors
              badgeColor = getTypeColor(String(value || ''));
            } else {
              badgeColor = 'bg-gray-100 text-gray-800 border-gray-200';
            }
            
            // For status column, show empty if value is empty string (for PIs row)
            const displayValue = (colIdLower === 'status' || col.id === 'Status') && value === '' ? '' : String(value || '-');
            
            return (
              <div style={{ paddingLeft: `${level * 20}px` }}>
                {displayValue ? (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${badgeColor}`}>
                    {displayValue}
                  </span>
                ) : null}
              </div>
            );
          }

          // Epic Progress % field - special handling with color and center alignment
          if (col.id === PROGRESS_FIELD_NAME || col.accessorKey === PROGRESS_FIELD_NAME) {
            // Don't show progress for level 0 (stories)
            const hierarchyLevel = (item as any)['Hierarchy Level'];
            if (hierarchyLevel === 0) {
              return <div className="text-center"></div>;
            }

            const progressValue = value !== null && value !== undefined ? value : (item as any)[PROGRESS_FIELD_NAME];
            const progressNum =
              typeof progressValue === 'number' ? progressValue : typeof progressValue === 'string' ? parseFloat(progressValue) : 0;
            const progressInt = Math.floor(progressNum); // Truncate to integer

            // Show the number even if it's 0 or invalid (show 0% or - for invalid)
            let displayValue: string;
            if (isNaN(progressInt)) {
              displayValue = '-';
            } else {
              displayValue = `${progressInt}%`;
            }

            // Get Status field (not status_category)
            const status = item.Status || item.status || '';
            const statusLower = String(status).toLowerCase();

            // Determine color: red bold if Status is "done" and progress is not 100%
            let progressColor = '';
            if (isNaN(progressInt)) {
              progressColor = 'text-gray-400';
            } else if ((statusLower === 'done' || statusLower === 'closed') && progressInt !== 100) {
              progressColor = 'text-red-600 font-bold';
            } else if (progressInt === 100) {
              progressColor = 'text-green-600 font-semibold';
            } else {
              progressColor = 'text-gray-700';
            }

            return (
              <div className="text-center">
                <span className={`text-[13px] ${progressColor}`}>{displayValue}</span>
              </div>
            );
          }
          
          // Default text renderer with indentation for hierarchy
          return (
            <div
              className="text-[13px] text-gray-700"
              style={{ paddingLeft: `${level * 20}px` }}
            >
              {value || ''}
            </div>
          );
        },
      } satisfies ColumnDef<TreeNode>;
    });
  }, [columns, jiraUrl, onRowClick]);

  // Add expand/collapse column
  const columnsWithExpand = useMemo<ColumnDef<TreeNode>[]>(() => {
    if (columnDefs.length === 0) {
      return columnDefs;
    }

    const expandColumn: ColumnDef<TreeNode> = {
      id: '__expander',
      header: () => {
        const hasExpanded = Object.keys(expanded).length > 0 && Object.values(expanded).some((v) => v);
        return (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggleAllExpanded();
            }}
            className="text-xs text-gray-600 hover:text-gray-800 flex items-center justify-center w-6 h-6"
            title={hasExpanded ? 'Collapse All' : 'Expand All'}
          >
            {hasExpanded ? '▼' : '▶'}
          </button>
        );
      },
      cell: ({ row }) => {
        const item = row.original;
        if (!item.children || item.children.length === 0 || !item.key) {
          return <span className="inline-block w-6 h-6" />;
        }
        const key = item.key;
        const expandedRecord = expanded as Record<string, boolean>;
        const isExpanded = key ? Boolean(expandedRecord[key]) : false;
        return (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (key) {
                toggleExpanded(key);
              }
            }}
            className="text-xs text-gray-600 hover:text-gray-900 flex items-center justify-center w-6 h-6"
            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        );
      },
      minSize: 30,
      maxSize: 30,
    };

    return [expandColumn, ...columnDefs];
  }, [columnDefs, expanded, toggleExpanded, toggleAllExpanded]);

  // React Table setup
  const table = useReactTable<TreeNode>({
    data: flatData,
    columns: columnsWithExpand,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const searchValue = String(filterValue).toLowerCase();
      if (!searchValue) return true;
      const item = row.original;
      const searchableValues = Object.values(item)
        .map(v => String(v || '').toLowerCase())
        .join(' ');
      return searchableValues.includes(searchValue);
    },
  });

  // Render left panel (hierarchy table)
  const renderLeftPanel = () => (
    <div className="h-full">
      <table className="min-w-full divide-y divide-gray-200 text-[13px]" style={{ tableLayout: 'fixed' }}>
        <thead className="bg-gray-50 sticky top-0 z-10" style={{ height: `${HEADER_HEIGHT}px` }}>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const headerStyle: React.CSSProperties = {
                  width: header.getSize() === Number.POSITIVE_INFINITY ? undefined : header.getSize(),
                };
                return (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-left text-[13px] font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-r border-gray-200 whitespace-nowrap"
                    style={headerStyle}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody ref={leftTableBodyRef} className="bg-white divide-y divide-gray-200">
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={table.getAllColumns().length} className="px-3 py-6 text-center text-[13px] text-gray-500">
                No data available
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row, index) => {
              const rowKey = row.original.key || `row-${index}`;
              const measuredHeight = rowHeights.get(rowKey);
              // Use measured height if available, otherwise let it be natural (for initial measurement)
              const rowStyle: React.CSSProperties = measuredHeight
                ? { height: `${measuredHeight}px`, minHeight: `${measuredHeight}px` }
                : { minHeight: `${DEFAULT_ROW_HEIGHT}px` };
              
              return (
                <tr
                  key={row.id}
                  className={`cursor-pointer ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:bg-gray-100`}
                  style={rowStyle}
                  onClick={() => onRowClick?.(row.original as HierarchyItem)}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isExpanderColumn = cell.column.id === '__expander';
                    return (
                      <td
                        key={cell.id}
                        className="px-3 py-2 text-[13px] text-gray-700 align-top border-r border-gray-200"
                        style={isExpanderColumn ? { pointerEvents: 'auto' } : undefined}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  // Render Gantt timeline header
  const renderGanttHeader = () => {
    if (mode !== 'hierarchy-gantt' || !ganttConfig) {
      return null;
    }

    return (
      <div className="border-b border-gray-200 bg-gray-50 sticky top-0 z-10" style={{ height: `${HEADER_HEIGHT}px` }}>
        <div className="flex items-center h-full">
          {timelineDates.map((timelineDate, index) => {
            if (currentGanttViewMode === 'sprint' && timelineDate.isSprint && timelineDate.sprintStartDate && timelineDate.sprintEndDate) {
              // Sprint mode: show sprint name and date range on one line with smaller font, both bold
              return (
                <div
                  key={index}
                  className="border-r border-gray-200 px-1 text-[11px] text-gray-500 font-medium leading-tight"
                  style={{
                    width: `${columnWidth}px`,
                    textAlign: 'center',
                    flexShrink: 0,
                    lineHeight: '1.2',
                  }}
                >
                  <div className="font-bold">{timelineDate.sprintName || timelineDate.label}</div>
                  <div className="text-[10px] text-gray-400 font-bold">
                    {format(timelineDate.sprintStartDate, 'MMM d')} - {format(timelineDate.sprintEndDate, 'MMM d')}
                  </div>
                </div>
              );
            } else {
              // Month/Week mode: single line
              return (
                <div
                  key={index}
                  className="border-r border-gray-200 px-2 text-[13px] text-gray-500 font-medium"
                  style={{
                    width: `${columnWidth}px`,
                    textAlign: 'center',
                    flexShrink: 0,
                  }}
                >
                  {timelineDate.label}
                </div>
              );
            }
          })}
        </div>
      </div>
    );
  };

  // Helper function to get progress value from item
  const getProgressValue = useCallback((item: HierarchyItem, ganttConfig: GanttConfig): number => {
    const hierarchyLevel = (item as any)['Hierarchy Level'];
    if (hierarchyLevel === undefined || hierarchyLevel === null || hierarchyLevel <= 0) {
      return 0;
    }

    // Try using ganttConfig.progressField first, then fallback to direct field access
    let progressValue: any = null;
    if (ganttConfig.progressField) {
      progressValue = (item as any)[ganttConfig.progressField];
    }
    // Fallback to direct field access
    if (progressValue === null || progressValue === undefined) {
      progressValue = (item as any)[PROGRESS_FIELD_NAME];
    }
    
    // Parse the progress value
    if (typeof progressValue === 'number') {
      return Math.max(0, Math.min(100, progressValue));
    } else if (typeof progressValue === 'string') {
      const parsed = parseFloat(progressValue);
      return isNaN(parsed) ? 0 : Math.max(0, Math.min(100, parsed));
    }
    return 0;
  }, []);

  // Helper function to build tooltip text
  const buildTooltipText = useCallback((item: HierarchyItem, ganttConfig: GanttConfig): string => {
    const parts: string[] = [];
    
    // Summary
    const summary = (item as any)['Issue Summary'] || (item as any).Summary || (item as any).summary || '';
    if (summary) {
      parts.push(`Summary: ${summary}`);
    }
    
    // Start date
    const startDateStr = ganttConfig.startDateField ? (item as any)[ganttConfig.startDateField] : null;
    if (startDateStr) {
      try {
        const startDate = new Date(startDateStr);
        if (!isNaN(startDate.getTime())) {
          parts.push(`Start: ${format(startDate, 'MMM d, yyyy')}`);
        }
      } catch (e) {
        // Invalid date, skip
      }
    }
    
    // End date
    const endDateStr = ganttConfig.endDateField ? (item as any)[ganttConfig.endDateField] : null;
    if (endDateStr) {
      try {
        const endDate = new Date(endDateStr);
        if (!isNaN(endDate.getTime())) {
          parts.push(`End: ${format(endDate, 'MMM d, yyyy')}`);
        }
      } catch (e) {
        // Invalid date, skip
      }
    }
    
    // Progress - only show for Hierarchy Level > 0
    const progress = getProgressValue(item, ganttConfig);
    if (progress > 0) {
      parts.push(`Progress: ${Math.round(progress)}%`);
    }
    
    return parts.length > 0 ? parts.join('\n') : '';
  }, [getProgressValue]);

  // Render Gantt timeline body
  const renderGanttBody = () => {
    if (mode !== 'hierarchy-gantt' || !ganttConfig) {
      return null;
    }

    const totalTimelineWidth = timelineDates.length * columnWidth;

    return (
      <div style={{ width: `${totalTimelineWidth}px`, minWidth: '100%' }}>
          {flatData.map((item, index) => {
            const barPosition = calculateBarPosition(item, ganttConfig, timelineStart, columnWidth, timelineDates, currentGanttViewMode);
            const hierarchyLevel = (item as any)['Hierarchy Level'];
            const progress = getProgressValue(item, ganttConfig);
            
            const barColor = getBarColor(item, ganttConfig);
            const rowKey = item.key || `row-${index}`;
            const measuredHeight = rowHeights.get(rowKey);
            const rowHeight = measuredHeight || DEFAULT_ROW_HEIGHT;
            const tooltipText = buildTooltipText(item, ganttConfig);
            const showProgressOnBar = hierarchyLevel !== undefined && hierarchyLevel !== null && hierarchyLevel > 0 && progress > 0;

            return (
              <div
                key={item.key || index}
                className={`relative border-b border-gray-200 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                } hover:bg-gray-100`}
                style={{ 
                  height: `${rowHeight}px`, 
                  minHeight: `${rowHeight}px`, 
                  position: 'relative', 
                  width: '100%' 
                }}
              >
                {/* Grid lines - render vertical borders */}
                <div className="absolute inset-0 flex">
                  {timelineDates.map((_, dateIndex) => (
                    <div
                      key={dateIndex}
                      className="border-r border-gray-200"
                      style={{ width: `${columnWidth}px`, flexShrink: 0 }}
                    />
                  ))}
                </div>
                {/* Gantt bar */}
                {(item as any).isPIsRow && (item as any).pisData && Array.isArray((item as any).pisData) && ((item as any).pisData as PIData[]).length > 0 ? (
                  // Render all PI bars on the same row
                  <>
                    {((item as any).pisData as PIData[]).map((pi: PIData, piIndex: number) => {
                      // Create a temporary item for calculating bar position
                      // Use the ganttConfig field names to ensure correct mapping
                      const piItem: HierarchyItem = {
                        ...item,
                        [ganttConfig.startDateField]: pi['start date'],
                        [ganttConfig.endDateField]: pi['end date'],
                        isPI: true,
                      } as HierarchyItem;
                      const piBarPosition = calculateBarPosition(piItem, ganttConfig, timelineStart, columnWidth, timelineDates, currentGanttViewMode);
                      const piColor = '#c084fc'; // light purple
                      const piTooltip = `PI: ${pi['PI name']}\nStart: ${pi['start date']}\nEnd: ${pi['end date']}`;
                      
                      // If bar position can't be calculated, skip this PI
                      if (!piBarPosition) return null;
                      
                      return (
                        <div
                          key={`pi-${piIndex}`}
                          className="absolute top-1/2 -translate-y-1/2 z-10 cursor-pointer"
                          style={{
                            left: `${Math.max(0, piBarPosition.left)}px`,
                            width: `${Math.max(10, piBarPosition.width)}px`,
                            height: '20px',
                          }}
                          title={piTooltip}
                        >
                          {/* Left marker */}
                          <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4"
                            style={{ backgroundColor: piColor }}
                          />
                          {/* Horizontal line */}
                          <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5"
                            style={{
                              width: `${Math.max(10, piBarPosition.width)}px`,
                              backgroundColor: piColor,
                            }}
                          />
                          {/* Right marker */}
                          <div
                            className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4"
                            style={{ backgroundColor: piColor }}
                          />
                          {/* PI name text above bar */}
                          {piBarPosition.width > 40 && (
                            <div
                              className="absolute flex items-center justify-center pointer-events-none z-20 whitespace-nowrap overflow-hidden"
                              style={{
                                left: '50%',
                                transform: 'translateX(-50%)',
                                bottom: 'calc(50% + 2px)', // Position just above the bar line (bar is at 50%, so 50% + small offset)
                                color: '#6b7280', // gray-500 for better visibility
                                fontSize: '11px', // Slightly bigger than 10px
                                fontWeight: 600, // font-semibold
                                textShadow: '0 0 2px white, 0 0 2px white', // white outline for readability
                              }}
                            >
                              {pi['PI name']}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                ) : (item as any).isReleasesRow && (item as any).releasesData && Array.isArray((item as any).releasesData) && ((item as any).releasesData as ReleaseData[]).length > 0 ? (
                  // Render all release icons on the same row at their end dates
                  <>
                    {((item as any).releasesData as ReleaseData[]).map((release: ReleaseData, releaseIndex: number) => {
                      // Only show if end date is present
                      if (!release['end date']) return null;
                      
                      const endDate = new Date(release['end date']);
                      if (isNaN(endDate.getTime())) return null;
                      
                      // Calculate the exact position of the end date on the timeline
                      let iconLeft = 0;
                      let found = false;
                      
                      for (let i = 0; i < timelineDates.length; i++) {
                        const timelineDate = timelineDates[i];
                        const colDate = timelineDate.date;
                        
                        if (currentGanttViewMode === 'month') {
                          const monthStart = startOfMonth(colDate);
                          const monthEnd = endOfMonth(colDate);
                          if (endDate >= monthStart && endDate <= monthEnd) {
                            const monthDays = differenceInDays(monthEnd, monthStart) + 1;
                            const dayOffset = differenceInDays(endDate, monthStart);
                            const offsetRatio = dayOffset / monthDays;
                            iconLeft = i * columnWidth + offsetRatio * columnWidth;
                            found = true;
                            break;
                          }
                        } else if (currentGanttViewMode === 'week') {
                          const weekStart = startOfWeek(colDate, { weekStartsOn: 0 });
                          const weekEnd = endOfWeek(colDate, { weekStartsOn: 0 });
                          if (endDate >= weekStart && endDate <= weekEnd) {
                            const dayOffset = differenceInDays(endDate, weekStart);
                            const offsetRatio = dayOffset / 7;
                            iconLeft = i * columnWidth + offsetRatio * columnWidth;
                            found = true;
                            break;
                          }
                        } else {
                          // Sprint mode - use column center
                          if (timelineDate.isSprint && timelineDate.sprintStartDate && timelineDate.sprintEndDate) {
                            if (endDate >= timelineDate.sprintStartDate && endDate <= timelineDate.sprintEndDate) {
                              iconLeft = i * columnWidth + columnWidth / 2;
                              found = true;
                              break;
                            }
                          }
                        }
                      }
                      
                      if (!found) return null;
                      
                      const releaseColor = '#06b6d4'; // cyan-500 (light blue/cyan)
                      const releaseTooltip = `Release: ${release['Release name']}\nStart Date: ${release['start date']}\nEnd Date: ${release['end date']}`;
                      
                      return (
                        <div
                          key={`release-${releaseIndex}`}
                          className="absolute top-1/2 -translate-y-1/2 z-10 cursor-pointer"
                          style={{
                            left: `${iconLeft}px`,
                            transform: 'translateX(-50%) translateY(-50%)', // Center the diamond icon
                          }}
                          title={releaseTooltip}
                        >
                          {/* Diamond/Flag icon - rotated square */}
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              backgroundColor: releaseColor,
                              transform: 'rotate(45deg)',
                              border: `1px solid ${releaseColor}`,
                            }}
                          />
                        </div>
                      );
                    })}
                  </>
                ) : barPosition ? (
                  <>
                    {(item as any).isPI ? (
                      // Special rendering for individual PIs: line with markers
                      <div
                        className="absolute top-1/2 -translate-y-1/2 z-10 cursor-pointer"
                        style={{
                          left: `${Math.max(0, barPosition.left)}px`,
                          width: `${Math.max(10, barPosition.width)}px`,
                          height: '20px',
                        }}
                        title={tooltipText || ''}
                      >
                        {/* Left marker */}
                        <div
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4"
                          style={{ backgroundColor: barColor }}
                        />
                        {/* Horizontal line */}
                        <div
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5"
                          style={{
                            width: `${Math.max(10, barPosition.width)}px`,
                            backgroundColor: barColor,
                          }}
                        />
                        {/* Right marker */}
                        <div
                          className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4"
                          style={{ backgroundColor: barColor }}
                        />
                      </div>
                    ) : (
                      // Regular bar rendering for other items
                      <div
                        className="absolute top-1/2 -translate-y-1/2 rounded z-10 cursor-pointer"
                        style={{
                          left: `${Math.max(0, barPosition.left)}px`,
                          width: `${Math.max(10, barPosition.width)}px`,
                          height: '18px', // 10% smaller: 20px * 0.9 = 18px
                          backgroundColor: barColor,
                        }}
                        title={tooltipText || ''}
                      >
                        {/* Progress overlay - light green overlay to show completed progress for Hierarchy Level > 0 */}
                        {hierarchyLevel !== undefined && hierarchyLevel !== null && hierarchyLevel > 0 && progress > 0 && (
                          <div
                            className="absolute top-0 left-0 h-full rounded"
                            style={{ 
                              width: `${progress}%`,
                              backgroundColor: 'rgba(134, 239, 172, 0.6)' // light green (green-300 with opacity)
                            }}
                          />
                        )}
                        {/* Progress text on bar - only for Hierarchy Level > 0 and progress > 0 */}
                        {showProgressOnBar && (
                          <div
                            className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-gray-800 pointer-events-none z-20"
                          >
                            {Math.round(progress)}%
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
    );
  };

  // Main render
  if (mode === 'hierarchy') {
    // Pure hierarchy mode - full width
    return (
      <div className={`flex flex-col h-full ${className}`}>
        {showControls && (
          <div className="flex-shrink-0 flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder="Search..."
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={toggleAllExpanded}
                className="px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
              >
                {Object.keys(expanded).length === 0 ? 'Expand all' : 'Collapse all'}
              </button>
            </div>
            <div className="text-sm text-gray-500">Rows: {flatData.length}</div>
          </div>
        )}
        {renderLeftPanel()}
      </div>
    );
  }

  // Hierarchy + Gantt mode
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* View Mode Selector and Color Legend - Same Row */}
      {ganttConfig && (
        <div className="mb-4 flex items-center gap-8 flex-shrink-0">
          {/* View Mode Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => handleGanttViewModeChange('month')}
              className={`px-3 py-1 text-sm border rounded ${
                currentGanttViewMode === 'month'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => handleGanttViewModeChange('week')}
              className={`px-3 py-1 text-sm border rounded ${
                currentGanttViewMode === 'week'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => handleGanttViewModeChange('sprint')}
              className={`px-3 py-1 text-sm border rounded ${
                currentGanttViewMode === 'sprint'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Sprints
            </button>
            <label className="flex items-center gap-2 px-3 py-1 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showMilestones}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  setShowMilestones(newValue);
                  // Automatically expand milestone when checked
                  if (newValue) {
                    setTimeout(() => {
                      setExpanded((prev) => ({
                        ...(prev as Record<string, boolean>),
                        'Milestone': true,
                      }));
                    }, 0);
                  }
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span>Show milestones</span>
            </label>
          </div>

          {/* Color Legend */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600 font-medium">Bar Colors:</span>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: '#86efac' }}
                />
                <span className="text-gray-700">Done</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: '#60a5fa' }}
                />
                <span className="text-gray-700">In Progress</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: '#6b7280' }}
                />
                <span className="text-gray-700">To Do</span>
              </div>
              {showMilestones && (
                <>
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex items-center" style={{ width: '24px', height: '16px' }}>
                      {/* Left marker */}
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2"
                        style={{ 
                          width: '2px', 
                          height: '8px', 
                          backgroundColor: '#c084fc' 
                        }}
                      />
                      {/* Horizontal line */}
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2"
                        style={{ 
                          width: '20px', 
                          height: '1px', 
                          backgroundColor: '#c084fc' 
                        }}
                      />
                      {/* Right marker */}
                      <div
                        className="absolute right-0 top-1/2 -translate-y-1/2"
                        style={{ 
                          width: '2px', 
                          height: '8px', 
                          backgroundColor: '#c084fc' 
                        }}
                      />
                    </div>
                    <span className="text-gray-700">PI (Program Increment)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div 
                      className="w-3 h-3"
                      style={{ 
                        backgroundColor: '#06b6d4',
                        transform: 'rotate(45deg)',
                      }}
                    />
                    <span className="text-gray-700">Release</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Split Layout */}
      <div
        ref={containerRef}
        className="flex-1 flex overflow-hidden border border-gray-200 rounded-lg min-h-0"
      >
        {/* Left Panel */}
        <div
          ref={leftPanelRef}
          className="flex-shrink-0 border-r border-gray-200 overflow-auto bg-white"
          style={{ width: `${leftPanelWidth}px` }}
        >
          {renderLeftPanel()}
        </div>

        {/* Resizer */}
        <div
          onMouseDown={handleMouseDown}
          className={`flex-shrink-0 bg-gray-400 hover:bg-blue-500 cursor-col-resize transition-colors ${
            isResizing ? 'bg-blue-500' : ''
          }`}
          style={{ width: '4px' }}
        />

        {/* Right Panel - Gantt */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div ref={rightPanelRef} className="flex-1 overflow-x-auto overflow-y-auto relative">
            {mode === 'hierarchy-gantt' && ganttConfig && timelineDates.length > 0 && (
              <div style={{ width: `${timelineDates.length * columnWidth}px`, minWidth: '100%' }}>
                {renderGanttHeader()}
                {renderGanttBody()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

