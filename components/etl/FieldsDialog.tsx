'use client';

import { useState } from 'react';
import { ETLSettings } from '@/lib/etl';
import { etlApiService } from '@/lib/etl';

interface FieldsDialogProps {
  settings: ETLSettings;
  customFields: { [field_id: string]: string };
  onClose: () => void;
  onSaved: () => void;
}

export default function FieldsDialog({ settings, customFields, onClose, onSaved }: FieldsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomFields, setSelectedCustomFields] = useState<string[]>(settings.selected_custom_fields || []);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [piField, setPiField] = useState<string>(settings.selected_pi_custom_field_id || '');
  const [sprintField, setSprintField] = useState<string>(settings.selected_sprint_field_id || 'sprint');
  const [sizingField, setSizingField] = useState<string>(settings.selected_sizing_field_id || '');
  const [teamNameField, setTeamNameField] = useState<string>(settings.selected_team_name_field_id || '');
  const [flaggedField, setFlaggedField] = useState<string>(settings.selected_flagged_field_id || '');

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const settingsUpdate: { [key: string]: any } = {
        selected_custom_fields: JSON.stringify(selectedCustomFields),
        selected_pi_custom_field_id: piField || null,
        selected_sprint_field_id: sprintField || 'sprint',
        selected_sizing_field_id: sizingField || null,
        selected_team_name_field_id: teamNameField || null,
        selected_flagged_field_id: flaggedField || null,
      };

      await etlApiService.updateSettings(settingsUpdate);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">🔧 Select Fields</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-800">
            {error}
          </div>
        )}

        {Object.keys(customFields).length === 0 ? (
          <div className="flex-1 p-6 flex items-center justify-center">
            <div className="text-gray-600">Loading JIRA custom fields...</div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-2 pb-4 sm:pb-6 space-y-4">
              {/* Core Fields Section */}
              <div>
                <h3 className="font-semibold mb-3">Core Fields</h3>
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                    <label className="text-sm font-medium text-gray-700 w-full sm:w-48 flex-shrink-0">
                      Program Increment (PI) Field:
                    </label>
                    <select
                      value={piField}
                      onChange={(e) => setPiField(e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
                    >
                      <option value="">--- Not Set ---</option>
                      {Object.entries(customFields).map(([id, name]) => (
                        <option key={id} value={id}>
                          {name} ({id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                    <label className="text-sm font-medium text-gray-700 w-full sm:w-48 flex-shrink-0">
                      Sprint Field:
                    </label>
                    <select
                      value={sprintField}
                      onChange={(e) => setSprintField(e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
                    >
                      <option value="sprint">Sprint (System Default)</option>
                      {Object.entries(customFields).map(([id, name]) => (
                        <option key={id} value={id}>
                          {name} ({id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                    <label className="text-sm font-medium text-gray-700 w-full sm:w-48 flex-shrink-0">
                      Sizing Field (e.g., Story Points):
                    </label>
                    <select
                      value={sizingField}
                      onChange={(e) => setSizingField(e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
                    >
                      <option value="">--- Not Set ---</option>
                      {Object.entries(customFields).map(([id, name]) => (
                        <option key={id} value={id}>
                          {name} ({id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                    <label className="text-sm font-medium text-gray-700 w-full sm:w-48 flex-shrink-0">
                      Team Name Field:
                    </label>
                    <select
                      value={teamNameField}
                      onChange={(e) => setTeamNameField(e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
                    >
                      <option value="">--- Not Set ---</option>
                      {Object.entries(customFields).map(([id, name]) => (
                        <option key={id} value={id}>
                          {name} ({id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                    <label className="text-sm font-medium text-gray-700 w-full sm:w-48 flex-shrink-0">
                      Flagged (Impediment) Field:
                    </label>
                    <select
                      value={flaggedField}
                      onChange={(e) => setFlaggedField(e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
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

              {/* Separator */}
              <div className="border-t border-gray-200 my-2"></div>

              {/* Custom Fields to Store Section */}
              <div>
                <h3 className="font-semibold mb-1">Custom Fields to Store</h3>
                
                {/* Search Bar */}
                <div className="mb-1.5">
                  <input
                    type="text"
                    placeholder="Search fields..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Filtered Fields List */}
                <div className="border border-gray-300 rounded p-2 pb-2 max-h-[230px] overflow-y-auto mb-2">
                  {Object.entries(customFields)
                    .filter(([id, name]) => {
                      if (!searchTerm) return true;
                      const searchLower = searchTerm.toLowerCase();
                      return id.toLowerCase().includes(searchLower) || name.toLowerCase().includes(searchLower);
                    })
                    .map(([id, name]) => (
                      <label
                        key={id}
                        className="flex items-center space-x-2 py-0.5 px-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCustomFields.includes(id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCustomFields([...selectedCustomFields, id]);
                            } else {
                              setSelectedCustomFields(selectedCustomFields.filter(f => f !== id));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          {name} ({id})
                        </span>
                      </label>
                    ))}
                  {Object.entries(customFields).filter(([id, name]) => {
                    if (!searchTerm) return false;
                    const searchLower = searchTerm.toLowerCase();
                    return id.toLowerCase().includes(searchLower) || name.toLowerCase().includes(searchLower);
                  }).length === 0 && searchTerm && (
                    <div className="text-sm text-gray-500 py-4 text-center">
                      No fields found matching &quot;{searchTerm}&quot;
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 flex flex-col sm:flex-row justify-end gap-2">
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Saving...' : '💾 Save'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
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

