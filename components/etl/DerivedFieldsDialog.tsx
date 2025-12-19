'use client';

import { useState } from 'react';
import { ETLSettings } from '@/lib/etl';
import { etlApiService } from '@/lib/etl';

interface DerivedFieldsDialogProps {
  settings: ETLSettings;
  onClose: () => void;
  onSaved: () => void;
}

export default function DerivedFieldsDialog({ settings, onClose, onSaved }: DerivedFieldsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldDefinitionsYaml, setFieldDefinitionsYaml] = useState<string>(settings.field_definitions_yaml_content || '');

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const settingsUpdate: { [key: string]: any } = {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">🔨 Derived Fields</h2>
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

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <h3 className="font-semibold mb-2">Field Definitions (YAML)</h3>
          <p className="text-sm text-gray-600 mb-4">
            Define <code>derived_fields</code> for main issues table and/or <code>history_table_fields</code> for history table.
          </p>
          <textarea
            value={fieldDefinitionsYaml}
            onChange={(e) => setFieldDefinitionsYaml(e.target.value)}
            className="w-full h-96 border border-gray-300 rounded p-3 font-mono text-sm"
            placeholder="derived_fields:&#10;  - db_column: ...&#10;history_table_fields:&#10;  - db_column_name: ..."
          />
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-2">
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
      </div>
    </div>
  );
}

