'use client';

import { useTeamMetrics } from '@/hooks';

interface TeamMetricsProps {
  teamName: string;
}

interface SprintMetricsData {
  velocity: number;
  cycle_time: number;
  predictability: number;
  team_name: string;
  sprint_count: number;
}

interface CompletionData {
  completion_rate: number;
  team_name: string;
}

interface WorkInProgressData {
  total_in_progress: number;
  count_by_type: {
    Task: number;
    Story: number;
  };
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

interface WorkInProgressResponse {
  success: boolean;
  data: WorkInProgressData;
  message: string;
}

const MetricCard = ({ icon, value, label, tooltip, className = "", isLeftmost = false }: { 
  icon: string; 
  value: string; 
  label: string; 
  tooltip: string;
  className?: string;
  isLeftmost?: boolean;
}) => (
  <div className={`bg-white rounded-lg shadow-sm p-3 flex flex-col items-center text-center w-[70%] relative group ${className}`}>
    <div className="w-8 h-8 mb-2 flex items-center justify-center text-lg">
      {icon}
    </div>
    <div className="text-2xl font-bold text-gray-800 mb-1">
      {value}
    </div>
    <div className="text-xs text-gray-600">
      {label}
    </div>
    {/* Tooltip */}
    <div className={`absolute bottom-full mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 max-w-xs ${isLeftmost ? 'left-0' : 'left-1/2 transform -translate-x-1/2'}`}>
      {tooltip}
      <div className={`absolute top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800 ${isLeftmost ? 'left-4' : 'left-1/2 transform -translate-x-1/2'}`}></div>
    </div>
  </div>
);

export default function TeamMetrics({ teamName }: TeamMetricsProps) {
  const { sprintMetrics, completionRate, inProgressCount, loading, error } = useTeamMetrics(teamName);

  if (loading) {
    return (
      <div className="px-3 pt-3">
        <h3 className="text-lg font-semibold mb-1">Team Metrics</h3>
        <div className="grid grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-3 animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-6 bg-gray-200 rounded mb-1"></div>
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
      <div className="grid grid-cols-5 gap-6">
        {/* Avg Velocity */}
        <MetricCard
          icon="📈"
          value={sprintMetrics?.velocity?.toString() || "0"}
          label="Avg Velocity"
          tooltip="Average velocity in the last five closed sprints"
          isLeftmost={true}
        />
        
        {/* Avg Cycle Time */}
        <MetricCard
          icon="⏱️"
          value={sprintMetrics?.cycle_time ? `${sprintMetrics.cycle_time}d` : "0d"}
          label="Avg Cycle Time"
          tooltip="Average story cycle time in the last five sprints"
        />
        
        {/* Avg Sprint Predictability */}
        <MetricCard
          icon="📊"
          value={sprintMetrics?.predictability ? `${sprintMetrics.predictability}%` : "0%"}
          label="Avg Sprint Predictability"
          tooltip="Average sprint predictability over last five sprints"
        />
        
        {/* Work in Progress */}
        <MetricCard
          icon="🔄"
          value={inProgressCount?.total_in_progress?.toString() || "0"}
          label="Work in Progress"
          tooltip="Number of issues in progress in the current active sprint"
        />
        
        {/* Completion */}
        <MetricCard
          icon="🎯"
          value={completionRate?.completion_rate ? `${completionRate.completion_rate}%` : "0%"}
          label="Completion"
          tooltip="Completed issues (%) in the current active sprint"
        />
      </div>
    </div>
  );
}
