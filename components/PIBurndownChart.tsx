'use client';

import React, { useEffect, useState } from 'react';
import { BurndownDataPoint } from '@/lib/api';
import { getDefaultIssueType } from '@/lib/issueTypes';
import BurndownChart from './BurndownChart';
import { usePIBurndown } from '@/hooks';

interface PIBurndownChartProps {
  piName: string;
  issueType?: string;
  teamName?: string;
  project?: string;
  onPINameChange?: (piName: string) => void;
  isVisible?: boolean;
}

export default function PIBurndownChart({ 
  piName,
  issueType = getDefaultIssueType('burndown'),
  teamName,
  project,
  onPINameChange,
  isVisible = true
}: PIBurndownChartProps) {
  const { data, loading, error } = usePIBurndown(piName, issueType, teamName, project);
  const [piInfo, setPIInfo] = useState<{
    pi_name: string;
    start_date: string;
    end_date: string;
  } | null>(null);

  useEffect(() => {
    if (!isVisible) return;
    
    // Extract PI info from current data
    if (data && data.length > 0) {
      const firstDataPoint = data[0];
      const piNameToUse = (firstDataPoint as any).pi_name || piName;
      setPIInfo({
        pi_name: piNameToUse,
        start_date: firstDataPoint.start_date,
        end_date: firstDataPoint.end_date,
      });
      if (onPINameChange) {
        onPINameChange(piNameToUse);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, data]);

  return <BurndownChart data={data} loading={loading} error={error} />;
}

