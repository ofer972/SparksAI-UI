'use client';

import ReportFiltersRow from '@/components/reporting/ReportFiltersRow';
import ReportFilterField from '@/components/reporting/ReportFilterField';
import RepositoryMultiSelect from './RepositoryMultiSelect';
import { TIME_PERIOD_OPTIONS } from '@/lib/githubConstants';

interface PRWorkflowFiltersProps {
  githubRepoIds: number[];
  months: number;
  prState: string;
  onGithubRepoIdsChange: (ids: number[]) => void;
  onMonthsChange: (months: number) => void;
  onPrStateChange: (state: string) => void;
  availableRepositories: Array<{ id: number; github_repo_id: number; name: string }>;
}

const prStateOptions = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'merged', label: 'Merged' },
];

export default function PRWorkflowFilters({
  githubRepoIds,
  months,
  prState,
  onGithubRepoIdsChange,
  onMonthsChange,
  onPrStateChange,
  availableRepositories,
}: PRWorkflowFiltersProps) {
  return (
    <ReportFiltersRow>
      <ReportFilterField label="Repositories">
        <RepositoryMultiSelect
          githubRepoIds={githubRepoIds}
          availableRepositories={availableRepositories}
          onGithubRepoIdsChange={onGithubRepoIdsChange}
        />
      </ReportFilterField>

      <ReportFilterField label="PR State">
        <select
          value={prState}
          onChange={(e) => onPrStateChange(e.target.value)}
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {prStateOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </ReportFilterField>

      <ReportFilterField label="Time Period">
        <select
          value={months}
          onChange={(e) => onMonthsChange(Number(e.target.value))}
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
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

