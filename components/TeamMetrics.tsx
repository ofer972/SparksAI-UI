'use client';

import { useState, useEffect } from 'react';

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

const MetricCard = ({ icon, value, label, className = "" }: { 
  icon: string; 
  value: string; 
  label: string; 
  className?: string; 
}) => (
  <div className={`bg-white rounded-lg shadow-sm p-3 flex flex-col items-center text-center w-[70%] ${className}`}>
    <div className="w-8 h-8 mb-2 flex items-center justify-center text-lg">
      {icon}
    </div>
    <div className="text-2xl font-bold text-gray-800 mb-1">
      {value}
    </div>
    <div className="text-xs text-gray-600">
      {label}
    </div>
  </div>
);

export default function TeamMetrics({ teamName }: TeamMetricsProps) {
  const [sprintMetrics, setSprintMetrics] = useState<SprintMetricsData | null>(null);
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [workInProgressData, setWorkInProgressData] = useState<WorkInProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!teamName) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch all three endpoints in parallel
        const [sprintResponse, completionResponse, wipResponse] = await Promise.all([
          fetch(`https://sparksai-backend-production.up.railway.app/api/v1/team-metrics/get-avg-sprint-metrics?team_name=${teamName}`),
          fetch(`https://sparksai-backend-production.up.railway.app/api/v1/team-metrics/current-sprint-completion?team_name=${teamName}`),
          fetch(`https://sparksai-backend-production.up.railway.app/api/v1/team-metrics/count-in-progress?team_name=${teamName}`)
        ]);

        // Process sprint metrics
        if (sprintResponse.ok) {
          const sprintData: SprintMetricsResponse = await sprintResponse.json();
          if (sprintData.success) {
            setSprintMetrics(sprintData.data);
          }
        }

        // Process completion data
        if (completionResponse.ok) {
          const completionData: CompletionResponse = await completionResponse.json();
          if (completionData.success) {
            setCompletionData(completionData.data);
          }
        }

        // Process work in progress data
        if (wipResponse.ok) {
          const wipData: WorkInProgressResponse = await wipResponse.json();
          if (wipData.success) {
            setWorkInProgressData(wipData.data);
          }
        }

      } catch (err) {
        console.error('Error fetching metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    };

    if (teamName) {
      fetchMetrics();
    }
  }, [teamName]);

  if (loading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Team Metrics</h3>
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
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Team Metrics</h3>
        <div className="text-center py-4">
          <div className="text-red-500 text-2xl mb-2">⚠️</div>
          <p className="text-xs text-gray-600">Error loading metrics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Team Metrics</h3>
      <div className="grid grid-cols-5 gap-6">
        {/* Avg Velocity */}
        <MetricCard
          icon="📈"
          value={sprintMetrics?.velocity?.toString() || "0"}
          label="Avg Velocity"
        />
        
        {/* Avg Cycle Time */}
        <MetricCard
          icon="⏱️"
          value={sprintMetrics?.cycle_time ? `${sprintMetrics.cycle_time}d` : "0d"}
          label="Avg Cycle Time"
        />
        
        {/* Avg Sprint Predictability */}
        <MetricCard
          icon="📊"
          value={sprintMetrics?.predictability ? `${sprintMetrics.predictability}%` : "0%"}
          label="Avg Sprint Predictability"
        />
        
        {/* Work in Progress */}
        <MetricCard
          icon="🔄"
          value={workInProgressData?.total_in_progress?.toString() || "0"}
          label="Work in Progress"
        />
        
        {/* Completion */}
        <MetricCard
          icon="🎯"
          value={completionData?.completion_rate ? `${completionData.completion_rate}%` : "0%"}
          label="Completion"
        />
      </div>
    </div>
  );
}
