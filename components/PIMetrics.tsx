'use client';

import { useState } from 'react';
import { usePIMetrics } from '@/hooks';

interface PIMetricsProps {
  piName?: string;
}

interface MetricCardProps {
  title: string | React.ReactNode;
  tooltip: string;
  value?: string | number;
  loading?: boolean;
  icon?: string;
  color?: 'red' | 'yellow' | 'green';
  remainingEpics?: number;
  idealRemaining?: number;
  totalEpics?: number;
  inProgressPercentage?: number;
  dependencies?: Array<{ team: string; uncompletedIssues: number }>;
  activeTooltip: string | null;
  setActiveTooltip: (id: string | null) => void;
  cardId: string;
}

function MetricCard({ 
  title, 
  tooltip, 
  value, 
  loading, 
  icon, 
  color, 
  remainingEpics, 
  idealRemaining, 
  totalEpics, 
  inProgressPercentage, 
  dependencies,
  activeTooltip,
  setActiveTooltip,
  cardId
}: MetricCardProps) {
  // Get color class based on status
  const getColorClass = () => {
    if (color === 'red') return 'text-red-600';
    if (color === 'yellow') return 'text-yellow-600';
    if (color === 'green') return 'text-green-600';
    return 'text-gray-900';
  };

  const isTooltipVisible = activeTooltip === cardId;

  return (
    <div 
      className="relative group flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-3 flex flex-col items-center justify-center min-h-[85px] min-w-[175px] max-w-[208px]"
      onMouseEnter={() => setActiveTooltip(cardId)}
      onMouseLeave={() => setActiveTooltip(null)}
    >
      {/* Tooltip - appears on top */}
      <div 
        className={`absolute bottom-full mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded shadow-xl pointer-events-none z-[100] max-w-xs left-1/2 transform -translate-x-1/2 transition-opacity duration-200 ${
          isTooltipVisible ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        style={{ 
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          minWidth: '200px',
          maxWidth: '300px'
        }}
      >
        {tooltip}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
      </div>

      {/* Icon at top or Epic Closure info or In Progress Epics info */}
      {dependencies && dependencies.length > 0 ? (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-700 text-center whitespace-nowrap">
          Teams with top 3 Dependencies
        </div>
      ) : remainingEpics !== undefined || idealRemaining !== undefined ? (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-700 text-center">
          <div className="whitespace-nowrap">
            Remaining: {remainingEpics !== undefined ? remainingEpics : '-'}, Ideal: {idealRemaining !== undefined ? idealRemaining : '-'}
          </div>
        </div>
      ) : totalEpics !== undefined || inProgressPercentage !== undefined ? (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-700 text-center">
          <div className="whitespace-nowrap">
            Total Epics: {totalEpics !== undefined ? totalEpics : '-'}, WIP%: {inProgressPercentage !== undefined ? Math.round(inProgressPercentage) : '-'}
          </div>
        </div>
      ) : icon ? (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-lg">
          {icon}
        </div>
      ) : null}

      {/* Metric Value Area */}
      <div className="flex-1 flex items-center justify-center pt-4">
        {loading ? (
          <div className="animate-pulse">
            <div className="h-8 w-16 bg-gray-200 rounded"></div>
          </div>
        ) : dependencies && dependencies.length > 0 ? (
          <div className="w-full mt-3">
            <table className="w-full text-xs border border-gray-300 table-fixed">
              <colgroup>
                <col className="w-[72%]" />
                <col className="w-[28%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-300 bg-gray-50">
                  <th className="text-left py-0.5 px-1 font-semibold text-gray-700 border-r border-gray-300">Team</th>
                  <th className="text-center py-0.5 px-1 font-semibold text-gray-700" title="Uncompleted Dependencies">
                    <div className="leading-tight">
                      <div>Uncom.</div>
                      <div>Dep.</div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {dependencies.map((dep, idx) => (
                  <tr key={idx} className="border-b border-gray-300 last:border-b-0">
                    <td className="py-1 px-1.5 text-gray-700 truncate border-r border-gray-300 overflow-hidden" title={dep.team}>
                      {dep.team}
                    </td>
                    <td className="py-1 px-1.5 text-gray-600 text-center">
                      {dep.uncompletedIssues}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={`text-xl font-bold ${getColorClass()}`}>
            {value !== undefined ? value : '-'}
          </div>
        )}
      </div>

      {/* Title at bottom */}
      <div className="mt-auto pt-1 pb-1 w-full">
        <h3 className="text-xs font-semibold text-gray-700 text-center">{title}</h3>
      </div>
    </div>
  );
}

export default function PIMetrics({ piName }: PIMetricsProps) {
  const { metrics, loading, error } = usePIMetrics(piName);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Don't render if no PI name is provided or if it's the placeholder text
  if (!piName || 
      piName.trim() === '' || 
      piName === 'Select PI' ||
      piName.trim() === 'Select PI') {
    return null;
  }

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-12 min-w-max">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3 flex flex-col items-center justify-center min-h-[85px] min-w-[175px] max-w-[208px] animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-5 w-16 bg-gray-200 rounded mb-1.5"></div>
              <div className="h-3 w-20 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    // Check if error is related to missing PI - show empty state instead of error
    const isPINotFoundError = 
      typeof error === 'string' && (
        error.includes("PI '") && error.includes("' not found") ||
        error.includes('404: PI') ||
        error.includes('PI not found')
      );
    
    if (isPINotFoundError) {
      // Return empty state instead of error
      return null;
    }
    
    return (
      <div className="overflow-x-auto">
        <div className="text-center py-4">
          <div className="text-red-500 text-2xl mb-2">⚠️</div>
          <p className="text-xs text-gray-700 font-semibold">Error loading metrics</p>
        </div>
      </div>
    );
  }

  const epicClosureValue = metrics?.epicClosure?.value !== undefined && metrics.epicClosure.value !== null
    ? `${metrics.epicClosure.value.toFixed(1)}%`
    : undefined;

  const inProgressValue = metrics?.inProgressEpics?.count !== undefined && metrics.inProgressEpics.count !== null
    ? metrics.inProgressEpics.count
    : undefined;

  const cycleTimeValue = metrics?.averageCycleTime?.value !== undefined && metrics.averageCycleTime.value !== null
    ? `${metrics.averageCycleTime.value.toFixed(1)} days`
    : undefined;

  const metricsList = [
    {
      cardId: 'epicClosure',
      title: 'Epic Closure',
      tooltip: metrics?.epicClosure?.totalEpics !== undefined && metrics.epicClosure.remainingEpics !== undefined && metrics.epicClosure.idealRemaining !== undefined
        ? `Closure gap from the ideal. Total Epics: ${metrics.epicClosure.totalEpics}. Remaining epics: ${metrics.epicClosure.remainingEpics}. Ideal remaining: ${metrics.epicClosure.idealRemaining}`
        : 'Closure gap from the ideal.',
      value: epicClosureValue,
      color: metrics?.epicClosure?.color,
      icon: '📉',
      remainingEpics: metrics?.epicClosure?.remainingEpics,
      idealRemaining: metrics?.epicClosure?.idealRemaining,
      dependencies: undefined,
    },
    {
      cardId: 'cycleTime',
      title: 'Average Epic Cycle Time',
      tooltip: metrics?.averageCycleTime?.value !== undefined && metrics.averageCycleTime.epicCount !== undefined
        ? `Average cycle time: ${metrics.averageCycleTime.value.toFixed(2)} days (${metrics.averageCycleTime.epicCount} epics completed, last 6 months)`
        : 'Average cycle time of EPIC in the last 6 months',
      value: cycleTimeValue,
      color: metrics?.averageCycleTime?.color,
      icon: '⏱️',
      dependencies: undefined,
    },
    {
      cardId: 'outboundDependencies',
      title: (
        <>
          <span className="font-bold">Outbound</span> Dependencies
        </>
      ),
      tooltip: metrics?.dependencies?.outbound && metrics.dependencies.outbound.length > 0
        ? `Top teams: ${metrics.dependencies.outbound.map(d => `${d.team} (${d.uncompletedIssues} uncompleted)`).join(', ')}`
        : 'Top three teams with the most outbound dependencies in the PI',
      value: undefined,
      icon: '🔗',
      dependencies: metrics?.dependencies?.outbound,
    },
    {
      cardId: 'inboundDependencies',
      title: (
        <>
          <span className="font-bold">Inbound</span> Dependencies
        </>
      ),
      tooltip: metrics?.dependencies?.inbound && metrics.dependencies.inbound.length > 0
        ? `Top teams: ${metrics.dependencies.inbound.map(d => `${d.team} (${d.uncompletedIssues} uncompleted)`).join(', ')}`
        : 'Top three teams with the most inbound dependencies in the PI',
      value: undefined,
      icon: '🔗',
      dependencies: metrics?.dependencies?.inbound,
    },
    {
      cardId: 'inProgress',
      title: 'In Progress Epics',
      tooltip: metrics?.inProgressEpics?.totalEpics !== undefined && metrics.inProgressEpics.count !== undefined && metrics.inProgressEpics.percentage !== undefined
        ? `Total epics: ${metrics.inProgressEpics.totalEpics}. Currently in progress: ${metrics.inProgressEpics.count} (${metrics.inProgressEpics.percentage.toFixed(1)}%)`
        : 'Number of epics that are in progress in the PI',
      value: inProgressValue,
      color: metrics?.inProgressEpics?.status,
      icon: '🚀',
      totalEpics: metrics?.inProgressEpics?.totalEpics,
      inProgressPercentage: metrics?.inProgressEpics?.percentage,
      dependencies: undefined,
    },
  ];

  return (
    <div className="relative" style={{ overflow: 'visible' }}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-12 overflow-x-auto" style={{ overflow: 'visible' }}>
        {metricsList.map((metric) => (
          <MetricCard
            key={metric.cardId}
            cardId={metric.cardId}
            title={metric.title}
            tooltip={metric.tooltip}
            value={metric.value}
            loading={loading && metric.cardId === 'epicClosure'}
            icon={metric.icon}
            color={metric.color}
            remainingEpics={metric.remainingEpics}
            idealRemaining={metric.idealRemaining}
            totalEpics={metric.totalEpics}
            inProgressPercentage={metric.inProgressPercentage}
            dependencies={metric.dependencies}
            activeTooltip={activeTooltip}
            setActiveTooltip={setActiveTooltip}
          />
        ))}
      </div>
    </div>
  );
}
