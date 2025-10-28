'use client';

import React, { useEffect, useState } from 'react';
import { ApiService, BurndownDataPoint } from '@/lib/api';
import { getDefaultIssueType } from '@/lib/issueTypes';
import BurndownChart from './BurndownChart';

interface PIBurndownChartProps {
  piName: string;
  issueType?: string;
  teamName?: string;
  project?: string;
  onPINameChange?: (piName: string) => void;
}

export default function PIBurndownChart({ 
  piName,
  issueType = getDefaultIssueType('burndown'),
  teamName,
  project,
  onPINameChange
}: PIBurndownChartProps) {
  const [data, setData] = useState<BurndownDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [piInfo, setPIInfo] = useState<{
    pi_name: string;
    start_date: string;
    end_date: string;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!piName) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const apiService = new ApiService();
        const response = await apiService.getPIBurndownData(piName, issueType, teamName, project);
        
        setData(response.data.burndown_data);
        
        // Extract PI info from the first data point if available
        if (response.data.burndown_data && response.data.burndown_data.length > 0) {
          const firstDataPoint = response.data.burndown_data[0];
          const piNameToUse = firstDataPoint.pi_name || response.data.pi || piName;
          
          setPIInfo({
            pi_name: piNameToUse,
            start_date: firstDataPoint.start_date,
            end_date: firstDataPoint.end_date,
          });
          
          // Notify parent component of the PI name
          if (onPINameChange) {
            onPINameChange(piNameToUse);
          }
        }
      } catch (err) {
        console.error('Error fetching PI burndown:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch PI burndown data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piName, issueType, teamName, project]);

  return <BurndownChart data={data} loading={loading} error={error} />;
}

