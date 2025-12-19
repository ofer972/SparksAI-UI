'use client';

import { useState, useEffect } from 'react';
import { ETLSettings } from '@/lib/etl';
import { etlApiService } from '@/lib/etl';

interface ProjectsDialogProps {
  settings: ETLSettings;
  onClose: () => void;
  onSaved: () => void;
}

export default function ProjectsDialog({ settings, onClose, onSaved }: ProjectsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<{ [key: string]: string }>({});
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [selectedProjects, setSelectedProjects] = useState<string[]>(settings.selected_project_keys || []);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    loadJIRAMetadata();
  }, []);

  const loadJIRAMetadata = async () => {
    try {
      setLoadingMetadata(true);
      const projectsData = await etlApiService.getJIRAProjects();
      setProjects(projectsData);
    } catch (err: any) {
      setError(`Failed to load JIRA projects: ${err.message}`);
    } finally {
      setLoadingMetadata(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const settingsUpdate: { [key: string]: any } = {
        selected_project_keys: selectedProjects.length > 0 ? JSON.stringify(selectedProjects) : null,
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">📋 Select Projects</h2>
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

        {loadingMetadata ? (
          <div className="flex-1 p-6 flex items-center justify-center">
            <div className="text-gray-600">Loading JIRA projects...</div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <h3 className="font-semibold mb-2">Project Scope</h3>
              <p className="text-sm text-gray-600 mb-4">
                Select which Jira projects to include in the ETL sync. If none are selected, ALL accessible projects will be synced.
              </p>
              
              {/* Search Bar */}
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Filtered Projects List */}
              <div className="border border-gray-300 rounded p-2 pb-2 max-h-[400px] overflow-y-auto mb-2">
                {Object.entries(projects)
                  .filter(([key, name]) => {
                    if (!searchTerm) return true;
                    const searchLower = searchTerm.toLowerCase();
                    return key.toLowerCase().includes(searchLower) || name.toLowerCase().includes(searchLower);
                  })
                  .map(([key, name]) => (
                    <label
                      key={key}
                      className="flex items-center space-x-2 py-0.5 px-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProjects.includes(key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProjects([...selectedProjects, key]);
                          } else {
                            setSelectedProjects(selectedProjects.filter(p => p !== key));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {name} ({key})
                      </span>
                    </label>
                  ))}
                {Object.entries(projects).filter(([key, name]) => {
                  if (!searchTerm) return false;
                  const searchLower = searchTerm.toLowerCase();
                  return key.toLowerCase().includes(searchLower) || name.toLowerCase().includes(searchLower);
                }).length === 0 && searchTerm && (
                  <div className="text-sm text-gray-500 py-4 text-center">
                    No projects found matching &quot;{searchTerm}&quot;
                  </div>
                )}
              </div>
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
          </>
        )}
      </div>
    </div>
  );
}

