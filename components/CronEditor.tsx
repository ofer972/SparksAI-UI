'use client';

import { useState, useEffect } from 'react';

interface CronConfig {
  day_of_week?: string; // e.g., "mon,wed,fri" or "sun,tue,thu"
  hour?: number; // 0-23
  minute?: number; // 0-59
}

interface CronEditorProps {
  value: CronConfig | null;
  onChange: (config: CronConfig | null) => void;
}

const DAYS_OF_WEEK = [
  { value: 'sun', label: 'Sunday' },
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
];

export default function CronEditor({ value, onChange }: CronEditorProps) {
  const [enabled, setEnabled] = useState<boolean>(!!value);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [hour, setHour] = useState<number>(6);
  const [minute, setMinute] = useState<number>(0);

  // Initialize state from value
  useEffect(() => {
    if (value) {
      setEnabled(true);
      if (value.day_of_week) {
        setSelectedDays(value.day_of_week.split(','));
      } else {
        setSelectedDays([]);
      }
      setHour(value.hour ?? 6);
      setMinute(value.minute ?? 0);
    } else {
      setEnabled(false);
      setSelectedDays([]);
      setHour(6);
      setMinute(0);
    }
  }, [value]);

  const toggleDay = (day: string) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day];
    setSelectedDays(newDays);
    updateCron(newDays, hour, minute, enabled);
  };

  const handleHourChange = (newHour: number) => {
    setHour(newHour);
    updateCron(selectedDays, newHour, minute, enabled);
  };

  const handleMinuteChange = (newMinute: number) => {
    setMinute(newMinute);
    updateCron(selectedDays, hour, newMinute, enabled);
  };

  const handleEnabledChange = (newEnabled: boolean) => {
    setEnabled(newEnabled);
    if (newEnabled) {
      updateCron(selectedDays, hour, minute, true);
    } else {
      onChange(null);
    }
  };

  const updateCron = (days: string[], h: number, m: number, isEnabled: boolean) => {
    if (!isEnabled) {
      onChange(null);
      return;
    }

    const config: CronConfig = {
      hour: h,
      minute: m,
    };

    // Only include day_of_week if days are selected
    if (days.length > 0) {
      config.day_of_week = days.join(',');
    }

    onChange(config);
  };

  const selectAllDays = () => {
    const allDays = DAYS_OF_WEEK.map(d => d.value);
    setSelectedDays(allDays);
    updateCron(allDays, hour, minute, enabled);
  };

  const clearAllDays = () => {
    setSelectedDays([]);
    updateCron([], hour, minute, enabled);
  };

  return (
    <div className="space-y-5">
      {/* Enable/Disable Cron */}
      <div className="flex items-center justify-between">
        <div>
          <label htmlFor="cron-enabled" className="block text-sm font-medium text-gray-900">
            Schedule Configuration
          </label>
          <p className="text-xs text-gray-600 mt-1">
            {enabled ? 'Automatic execution is enabled' : 'Enable automatic scheduled execution'}
          </p>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="cron-enabled"
            checked={enabled}
            onChange={(e) => handleEnabledChange(e.target.checked)}
            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="cron-enabled" className="ml-3 text-sm font-medium text-gray-700">
            {enabled ? 'Enabled' : 'Disabled'}
          </label>
        </div>
      </div>

      {enabled && (
        <>
          {/* Time Picker */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Execution Time
            </label>
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-600 mb-1">Hour</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={hour}
                  onChange={(e) => handleHourChange(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                  className="w-20 px-3 py-2 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-lg"
                />
                <span className="text-xs text-gray-500 mt-1 text-center">0-23</span>
              </div>
              <span className="text-3xl text-gray-300 font-light mt-3">:</span>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-600 mb-1">Minute</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minute}
                  onChange={(e) => handleMinuteChange(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="w-20 px-3 py-2 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-lg"
                />
                <span className="text-xs text-gray-500 mt-1 text-center">0-59</span>
              </div>
              <div className="ml-6 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mt-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-mono text-xl font-semibold text-blue-900">
                  {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>

          {/* Days of Week */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  Days of Week
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  Leave unselected to run every day
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllDays}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={clearAllDays}
                  className="text-xs text-gray-600 hover:text-gray-700 font-medium px-2 py-1 hover:bg-gray-100 rounded transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`px-3 py-3 rounded-lg text-xs font-semibold transition-all ${
                    selectedDays.includes(day.value)
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg transform hover:scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow'
                  }`}
                >
                  {day.label.substring(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Human-readable summary */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-1">
                  Schedule Summary
                </div>
                <div className="text-sm text-green-900">
                  {selectedDays.length === 0 ? (
                    <>
                      Runs <span className="font-bold">every day</span> at{' '}
                      <span className="font-mono font-bold bg-green-100 px-2 py-0.5 rounded">
                        {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')}
                      </span>
                    </>
                  ) : selectedDays.length === 7 ? (
                    <>
                      Runs <span className="font-bold">every day</span> at{' '}
                      <span className="font-mono font-bold bg-green-100 px-2 py-0.5 rounded">
                        {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')}
                      </span>
                    </>
                  ) : (
                    <>
                      Runs on{' '}
                      <span className="font-bold">
                        {selectedDays
                          .map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label)
                          .join(', ')}
                      </span>{' '}
                      at{' '}
                      <span className="font-mono font-bold bg-green-100 px-2 py-0.5 rounded">
                        {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

