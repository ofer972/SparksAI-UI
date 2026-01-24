'use client';

import { useState, useEffect } from 'react';
import { ETLSettings } from '@/lib/etl';
import { etlApiService } from '@/lib/etl';
import { PIDefinition } from '@/lib/etl';
import PIManagement from './PIManagement';
import JiraConnectionTab from './JiraConnectionTab';

interface ETLSettingsTabsProps {
  settings: ETLSettings;
  customFields: { [field_id: string]: string };
  onSaved: () => void;
}

type TabType = 'jira-connection' | 'projects' | 'jql' | 'fields' | 'history' | 'derived' | 'pi';

export default function ETLSettingsTabs({ settings, customFields, onSaved }: ETLSettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('jira-connection');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const tabs = [
    { 
      id: 'jira-connection' as TabType, 
      label: 'JIRA Connection', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
    },
    { 
      id: 'projects' as TabType, 
      label: 'Projects', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    { 
      id: 'jql' as TabType, 
      label: 'JQL Scope', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    },
    { 
      id: 'fields' as TabType, 
      label: 'Fields', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      )
    },
    { 
      id: 'history' as TabType, 
      label: 'History', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      id: 'derived' as TabType, 
      label: 'Derived Fields', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      id: 'pi' as TabType, 
      label: 'PI Dates', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
  ];

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Reload data when tab changes
  useEffect(() => {
    onSaved();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-full flex flex-col overflow-hidden p-6">
      {/* Toast Message */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-green-50 border border-green-200 rounded-lg shadow-lg text-green-800">
          {toastMessage}
        </div>
      )}

      {/* Tab Navigation */}
      <nav className="flex-shrink-0 flex space-x-1 bg-surface px-4 pt-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border transition-colors
                ${isActive 
                  ? 'bg-surface text-brand border-x border-t border-outline border-b-white -mb-px relative z-10' 
                  : 'bg-surface-elevated text-content-secondary border border-outline hover:bg-surface-secondary'}
              `}
            >
                {tab.icon}
                <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Tab Content Area with Border */}
      <div className="flex-1 overflow-y-auto bg-surface border border-outline rounded-tr-lg rounded-b-lg shadow-sm p-6">
        {activeTab === 'jira-connection' && (
          <div className="w-full max-w-[50%]">
            <JiraConnectionTab settings={settings} onSaved={onSaved} onShowToast={showToast} />
          </div>
        )}
        {activeTab === 'projects' && (
          <div className="w-full max-w-[38.4%]">
            <ProjectsTab settings={settings} onSaved={onSaved} onShowToast={showToast} />
          </div>
        )}
        {activeTab === 'jql' && (
          <div className="w-full max-w-[50%]">
            <JQLScopeTab settings={settings} onSaved={onSaved} onShowToast={showToast} />
          </div>
        )}
        {activeTab === 'fields' && (
          <div className="w-full max-w-[40%]">
            <FieldsTab settings={settings} customFields={customFields} onSaved={onSaved} onShowToast={showToast} />
          </div>
        )}
        {activeTab === 'history' && (
          <div className="w-full max-w-[40%]">
            <HistoryScopeTab settings={settings} onSaved={onSaved} onShowToast={showToast} />
          </div>
        )}
        {activeTab === 'derived' && (
          <div className="w-full max-w-[50%]">
            <DerivedFieldsTab settings={settings} onSaved={onSaved} onShowToast={showToast} />
          </div>
        )}
        {activeTab === 'pi' && (
          <div className="w-full">
            <PIManagement onSaved={onSaved} />
          </div>
        )}
      </div>
    </div>
  );
}

// General Settings Tab
function GeneralSettingsTab({ settings, onSaved, onShowToast }: { settings: ETLSettings; onSaved: () => void; onShowToast: (message: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enableSync, setEnableSync] = useState<boolean>(() => {
    if (typeof settings.enable_sync === 'boolean') {
      return settings.enable_sync;
    }
    if (typeof settings.enable_sync === 'string') {
      return settings.enable_sync === 'true' || settings.enable_sync === '1';
    }
    return false;
  });

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      const settingsUpdate: { [key: string]: any } = {
        enable_sync: enableSync ? 'true' : 'false',
      };
      await etlApiService.updateSettings(settingsUpdate);
      onShowToast('Settings saved successfully!');
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="enable_sync"
          checked={enableSync}
          onChange={(e) => setEnableSync(e.target.checked)}
          className="w-5 h-5 text-brand border-outline rounded focus:ring-brand"
        />
        <label htmlFor="enable_sync" className="text-lg font-bold text-content-primary cursor-pointer">
          Enable Sync
        </label>
      </div>
      <div className="flex justify-start gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 bg-brand text-white rounded hover:bg-brand-hover disabled:bg-gray-400"
        >
          {loading ? 'Saving...' : '💾 Save'}
        </button>
      </div>
    </div>
  );
}

// Projects Tab
function ProjectsTab({ settings, onSaved, onShowToast }: { settings: ETLSettings; onSaved: () => void; onShowToast: (message: string) => void }) {
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
      onShowToast('Projects saved successfully!');
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  if (loadingMetadata) {
    return <div className="text-content-secondary">Loading JIRA projects...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}
      <div>
        <h3 className="font-semibold mb-2">Project Scope</h3>
        <p className="text-sm text-content-secondary mb-4">
          Select which Jira projects to include in the ETL sync. If none are selected, ALL accessible projects will be synced.
        </p>
        
        <div className="mb-3">
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-outline rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>

        <div className="border border-outline rounded p-2 pb-2 max-h-[400px] overflow-y-auto mb-2">
          {Object.entries(projects)
            .filter(([key, name]) => {
              if (!searchTerm) return true;
              const searchLower = searchTerm.toLowerCase();
              return key.toLowerCase().includes(searchLower) || name.toLowerCase().includes(searchLower);
            })
            .map(([key, name]) => (
              <label
                key={key}
                className="flex items-center space-x-2 py-0.5 px-2 hover:bg-surface-elevated rounded cursor-pointer"
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
                  className="w-4 h-4 text-brand border-outline rounded focus:ring-brand"
                />
                <span className="text-sm text-content-secondary">
                  {name} ({key})
                </span>
              </label>
            ))}
          {Object.entries(projects).filter(([key, name]) => {
            if (!searchTerm) return false;
            const searchLower = searchTerm.toLowerCase();
            return key.toLowerCase().includes(searchLower) || name.toLowerCase().includes(searchLower);
          }).length === 0 && searchTerm && (
            <div className="text-sm text-content-tertiary py-4 text-center">
              No projects found matching &quot;{searchTerm}&quot;
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-start gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 bg-brand text-white rounded hover:bg-brand-hover disabled:bg-gray-400"
        >
          {loading ? 'Saving...' : '💾 Save'}
        </button>
      </div>
    </div>
  );
}

// JQL Scope Tab
function JQLScopeTab({ settings, onSaved, onShowToast }: { settings: ETLSettings; onSaved: () => void; onShowToast: (message: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationSuccess, setValidationSuccess] = useState<string | null>(null);
  const [isValidated, setIsValidated] = useState(false);
  const [jql, setJql] = useState<string>(settings.jql_scope || '');

  const handleValidate = async () => {
    if (!jql.trim()) {
      setValidationError('JQL query cannot be empty');
      setValidationErrors(['JQL query cannot be empty']);
      setIsValidated(false);
      setValidationSuccess(null);
      return;
    }

    try {
      setValidating(true);
      setValidationError(null);
      setValidationErrors([]);
      setValidationSuccess(null);
      
      const result = await etlApiService.validateJQL(jql);
      
      if (result.valid) {
        setIsValidated(true);
        setValidationSuccess(result.message || 'JQL is valid');
        setValidationError(null);
        setValidationErrors([]);
      } else {
        setIsValidated(false);
        if (result.errors && result.errors.length > 0) {
          setValidationErrors(result.errors);
          setValidationError(result.message || 'JQL validation failed');
        } else {
          setValidationError(result.message || 'JQL validation failed');
          setValidationErrors([result.message || 'JQL validation failed']);
        }
        setValidationSuccess(null);
      }
    } catch (err: any) {
      setIsValidated(false);
      const errorMessage = err.message || 'Failed to validate JQL';
      setValidationError(errorMessage);
      setValidationErrors([errorMessage]);
      setValidationSuccess(null);
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    if (!isValidated) {
      setError('Please validate the JQL before saving');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const settingsUpdate: { [key: string]: any } = {
        jql_scope: jql || null,
      };
      await etlApiService.updateSettings(settingsUpdate);
      onShowToast('JQL Scope saved successfully!');
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save JQL scope');
    } finally {
      setLoading(false);
    }
  };

  // Reset validation when JQL changes
  const handleJqlChange = (value: string) => {
    setJql(value);
    setIsValidated(false);
    setValidationError(null);
    setValidationErrors([]);
    setValidationSuccess(null);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}
      <div>
        <h3 className="font-semibold mb-2">JQL Scope</h3>
        <p className="text-sm text-content-secondary mb-4">
          Enter a JQL (Jira Query Language) query to define the scope of issues to sync. Use the Validate button to validate the JQL before saving.
        </p>
        
        <div className="flex gap-2 mb-2 items-start">
          <textarea
            value={jql}
            onChange={(e) => handleJqlChange(e.target.value)}
            placeholder="Enter JQL query (e.g., project = TEST AND status = Open)"
            className="flex-1 border border-outline rounded px-3 py-2 text-sm font-mono min-h-[100px] focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
          <button
            onClick={handleValidate}
            disabled={validating || !jql.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap self-start"
          >
            {validating ? 'Validating...' : 'Validate'}
          </button>
        </div>

        {validationError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm mb-2">
            <div className="font-semibold mb-1">{validationError}</div>
            {validationErrors.length > 0 && (
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {validationSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm mb-2">
            {validationSuccess}
          </div>
        )}
      </div>
      <div className="flex justify-start gap-2">
        <button
          onClick={handleSave}
          disabled={loading || !isValidated}
          className="px-4 py-2 bg-brand text-white rounded hover:bg-brand-hover disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : '💾 Save'}
        </button>
      </div>
    </div>
  );
}

// Fields Tab
function FieldsTab({ settings, customFields, onSaved, onShowToast }: { settings: ETLSettings; customFields: { [field_id: string]: string }; onSaved: () => void; onShowToast: (message: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomFields, setSelectedCustomFields] = useState<string[]>(settings.selected_custom_fields || []);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [piField, setPiField] = useState<string>(settings.selected_pi_custom_field_id || '');
  const [sprintField, setSprintField] = useState<string>(settings.selected_sprint_field_id || 'sprint');
  const [sizingField, setSizingField] = useState<string>(settings.selected_sizing_field_id || '');
  const [teamNameField, setTeamNameField] = useState<string>(settings.selected_team_name_field_id || '');
  const [flaggedField, setFlaggedField] = useState<string>(settings.selected_flagged_field_id || '');
  
  // Local state for custom fields (reloaded when tab opens)
  const [localCustomFields, setLocalCustomFields] = useState<{ [field_id: string]: string }>(customFields);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  // Reload custom fields when tab opens
  useEffect(() => {
    const loadCustomFields = async () => {
      try {
        setLoadingMetadata(true);
        const fieldsData = await etlApiService.getJIRACustomFields();
        setLocalCustomFields(fieldsData);
      } catch (err: any) {
        console.error('Failed to load custom fields:', err);
        // Keep existing customFields as fallback
      } finally {
        setLoadingMetadata(false);
      }
    };

    loadCustomFields();
  }, []);

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
      onShowToast('Fields saved successfully!');
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  if (loadingMetadata || Object.keys(localCustomFields).length === 0) {
    return <div className="text-content-secondary">Loading JIRA custom fields...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}
      
      <div>
        <h3 className="font-semibold mb-3">Core Fields</h3>
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <label className="text-sm font-medium text-content-secondary w-full sm:w-48 flex-shrink-0">
              Program Increment (PI) Field:
            </label>
            <select
              value={piField}
              onChange={(e) => setPiField(e.target.value)}
              className="flex-1 border border-outline rounded px-3 py-1.5 text-sm"
            >
              <option value="">--- Not Set ---</option>
              {Object.entries(localCustomFields).map(([id, name]) => (
                <option key={id} value={id}>
                  {name} ({id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <label className="text-sm font-medium text-content-secondary w-full sm:w-48 flex-shrink-0">
              Sprint Field:
            </label>
            <select
              value={sprintField}
              onChange={(e) => setSprintField(e.target.value)}
              className="flex-1 border border-outline rounded px-3 py-1.5 text-sm"
            >
              <option value="sprint">Sprint (System Default)</option>
              {Object.entries(localCustomFields).map(([id, name]) => (
                <option key={id} value={id}>
                  {name} ({id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <label className="text-sm font-medium text-content-secondary w-full sm:w-48 flex-shrink-0">
              Sizing Field (e.g., Story Points):
            </label>
            <select
              value={sizingField}
              onChange={(e) => setSizingField(e.target.value)}
              className="flex-1 border border-outline rounded px-3 py-1.5 text-sm"
            >
              <option value="">--- Not Set ---</option>
              {Object.entries(localCustomFields).map(([id, name]) => (
                <option key={id} value={id}>
                  {name} ({id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <label className="text-sm font-medium text-content-secondary w-full sm:w-48 flex-shrink-0">
              Team Name Field:
            </label>
            <select
              value={teamNameField}
              onChange={(e) => setTeamNameField(e.target.value)}
              className="flex-1 border border-outline rounded px-3 py-1.5 text-sm"
            >
              <option value="">--- Not Set ---</option>
              {Object.entries(localCustomFields).map(([id, name]) => (
                <option key={id} value={id}>
                  {name} ({id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <label className="text-sm font-medium text-content-secondary w-full sm:w-48 flex-shrink-0">
              Flagged (Impediment) Field:
            </label>
            <select
              value={flaggedField}
              onChange={(e) => setFlaggedField(e.target.value)}
              className="flex-1 border border-outline rounded px-3 py-1.5 text-sm"
            >
              <option value="">--- Not Set ---</option>
              {Object.entries(localCustomFields).map(([id, name]) => (
                <option key={id} value={id}>
                  {name} ({id})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="border-t border-outline my-2"></div>

      <div>
        <h3 className="font-semibold mb-1">Custom Fields to Store</h3>
        
        <div className="mb-1.5">
          <input
            type="text"
            placeholder="Search fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-outline rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>

        <div className="border border-outline rounded p-2 pb-2 max-h-[230px] overflow-y-auto mb-2">
          {Object.entries(localCustomFields)
            .filter(([id, name]) => {
              if (!searchTerm) return true;
              const searchLower = searchTerm.toLowerCase();
              return id.toLowerCase().includes(searchLower) || name.toLowerCase().includes(searchLower);
            })
            .map(([id, name]) => (
              <label
                key={id}
                className="flex items-center space-x-2 py-0.5 px-2 hover:bg-surface-elevated rounded cursor-pointer"
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
                  className="w-4 h-4 text-brand border-outline rounded focus:ring-brand"
                />
                <span className="text-sm text-content-secondary">
                  {name} ({id})
                </span>
              </label>
            ))}
          {Object.entries(localCustomFields).filter(([id, name]) => {
            if (!searchTerm) return false;
            const searchLower = searchTerm.toLowerCase();
            return id.toLowerCase().includes(searchLower) || name.toLowerCase().includes(searchLower);
          }).length === 0 && searchTerm && (
            <div className="text-sm text-content-tertiary py-4 text-center">
              No fields found matching &quot;{searchTerm}&quot;
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-start gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 bg-brand text-white rounded hover:bg-brand-hover disabled:bg-gray-400"
        >
          {loading ? 'Saving...' : '💾 Save'}
        </button>
      </div>
    </div>
  );
}

// History Scope Tab
function HistoryScopeTab({ settings, onSaved, onShowToast }: { settings: ETLSettings; onSaved: () => void; onShowToast: (message: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyRetention, setHistoryRetention] = useState<number>(settings.history_retention_months);
  const [defaultBackfillDays, setDefaultBackfillDays] = useState<number>(settings.history_default_backfill_days);
  const [etlStartMonthsBack, setEtlStartMonthsBack] = useState<number>(settings.etl_start_months_back);
  const [periodicSyncOfDataMinutes, setPeriodicSyncOfDataMinutes] = useState<number>(
    settings.periodic_sync_of_data_minutes || 60
  );

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      const settingsUpdate: { [key: string]: any } = {
        history_retention_months: historyRetention.toString(),
        history_default_backfill_days: defaultBackfillDays.toString(),
        etl_start_months_back: etlStartMonthsBack.toString(),
        periodic_sync_of_data_minutes: periodicSyncOfDataMinutes.toString(),
      };
      await etlApiService.updateSettings(settingsUpdate);
      onShowToast('Settings saved successfully!');
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}
      
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-1">
          <label className="text-sm font-medium text-content-secondary w-full sm:w-48 flex-shrink-0">
            History Retention Period (Months):
          </label>
          <input
            type="number"
            min="1"
            value={historyRetention}
            onChange={(e) => setHistoryRetention(parseInt(e.target.value) || 6)}
            className="flex-1 border border-outline rounded px-3 py-2"
          />
        </div>
        <p className="text-xs text-content-tertiary mt-1 ml-0 sm:ml-[208px]">
          Snapshots older than this will be automatically deleted.
        </p>
      </div>

      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-1">
          <label className="text-sm font-medium text-content-secondary w-full sm:w-48 flex-shrink-0">
            Default History Backfill Depth (Days):
          </label>
          <input
            type="number"
            min="1"
            max="730"
            value={defaultBackfillDays}
            onChange={(e) => setDefaultBackfillDays(parseInt(e.target.value) || 30)}
            className="flex-1 border border-outline rounded px-3 py-2"
          />
        </div>
        <p className="text-xs text-content-tertiary mt-1 ml-0 sm:ml-[208px]">
          Default number of days to backfill issue history.
        </p>
      </div>

      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-1">
          <label className="text-sm font-medium text-content-secondary w-full sm:w-48 flex-shrink-0">
            Global Sync Lookback (Months):
          </label>
          <input
            type="number"
            min="1"
            value={etlStartMonthsBack}
            onChange={(e) => setEtlStartMonthsBack(parseInt(e.target.value) || 9)}
            className="flex-1 border border-outline rounded px-3 py-2"
          />
        </div>
        <p className="text-xs text-content-tertiary mt-1 ml-0 sm:ml-[208px]">
          Sync issues CREATED or UPDATED within this period from today.
        </p>
      </div>

      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-1">
          <label className="text-sm font-medium text-content-secondary w-full sm:w-48 flex-shrink-0">
            Periodic Sync of Data (Minutes):
          </label>
          <input
            type="number"
            min="1"
            value={periodicSyncOfDataMinutes}
            onChange={(e) => setPeriodicSyncOfDataMinutes(parseInt(e.target.value) || 60)}
            className="flex-1 border border-outline rounded px-3 py-2"
          />
        </div>
        <p className="text-xs text-content-tertiary mt-1 ml-0 sm:ml-[208px]">
          Sync Issues/Sprint/Projects etc that were updated since last sync.
        </p>
      </div>
      
      <div className="flex justify-start gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 bg-brand text-white rounded hover:bg-brand-hover disabled:bg-gray-400"
        >
          {loading ? 'Saving...' : '💾 Save'}
        </button>
      </div>
    </div>
  );
}

// Derived Fields Tab
function DerivedFieldsTab({ settings, onSaved, onShowToast }: { settings: ETLSettings; onSaved: () => void; onShowToast: (message: string) => void }) {
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
      onShowToast('Derived fields saved successfully!');
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}
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
      <div className="flex justify-start gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 bg-brand text-white rounded hover:bg-brand-hover disabled:bg-gray-400"
        >
          {loading ? 'Saving...' : '💾 Save'}
        </button>
      </div>
    </div>
  );
}

// PI Tab
function PITab({ onSaved }: { onSaved: () => void }) {
  const [pis, setPIs] = useState<{ [pi_name: string]: PIDefinition }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'add' | string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    planning_grace_days: 5,
    prep_grace_days: 5,
  });

  useEffect(() => {
    loadPIs();
  }, []);

  const loadPIs = async () => {
    try {
      setLoading(true);
      const pisData = await etlApiService.getPIs();
      setPIs(pisData);
    } catch (err: any) {
      setError(err.message || 'Failed to load PIs');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    setFormData({
      name: '',
      start_date: today,
      end_date: futureDateStr,
      planning_grace_days: 5,
      prep_grace_days: 5,
    });
    setEditMode('add');
  };

  const handleEdit = (piName: string) => {
    const pi = pis[piName];
    setFormData({
      name: piName,
      start_date: pi.start_date,
      end_date: pi.end_date,
      planning_grace_days: pi.planning_grace_days,
      prep_grace_days: pi.prep_grace_days,
    });
    setEditMode(piName);
  };

  const handleSave = async () => {
    try {
      setError(null);
      if (editMode === 'add') {
        await etlApiService.createPI(
          formData.name,
          formData.start_date,
          formData.end_date,
          formData.planning_grace_days,
          formData.prep_grace_days
        );
      } else {
        await etlApiService.updatePI(
          formData.name,
          formData.start_date,
          formData.end_date,
          formData.planning_grace_days,
          formData.prep_grace_days
        );
      }
      setEditMode(null);
      loadPIs();
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save PI');
    }
  };

  const handleDelete = async (piName: string) => {
    try {
      setError(null);
      await etlApiService.deletePI(piName);
      setDeleteConfirm(null);
      loadPIs();
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to delete PI');
    }
  };

  if (loading) {
    return <div className="text-content-secondary">Loading PIs...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          {error}
        </div>
      )}

      {Object.keys(pis).length > 0 ? (
        <div className="mb-6 overflow-x-auto">
          <table className="w-full border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-outline">
                <th className="text-left px-1.5 py-2 font-semibold">PI Name</th>
                <th className="text-left px-1.5 py-2 font-semibold">Start Date</th>
                <th className="text-left px-1.5 py-2 font-semibold">End Date</th>
                <th className="text-left px-1.5 py-2 font-semibold">
                  <div className="leading-tight">
                    <div>Planning</div>
                    <div>Grace</div>
                  </div>
                </th>
                <th className="text-left px-1.5 py-2 font-semibold">
                  <div className="leading-tight">
                    <div>Prep</div>
                    <div>Grace</div>
                  </div>
                </th>
                <th className="text-left px-1.5 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(pis).map(([name, pi]) => (
                <tr key={name} className="border-b border-gray-100">
                  <td className="px-1.5 py-2 font-medium">{name}</td>
                  <td className="px-1.5 py-2">{pi.start_date}</td>
                  <td className="px-1.5 py-2">{pi.end_date}</td>
                  <td className="px-1.5 py-2">{pi.planning_grace_days} days</td>
                  <td className="px-1.5 py-2">{pi.prep_grace_days} days</td>
                  <td className="px-1.5 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(name)}
                        className="px-2 py-1 text-brand hover:bg-blue-50 rounded text-sm"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(name)}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-surface-elevated rounded text-content-secondary">
          No PI definitions found. Add new PIs below.
        </div>
      )}

      {editMode && (
        <div className="pt-6 bg-surface-elevated rounded-lg p-4 w-full max-w-[50%]">
          <h3 className="font-semibold mb-4">
            {editMode === 'add' ? 'Add New PI' : `Edit PI: ${formData.name}`}
          </h3>
          <div className="space-y-3">
            {editMode === 'add' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                <label className="text-sm font-medium text-content-secondary w-full sm:w-40 flex-shrink-0">
                  PI Name *:
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="flex-1 border border-outline rounded px-3 py-2"
                />
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <label className="text-sm font-medium text-content-secondary w-full sm:w-40 flex-shrink-0">
                Dates *:
              </label>
              <div className="flex-1 flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-content-secondary mb-1 block">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full border border-outline rounded px-3 py-2"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-content-secondary mb-1 block">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full border border-outline rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <label className="text-sm font-medium text-content-secondary w-full sm:w-40 flex-shrink-0">
                Grace Periods (Days) *:
              </label>
              <div className="flex-1 flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-content-secondary mb-1 block">Planning Grace</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.planning_grace_days}
                    onChange={(e) => setFormData({ ...formData, planning_grace_days: parseInt(e.target.value) || 0 })}
                    className="w-full border border-outline rounded px-3 py-2"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-content-secondary mb-1 block">Prep Grace</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.prep_grace_days}
                    onChange={(e) => setFormData({ ...formData, prep_grace_days: parseInt(e.target.value) || 0 })}
                    className="w-full border border-outline rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-brand text-white rounded hover:bg-brand-hover"
            >
              💾 Save PI
            </button>
            <button
              onClick={() => setEditMode(null)}
              className="px-4 py-2 bg-gray-300 text-content-secondary rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!editMode && (
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-brand text-white rounded hover:bg-brand-hover"
        >
          ➕ Add New PI
        </button>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-2 sm:p-4">
          <div className="bg-surface rounded-lg p-4 sm:p-6 max-w-md w-full">
            <h3 className="font-semibold text-lg mb-4">⚠️ Confirm Delete</h3>
            <p className="text-sm text-content-secondary mb-4">
              Are you sure you want to delete PI &apos;{deleteConfirm}&apos;?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                ✅ Confirm Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-300 text-content-secondary rounded hover:bg-gray-400"
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

