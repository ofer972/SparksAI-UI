'use client';

import { useState } from 'react';
import { usePIMetrics } from '@/hooks';

interface PIMetricsProps {
  piName?: string;
}

interface MetricCardProps {
  id: string;
  icon: string;
  value: string;
  label: string;
  tooltip: string;
  status?: 'red' | 'yellow' | 'green';
  className?: string;
  isLeftmost?: boolean;
  activeTooltip: string | null;
  setActiveTooltip: (id: string | null) => void;
}

const MetricCard = ({ 
  id, 
  icon, 
  value, 
  label, 
  tooltip, 
  status, 
  className = "", 
  isLeftmost = false, 
  activeTooltip, 
  setActiveTooltip
}: MetricCardProps) => {
  const getStatusColor = (status?: 'red' | 'yellow' | 'green') => {
    switch (status) {
      case 'red':
        return 'text-red-600';
      case 'yellow':
        return 'text-yellow-600';
      case 'green':
        return 'text-green-600';
      default:
        return 'text-gray-800';
    }
  };

  const isTooltipVisible = activeTooltip === id;

  return (
    <div 
      className={`bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 p-4 flex flex-col items-center text-center h-full relative ${className}`}
      onMouseEnter={() => {
        setActiveTooltip(id);
      }}
      onMouseLeave={() => {
        setActiveTooltip(null);
      }}
    >
      {/* Icon */}
      <div className="w-8 h-8 mb-2 flex items-center justify-center text-2xl rounded">
        {icon}
      </div>
      
      {/* Value */}
      <div className={`text-lg font-bold mb-1.5 ${getStatusColor(status)}`}>
        {value}
      </div>
      
      {/* Label */}
      <div className="text-xs text-gray-700 break-words text-center font-semibold">
        {label}
      </div>
      
      {/* Tooltip */}
      <div 
        className={`absolute bottom-full mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded transition-opacity duration-200 pointer-events-none z-[100] max-w-xs ${isLeftmost ? 'left-0' : 'left-1/2 transform -translate-x-1/2'} ${isTooltipVisible ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        style={{ 
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          minWidth: '200px',
          maxWidth: '300px'
        }}
      >
        {tooltip}
        <div className={`absolute top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800 ${isLeftmost ? 'left-4' : 'left-1/2 transform -translate-x-1/2'}`}></div>
      </div>
    </div>
  );
};

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
      <div className="overflow-x-hidden">
        <div className="grid gap-3 w-full" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm p-4 animate-pulse h-full">
              <div className="w-8 h-8 bg-transparent rounded mb-2 mx-auto"></div>
              <div className="h-5 bg-gray-200 rounded mb-1.5"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
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
      <div className="overflow-x-hidden">
        <div className="text-center py-4">
          <div className="text-red-500 text-2xl mb-2">⚠️</div>
          <p className="text-xs text-gray-700 font-semibold">Error loading metrics</p>
        </div>
      </div>
    );
  }

  const epicClosureValue = metrics?.epicClosure?.value !== undefined && metrics.epicClosure.value !== null
    ? `${metrics.epicClosure.value.toFixed(1)}%`
    : '-';

  const inProgressValue = metrics?.inProgressEpics?.count !== undefined && metrics.inProgressEpics.count !== null
    ? metrics.inProgressEpics.count.toString()
    : '-';

  return (
    <div className="relative">
      <div className="grid gap-3 w-full" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        {/* Epic Closure */}
        <MetricCard
          id="epicClosure"
          icon="📉"
          value={epicClosureValue}
          label="Epic Closure"
          tooltip={metrics?.epicClosure?.totalEpics !== undefined && metrics.epicClosure.remainingEpics !== undefined && metrics.epicClosure.idealRemaining !== undefined
            ? `Closure gap from the ideal. Total Epics: ${metrics.epicClosure.totalEpics}. Remaining epics: ${metrics.epicClosure.remainingEpics}. Ideal remaining: ${metrics.epicClosure.idealRemaining}`
            : 'Closure gap from the ideal.'}
          isLeftmost={true}
          status={metrics?.epicClosure?.color}
          activeTooltip={activeTooltip}
          setActiveTooltip={setActiveTooltip}
        />
        
        {/* Dependencies */}
        <MetricCard
          id="dependencies"
          icon="🔗"
          value="-"
          label="Dependencies"
          tooltip="Top three teams with the most dependencies in the PI"
          activeTooltip={activeTooltip}
          setActiveTooltip={setActiveTooltip}
        />
        
        {/* Average Epic Cycle Time */}
        <MetricCard
          id="cycleTime"
          icon="⏱️"
          value="-"
          label="Avg Epic Cycle Time"
          tooltip="Average cycle time of EPIC in the last three PIs"
          activeTooltip={activeTooltip}
          setActiveTooltip={setActiveTooltip}
        />
        
        {/* PI Predictability */}
        <MetricCard
          id="predictability"
          icon="📊"
          value="-"
          label="PI Predictability"
          tooltip="Average PI predictability in the last three PIs"
          activeTooltip={activeTooltip}
          setActiveTooltip={setActiveTooltip}
        />
        
        {/* In Progress Epics */}
        <MetricCard
          id="inProgress"
          icon="🚀"
          value={inProgressValue}
          label="In Progress Epics"
          tooltip={metrics?.inProgressEpics?.totalEpics !== undefined && metrics.inProgressEpics.count !== undefined && metrics.inProgressEpics.percentage !== undefined
            ? `Total epics: ${metrics.inProgressEpics.totalEpics}. Currently in progress: ${metrics.inProgressEpics.count} (${metrics.inProgressEpics.percentage.toFixed(1)}%)`
            : 'Number of epics that are in progress in the PI'}
          status={metrics?.inProgressEpics?.status}
          activeTooltip={activeTooltip}
          setActiveTooltip={setActiveTooltip}
        />
      </div>
    </div>
  );
}

