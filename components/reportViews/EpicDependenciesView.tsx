'use client';

import React, { useMemo, useCallback } from 'react';
import type { ReportFiltersUpdater } from '../reportComponentsRegistry';
import ReportCard from '../reporting/ReportCard';
import ReportFiltersRow from '../reporting/ReportFiltersRow';
import ReportFilterField from '../reporting/ReportFilterField';
import DataTable, { Column } from '../DataTable';
import MultiPIFilter from '../MultiPIFilter';
import TeamGroupFilter from '../TeamGroupFilter';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
import { getPITerminology, getPITerminologyPlural, piLabel } from '@/lib/piTerminology';

interface EpicDependencyItem {
 [key: string]: any;
}

interface EpicDependenciesResult {
 inbound?: EpicDependencyItem[];
 outbound?: EpicDependencyItem[];
}

interface EpicDependenciesViewProps {
 data: EpicDependenciesResult | null | undefined;
 loading: boolean;
 error: string | null;
 filters: Record<string, any>;
 setFilters: (updater: ReportFiltersUpdater) => void;
 refresh: () => void;
 meta?: Record<string, any> | null;
 componentProps?: Record<string, any>;
 togglePin?: (filterKey: string) => void;
 pinnedFilters?: string[];
}

// Column label mappings for outbound
const outboundLabelMap: Record<string, string> = {
 'quarter_pi_of_epic': getPITerminology(),
 'owned_team': 'Owning\nTeam',
 'number_of_epics_owned': '# Epics\nOwned',
 'number_of_dependent_teams': '# Dependent\nTeams',
 'number_of_dependent_issues': '# Dependent\nIssues',
 'completed_dependent_issues_count': '# Completed\nDependent\nIssues',
 'relying_on_teams_array': 'Relying On\nTeams',
};

// Column label mappings for inbound
const inboundLabelMap: Record<string, string> = {
 'quarter_pi_of_epic': getPITerminology(),
 'assignee_team': 'Assignee\nTeam',
 'number_of_relying_teams': '# Relying\nTeams',
 'volume_of_work_relied_upon': '# Volume Of\nWork',
 'completed_issues_dependent_count': '# Completed\nIssues',
 'relying_teams_array': 'Relying\nTeams',
};

// Numeric columns that should have minimal width
const numericColumns = [
 'number_of_epics_owned',
 'number_of_dependent_teams',
 'number_of_dependent_issues',
 'completed_dependent_issues_count',
 'number_of_relying_teams',
 'volume_of_work_relied_upon',
 'completed_issues_dependent_count',
];

const buildOutboundColumns = (rows: EpicDependencyItem[] = []): Column<EpicDependencyItem>[] => {
 if (rows.length === 0) {
 return [];
 }

 return Object.keys(rows[0]).map((key) => {
 const isNumeric = numericColumns.includes(key);
 const isPI = key === 'quarter_pi_of_epic';
 const label = outboundLabelMap[key] || key
 .replace(/_/g, ' ')
 .replace(/\b\w/g, (char) => char.toUpperCase());
 
 return {
 key,
 label,
 align: (isNumeric || isPI) ? 'center' as const : 'left' as const,
 sortable: true,
 width: isNumeric ? '80px' : undefined,
 render: (value: any) => {
 if (value === null || value === undefined || value === '') {
 return <span className="text-xs text-content-muted">-</span>;
 }
 if (typeof value === 'number') {
 let colorClass = 'text-content-primary';
 let fontWeight = 'font-normal';
 
 // Color coding for outbound columns
 if (key === 'number_of_dependent_teams') {
 if (value === 4 || value === 5) {
 colorClass = 'text-yellow-600 text-yellow-400';
 fontWeight = 'font-bold';
 } else if (value > 5) {
 colorClass = 'text-danger-text';
 fontWeight = 'font-bold';
 }
 } else if (key === 'number_of_dependent_issues') {
 if (value > 10 && value < 15) {
 colorClass = 'text-yellow-600 text-yellow-400';
 fontWeight = 'font-bold';
 } else if (value >= 15) {
 colorClass = 'text-danger-text';
 fontWeight = 'font-bold';
 }
 }
 
 return (
 <span className={`text-xs ${fontWeight} ${colorClass}`}>
 {Number.isInteger(value) ? value : value.toFixed(2)}
 </span>
 );
 }
 return <span className="text-xs text-content-primary">{String(value)}</span>;
 },
 };
 });
};

const buildInboundColumns = (rows: EpicDependencyItem[] = []): Column<EpicDependencyItem>[] => {
 if (rows.length === 0) {
 return [];
 }

 return Object.keys(rows[0]).map((key) => {
 const isNumeric = numericColumns.includes(key);
 const isPI = key === 'quarter_pi_of_epic';
 const label = inboundLabelMap[key] || key
 .replace(/_/g, ' ')
 .replace(/\b\w/g, (char) => char.toUpperCase());
 
 return {
 key,
 label,
 align: (isNumeric || isPI) ? 'center' as const : 'left' as const,
 sortable: true,
 width: isNumeric ? '80px' : undefined,
 render: (value: any) => {
 if (value === null || value === undefined || value === '') {
 return <span className="text-xs text-content-muted">-</span>;
 }
 if (typeof value === 'number') {
 let colorClass = 'text-content-primary';
 let fontWeight = 'font-normal';
 
 // Color coding for inbound columns
 if (key === 'volume_of_work_relied_upon') {
 if (value >= 20 && value <= 40) {
 colorClass = 'text-yellow-600 text-yellow-400';
 fontWeight = 'font-bold';
 } else if (value > 40) {
 colorClass = 'text-danger-text';
 fontWeight = 'font-bold';
 }
 }
 // Number of relying teams - no color coding (leave it)
 
 return (
 <span className={`text-xs ${fontWeight} ${colorClass}`}>
 {Number.isInteger(value) ? value : value.toFixed(2)}
 </span>
 );
 }
 return <span className="text-xs text-content-primary">{String(value)}</span>;
 },
 };
 });
};

const EpicDependenciesView: React.FC<EpicDependenciesViewProps> = ({
 data,
 loading,
 error,
 filters,
 setFilters,
 refresh,
 meta,
 componentProps,
 togglePin,
 pinnedFilters = [],
}) => {
 const availablePIs = useMemo(() => {
 if (meta && Array.isArray(meta.available_pis)) {
 return meta.available_pis as string[];
 }
 return [];
 }, [meta]);

 const { groups, teams } = useTeamsGroups();
  const teamName = (filters?.team_name as string) ?? '';
 const isGroup = (filters?.isGroup as boolean) ?? false;

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

 const piNames = useMemo(() => {
 const pi = filters.pi;
 if (Array.isArray(pi)) {
 return pi;
 }
 if (typeof pi === 'string' && pi.trim()) {
 return [pi.trim()];
 }
 return [];
 }, [filters.pi]);

 const handlePIsChange = useCallback((selectedPIs: string[]) => {
 setFilters?.((prev) => ({
 ...prev,
 pi: selectedPIs.length > 0 ? selectedPIs : null,
 }));
 }, [setFilters]);

 const handleTeamGroupChange = useCallback(
 (value: string | null, type: 'group' | 'team', name: string) => {
 if (value === null) {
 setFilters?.((prev) => ({
 ...prev,
 team_name: null,
 isGroup: false,
 }));
 } else {
 setFilters?.((prev) => ({
 ...prev,
 team_name: name,
 isGroup: type === 'group',
 }));
 }
 },
 [setFilters]
 );

 const outbound = Array.isArray(data?.outbound) ? data!.outbound : [];
 const inbound = Array.isArray(data?.inbound) ? data!.inbound : [];

 const outboundColumns = useMemo(() => buildOutboundColumns(outbound), [outbound]);
 const inboundColumns = useMemo(() => buildInboundColumns(inbound), [inbound]);

 const filtersContent = (
 <ReportFiltersRow>
 <ReportFilterField label={getPITerminologyPlural()}>
 <MultiPIFilter
 selectedPIs={piNames}
 onPIsChange={handlePIsChange}
 maxSelections={100}
 autoSelectFirst={false}
 pis={availablePIs}
 />
 </ReportFilterField>

 <ReportFilterField label="Team/Group">
 <TeamGroupFilter
 value={teamValue}
 onChange={handleTeamGroupChange}
 placeholder="Select team or group"
 allowClear={true}
 />
 </ReportFilterField>
 </ReportFiltersRow>
 );

 // Generate filter badges for active filters
 const filterBadges = useMemo(() => {
 const badges: { label: string; value: string; filterKey: string; isPinned: boolean }[] = [];
 
 if (piNames.length > 0) {
 badges.push({
 label: getPITerminologyPlural(),
 value: `${piNames.length} selected`,
 filterKey: 'pi',
 isPinned: pinnedFilters.includes('pi'),
 });
 }
 
 if (teamName) {
 badges.push({
 label: isGroup ? 'Group' : 'Team',
 value: teamName,
 filterKey: 'team_name',
 isPinned: pinnedFilters.includes('team_name'),
 });
 }
 
 return badges;
 }, [piNames.length, teamName, isGroup, pinnedFilters]);

 return (
 <ReportCard 
 title="Epic Dependencies" 
 reportId={componentProps?.reportId}
 filters={filtersContent} 
 filterBadges={filterBadges}
 onTogglePin={togglePin}
 onRefresh={refresh}
 onClose={componentProps?.onClose}
 onAIChat={componentProps?.onAIChat}
 readOnly={componentProps?.readOnly}
 hideHeader={componentProps?.hideHeader}
 hideCollapse={componentProps?.hideCollapse}
 >
 {error && (
 <div className="bg-danger-bg border border-danger-border rounded-lg p-4 text-sm text-danger-text">
 {error}
 </div>
 )}

 {!error && (
 <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 h-full">
 <div className="border border-outline rounded-lg p-4 flex flex-col">
 <h3 className="text-md font-semibold text-content-primary mb-3 flex-shrink-0">Outbound Dependency Metrics</h3>
 <div className="flex-1 min-h-0">
 <DataTable<EpicDependencyItem>
 data={outbound}
 columns={outboundColumns.length ? outboundColumns : undefined}
 loading={loading}
 emptyMessage="No outbound dependencies found."
 />
 </div>
 </div>

 <div className="border border-outline rounded-lg p-4 flex flex-col">
 <h3 className="text-md font-semibold text-content-primary mb-3 flex-shrink-0">Inbound Dependency Load</h3>
 <div className="flex-1 min-h-0">
 <DataTable<EpicDependencyItem>
 data={inbound}
 columns={inboundColumns.length ? inboundColumns : undefined}
 loading={loading}
 emptyMessage="No inbound dependencies found."
 />
 </div>
 </div>
 </div>
 )}
 </ReportCard>
 );
};

export default EpicDependenciesView;

