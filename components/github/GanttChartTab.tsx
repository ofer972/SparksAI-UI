'use client';

import React, { useMemo, useState, useEffect } from 'react';
import HierarchyGanttTable from '../hierarchyGanttTable/HierarchyGanttTable';
import type { ColumnConfig } from '../hierarchyTable/types';
import type { HierarchyItem } from '@/lib/config';
import type { GanttConfig } from '../hierarchyGanttTable/types';
import { getCleanJiraUrl } from '@/lib/config';
import { ApiService } from '@/lib/api';

interface EpicsHierarchyResult {
  issues?: HierarchyItem[];
  count?: number;
  limit?: number;
}

export default function GanttChartTab() {
  const [data, setData] = useState<HierarchyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const jiraUrl = useMemo(() => getCleanJiraUrl(), []);

  // Fetch Epic Hierarchy data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const apiService = new ApiService();
        // Try 'issues-epics-hierarchy' first, fallback to 'epics-hierarchy'
        let reportData;
        try {
          reportData = await apiService.getReport<EpicsHierarchyResult>('issues-epics-hierarchy', {});
        } catch (err) {
          // Fallback to 'epics-hierarchy' if 'issues-epics-hierarchy' doesn't exist
          reportData = await apiService.getReport<EpicsHierarchyResult>('epics-hierarchy', {});
        }
        
        const issues = Array.isArray(reportData.result?.issues) ? reportData.result!.issues : [];
        
        // Normalize the data to match HierarchyItem interface
        const normalizedIssues: HierarchyItem[] = issues.map((issue: any) => ({
          ...issue,
          key: issue.Key || issue.key,
          parent: issue['Parent Key'] || issue['Parent'] || issue.parent || null,
        }));
        
        setData(normalizedIssues);
        
        // Extract sprints and PIs from result if available, merge with meta
        const metaData = reportData.meta || {};
        if (reportData.result && typeof reportData.result === 'object') {
          if ('sprints' in reportData.result) {
            metaData.sprints = (reportData.result as any).sprints || [];
          }
          if ('pis' in reportData.result) {
            metaData.pis = (reportData.result as any).pis || [];
          }
          if ('releases' in reportData.result) {
            metaData.releases = (reportData.result as any).releases || [];
          }
        }
        setMeta(metaData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        setError(errorMessage);
        console.error('Error fetching Epic Hierarchy data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Process data (no longer adding default dates - items without dates won't show bars)
  const processedData = useMemo(() => {
    return data;
  }, [data]);

  // Determine field names from the data
  const ganttConfig = useMemo<GanttConfig>(() => {
    if (processedData.length === 0) {
      // Default fallback
      return {
        startDateField: 'Start Date',
        endDateField: 'End Date',
        progressField: 'Epic Progress %',
        statusCategoryField: 'Status Category',
        issueTypeField: 'Type',
      };
    }
    
    const firstItem = processedData[0] as any;
    
    // Try to find date fields (prioritize "Start Date" and "End Date" from API response)
    const startDateField = 
      firstItem['Start Date'] ? 'Start Date' :
      firstItem['Epic Start Date'] ? 'Epic Start Date' :
      firstItem['start_date'] ? 'start_date' :
      'Start Date';
    
    const endDateField = 
      firstItem['End Date'] ? 'End Date' :
      firstItem['Epic End Date'] ? 'Epic End Date' :
      firstItem['Epic Target Completion Date'] ? 'Epic Target Completion Date' :
      firstItem['Target Completion Date'] ? 'Target Completion Date' :
      firstItem['end_date'] ? 'end_date' :
      'End Date';
    
    const PROGRESS_FIELD_NAME = 'Progress %';
    const progressField = firstItem[PROGRESS_FIELD_NAME] ? PROGRESS_FIELD_NAME : undefined;
    
    const statusCategoryField = 
      firstItem['Status Category'] ? 'Status Category' :
      firstItem['status_category'] ? 'status_category' :
      undefined;
    
    const issueTypeField = 
      firstItem['Type'] ? 'Type' :
      firstItem['type'] ? 'type' :
      undefined;
    
    return {
      startDateField,
      endDateField,
      progressField,
      statusCategoryField,
      issueTypeField,
    };
  }, [processedData]);
  
  // Define columns for left panel (matching Epic hierarchy style)
  const columns = useMemo<ColumnConfig[]>(() => {
    if (processedData.length === 0) {
      return [];
    }

    const firstRow = processedData[0] as any;
    const columnsToShow: ColumnConfig[] = [];

    // Key (link)
    if (firstRow.Key || firstRow.key) {
      columnsToShow.push({
        id: 'Key',
        header: 'Key',
        accessorKey: firstRow.Key ? 'Key' : 'key',
        renderer: 'link',
        minWidth: 69,
        maxWidth: 79,
        size: 74,
      });
    }

    // Type (badge) - after Key, before Summary
    if (firstRow.Type || firstRow.type) {
      columnsToShow.push({
        id: 'Type',
        header: 'Type',
        accessorKey: firstRow.Type ? 'Type' : 'type',
        renderer: 'badge',
        minWidth: 70,
        maxWidth: 80,
        size: 75,
      });
    }

    // Summary
    if (firstRow['Issue Summary'] || firstRow.summary || firstRow.Summary) {
      columnsToShow.push({
        id: 'Summary',
        header: 'Summary',
        accessorKey: firstRow['Issue Summary'] ? 'Issue Summary' : (firstRow.Summary ? 'Summary' : 'summary'),
        renderer: 'text',
        minWidth: 200,
        size: 270,
      });
    }

    // Status (badge)
    if (firstRow.Status || firstRow.status) {
      columnsToShow.push({
        id: 'Status',
        header: 'Status',
        accessorKey: firstRow.Status ? 'Status' : 'status',
        renderer: 'badge',
        minWidth: 83,
        maxWidth: 93,
        size: 88,
      });
    }

    // Progress % - after Status
    // Check if the field exists (even if value is 0, null, or undefined)
    const PROGRESS_FIELD_NAME = 'Progress %';
    if (PROGRESS_FIELD_NAME in firstRow) {
      columnsToShow.push({
        id: PROGRESS_FIELD_NAME,
        header: 'Progress %',
        accessorKey: PROGRESS_FIELD_NAME,
        renderer: 'text',
        minWidth: 61,
        maxWidth: 71,
        size: 70,
      });
    }

    return columnsToShow;
  }, [processedData]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
          <p className="text-content-tertiary text-sm">Loading Gantt chart data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <h3 className="text-sm font-medium text-red-800 mb-1">Error loading data</h3>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <HierarchyGanttTable
        data={processedData}
        columns={columns}
        mode="hierarchy-gantt"
        ganttConfig={ganttConfig}
        defaultExpanded={true}
        showControls={false}
        jiraUrl={jiraUrl || meta?.jira_url}
        sprints={meta?.sprints || []}
        pis={meta?.pis || []}
        releases={meta?.releases || []}
      />
    </div>
  );
}
