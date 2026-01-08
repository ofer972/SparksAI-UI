'use client';

import React, { useState, useEffect } from 'react';
import { ApiService } from '@/lib/api';
import TeamGroupFilter from './TeamGroupFilter';

export interface MetricsSelection {
  metricsType: 'team' | 'pi';
  teamName?: string;
  piName?: string;
  isGroup?: boolean;
  selectedMetrics: string[];
}

interface MetricsSelectorProps {
  onUpdateSelections: (selections: Map<string, MetricsSelection>) => void;
  currentSelections: Map<string, MetricsSelection>;
}

const TEAM_METRICS = [
  { id: 'velocity', label: 'Avg Sprint Velocity' },
  { id: 'cycleTime', label: 'Avg Story/Task Cycle Time' },
  { id: 'predictability', label: 'Avg Sprint Predictability' },
  { id: 'wip', label: 'Sprint Work in Progress' },
  { id: 'completion', label: 'Sprint Completion' },
  { id: 'daysLeft', label: 'Days Left in Sprint' },
];

const PI_METRICS = [
  { id: 'epicClosure', label: 'Epic Closure' },
  { id: 'cycleTime', label: 'Average Epic Cycle Time' },
  { id: 'outboundDependencies', label: 'PI Outbound Dependencies' },
  { id: 'inboundDependencies', label: 'PI Inbound Dependencies' },
  { id: 'inProgress', label: 'In Progress Epics' },
];

export default function MetricsSelector({
  onUpdateSelections,
  currentSelections,
}: MetricsSelectorProps) {
  const [metricsType, setMetricsType] = useState<'team' | 'pi'>('team');
  const [selectedTeamValue, setSelectedTeamValue] = useState<string | null>(null); // Format: "group:ID" or "team:ID" or null
  const [selectedTeamName, setSelectedTeamName] = useState<string>('');
  const [isGroup, setIsGroup] = useState<boolean>(false);
  const [selectedPI, setSelectedPI] = useState<string>('');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [availablePIs, setAvailablePIs] = useState<string[]>([]);

  // Sync internal state when currentSelections changes (e.g., when modal opens with existing widgets)
  useEffect(() => {
    if (currentSelections.size > 0) {
      // For display purposes, we don't need to populate the form fields
      // The "Added Widgets" section will show the existing selections
      // This effect is mainly to ensure the component reacts to currentSelections changes
      console.log('[MetricsSelector] currentSelections updated:', {
        size: currentSelections.size,
        entries: Array.from(currentSelections.entries()),
      });
    } else {
      // Reset form when no selections exist
      setMetricsType('team');
      setSelectedTeamValue(null);
      setSelectedTeamName('');
      setSelectedPI('');
      setIsGroup(false);
      setSelectedMetrics([]);
    }
  }, [currentSelections]);

  // Load PIs when PI metrics type is selected
  useEffect(() => {
    if (metricsType === 'pi') {
      const loadPIs = async () => {
        try {
          const api = new ApiService();
          const pisResponse = await api.getPIs();
          if (pisResponse.pis && pisResponse.pis.length > 0) {
            setAvailablePIs(pisResponse.pis.map(p => p.pi_name));
          }
        } catch (err) {
          console.error('Failed to load PIs:', err);
        }
      };
      loadPIs();
    }
  }, [metricsType]);

  // Handle team/group selection from TeamGroupFilter
  const handleTeamGroupChange = (value: string | null, type: 'group' | 'team', name: string) => {
    setSelectedTeamValue(value);
    setSelectedTeamName(name);
    setIsGroup(type === 'group');
  };

  // Generate unique widget ID based on configuration
  const generateWidgetId = (): string => {
    if (metricsType === 'team') {
      return `team-metrics-${selectedTeamName || 'none'}-${isGroup ? 'group' : 'team'}`;
    } else {
      return `pi-metrics-${selectedPI || 'none'}-${selectedTeamName || 'none'}-${isGroup ? 'group' : 'team'}`;
    }
  };

  const handleAddWidget = () => {
    if (selectedMetrics.length === 0) {
      alert('Please select at least one metric');
      return;
    }

    if (metricsType === 'team' && !selectedTeamName) {
      alert('Please select a team or group');
      return;
    }

    if (metricsType === 'pi' && (!selectedPI || !selectedTeamName)) {
      alert('Please select both PI and team/group');
      return;
    }

    const widgetId = generateWidgetId();
    const selection: MetricsSelection = {
      metricsType,
      teamName: selectedTeamName || undefined,
      piName: metricsType === 'pi' ? selectedPI : undefined,
      isGroup,
      selectedMetrics: [...selectedMetrics],
    };

    const newSelections = new Map(currentSelections);
    newSelections.set(widgetId, selection);
    onUpdateSelections(newSelections);
  };

  const handleRemoveWidget = (widgetId: string) => {
    const newSelections = new Map(currentSelections);
    newSelections.delete(widgetId);
    onUpdateSelections(newSelections);
  };

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metricId)
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  const availableMetrics = metricsType === 'team' ? TEAM_METRICS : PI_METRICS;

  return (
    <div className="space-y-6">
      {/* Team/Group Selection - Using TeamGroupFilter component (First) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Team/Group
        </label>
        <TeamGroupFilter
          value={selectedTeamValue}
          onChange={handleTeamGroupChange}
          placeholder="Select team or group"
          allowClear={true}
        />
      </div>

      {/* Metrics Type Selection - System Settings Tab Style */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Metrics Type
        </label>
        <nav className="flex space-x-1 bg-white px-0 pt-0">
          <button
            type="button"
            onClick={() => {
              setMetricsType('team');
              setSelectedPI('');
              setSelectedMetrics([]);
              // Keep team/group selection when switching metric types
            }}
            className={`
              flex items-center px-4 py-2.5 text-sm font-medium rounded-t-lg border transition-colors whitespace-nowrap
              ${metricsType === 'team'
                ? 'bg-white text-blue-600 border-x border-t border-gray-300 border-b-white -mb-px relative z-10'
                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}
            `}
          >
            Team Metrics
          </button>
          <button
            type="button"
            onClick={() => {
              setMetricsType('pi');
              setSelectedMetrics([]);
              // Keep team/group selection when switching to PI metrics
            }}
            className={`
              flex items-center px-4 py-2.5 text-sm font-medium rounded-t-lg border transition-colors whitespace-nowrap
              ${metricsType === 'pi'
                ? 'bg-white text-blue-600 border-x border-t border-gray-300 border-b-white -mb-px relative z-10'
                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}
            `}
          >
            PI Metrics
          </button>
        </nav>
        {/* Tab Content Area */}
        <div className="bg-white border border-gray-300 rounded-tr-lg rounded-b-lg shadow-sm -mt-px">
          <div className="p-4 space-y-4">
            {/* PI Selection (only for PI metrics) */}
            {metricsType === 'pi' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PI
                </label>
                <select
                  value={selectedPI}
                  onChange={(e) => setSelectedPI(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select PI</option>
                  {availablePIs.map(pi => (
                    <option key={pi} value={pi}>
                      {pi}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Metrics Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Metrics to Display
              </label>
              <div className="grid grid-cols-2 gap-2">
                {availableMetrics.map(metric => (
                  <label
                    key={metric.id}
                    className="flex items-center p-2 border border-gray-300 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMetrics.includes(metric.id)}
                      onChange={() => toggleMetric(metric.id)}
                      className="mr-2"
                    />
                    <span className="text-sm">{metric.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Widget Button */}
      <button
        onClick={handleAddWidget}
        disabled={selectedMetrics.length === 0 || (metricsType === 'team' && !selectedTeamName) || (metricsType === 'pi' && (!selectedPI || !selectedTeamName))}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        Add Metrics Widget
      </button>

      {/* Current Selections */}
      {currentSelections.size > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Added Widgets ({currentSelections.size})
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Array.from(currentSelections.entries()).map(([widgetId, selection]) => (
              <div
                key={widgetId}
                className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {selection.metricsType === 'team' ? 'Team' : 'PI'} Metrics
                  </div>
                  <div className="text-xs text-gray-600">
                    {selection.teamName && `Team: ${selection.teamName}`}
                    {selection.piName && ` | PI: ${selection.piName}`}
                    {` | ${selection.selectedMetrics.length} metric(s)`}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveWidget(widgetId)}
                  className="ml-2 px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

