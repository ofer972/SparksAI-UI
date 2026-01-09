'use client';

import React from 'react';
import TeamMetrics from './TeamMetrics';
import PIMetrics from './PIMetrics';
import type { MetricsSelection } from './MetricsSelector';

interface MetricsWidgetProps {
  metricsConfig: MetricsSelection;
  teamNameOverride?: string;
  piNameOverride?: string;
  isGroupOverride?: boolean;
}

export default function MetricsWidget({ 
  metricsConfig, 
  teamNameOverride, 
  piNameOverride, 
  isGroupOverride 
}: MetricsWidgetProps) {
  const { metricsType, selectedMetrics } = metricsConfig;
  
  // Use overrides if provided, otherwise fallback to config
  const teamName = teamNameOverride !== undefined ? teamNameOverride : metricsConfig.teamName;
  const piName = piNameOverride !== undefined ? piNameOverride : metricsConfig.piName;
  const isGroup = isGroupOverride !== undefined ? isGroupOverride : metricsConfig.isGroup;

  if (metricsType === 'team') {
    if (!teamName) return null;
    return <TeamMetrics teamName={teamName} isGroup={isGroup} selectedMetrics={selectedMetrics} />;
  } else {
    if (!piName || !teamName) return null;
    return <PIMetrics piName={piName} selectedMetrics={selectedMetrics} />;
  }
}

