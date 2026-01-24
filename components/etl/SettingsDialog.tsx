'use client';

import { useState, useEffect } from 'react';
import { ETLSettings } from '@/lib/etl';
import { etlApiService } from '@/lib/etl';

interface SettingsDialogProps {
  settings: ETLSettings;
  onClose: () => void;
  onSaved: () => void;
}

type TabType = 'Projects' | 'Fields' | 'History & Scope' | 'Derived Fields';

export default function SettingsDialog({ settings, onClose, onSaved }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>('Projects');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // JIRA metadata
  const [projects, setProjects] = useState<{ [key: string]: string }>({});
  const [customFields, setCustomFields] = useState<{ [field_id: string]: string }>({});
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  // Form state
  const [selectedProjects, setSelectedProjects] = useState<string[]>(settings.selected_project_keys || []);
  const [selectedCustomFields, setSelectedCustomFields] = useState<string[]>(settings.selected_custom_fields || []);
  const [piField, setPiField] = useState<string>(settings.selected_pi_custom_field_id || '');
  const [sprintField, setSprintField] = useState<string>(settings.selected_sprint_field_id || 'sprint');
  const [sizingField, setSizingField] = useState<string>(settings.selected_sizing_field_id || '');
  const [teamNameField, setTeamNameField] = useState<string>(settings.selected_team_name_field_id || '');
  const [flaggedField, setFlaggedField] = useState<string>(settings.selected_flagged_field_id || '');
  const [historyRetention, setHistoryRetention] = useState<number>(settings.history_retention_months);
  const [defaultBackfillDays, setDefaultBackfillDays] = useState<number>(settings.history_default_backfill_days);
  const [etlStartMonthsBack, setEtlStartMonthsBack] = useState<number>(settings.etl_start_months_back);
  const [periodicSyncOfDataMinutes, setPeriodicSyncOfDataMinutes] = useState<number>(
    settings.periodic_sync_of_data_minutes || 60
  );
  const [fieldDefinitionsYaml, setFieldDefinitionsYaml] = useState<string>(settings.field_definitions_yaml_content || '');

  useEffect(() => {
    loadJIRAMetadata();
  }, []);

  const loadJIRAMetadata = async () => {
    try {
      setLoadingMetadata(true);
      const [projectsData, fieldsData] = await Promise.all([
        etlApiService.getJIRAProjects(),
        etlApiService.getJIRACustomFields(),
      ]);
      setProjects(projectsData);
      setCustomFields(fieldsData);
    } catch (err: any) {
      setError(`Failed to load JIRA metadata: ${err.message}`);
    } finally {
      setLoadingMetadata(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Prepare settings update - need to JSON-encode array fields
      const settingsUpdate: { [key: string]: any } = {
        selected_project_keys: selectedProjects.length > 0 ? JSON.stringify(selectedProjects) : null,
        selected_custom_fields: JSON.stringify(selectedCustomFields),
        selected_pi_custom_field_id: piField || null,
        selected_sprint_field_id: sprintField || 'sprint',
        selected_sizing_field_id: sizingField || null,
        selected_team_name_field_id: teamNameField || null,
        selected_flagged_field_id: flaggedField || null,
        history_retention_months: historyRetention.toString(),
        history_default_backfill_days: defaultBackfillDays.toString(),
        etl_start_months_back: etlStartMonthsBack.toString(),
        periodic_sync_of_data_minutes: periodicSyncOfDataMinutes.toString(),
        field_definitions_yaml_content: fieldDefinitionsYaml,
      };

      await etlApiService.updateSettings(settingsUpdate);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const tabs: TabType[] = ['Projects', 'Fields', 'History & Scope', 'Derived Fields'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 sm:p-6 border-b border-outline">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">⚙️ General Settings</h2>
            <button
              onClick={onClose}
              className="text-content-tertiary hover:text-content-secondary text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            {error}
          </div>
        )}

        {loadingMetadata ? (
          <div className="flex-1 p-6 flex items-center justify-center">
            <div className="text-content-secondary">Loading JIRA metadata...</div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="border-b border-outline px-4 sm:px-6">
              <div className="flex gap-1 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-blue-600 text-brand'
                        : 'border-transparent text-content-secondary hover:text-content-primary'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {activeTab === 'Projects' && (
                <div>
                  <h3 className="font-semibold mb-2">Project Scope</h3>
                  <p className="text-sm text-content-secondary mb-4">
                    Select which Jira projects to include in the ETL sync. If none are selected, ALL accessible projects will be synced.
                  </p>
                  <select
                    multiple
                    value={selectedProjects}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, (option) => option.value);
                      setSelectedProjects(values);
                    }}
                    className="w-full min-h-[200px] border border-outline rounded p-2"
                    size={10}
                  >
                    {Object.entries(projects).map(([key, name]) => (
                      <option key={key} value={key}>
                        {name} ({key})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-content-tertiary mt-2">
                    Hold Ctrl/Cmd to select multiple projects
                  </p>
                </div>
              )}

              {activeTab === 'Fields' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">Custom Fields to Store</h3>
                    <p className="text-sm text-content-secondary mb-2">
                      Selected fields will be added as generic &apos;cf_...&apos; columns.
                    </p>
                    <select
                      multiple
                      value={selectedCustomFields}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, (option) => option.value);
                        setSelectedCustomFields(values);
                      }}
                      className="w-full min-h-[150px] border border-outline rounded p-2"
                      size={8}
                    >
                      {Object.entries(customFields).map(([id, name]) => (
                        <option key={id} value={id}>
                          {name} ({id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-4">Core Field Links</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-content-secondary mb-1">
                          Program Increment (PI) Field
                        </label>
                        <select
                          value={piField}
                          onChange={(e) => setPiField(e.target.value)}
                          className="w-full border border-outline rounded px-3 py-2"
                        >
                          <option value="">--- Not Set ---</option>
                          {Object.entries(customFields).map(([id, name]) => (
                            <option key={id} value={id}>
                              {name} ({id})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-content-secondary mb-1">
                          Sprint Field
                        </label>
                        <select
                          value={sprintField}
                          onChange={(e) => setSprintField(e.target.value)}
                          className="w-full border border-outline rounded px-3 py-2"
                        >
                          <option value="sprint">Sprint (System Default)</option>
                          {Object.entries(customFields).map(([id, name]) => (
                            <option key={id} value={id}>
                              {name} ({id})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-content-secondary mb-1">
                          Sizing Field (e.g., Story Points)
                        </label>
                        <select
                          value={sizingField}
                          onChange={(e) => setSizingField(e.target.value)}
                          className="w-full border border-outline rounded px-3 py-2"
                        >
                          <option value="">--- Not Set ---</option>
                          {Object.entries(customFields).map(([id, name]) => (
                            <option key={id} value={id}>
                              {name} ({id})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-content-secondary mb-1">
                          Team Name Field
                        </label>
                        <select
                          value={teamNameField}
                          onChange={(e) => setTeamNameField(e.target.value)}
                          className="w-full border border-outline rounded px-3 py-2"
                        >
                          <option value="">--- Not Set ---</option>
                          {Object.entries(customFields).map(([id, name]) => (
                            <option key={id} value={id}>
                              {name} ({id})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-content-secondary mb-1">
                          Flagged (Impediment) Field
                        </label>
                        <select
                          value={flaggedField}
                          onChange={(e) => setFlaggedField(e.target.value)}
                          className="w-full border border-outline rounded px-3 py-2"
                        >
                          <option value="">--- Not Set ---</option>
                          {Object.entries(customFields).map(([id, name]) => (
                            <option key={id} value={id}>
                              {name} ({id})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'History & Scope' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-content-secondary mb-1">
                      History Retention Period (Months)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={historyRetention}
                      onChange={(e) => setHistoryRetention(parseInt(e.target.value) || 6)}
                      className="w-full border border-outline rounded px-3 py-2"
                    />
                    <p className="text-xs text-content-tertiary mt-1">
                      Snapshots older than this will be automatically deleted.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-content-secondary mb-1">
                      Default History Backfill Depth (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="730"
                      value={defaultBackfillDays}
                      onChange={(e) => setDefaultBackfillDays(parseInt(e.target.value) || 30)}
                      className="w-full border border-outline rounded px-3 py-2"
                    />
                    <p className="text-xs text-content-tertiary mt-1">
                      Default number of days to backfill issue history.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-content-secondary mb-1">
                      Global Sync Lookback (Months)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={etlStartMonthsBack}
                      onChange={(e) => setEtlStartMonthsBack(parseInt(e.target.value) || 9)}
                      className="w-full border border-outline rounded px-3 py-2"
                    />
                    <p className="text-xs text-content-tertiary mt-1">
                      Sync issues CREATED or UPDATED within this period from today.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-content-secondary mb-1">
                      Periodic Sync of Data (Minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={periodicSyncOfDataMinutes}
                      onChange={(e) => setPeriodicSyncOfDataMinutes(parseInt(e.target.value) || 60)}
                      className="w-full border border-outline rounded px-3 py-2"
                    />
                    <p className="text-xs text-content-tertiary mt-1">
                      Sync Issues/Sprint/Projects etc that were updated since last sync.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'Derived Fields' && (
                <div>
                  <h3 className="font-semibold mb-2">Field Definitions (YAML)</h3>
                  <p className="text-sm text-content-secondary mb-4">
                    Define <code>derived_fields</code> for main issues table and/or <code>history_table_fields</code> for history table.
                  </p>
                  <textarea
                    value={fieldDefinitionsYaml}
                    onChange={(e) => setFieldDefinitionsYaml(e.target.value)}
                    className="w-full h-96 border border-outline rounded p-3 font-mono text-sm"
                    placeholder="derived_fields:&#10;  - db_column: ...&#10;history_table_fields:&#10;  - db_column_name: ..."
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-6 border-t border-outline flex flex-col sm:flex-row justify-end gap-2">
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 bg-brand text-white rounded hover:bg-brand-hover disabled:bg-gray-400"
              >
                {loading ? 'Saving...' : '💾 Save Settings'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-content-secondary rounded hover:bg-gray-400"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

