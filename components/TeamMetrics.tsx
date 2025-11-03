'use client';

import { useTeamMetrics } from '@/hooks';

interface TeamMetricsProps {
  teamName: string;
}

interface SprintMetricsData {
  velocity: number;
  cycle_time: number;
  predictability: number;
  velocity_status?: 'red' | 'yellow' | 'green';
  cycle_time_status?: 'red' | 'yellow' | 'green';
  predictability_status?: 'red' | 'yellow' | 'green';
  team_name: string;
  sprint_count: number;
}

interface CompletionData {
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
}


interface SprintMetricsResponse {
  success: boolean;
  data: SprintMetricsData;
  message: string;
}

interface CompletionResponse {
  success: boolean;
  data: CompletionData;
  message: string;
}


// Custom Days Left Card with Progress Bar
const DaysLeftCard = ({ daysLeft, daysInSprint, tooltip, className = "" }: {
  daysLeft?: number;
  daysInSprint?: number;
  tooltip: string;
  className?: string;
}) => {
  const formatDaysLeft = (days: number | undefined): string => {
    if (days === undefined || days === null) return "N/A";
    if (days === 1) return "Last day";
    return `${days} days left`;
  };

  const calculateProgress = (): number => {
    if (!daysLeft || !daysInSprint || daysInSprint === 0) return 0;
    // Calculate days passed (not days left) for progress bar
    const daysPassed = daysInSprint - daysLeft;
    return (daysPassed / daysInSprint) * 100;
  };

  const progress = calculateProgress();

  return (
    <div className={`bg-white rounded-lg shadow-sm p-[10.8px] flex flex-col items-center text-center w-full relative group ${className}`}>
      {/* Icon */}
      <div className="w-[28.8px] h-[28.8px] mb-2 flex items-center justify-center text-lg">
        📅
      </div>
      
      {/* Progress Bar - takes same space as value in other cards */}
      <div className="w-full mb-1 flex items-center justify-center" style={{ minHeight: '27.6px' }}>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      {/* Days Left Text (formatted) - at bottom like other labels */}
      <div className="text-xs text-gray-600 mt-auto">
        {formatDaysLeft(daysLeft)}
      </div>
      
      {/* Tooltip */}
      <div className={`absolute bottom-full mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 max-w-xs left-1/2 transform -translate-x-1/2`}>
        {tooltip}
        <div className={`absolute top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800 left-1/2 transform -translate-x-1/2`}></div>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, value, label, tooltip, className = "", isLeftmost = false, status }: { 
  icon: string; 
  value: string; 
  label: string; 
  tooltip: string;
  className?: string;
  isLeftmost?: boolean;
  status?: 'red' | 'yellow' | 'green';
}) => {
  const getStatusColor = (status?: 'red' | 'yellow' | 'green') => {
    switch (status) {
      case 'red':
        return 'text-red-600';
      case 'yellow':
        return 'text-yellow-600';
      case 'green':
        return 'text-green-600';
      default:
        return 'text-gray-800';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-[10.8px] flex flex-col items-center text-center w-full relative group ${className}`}>
      <div className="w-[28.8px] h-[28.8px] mb-2 flex items-center justify-center text-lg">
        {icon}
      </div>
      <div className={`text-[21.6px] font-bold mb-1 ${getStatusColor(status)}`}>
        {value}
      </div>
      <div className="text-xs text-gray-600 break-words text-center">
        {label}
      </div>
      {/* Tooltip */}
      <div className={`absolute bottom-full mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 max-w-xs ${isLeftmost ? 'left-0' : 'left-1/2 transform -translate-x-1/2'}`}>
        {tooltip}
        <div className={`absolute top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800 ${isLeftmost ? 'left-4' : 'left-1/2 transform -translate-x-1/2'}`}></div>
      </div>
    </div>
  );
};

export default function TeamMetrics({ teamName }: TeamMetricsProps) {
  const { sprintMetrics, completionRate, loading, error } = useTeamMetrics(teamName);

  if (loading) {
    return (
      <div className="px-3 pt-3">
      <h3 className="text-lg font-semibold mb-1">Team Metrics</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-[10.8px] animate-pulse">
            <div className="w-[28.8px] h-[28.8px] bg-gray-200 rounded mb-2"></div>
            <div className="h-[21.6px] bg-gray-200 rounded mb-1"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-3 pt-3">
        <h3 className="text-lg font-semibold mb-1">Team Metrics</h3>
        <div className="text-center py-4">
          <div className="text-red-500 text-2xl mb-2">⚠️</div>
          <p className="text-xs text-gray-600">Error loading metrics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pt-3">
      <h3 className="text-lg font-semibold mb-1">Team Metrics</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
        {/* Avg Velocity */}
        <MetricCard
          icon="📈"
          value={sprintMetrics?.velocity?.toString() || "0"}
          label="Avg Velocity"
          tooltip="Average velocity in the last five closed sprints"
          isLeftmost={true}
          status={sprintMetrics?.velocity_status}
        />
        
        {/* Avg Cycle Time */}
        <MetricCard
          icon="⏱️"
          value={sprintMetrics?.cycle_time ? `${sprintMetrics.cycle_time.toFixed(1)}d` : "0d"}
          label="Avg Cycle Time"
          tooltip="Average story cycle time in the last five sprints"
          status={sprintMetrics?.cycle_time_status}
        />
        
        {/* Avg Sprint Predictability */}
        <MetricCard
          icon="📊"
          value={sprintMetrics?.predictability ? `${Math.round(sprintMetrics.predictability)}%` : "0%"}
          label="Avg Sprint Predictability"
          tooltip="Average sprint predictability over last five sprints"
          status={sprintMetrics?.predictability_status}
        />
        
        {/* Work in Progress */}
        <MetricCard
          icon="🔄"
          value={completionRate?.in_progress_issues?.toString() || "0"}
          label="Work in Progress"
          tooltip="Number of issues in progress in the current active sprint"
          status={completionRate?.in_progress_issues_status}
        />
        
        {/* Completion */}
        <MetricCard
          icon="🎯"
          value={completionRate?.percent_completed ? `${Math.round(completionRate.percent_completed)}%` : "0%"}
          label="Completion"
          tooltip="Completed issues (%) in the current active sprint"
          status={completionRate?.percent_completed_status}
        />
        
        {/* Days Left */}
        <DaysLeftCard
          daysLeft={completionRate?.days_left}
          daysInSprint={completionRate?.days_in_sprint}
          tooltip="Number of days remaining in the current active sprint"
        />
      </div>
    </div>
  );
}
