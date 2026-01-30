'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LineChart, Line, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

interface Trend {
  direction: 'up' | 'down' | 'flat';
  percentage: number; // Integer from backend
  label: string;
  improved: boolean; // true = good trend, false = bad trend (not used for "flat")
}

interface ChartData {
  type: 'line' | 'progress' | 'bar';
  points?: Array<{
    sprint_id: string;
    value: number;
    date: string | null;
  }>;
  current?: number;
  total?: number;
  percentage?: number;
  items?: Array<{
    label: string;
    value: number;
    completed?: number;
    total?: number;
  }>;
  total_count?: number;
}

interface ActionData {
  type: 'report' | 'table';
  report_ids?: string[];
  params?: Record<string, any>;
}

interface KPIDashboardData {
  title: string;
  value: string;
  tierStatus: 'elite' | 'high' | 'medium' | 'low' | string;
  description: string;
  trend?: Trend | null;
  reportIds: string[];
  initialFilters: Record<string, any>;
  metric: {
    metric_id: string;
    label: string;
    value: string;
  };
}

interface KPICardProps {
  metricId: string;
  label: string;
  value: string;
  tierStatus?: 'elite' | 'high' | 'medium' | 'low' | '' | null;
  description: string;
  tooltip: string;
  trend?: Trend | null;
  metricType?: 'dora' | 'sprint' | 'pi' | null;
  chart_data?: ChartData | null;
  layout?: 'normal' | 'wide';
  alternative_text?: string | null;
  action?: ActionData | null;
  onOpenDashboard?: (data: KPIDashboardData) => void;
  onClick?: () => void;  // Optional for backward compatibility
  // Context from parent for merging filters
  defaultTeamOrGroupName?: string | null;
  defaultTreeType?: 'team' | 'group' | null;
  currentPIName?: string | null;
}

export default function KPICard({
  metricId,
  label,
  value,
  tierStatus,
  description,
  tooltip,
  trend,
  metricType,
  chart_data,
  layout = 'normal',
  alternative_text,
  action,
  onOpenDashboard,
  onClick,
  defaultTeamOrGroupName,
  defaultTreeType,
  currentPIName,
}: KPICardProps) {
  // DEBUG: Log chart_data for days_left metric
  useEffect(() => {
    if (metricId === 'sprint_days_left' && chart_data) {
      console.log('DEBUG sprint_days_left KPI:', {
        chart_data,
        type: chart_data?.type,
        total: chart_data?.total,
        current: chart_data?.current,
        percentage: chart_data?.percentage,
        willRenderProgressBar: chart_data?.type === 'progress' && chart_data?.total && chart_data.total > 0
      });
    }
  }, [metricId, chart_data]);

  // DORA tier colors (4 levels: elite=green, high=blue, medium=yellow, low=red)
  const doraTierColors = {
    elite: {
      border: 'border-green-300',
      valueText: 'text-green-600',
      badge: {
        background: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-300',
      },
    },
    high: {
      border: 'border-blue-300',
      valueText: 'text-blue-600',
      badge: {
        background: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-300',
      },
    },
    medium: {
      border: 'border-yellow-300',
      valueText: 'text-yellow-600',
      badge: {
        background: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-300',
      },
    },
    low: {
      border: 'border-red-300',
      valueText: 'text-red-600',
      badge: {
        background: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-300',
      },
    },
  };

  // Sprint/PI tier colors (3 levels: high=green, medium=yellow, low=red)
  const sprintTierColors = {
    high: {
      border: 'border-green-300',
      valueText: 'text-green-600',
      badge: {
        background: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-300',
      },
    },
    medium: {
      border: 'border-yellow-300',
      valueText: 'text-yellow-600',
      badge: {
        background: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-300',
      },
    },
    low: {
      border: 'border-red-300',
      valueText: 'text-red-600',
      badge: {
        background: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-300',
      },
    },
  };

  // Select color scheme based on metric type (default to DORA for backward compatibility)
  const isSprintOrPI = metricType === 'sprint' || metricType === 'pi';
  const tierColors = isSprintOrPI ? sprintTierColors : doraTierColors;

  // Use neutral colors when tier is not provided
  const hasTier = tierStatus && tierStatus !== '';
  // Get tier color - backend now sends correct tier names for each metric type
  const getTierColor = (tier: string) => {
    if (tier in tierColors) {
      return (tierColors as any)[tier];
    }
    return tierColors.low; // Fallback to low if tier not found
  };
  // When no tier, use blue (same as DORA "high" tier)
  const noTierColors = {
    border: 'border-blue-300',
    valueText: 'text-blue-600',
    badge: {
      background: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-300',
    },
  };
  const colors = hasTier ? getTierColor(tierStatus) : noTierColors;
  const tierLabel = hasTier ? tierStatus.charAt(0).toUpperCase() + tierStatus.slice(1) : '';

  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (showTooltip && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 10, // Position above the button
        left: rect.left + rect.width / 2, // Center horizontally on the button
      });
    }
  }, [showTooltip]);

  // Trend arrow mapping - using simple characters that should render
  const getTrendArrow = (direction: string) => {
    // Normalize the direction value (trim whitespace, lowercase)
    const normalized = direction?.toLowerCase().trim();
    switch (normalized) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      case 'flat':
        return '→';
      default:
        return '→'; // Default to flat arrow
    }
  };

  // Get trend color based on improved field from backend
  // Green if improved, red if not improved, gray if flat (no color)
  const getTrendColor = () => {
    if (!trend || !trend.direction) return colors.valueText;
    
    const normalized = trend.direction.toLowerCase().trim();
    
    // If direction is flat, use neutral gray color
    if (normalized === 'flat') {
      return 'text-content-tertiary';
    }
    
    // Use improved field from backend to determine color
    // Green if improved (good trend), red if not improved (bad trend)
    return trend.improved ? 'text-green-600' : 'text-red-600';
  };

  // Handle click - smart logic based on action field
  const handleClick = () => {
    // If custom onClick provided (backward compatibility), use it
    if (onClick) {
      onClick();
      return;
    }
    
    // If no action data or no callback, do nothing
    if (!action || !onOpenDashboard) return;
    
    // Handle report action
    if (action.type === 'report' && action.report_ids && action.report_ids.length > 0) {
      // Merge action params with default context from parent
      const mergedFilters: Record<string, any> = {
        ...action.params,
      };
      
      // Add default team/group if available
      if (defaultTeamOrGroupName) {
        mergedFilters.team_name = defaultTeamOrGroupName;
        mergedFilters.isGroup = defaultTreeType === 'group';
      }
      
      // Add current PI if available
      if (currentPIName) {
        mergedFilters.pi = currentPIName;
      }
      
      const dashboardData: KPIDashboardData = {
        title: label,
        value: value,
        tierStatus: tierStatus || 'medium',
        description: description,
        trend: trend || null,
        reportIds: action.report_ids,
        initialFilters: mergedFilters,
        metric: {
          metric_id: metricId,
          label: label,
          value: value,
        },
      };
      
      onOpenDashboard(dashboardData);
    }
    // Could handle other action types here (table, external, etc.)
  };

  return (
    <>
      <div 
        className="relative group"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <button
          ref={buttonRef}
          onClick={handleClick}
          className={`
            h-32 rounded-lg border transition-all relative
            bg-gradient-to-br from-surface to-surface-elevated
            border-outline shadow-sm
            hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 hover:scale-[1.02] cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300
            flex flex-col
            ${layout === 'wide' ? 'w-full' : 'w-[170px]'}
          `}
        >
        {/* Header with label and tier badge in top-right - fixed height for consistency */}
        <div className="flex items-start justify-between px-2 pt-2 flex-shrink-0 h-7">
          <h3 className="text-xs font-medium text-content-secondary">{label}</h3>
          {hasTier && (
            <span
              className={`
                inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium border
                ${colors.badge.background} ${colors.badge.text} ${colors.badge.border}
              `}
            >
              {tierLabel.toUpperCase()}
            </span>
          )}
        </div>

        {/* Value OR Bar Chart - centered in remaining space */}
        <div className="flex-1 flex items-center justify-center px-2">
          {chart_data?.type === 'bar' && chart_data.items && chart_data.items.length > 0 ? (
            <div className="w-full space-y-2">
              {chart_data.items.slice(0, 2).map((item, idx) => {
                const maxValue = Math.max(...chart_data.items!.map(d => d.value), 1);
                const percentage = (item.value / maxValue) * 100;
                
                return (
                  <div key={idx} className="w-full">
                    <div className="text-xs truncate mb-0.5" title={item.label}>
                      {item.label}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-orange-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-4 text-right">
                        {item.value}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`text-lg sm:text-xl font-bold ${colors.valueText}`}>
              {value}
            </div>
          )}
        </div>

        {/* Bottom section: Alternative Text OR Chart OR Trend - fixed height for consistency */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs text-content-secondary px-2 pb-2 flex-shrink-0 font-semibold leading-tight h-7">
          {alternative_text ? (
            <span className="text-content-secondary">{alternative_text}</span>
          ) : chart_data?.type === 'line' && chart_data.points && chart_data.points.length > 0 ? (
            <div className="w-full" style={{ height: '28px' }}>
              <ResponsiveContainer width="100%" height={28}>
                <LineChart data={chart_data.points} margin={{ top: 0, right: 4, left: 4, bottom: 0 }}>
                  <Line
                    type="linear"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 2.5, strokeWidth: 0 }}
                    activeDot={{ r: 3.5 }}
                    isAnimationActive={false}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 shadow-lg">
                            <p className="font-semibold">Sprint: {data.sprint_id}</p>
                            <p className="text-blue-300">Velocity: {data.value}</p>
                            {data.date && <p className="text-gray-400 text-[10px]">{new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : chart_data?.type === 'progress' && chart_data.total && chart_data.total > 0 ? (
            <div className="w-full">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 shadow-inner">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(chart_data.percentage || 0, 100)}%` }}
                />
              </div>
            </div>
          ) : trend && trend.direction ? (
            <>
              <span className={`font-bold leading-none ${getTrendColor()}`} style={{ fontSize: '0.875rem', lineHeight: '1' }}>
                {getTrendArrow(trend.direction)}
              </span>
              <span className={`font-semibold ${getTrendColor()}`}>{trend.percentage}%</span>
              <span className="text-content-secondary">{trend.label}</span>
            </>
          ) : null}
        </div>
      </button>
      </div>

      {/* Tooltip on hover - positioned using portal to escape overflow */}
      {typeof window !== 'undefined' && showTooltip && createPortal(
        <div 
          className="fixed z-[9999] pointer-events-none transition-opacity duration-200"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3 max-w-xs mb-2">
            <div className="text-gray-300 whitespace-pre-line">{tooltip}</div>
          </div>
          {/* Arrow pointing down */}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #111827',
            }}
          />
        </div>,
        document.body
      )}
    </>
  );
}

