'use client';

import { useMemo } from 'react';
import ReportFiltersRow from '@/components/reporting/ReportFiltersRow';
import ReportFilterField from '@/components/reporting/ReportFilterField';
import RepositoryMultiSelect from './RepositoryMultiSelect';
import TeamGroupFilter from '@/components/filters/TeamGroupSelect';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
import { TIME_PERIOD_OPTIONS } from '@/lib/githubConstants';

interface DORAFiltersProps {
  githubRepoIds: number[];
  environment: string;
  months: number;
  teamName?: string | null;
  isGroup?: boolean;
  onGithubRepoIdsChange: (ids: number[]) => void;
  onEnvironmentChange: (env: string) => void;
  onMonthsChange: (months: number) => void;
  onTeamGroupChange?: (value: string | null, type: 'group' | 'team', name: string) => void;
  availableRepositories: Array<{ id: number; github_repo_id: number; name: string }>;
  availableEnvironments: string[];
}

export default function DORAFilters({
  githubRepoIds,
  environment,
  months,
  teamName,
  isGroup = false,
  onGithubRepoIdsChange,
  onEnvironmentChange,
  onMonthsChange,
  onTeamGroupChange,
  availableRepositories,
  availableEnvironments,
}: DORAFiltersProps) {
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

