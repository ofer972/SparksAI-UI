'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ApiService } from '@/lib/api';
import DataTable, { Column, SortConfig } from '../DataTable';

interface ValidationIssue {
  issue_key: string;
  issue_summary: string;
  issue_type?: string;
  team_name?: string;
  status: string;
  status_category?: string;
  updated_at: string;
  additional_comment: string;
}

interface ValidationIssuesViewProps {
  validationType: string;
  metricLabel: string;
  tooltip?: string;
  filters: Record<string, any>;
  onBack: () => void;
  jiraUrl?: string;
}

export default function ValidationIssuesView({
  validationType,
  metricLabel,
  tooltip,
  filters,
  onBack,
  jiraUrl,
}: ValidationIssuesViewProps) {
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
  const [responseJiraUrl, setResponseJiraUrl] = useState<string>('');

  useEffect(() => {
    fetchIssues();
  }, [validationType, filters]);

  const fetchIssues = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiService = new ApiService();
      const response = await apiService.getValidationIssues({
        validation_type: validationType,
        ...filters,
      });
      
      // Extract issues from the first validation
      const validation = response.validations?.[0];
      setIssues(validation?.issues || []);
      
      // Use jiraUrl from response meta if available (preferred over prop)
      if (response.meta?.jira_url) {
        setResponseJiraUrl(response.meta.jira_url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load issues');
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  // Prefer jiraUrl from API response meta, fallback to prop
  const effectiveJiraUrl = useMemo(() => {
    return responseJiraUrl || jiraUrl || '';
  }, [responseJiraUrl, jiraUrl]);

  const handleIssueKeyClick = useCallback((issueKey: string) => {
    if (effectiveJiraUrl && issueKey) {
      window.open(`${effectiveJiraUrl}/browse/${issueKey}`, '_blank');
    }
  }, [effectiveJiraUrl]);

  const handleOpenAllInJira = useCallback(() => {
    if (!effectiveJiraUrl || issues.length === 0) return;
    
    const issueKeys = issues
      .map(issue => issue.issue_key)
      .filter((key): key is string => Boolean(key));
    
    if (issueKeys.length === 0) return;
    
    const keysParam = issueKeys.join(',');
    const jql = encodeURIComponent(`key IN (${keysParam})`);
    const jiraLink = `${effectiveJiraUrl}/issues/?jql=${jql}`;
    window.open(jiraLink, '_blank', 'noopener,noreferrer');
  }, [effectiveJiraUrl, issues]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  // Define table columns - enhance issue_key to be clickable like IssuesDialog
  const columns = useMemo<Column<ValidationIssue>[]>(() => [
    {
      key: 'issue_key',
      label: 'Issue Key',
      sortable: true,
      width: '120px',
      align: 'left',
      render: (value) => {
        if (!effectiveJiraUrl) {
          return <span className="text-sm font-medium text-content-primary">{value}</span>;
        }
        
        return (
          <button
            onClick={() => handleIssueKeyClick(value)}
            className="text-brand hover:text-blue-800 hover:underline cursor-pointer font-medium"
            title={`Open ${value} in Jira`}
          >
            {value}
          </button>
        );
      },
    },
    {
      key: 'issue_summary',
      label: 'Summary',
      sortable: true,
      align: 'left',
    },
    {
      key: 'issue_type',
      label: 'Type',
      sortable: true,
      width: '100px',
    },
    {
      key: 'team_name',
      label: 'Team',
      sortable: true,
      width: '150px',
      align: 'left',
    },
    {
      key: 'status_category',
      label: 'Status Category',
      sortable: true,
      width: '150px',
    },
    {
      key: 'additional_comment',
      label: 'Details',
      sortable: false,
      align: 'left',
    },
  ], [effectiveJiraUrl, handleIssueKeyClick]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-brand hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-content-primary">{metricLabel}</h1>
            {tooltip && (
              <p className="text-sm text-content-secondary mt-1">
                {tooltip}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <p className="text-sm text-content-secondary">
                {issues.length} {issues.length === 1 ? 'issue' : 'issues'} found
              </p>
              {effectiveJiraUrl && issues.length > 0 && (
                <button
                  onClick={handleOpenAllInJira}
                  className="px-3 py-1.5 text-sm bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded transition-colors"
                  disabled={!effectiveJiraUrl || issues.length === 0}
                >
                  Open all in Jira
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table - DataTable handles sticky headers automatically */}
      <DataTable
        data={issues}
        columns={columns}
        sortConfig={sortConfig}
        onSort={handleSort}
        loading={loading}
        error={error}
        emptyMessage="No issues found for this validation"
        maxHeight="calc((100vh - 280px) * 0.9 - 30px)"
        striped
        hoverable
      />
    </div>
  );
}

