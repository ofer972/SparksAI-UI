'use client';

import { useState } from 'react';
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
const DaysLeftCard = ({ id, daysLeft, daysInSprint, tooltip, className = "", activeTooltip, setActiveTooltip }: {
  id: string;
  daysLeft?: number;
  daysInSprint?: number;
  tooltip: string;
  className?: string;
  activeTooltip: string | null;
  setActiveTooltip: (id: string | null) => void;
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
  const isTooltipVisible = activeTooltip === id;

  return (
    <div 
      className={`bg-gradient-to-br from-white to-gray-50 rounded-md border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 p-1.5 flex flex-col items-center text-center w-[70%] mx-auto relative ${className}`}
      onMouseEnter={() => setActiveTooltip(id)}
      onMouseLeave={() => setActiveTooltip(null)}
    >
      {/* Icon */}
      <div className="w-5 h-5 mb-1 flex items-center justify-center text-lg bg-gradient-to-br from-blue-50 to-indigo-100 rounded">
        📅
      </div>
      
      {/* Progress Bar - takes same space as value in other cards */}
      <div className="w-full mb-1 flex items-center justify-center" style={{ minHeight: '16px' }}>
        <div className="w-full bg-gradient-to-r from-gray-100 to-gray-200 rounded-full h-1 shadow-inner">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1 rounded-full transition-all duration-300 shadow-sm"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      {/* Days Left Text (formatted) - at bottom like other labels */}
      <div className="text-[9px] text-gray-600 mt-auto font-medium">
        {formatDaysLeft(daysLeft)}
      </div>
      
      {/* Tooltip */}
      <div className={`absolute bottom-full mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 max-w-xs left-1/2 transform -translate-x-1/2 ${isTooltipVisible ? 'opacity-100' : 'opacity-0'}`}>
        {tooltip}
        <div className={`absolute top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800 left-1/2 transform -translate-x-1/2`}></div>
      </div>
    </div>
  );
};

const MetricCard = ({ id, icon, value, label, tooltip, className = "", isLeftmost = false, status, activeTooltip, setActiveTooltip }: { 
  id: string;
  icon: string; 
  value: string; 
  label: string; 
  tooltip: string;
  className?: string;
  isLeftmost?: boolean;
  status?: 'red' | 'yellow' | 'green';
  activeTooltip: string | null;
  setActiveTooltip: (id: string | null) => void;
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

  const isTooltipVisible = activeTooltip === id;

  return (
    <div 
      className={`bg-gradient-to-br from-white to-gray-50 rounded-md border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 p-1.5 flex flex-col items-center text-center w-[70%] mx-auto relative ${className}`}
      onMouseEnter={() => setActiveTooltip(id)}
      onMouseLeave={() => setActiveTooltip(null)}
    >
      <div className="w-5 h-5 mb-1 flex items-center justify-center text-lg bg-gradient-to-br from-blue-50 to-indigo-100 rounded">
        {icon}
      </div>
      <div className={`text-sm font-bold mb-0.5 ${getStatusColor(status)}`}>
        {value}
      </div>
      <div className="text-[9px] text-gray-600 break-words text-center font-medium">
        {label}
      </div>
      {/* Tooltip */}
      <div className={`absolute bottom-full mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 max-w-xs ${isLeftmost ? 'left-0' : 'left-1/2 transform -translate-x-1/2'} ${isTooltipVisible ? 'opacity-100' : 'opacity-0'}`}>
        {tooltip}
        <div className={`absolute top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800 ${isLeftmost ? 'left-4' : 'left-1/2 transform -translate-x-1/2'}`}></div>
      </div>
    </div>
  );
};

export default function TeamMetrics({ teamName }: TeamMetricsProps) {
  const { sprintMetrics, completionRate, loading, error } = useTeamMetrics(teamName);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="overflow-x-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2 lg:gap-1 w-full">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gradient-to-br from-white to-gray-50 rounded-md border border-gray-200 shadow-sm p-1.5 animate-pulse w-[70%] mx-auto">
              <div className="w-5 h-5 bg-gray-200 rounded mb-1"></div>
              <div className="h-3.5 bg-gray-200 rounded mb-0.5"></div>
              <div className="h-2 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="overflow-x-hidden">
        <div className="text-center py-1.5">
          <div className="text-red-500 text-base mb-0.5">⚠️</div>
          <p className="text-[9px] text-gray-600">Error loading metrics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2 lg:gap-1 w-full">
        {/* Avg Velocity */}
        <MetricCard
          id="velocity"
          icon="📈"
          value={sprintMetrics?.velocity?.toString() || "0"}
          label="Avg Velocity"
          tooltip="Average velocity in the last five closed sprints"
          isLeftmost={true}
          status={sprintMetrics?.velocity_status}
          activeTooltip={activeTooltip}
          setActiveTooltip={setActiveTooltip}
        />
        
        {/* Avg Cycle Time */}
        <MetricCard
          id="cycleTime"
          icon="⏱️"
          value={sprintMetrics?.cycle_time ? `${sprintMetrics.cycle_time.toFixed(1)}d` : "0d"}
          label="Avg Cycle Time"
          tooltip="Average story cycle time in the last five sprints"
          status={sprintMetrics?.cycle_time_status}
          activeTooltip={activeTooltip}
          setActiveTooltip={setActiveTooltip}
        />
        
        {/* Avg Sprint Predictability */}
        <MetricCard
          id="predictability"
          icon="📊"
          value={sprintMetrics?.predictability ? `${Math.round(sprintMetrics.predictability)}%` : "0%"}
          label="Avg Sprint Predictability"
          tooltip="Average sprint predictability over last five sprints"
          status={sprintMetrics?.predictability_status}
          activeTooltip={activeTooltip}
          setActiveTooltip={setActiveTooltip}
        />
        
        {/* Work in Progress */}
        <MetricCard
          id="wip"
          icon="🔄"
          value={completionRate?.in_progress_issues?.toString() || "0"}
          label="Work in Progress"
          tooltip="Number of issues in progress in the current active sprint"
          status={completionRate?.in_progress_issues_status}
          activeTooltip={activeTooltip}
          setActiveTooltip={setActiveTooltip}
        />
        
        {/* Completion */}
        <MetricCard
          id="completion"
          icon="🎯"
          value={completionRate?.percent_completed ? `${Math.round(completionRate.percent_completed)}%` : "0%"}
          label="Completion"
          tooltip="Completed issues (%) in the current active sprint"
          status={completionRate?.percent_completed_status}
          activeTooltip={activeTooltip}
          setActiveTooltip={setActiveTooltip}
        />
        
        {/* Days Left */}
        <DaysLeftCard
          id="daysLeft"
          daysLeft={completionRate?.days_left}
          daysInSprint={completionRate?.days_in_sprint}
          tooltip="Number of days remaining in the current active sprint"
          activeTooltip={activeTooltip}
          setActiveTooltip={setActiveTooltip}
        />
      </div>
    </div>
  );
}
