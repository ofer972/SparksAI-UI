'use client';

import { useState, useEffect } from 'react';
import { ApiService } from '@/lib/api';
import { getCleanJiraUrl } from '@/lib/config';
import KPICard from '../KPICard';
import ValidationIssuesView from './ValidationIssuesView';

interface ValidationMetric {
  metric_id: string;
  label: string;
  value: string;
  tier_status: string;
  description: string;
  tooltip: string;
  alternative_text?: string | null;
  trend?: any;
  action?: {
    type: 'report';
    report_ids: string[];
    params: Record<string, any>;
  };
}

export default function ValidationsReportView() {
  const [metrics, setMetrics] = useState<ValidationMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for selected validation
  const [selectedMetric, setSelectedMetric] = useState<ValidationMetric | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const [meta, setMeta] = useState<Record<string, any> | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiService = new ApiService();
      const data = await apiService.getValidationSummaryMetrics();
      setMetrics(data);
      // Note: validation summary returns array, meta would be in validation issues response
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load validation metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (metric: ValidationMetric) => {
    setSelectedMetric(metric);
  };

  const handleBack = () => {
    setSelectedMetric(null);
  };

  // Get Jira URL - prefer meta from API, fallback to config
  const jiraUrl = meta?.jira_url || getCleanJiraUrl();

  // If a metric is selected, show the issues view
  if (selectedMetric && selectedMetric.action?.params) {
    return (
      <ValidationIssuesView
        validationType={selectedMetric.action.params.validation_type}
        metricLabel={selectedMetric.label}
        filters={selectedMetric.action.params}
        onBack={handleBack}
        jiraUrl={jiraUrl}
      />
    );
  }

  // Show cards view
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-content-primary">Validation Reports</h1>
        <p className="text-sm text-content-secondary mt-1">
          Click on any card to view detailed issues
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm text-content-tertiary">Loading validation metrics...</span>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="w-12 h-12 text-danger-text mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-danger-text">{error}</p>
            <button
              onClick={fetchMetrics}
              className="mt-3 text-sm text-brand hover:text-blue-800 dark:hover:text-blue-300 underline"
            >
              Try again
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-8">
          {metrics.map((metric) => (
            <KPICard
              key={metric.metric_id}
              metricId={metric.metric_id}
              label={metric.label}
              value={metric.value}
              tierStatus={metric.tier_status || null}
              description={metric.description}
              tooltip={metric.tooltip}
              alternative_text={metric.alternative_text || null}
              trend={metric.trend || null}
              onClick={() => handleCardClick(metric)}
              size="large"
            />
          ))}
        </div>
      )}
    </div>
  );
}

