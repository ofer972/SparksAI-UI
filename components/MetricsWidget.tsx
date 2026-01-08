'use client';

import React from 'react';
import TeamMetrics from './TeamMetrics';
import PIMetrics from './PIMetrics';
import type { MetricsSelection } from './MetricsSelector';

interface MetricsWidgetProps {
  metricsConfig: MetricsSelection;
}

export default function MetricsWidget({ metricsConfig }: MetricsWidgetProps) {
  const { metricsType, teamName, piName, isGroup, selectedMetrics } = metricsConfig;

  if (metricsType === 'team') {
    if (!teamName) return null;
    return <TeamMetrics teamName={teamName} isGroup={isGroup} selectedMetrics={selectedMetrics} />;
  } else {
    if (!piName || !teamName) return null;
    return <PIMetrics piName={piName} selectedMetrics={selectedMetrics} />;
  }
}

