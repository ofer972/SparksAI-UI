'use client';

import { useEffect, useState } from 'react';
import { ApiService } from '../lib/api';
import { buildBackendUrl } from '../lib/config';
import { authFetch } from '../lib/api';
import { replacePITerminology } from '../lib/piTerminology';
import Toast from './Toast';

interface Setting {
  setting_key: string;
  setting_value: string;
  setting_type: string;
  description: string;
  is_encrypted: boolean;
}

interface SettingsData {
  settings_by_category: {
    [category: string]: Setting[];
  };
  categories: string[];
  count: number;
}

function formatSettingName(key: string): string {
  const formatted = key
    .replace(/^backend_/, '')
    .split('_')
    .map(word => {
      // Special case: "pi" should become "PI" (all caps)
      if (word.toLowerCase() === 'pi') {
        return 'PI';
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
  
  // Apply terminology replacement (PI -> Quarter, etc.)
  return replacePITerminology(formatted);
}

export default function ConfigAndThresholdsTab() {
  const [settingsData, setSettingsData] = useState<SettingsData | null>(null);
  const [editedValues, setEditedValues] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const api = new ApiService();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.getSystemSettings();
      if (response.success && response.data) {
        setSettingsData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch settings', error);
      setToastType('error');
      setToastMessage((error as any)?.message || 'Failed to load settings');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (key: string, value: string) => {
    setEditedValues(prev => {
      const newMap = new Map(prev);
      newMap.set(key, value);
      return newMap;
    });
  };

  const handleReset = () => {
    setEditedValues(new Map());
    setToastType('success');
    setToastMessage('Changes discarded');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSave = async () => {
    if (editedValues.size === 0) {
      setToastType('error');
      setToastMessage('No changes to save');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    try {
      setSaving(true);
      setToastMessage(null);

      // Convert Map to format expected by backend: { key: { value: "...", description: undefined } }
      const settingsToUpdate: Record<string, { value: string; description?: string }> = {};
      editedValues.forEach((value, key) => {
        settingsToUpdate[key] = { value };
      });

      // Use authFetch to match backend format
      const url = buildBackendUrl('/settings/batch');
      const response = await authFetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          settings: settingsToUpdate,
          updated_by: 'ui'
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to update settings: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`);
      }

      // Update local state with saved values
      if (settingsData) {
        const updatedData = { ...settingsData };
        editedValues.forEach((value, key) => {
          // Find and update the setting in the appropriate category
          for (const category in updatedData.settings_by_category) {
            const setting = updatedData.settings_by_category[category].find(s => s.setting_key === key);
            if (setting) {
              setting.setting_value = value;
              break;
            }
          }
        });
        setSettingsData(updatedData);
      }

      // Clear edited values
      setEditedValues(new Map());

      setToastType('success');
      setToastMessage('Settings saved successfully');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save settings', error);
      setToastType('error');
      setToastMessage((error as any)?.message || 'Failed to save settings');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const getCurrentValue = (key: string, originalValue: string): string => {
    return editedValues.get(key) ?? originalValue;
  };

  const renderInput = (setting: Setting) => {
    const currentValue = getCurrentValue(setting.setting_key, setting.setting_value);
    const inputId = `setting-${setting.setting_key}`;

    switch (setting.setting_type) {
      case 'integer':
        return (
          <input
            id={inputId}
            type="number"
            step="1"
            value={currentValue}
            onChange={(e) => handleValueChange(setting.setting_key, e.target.value)}
            className="w-full sm:w-20 border border-outline-strong bg-surface-elevated text-content-primary rounded px-2 py-1 text-xs h-6 focus:outline-none focus:ring-1 focus:ring-brand focus:border-transparent"
          />
        );
      case 'float':
        return (
          <input
            id={inputId}
            type="number"
            step="0.01"
            value={currentValue}
            onChange={(e) => handleValueChange(setting.setting_key, e.target.value)}
            className="w-full sm:w-20 border border-outline-strong bg-surface-elevated text-content-primary rounded px-2 py-1 text-xs h-6 focus:outline-none focus:ring-1 focus:ring-brand focus:border-transparent"
          />
        );
      case 'json':
        return (
          <input
            id={inputId}
            type="text"
            value={currentValue}
            onChange={(e) => handleValueChange(setting.setting_key, e.target.value)}
            className="w-full sm:w-72 border border-outline-strong bg-surface-elevated text-content-primary rounded px-2 py-1 text-xs font-mono h-6 focus:outline-none focus:ring-1 focus:ring-brand focus:border-transparent"
          />
        );
      case 'boolean':
        return (
          <input
            id={inputId}
            type="checkbox"
            checked={currentValue === 'true' || currentValue === '1'}
            onChange={(e) => handleValueChange(setting.setting_key, e.target.checked ? 'true' : 'false')}
            className="w-4 h-4 text-brand focus:ring-brand border-outline rounded"
          />
        );
      default:
        return (
          <input
            id={inputId}
            type="text"
            value={currentValue}
            onChange={(e) => handleValueChange(setting.setting_key, e.target.value)}
            className="w-full sm:w-20 border border-outline-strong bg-surface-elevated text-content-primary rounded px-2 py-1 text-xs h-6 focus:outline-none focus:ring-1 focus:ring-brand focus:border-transparent"
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-2 text-content-tertiary text-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          Loading settings...
        </div>
      </div>
    );
  }

  if (!settingsData) {
    return (
      <div className="bg-surface rounded-lg shadow-sm p-6 text-center">
        <p className="text-content-tertiary">No settings available</p>
      </div>
    );
  }

  const hasChanges = editedValues.size > 0;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Sticky Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 flex-shrink-0 px-1 pb-2 border-b border-outline sticky top-0 bg-surface z-10">
        <h2 className="text-base sm:text-lg font-semibold text-content-primary">System Configuration</h2>
        <div className="flex flex-wrap items-center gap-2">
          {hasChanges && (
            <span className="text-xs text-content-tertiary whitespace-nowrap">
              Unsaved: {editedValues.size}
            </span>
          )}
          {hasChanges && (
            <button
              onClick={handleReset}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded transition-all border border-outline-strong text-content-secondary hover:bg-surface-secondary"
              title="Discard changes currently made"
            >
              Reset Values
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded transition-all ${
              saving || !hasChanges
                ? 'bg-gray-300 bg-surface-elevated text-content-muted cursor-not-allowed'
                : 'bg-brand text-white hover:bg-brand-hover'
            }`}
          >
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      {/* Settings Groups - Scrollable */}
      <div className="flex-1 overflow-auto space-y-6 pr-2">
        {settingsData.categories.map((category) => {
          const settings = settingsData.settings_by_category[category] || [];
          if (settings.length === 0) return null;

          return (
            <div
              key={category}
              className="bg-surface rounded border border-outline-strong"
            >
              {/* Group Header */}
              <div className="px-3 py-1.5 border-b border-outline bg-gradient-to-r from-teal-50 to-teal-100 dark:from-teal-950/50 dark:to-teal-900/40 rounded-t">
                <h3 className="text-sm font-semibold text-teal-700 dark:text-teal-300">
                  {category} ({settings.length})
                </h3>
              </div>

              {/* Settings Grid - 2 columns */}
              <div className="p-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                  {settings.map((setting, index) => {
                    const hasChange = editedValues.has(setting.setting_key);
                    // Show separator for all except last item in each column
                    const isLeftColumn = index % 2 === 0;
                    const isLastInLeftColumn = isLeftColumn && (index === settings.length - 1 || index === settings.length - 2);
                    const isLastInRightColumn = !isLeftColumn && index === settings.length - 1;
                    const showSeparator = !isLastInLeftColumn && !isLastInRightColumn;
                    
                    return (
                      <div key={setting.setting_key}>
                        <div
                          className={`p-2 ${
                            hasChange ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                          } ${
                            showSeparator ? 'border-b border-outline' : ''
                          }`}
                        >
                          <div className="flex flex-col sm:grid sm:grid-cols-[200px_100px_auto_1fr] sm:items-center gap-1 sm:gap-0 mb-0.5">
                            <label
                              htmlFor={`setting-${setting.setting_key}`}
                              className="text-sm font-semibold text-content-secondary sm:whitespace-nowrap"
                            >
                              {formatSettingName(setting.setting_key)}
                            </label>
                            <div className="hidden sm:block"></div>
                            <div className="flex-shrink-0 sm:justify-self-center">
                              {renderInput(setting)}
                            </div>
                            <div className="hidden sm:block"></div>
                          </div>
                          {setting.description && (
                            <div className="text-xs text-content-tertiary mt-0.5">
                              {replacePITerminology(setting.description)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toast */}
      <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage(null)} />
    </div>
  );
}

