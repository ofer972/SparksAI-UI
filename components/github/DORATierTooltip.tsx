'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/api';

interface TierDefinition {
  tier: string;
  label: string;
  description: string;
}

interface MetricTierThresholds {
  metric: string;
  tier_definitions: {
    elite?: TierDefinition;
    high?: TierDefinition;
    medium?: TierDefinition;
    low?: TierDefinition;
  };
}

interface DORATierTooltipProps {
  metric: string; // e.g., "deployment_frequency"
  onClose: () => void;
}

// Tier colors matching DORATierBadge
const tierColors: Record<string, { bg: string; text: string; border: string }> = {
  elite: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-300' },
  high: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300' },
  medium: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-300' },
  low: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-300' },
};

const tierOrder = ['elite', 'high', 'medium', 'low'] as const;

// Format metric name to readable format and get description
const formatMetricName = (metric: string): string => {
  const metricMap: Record<string, string> = {
    'deployment_frequency': 'Deployment Frequency, how often you deploy',
    'time_to_restore': 'Failed Deployment Recovery Time, how quickly you recover from failed deployments',
    'change_failure_rate': 'Change Failure Rate, percentage of deployments that fail',
    'lead_time': 'Lead Time, time from commit to deployment',
  };
  return metricMap[metric] || metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function DORATierTooltip({ metric, onClose }: DORATierTooltipProps) {
  const [tiers, setTiers] = useState<MetricTierThresholds | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTiers();
  }, [metric]);

  const fetchTiers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(`/api/v1/github-service/dora/tiers/${metric}`);
      if (!response.ok) {
        throw new Error(`Failed to load tiers: ${response.statusText}`);
      }
      const data = await response.json();
      setTiers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching tiers');
      console.error('Failed to load tiers', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-[462px] bg-white border-2 border-gray-300 rounded-lg shadow-2xl p-2.5">
      <div className="flex justify-between items-start mb-1.5">
        {tiers && (
          <p className="text-sm text-gray-600 pr-2">
            <span className="font-semibold">Tier:</span> {formatMetricName(tiers.metric)}
          </p>
        )}
        <button 
          onClick={onClose} 
          className="text-gray-400 hover:text-gray-600 text-lg leading-none flex-shrink-0"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      
      {loading ? (
        <div className="text-center py-3 text-gray-500 text-sm">Loading tier definitions...</div>
      ) : error ? (
        <div className="text-center py-3 text-red-600 text-sm">{error}</div>
      ) : tiers ? (
        <div className="space-y-1">
          {tierOrder.map((tierKey) => {
            const tierDef = tiers.tier_definitions[tierKey];
            if (!tierDef) return null;
            
            const colors = tierColors[tierKey] || tierColors.low;
            
            return (
              <div
                key={tierKey}
                className={`${colors.bg} ${colors.border} border-2 rounded-md px-2 py-1`}
              >
                <div className="flex items-center justify-between">
                  <span className={`${colors.text} font-bold text-sm`}>
                    {tierDef.label}
                  </span>
                </div>
                <p className={`${colors.text} text-xs mt-0.5`}>
                  {tierDef.description}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

