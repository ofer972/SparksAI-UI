'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Trend {
  direction: 'up' | 'down' | 'flat';
  percentage: number; // Integer from backend
  label: string;
  improved: boolean; // true = good trend, false = bad trend (not used for "flat")
}

interface KPICardProps {
  metricId: string;
  label: string;
  value: string;
  tierStatus: 'elite' | 'high' | 'medium' | 'low';
  description: string;
  tooltip: string;
  trend?: Trend;
  onClick: () => void;
}

export default function KPICard({
  metricId,
  label,
  value,
  tierStatus,
  description,
  tooltip,
  trend,
  onClick,
}: KPICardProps) {
  // DORA tier colors - only for border and value text
  const tierColors = {
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

  const colors = tierColors[tierStatus] || tierColors.low;
  const tierLabel = tierStatus.charAt(0).toUpperCase() + tierStatus.slice(1);

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

  return (
    <>
      <div 
        className="relative group"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <button
          ref={buttonRef}
          onClick={onClick}
          className={`
            h-32 rounded-lg border transition-all relative
            bg-gradient-to-br from-surface to-surface-elevated
            border-outline shadow-sm
            hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 hover:scale-[1.02] cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300
            flex flex-col
          `}
          style={{ width: '171px' }}
        >
        {/* Header with tier badge in top-right */}
        <div className="flex items-start justify-between px-2 pt-2 flex-shrink-0">
          <h3 className="text-xs font-medium text-content-secondary">{label}</h3>
          <span
            className={`
              inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium border
              ${colors.badge.background} ${colors.badge.text} ${colors.badge.border}
            `}
          >
            {tierLabel.toUpperCase()}
          </span>
        </div>

        {/* Value with tier color - centered vertically in remaining space */}
        <div className="flex-1 flex items-center justify-center -mt-2">
          <div className={`text-base sm:text-lg font-bold ${colors.valueText}`}>
            {value}
          </div>
        </div>

        {/* Trend indicator - aligned to bottom */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs text-content-secondary px-2 pb-2 flex-shrink-0 font-semibold leading-tight">
          {trend && trend.direction ? (
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
            <div className="mb-1 font-semibold">{label}</div>
            <div className="text-gray-300 whitespace-normal">{tooltip}</div>
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

