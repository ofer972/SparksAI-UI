'use client';

import PRSizeCard from './PRSizeCard';
import PickupTimeCard from './PickupTimeCard';
import PRMaturityCard from './PRMaturityCard';
import ReworkRateCard from './ReworkRateCard';
import GitHubMetricsTab from './GitHubMetricsTab';

export default function PRQualityMetricsTab() {
  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <GitHubMetricsTab
        cards={[
          <PRSizeCard key="pr-size" />,
          <PickupTimeCard key="pickup-time" />,
          <PRMaturityCard key="pr-maturity" />,
          <ReworkRateCard key="rework-rate" />,
        ]}
      />
    </div>
  );
}


