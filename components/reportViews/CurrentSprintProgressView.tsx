'use client';

import React from 'react';
import ReportCard from '../reporting/ReportCard';

interface CompletionRate {
  days_left?: number;
  days_in_sprint?: number;
  total_issues: number;
  completed_issues: number;
  in_progress_issues: number;
  todo_issues: number;
  percent_completed: number;
  percent_completed_status?: 'red' | 'yellow' | 'green';
  in_progress_issues_status?: 'red' | 'yellow' | 'green';
  team_name: string;
  sprint_name?: string;
}

interface CurrentSprintProgressViewProps {
  data: CompletionRate | null;
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  refresh: () => void;
}

const ProgressBar: React.FC<{ value: number; colorClass: string }> = ({ value, colorClass }) => (
  <div className="w-full bg-gray-200 rounded-full h-4">
    <div
      className={`${colorClass} h-4 rounded-full text-center text-white text-xs leading-4`}
      style={{ width: `${value}%` }}
    >
      {(value || 0).toFixed(0)}%
    </div>
  </div>
);

const MetricDisplay: React.FC<{ label: string; value: string | number | undefined; status?: string }> = ({ label, value, status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'red': return 'text-red-500';
      case 'yellow': return 'text-yellow-500';
      case 'green': return 'text-green-500';
      default: return 'text-gray-900';
    }
  };

  return (
    <div className="text-center">
      <div className="text-sm text-gray-600">{label}</div>
      <div className={`text-2xl font-bold ${getStatusColor()}`}>{value ?? '-'}</div>
    </div>
  );
};

const CurrentSprintProgressView: React.FC<CurrentSprintProgressViewProps> = ({
  data,
  loading,
  error,
  filters,
  refresh,
}) => {
  if (loading) {
    return (
      <ReportCard title="Current Sprint Progress" onRefresh={refresh}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </ReportCard>
    );
  }

  if (error) {
    return (
      <ReportCard title="Current Sprint Progress" onRefresh={refresh}>
        <div className="text-red-500 p-4">{error}</div>
      </ReportCard>
    );
  }
  
  if (!data) {
    return (
      <ReportCard title="Current Sprint Progress" onRefresh={refresh}>
        <div className="text-gray-500 p-4">No active sprint found for team '{filters.team_name}'.</div>
      </ReportCard>
    );
  }

  const {
    sprint_name,
    percent_completed,
    percent_completed_status,
    days_left,
    total_issues,
    completed_issues,
    in_progress_issues,
    todo_issues,
  } = data;

  const getProgressColor = () => {
    switch (percent_completed_status) {
      case 'red': return 'bg-red-500';
      case 'yellow': return 'bg-yellow-500';
      case 'green': return 'bg-green-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <ReportCard title="Current Sprint Progress" onRefresh={refresh}>
      <div className="p-4 h-full flex flex-col justify-between">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold">{sprint_name}</h3>
        </div>
        
        {percent_completed !== undefined && percent_completed !== null && (
          <div className="mb-4">
            <ProgressBar value={percent_completed} colorClass={getProgressColor()} />
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricDisplay label="Days Left" value={days_left} />
          <MetricDisplay label="Completed" value={completed_issues} status="green" />
          <MetricDisplay label="In Progress" value={in_progress_issues} status="yellow" />
          <MetricDisplay label="To Do" value={todo_issues} status="red" />
        </div>
      </div>
    </ReportCard>
  );
};

export default CurrentSprintProgressView;
