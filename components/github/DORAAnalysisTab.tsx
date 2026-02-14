'use client';

import DeploymentFrequencyCard from './DeploymentFrequencyCard';
import RecoveryTimeCard from './RecoveryTimeCard';
import ChangeFailureRateCard from './ChangeFailureRateCard';
import LeadTimeCard from './LeadTimeCard';
import GitHubMetricsTab from './GitHubMetricsTab';

export default function DORAAnalysisTab() {
  return (
    <GitHubMetricsTab
      preserveRowMinHeights
      cards={[
        <DeploymentFrequencyCard key="deployment-frequency" />,
        <RecoveryTimeCard key="recovery-time" />,
        <ChangeFailureRateCard key="change-failure-rate" />,
        <LeadTimeCard key="lead-time" />,
      ]}
    />
  );
}

