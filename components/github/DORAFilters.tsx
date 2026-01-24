'use client';

import ReportFiltersRow from '@/components/reporting/ReportFiltersRow';
import ReportFilterField from '@/components/reporting/ReportFilterField';
import RepositoryMultiSelect from './RepositoryMultiSelect';
import { TIME_PERIOD_OPTIONS } from '@/lib/githubConstants';

interface DORAFiltersProps {
  githubRepoIds: number[];
  environment: string;
  months: number;
  onGithubRepoIdsChange: (ids: number[]) => void;
  onEnvironmentChange: (env: string) => void;
  onMonthsChange: (months: number) => void;
  availableRepositories: Array<{ id: number; github_repo_id: number; name: string }>;
  availableEnvironments: string[];
}

export default function DORAFilters({
  githubRepoIds,
  environment,
  months,
  onGithubRepoIdsChange,
  onEnvironmentChange,
  onMonthsChange,
  availableRepositories,
  availableEnvironments,
}: DORAFiltersProps) {
  return (
    <ReportFiltersRow>
      <ReportFilterField label="Repositories">
        <RepositoryMultiSelect
          githubRepoIds={githubRepoIds}
          availableRepositories={availableRepositories}
          onGithubRepoIdsChange={onGithubRepoIdsChange}
        />
      </ReportFilterField>

      <ReportFilterField label="Environment">
        <select
          value={environment}
          onChange={(e) => onEnvironmentChange(e.target.value)}
          className="px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-surface text-content-primary"
        >
          <option value="">All Environments</option>
          {availableEnvironments.map((env) => (
            <option key={env} value={env}>
              {env}
            </option>
          ))}
        </select>
      </ReportFilterField>

      <ReportFilterField label="Time Period">
        <select
          value={months}
          onChange={(e) => onMonthsChange(Number(e.target.value))}
          className="px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-surface text-content-primary"
        >
          {TIME_PERIOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </ReportFilterField>
    </ReportFiltersRow>
  );
}

