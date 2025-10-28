'use client';

import React, { useEffect, useState } from 'react';
import { ApiService, BurndownDataPoint } from '@/lib/api';
import { getDefaultIssueType } from '@/lib/issueTypes';
import BurndownChart from './BurndownChart';

interface SprintBurndownChartProps {
  teamName?: string;
  issueType?: string;
  sprintName?: string;
  onSprintNameChange?: (sprintName: string) => void;
  isVisible?: boolean;
}

export default function SprintBurndownChart({ 
  teamName = 'AutoDesign-Dev', 
  issueType = getDefaultIssueType('burndown'),
  sprintName,
  onSprintNameChange,
  isVisible = true
}: SprintBurndownChartProps) {
  const [data, setData] = useState<BurndownDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sprintInfo, setSprintInfo] = useState<{
    sprint_name: string;
    start_date: string;
    end_date: string;
  } | null>(null);

  useEffect(() => {
    if (!isVisible) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const apiService = new ApiService();
        const response = await apiService.getBurndownData(teamName, issueType, sprintName);
        
        setData(response.data.burndown_data);
        setSprintInfo({
          sprint_name: response.data.sprint_name || '',
          start_date: response.data.start_date,
          end_date: response.data.end_date,
        });
        
        // Notify parent component of the sprint name
        if (onSprintNameChange && response.data.sprint_name) {
          onSprintNameChange(response.data.sprint_name);
        }
      } catch (err) {
        console.error('Error fetching sprint burndown:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, teamName, issueType, sprintName]);

  return <BurndownChart data={data} loading={loading} error={error} />;
}

