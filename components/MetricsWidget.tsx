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
  refreshKey?: number; // Trigger refetch with bypass_cache when this changes
}

export default function MetricsWidget({ 
  metricsConfig, 
  teamNameOverride, 
  piNameOverride, 
  isGroupOverride,
  refreshKey
}: MetricsWidgetProps) {
  const { metricsType, selectedMetrics } = metricsConfig;
  
  // Use overrides if provided, otherwise fallback to config
  const teamName = teamNameOverride !== undefined ? teamNameOverride : metricsConfig.teamName;
  const piName = piNameOverride !== undefined ? piNameOverride : metricsConfig.piName;
  const isGroup = isGroupOverride !== undefined ? isGroupOverride : metricsConfig.isGroup;

  console.log('[MetricsWidget] Rendering with:', {
    metricsType,
    teamName,
    piName,
    isGroup,
    teamNameOverride,
    isGroupOverride,
    configIsGroup: metricsConfig.isGroup,
    refreshKey,
  });

  if (metricsType === 'team') {
    if (!teamName) return null;
    return <TeamMetrics teamName={teamName} isGroup={isGroup} selectedMetrics={selectedMetrics} refreshKey={refreshKey} />;
  } else {
    if (!piName || !teamName) return null;
    return <PIMetrics piName={piName} selectedMetrics={selectedMetrics} refreshKey={refreshKey} />;
  }
}

