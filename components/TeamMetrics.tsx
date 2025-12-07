'use client';

import { useState } from 'react';
import { useTeamMetrics } from '@/hooks';
import { LineChart, Line, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendDataPoint } from '@/lib/config';

interface TeamMetricsProps {
  teamName?: string;
  isGroup?: boolean;
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


// Format date for tooltip
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Format value based on metric type
const formatValue = (value: number, metricType: 'velocity' | 'cycle_time' | 'predictability'): string => {
  if (metricType === 'cycle_time') {
    return `${value.toFixed(1)}d`;
  } else if (metricType === 'predictability') {
    return `${Math.round(value)}%`;
  }
  return value.toString();
};

// Trend Line Component with Recharts
const TrendLine = ({ 
  data, 
  metricType 
}: { 
  data: TrendDataPoint[]; 
  metricType: 'velocity' | 'cycle_time' | 'predictability';
}) => {
  if (!data || data.length === 0) return null;

  const dataKey = metricType;
  const height = 32;

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as TrendDataPoint;
      const value = payload[0].value;
      return (
        <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 shadow-lg">
          <p className="font-semibold">{formatDate(dataPoint.sprint_complete_date)}</p>
          <p className="text-blue-300">{formatValue(value, metricType)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line
            type="linear"
            dataKey={dataKey}
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
          <Tooltip content={<CustomTooltip />} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

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
      className={`bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 p-4 flex flex-col items-center text-center h-full relative ${className}`}
      onMouseEnter={() => setActiveTooltip(id)}
      onMouseLeave={() => setActiveTooltip(null)}
    >
      {/* Icon */}
      <div className="w-8 h-8 mb-2 flex items-center justify-center text-2xl rounded">
        📅
      </div>
      
      {/* Progress Bar - takes same space as value in other cards */}
      <div className="w-full mb-2 flex items-center justify-center" style={{ minHeight: '24px' }}>
        <div className="w-full bg-gradient-to-r from-gray-100 to-gray-200 rounded-full h-2 shadow-inner">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300 shadow-sm"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      {/* Days Left Text (formatted) - at bottom like other labels */}
      <div className="text-xs text-gray-700 mt-auto font-semibold">
        {formatDaysLeft(daysLeft)}
      </div>
      
      {/* Tooltip */}
      <div 
        className={`absolute bottom-full mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded transition-opacity duration-200 pointer-events-none z-[100] max-w-xs left-1/2 transform -translate-x-1/2 ${isTooltipVisible ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        style={{ 
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          minWidth: '200px',
          maxWidth: '300px'
        }}
      >
        {tooltip}
        <div className={`absolute top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800 left-1/2 transform -translate-x-1/2`}></div>
      </div>
    </div>
  );
};

const MetricCard = ({ id, icon, value, label, tooltip, className = "", isLeftmost = false, status, trendData, metricType, activeTooltip, setActiveTooltip }: { 
  id: string;
  icon: string; 
  value: string; 
  label: string; 
  tooltip: string;
  className?: string;
  isLeftmost?: boolean;
  status?: 'red' | 'yellow' | 'green';
  trendData?: TrendDataPoint[];
  metricType?: 'velocity' | 'cycle_time' | 'predictability';
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
      className={`bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 p-4 flex flex-col items-center text-center h-full relative ${className}`}
      onMouseEnter={() => setActiveTooltip(id)}
      onMouseLeave={() => setActiveTooltip(null)}
    >
      {/* Show trend line if data exists, otherwise show icon */}
      {trendData && trendData.length > 0 && metricType ? (
        <div className="w-full mb-2 flex items-center justify-center" style={{ minHeight: '32px' }}>
          <TrendLine data={trendData} metricType={metricType} />
        </div>
      ) : (
        <div className="w-8 h-8 mb-2 flex items-center justify-center text-2xl rounded">
          {icon}
        </div>
      )}
      <div className={`text-lg font-bold mb-1.5 ${getStatusColor(status)}`}>
        {value}
      </div>
      <div className="text-xs text-gray-700 break-words text-center font-semibold">
        {label}
      </div>
      {/* Tooltip */}
      <div 
        className={`absolute bottom-full mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded transition-opacity duration-200 pointer-events-none z-[100] max-w-xs ${isLeftmost ? 'left-0' : 'left-1/2 transform -translate-x-1/2'} ${isTooltipVisible ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        style={{ 
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          minWidth: '200px',
          maxWidth: '300px'
        }}
      >
        {tooltip}
        <div className={`absolute top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800 ${isLeftmost ? 'left-4' : 'left-1/2 transform -translate-x-1/2'}`}></div>
      </div>
    </div>
  );
};

export default function TeamMetrics({ teamName, isGroup }: TeamMetricsProps) {
  const { sprintMetrics, completionRate, loading, error } = useTeamMetrics(teamName, isGroup);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Don't render if no team name is provided or if it's the placeholder text
  if (!teamName || 
      teamName.trim() === '' || 
      teamName === 'Select team or group' ||
      teamName.trim() === 'Select team or group') {
    return null;
  }

  if (loading) {
    return (
      <div className="overflow-x-hidden">
        <div className="grid gap-3 w-full" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm p-4 animate-pulse h-full">
              <div className="w-8 h-8 bg-transparent rounded mb-2 mx-auto"></div>
              <div className="h-5 bg-gray-200 rounded mb-1.5"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    // Check if error is related to missing team/group - show empty state instead of error
    const isTeamNotFoundError = 
      typeof error === 'string' && (
        error.includes("Team '") && error.includes("' not found") ||
        error.includes('404: Team') ||
        error.includes('Team not found') ||
        error.includes('Group not found') ||
        error.includes("Group '") && error.includes("' not found")
      );
    
    if (isTeamNotFoundError) {
      // Return empty state instead of error
      return null;
    }
    
    return (
      <div className="overflow-x-hidden">
        <div className="text-center py-4">
          <div className="text-red-500 text-2xl mb-2">⚠️</div>
          <p className="text-xs text-gray-700 font-semibold">Error loading metrics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="grid gap-3 w-full" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        {/* Avg Velocity */}
        <MetricCard
          id="velocity"
          icon="📈"
          value={sprintMetrics?.velocity?.toString() || "0"}
          label="Avg Velocity"
          tooltip="Average velocity in the last five closed sprints"
          isLeftmost={true}
          status={sprintMetrics?.velocity_status}
          trendData={sprintMetrics?.trend_data}
          metricType="velocity"
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
          trendData={sprintMetrics?.trend_data}
          metricType="cycle_time"
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
          trendData={sprintMetrics?.trend_data}
          metricType="predictability"
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
