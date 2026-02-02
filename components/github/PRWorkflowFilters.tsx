'use client';

import { useMemo } from 'react';
import ReportFiltersRow from '@/components/reporting/ReportFiltersRow';
import ReportFilterField from '@/components/reporting/ReportFilterField';
import RepositoryMultiSelect from './RepositoryMultiSelect';
import TeamGroupFilter from '@/components/filters/TeamGroupSelect';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
import { TIME_PERIOD_OPTIONS } from '@/lib/githubConstants';

interface PRWorkflowFiltersProps {
  githubRepoIds: number[];
  months: number;
  prState: string;
  teamName?: string | null;
  isGroup?: boolean;
  onGithubRepoIdsChange: (ids: number[]) => void;
  onMonthsChange: (months: number) => void;
  onPrStateChange: (state: string) => void;
  onTeamGroupChange?: (value: string | null, type: 'group' | 'team', name: string) => void;
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
  teamName,
  isGroup = false,
  onGithubRepoIdsChange,
  onMonthsChange,
  onPrStateChange,
  onTeamGroupChange,
  availableRepositories,
}: PRWorkflowFiltersProps) {
  const { groups, teams } = useTeamsGroups();

  // Look up ID from name to construct proper teamValue
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

  const handleTeamGroupChange = (value: string | null, type: 'group' | 'team', name: string) => {
    if (onTeamGroupChange) {
      onTeamGroupChange(value, type, name);
    }
  };

  return (
    <ReportFiltersRow>
      <ReportFilterField label="Team/Group">
        <TeamGroupFilter
          value={teamValue}
          onChange={handleTeamGroupChange}
          placeholder="Select team or group"
          allowClear={true}
          size="xs"
        />
      </ReportFilterField>

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
          className="px-2 py-1 border border-outline rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-surface text-content-primary"
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

