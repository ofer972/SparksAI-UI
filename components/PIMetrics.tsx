'use client';

import { useState } from 'react';
import { usePIMetrics } from '@/hooks';

interface PIMetricsProps {
  piName?: string;
  selectedMetrics?: string[]; // Optional: filter which metrics to display
  singleRowLayout?: boolean; // Optional: use single row layout instead of 2-column grid (default: false)
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
      className="relative group flex-1 bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 p-2 sm:p-3 flex flex-col items-center justify-center text-center h-full min-w-0"
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

      {/* All content centered together - matching TeamMetrics structure */}
      {/* Icon at top or Epic Closure info or In Progress Epics info */}
      {dependencies && dependencies.length > 0 ? null : remainingEpics !== undefined || idealRemaining !== undefined ? (
        <div className="text-[10px] sm:text-xs text-gray-700 text-center mb-1 sm:mb-2">
          <div className="whitespace-nowrap">
            Remaining: {remainingEpics !== undefined ? remainingEpics : '-'}, Ideal: {idealRemaining !== undefined ? idealRemaining : '-'}
          </div>
        </div>
      ) : totalEpics !== undefined || inProgressPercentage !== undefined ? (
        <div className="text-[10px] sm:text-xs text-gray-700 text-center mb-1 sm:mb-2">
          <div className="whitespace-nowrap">
            Total Epics: {totalEpics !== undefined ? totalEpics : '-'}, WIP%: {inProgressPercentage !== undefined ? Math.round(inProgressPercentage) : '-'}
          </div>
        </div>
      ) : icon ? (
        <div className="w-6 h-6 sm:w-8 sm:h-8 mb-1 sm:mb-2 flex items-center justify-center text-xl sm:text-2xl rounded flex-shrink-0">
          {icon}
        </div>
      ) : null}

      {/* Value or Dependencies */}
      {loading ? (
        <div className="animate-pulse mb-1 sm:mb-1.5">
          <div className="h-6 sm:h-8 w-12 sm:w-16 bg-gray-200 rounded"></div>
        </div>
       ) : dependencies && dependencies.length > 0 ? (
         <div className="w-full max-w-[300px] space-y-1 sm:space-y-1.5 px-0.5 sm:px-1 flex flex-col justify-center mb-1 sm:mb-1.5 mx-auto">
          {dependencies.map((dep, idx) => {
            // Calculate max value for relative sizing (use the highest value in the list)
            const maxIssues = Math.max(...dependencies.map(d => d.uncompletedIssues), 1);
            const percentage = (dep.uncompletedIssues / maxIssues) * 100;
            
            // Determine color based on severity
            const getBarColor = () => {
              if (dep.uncompletedIssues >= maxIssues * 0.7) return 'bg-red-500';
              if (dep.uncompletedIssues >= maxIssues * 0.4) return 'bg-yellow-500';
              return 'bg-orange-400';
            };
            
              return (
               <div key={idx} className="space-y-0.5">
                 {/* Team name and count */}
                 <div className="flex items-center justify-start gap-1 sm:gap-1.5 flex-wrap">
                   <span 
                     className="text-[10px] sm:text-xs font-semibold text-gray-700 text-left leading-tight" 
                     title={dep.team}
                   >
                     {dep.team}
                   </span>
                   <span className="text-[10px] sm:text-xs font-bold text-gray-800 bg-gray-100 px-0.5 sm:px-1 py-0.5 rounded whitespace-nowrap flex-shrink-0 ml-auto">
                     {dep.uncompletedIssues}
                   </span>
                 </div>
                
                {/* Progress bar visualization */}
                <div className="w-full bg-gray-200 rounded-full h-0.5 sm:h-1 overflow-hidden">
                  <div 
                    className={`h-full ${getBarColor()} rounded-full transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`text-base sm:text-lg font-bold mb-1 sm:mb-1.5 ${getColorClass()}`}>
          {value !== undefined ? value : '-'}
        </div>
      )}

      {/* Title at bottom */}
      <div className="text-[10px] sm:text-xs text-gray-900 break-words text-center leading-tight">
        {title}
      </div>
    </div>
  );
}

export default function PIMetrics({ piName, selectedMetrics, singleRowLayout = false }: PIMetricsProps) {
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
    const loadingCount = selectedMetrics && selectedMetrics.length > 0 ? selectedMetrics.length : 5;
    const isOdd = loadingCount % 2 !== 0;
    const lastItemIndex = loadingCount - 1;
    return (
      <div className="h-full w-full overflow-hidden">
        <div className="grid gap-2 w-full h-full" style={{ 
          gridTemplateColumns: singleRowLayout ? 'repeat(auto-fit, minmax(120px, 1fr))' : 'repeat(2, minmax(0, 1fr))',
          gridAutoRows: '1fr'
        }}>
          {[...Array(loadingCount)].map((_, i) => {
            const isLastItem = i === lastItemIndex && isOdd && !singleRowLayout;
            return (
              <div 
                key={i} 
                className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm p-2 sm:p-3 flex flex-col items-center text-center h-full min-w-0 animate-pulse"
                style={isLastItem ? { gridColumn: '1 / -1' } : {}}
              >
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 rounded mb-1 sm:mb-2"></div>
                <div className="h-4 sm:h-5 w-12 sm:w-16 bg-gray-200 rounded mb-1 sm:mb-1.5"></div>
                <div className="h-2 sm:h-3 w-16 sm:w-20 bg-gray-200 rounded"></div>
              </div>
            );
          })}
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
      <div className="h-full w-full overflow-hidden flex items-center justify-center">
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
    ? String(metrics.inProgressEpics.count)
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
      tooltip: metrics?.averageCycleTime?.value !== undefined && metrics.averageCycleTime.value !== null && metrics.averageCycleTime.epicCount !== undefined
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
          <span className="font-bold">PI Outbound</span> Dependencies
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
          <span className="font-bold">PI Inbound</span> Dependencies
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
      tooltip: metrics?.inProgressEpics?.totalEpics !== undefined && metrics.inProgressEpics.count !== undefined && metrics.inProgressEpics.percentage !== undefined && metrics.inProgressEpics.percentage !== null
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

  // Filter metrics based on selectedMetrics if provided
  const metricsToDisplay = selectedMetrics && selectedMetrics.length > 0
    ? metricsList.filter(m => selectedMetrics.includes(m.cardId))
    : metricsList;

  const isOdd = metricsToDisplay.length % 2 !== 0;
  const lastItemIndex = metricsToDisplay.length - 1;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="grid gap-2 w-full h-full" style={{ 
        gridTemplateColumns: singleRowLayout ? 'repeat(auto-fit, minmax(120px, 1fr))' : 'repeat(2, minmax(0, 1fr))',
        gridAutoRows: '1fr'
      }}>
        {metricsToDisplay.map((metric, index) => {
          const isLastItem = index === lastItemIndex && isOdd && !singleRowLayout;
          return (
            <div 
              key={metric.cardId} 
              className="min-w-0 h-full"
              style={isLastItem ? { gridColumn: '1 / -1' } : {}}
            >
              <MetricCard
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
