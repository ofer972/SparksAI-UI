'use client';

import { useState, useEffect, useRef } from 'react';
import { ETLSettings } from '@/lib/etl';
import { etlApiService } from '@/lib/etl';

interface JiraConnectionTabProps {
  settings: ETLSettings;
  onSaved: () => void;
  onShowToast: (message: string) => void;
}

const MASK = '********';

export default function JiraConnectionTab({ settings, onSaved, onShowToast }: JiraConnectionTabProps) {
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSuccess, setValidationSuccess] = useState<string | null>(null);
  const [isValidated, setIsValidated] = useState<boolean>(false);
  
  const [jiraUrl, setJiraUrl] = useState<string>(settings.jira_url || '');
  const [email, setEmail] = useState<string>(settings.jira_email || '');
  const [apiToken, setApiToken] = useState<string>('');
  const [jiraCloud, setJiraCloud] = useState<boolean>(settings.jira_cloud !== undefined ? settings.jira_cloud : true);

  // Store original values to track changes
  const originalValuesRef = useRef({
    jiraUrl: settings.jira_url || '',
    email: settings.jira_email || '',
    jiraCloud: settings.jira_cloud !== undefined ? settings.jira_cloud : true,
  });

  // Initialize API token mask if JIRA URL or email exists
  useEffect(() => {
    if ((settings.jira_url || settings.jira_email) && !apiToken) {
      setApiToken(MASK);
    }
  }, [settings.jira_url, settings.jira_email, apiToken]);

  // Check if any fields have changed
  const hasChanges = () => {
    const original = originalValuesRef.current;
    
    // Check if URL, email, or cloud setting changed
    if (jiraUrl.trim() !== original.jiraUrl ||
        email.trim() !== original.email ||
        jiraCloud !== original.jiraCloud) {
      return true;
    }
    
    // Check if API token was changed (user entered a new token)
    if (apiToken && apiToken !== MASK && apiToken.trim() !== '') {
      return true;
    }
    
    return false;
  };

  const handleValidate = async () => {
    try {
      setValidating(true);
      setValidationError(null);
      setValidationSuccess(null);
      
      let result;
      
      // Option 3: Check if settings were loaded from backend
      // If settings.jira_url exists, assume token is saved (masked)
      const hasSavedSettings = settings.jira_url && settings.jira_url.trim() !== '';
      const userEnteredNewToken = apiToken && apiToken !== MASK && apiToken.trim() !== '';
      
      if (hasSavedSettings && !userEnteredNewToken) {
        // Settings exist in database and user hasn't entered a new token
        // Validate from database (saved settings)
        const checkResult = await etlApiService.checkJiraConfiguration();
        
        if (!checkResult.backendAvailable) {
          setValidationError('ETL backend is not available');
          setIsValidated(false);
          return;
        }
        
        if (!checkResult.data) {
          setValidationError('Failed to validate JIRA configuration');
          setIsValidated(false);
          return;
        }
        
        result = checkResult.data;
      } else {
        // User entered new values (including new API token) - validate form values
        // Validate that all required fields are filled
        if (!jiraUrl.trim() || !email.trim() || !apiToken || apiToken.trim() === '') {
          setValidationError('Please fill in all required fields (JIRA URL, Email, and API Token)');
          setIsValidated(false);
          return;
        }
        
        // Call validateJiraSettings with form values
        result = await etlApiService.validateJiraSettings(
          jiraUrl.trim(),
          email.trim(),
          apiToken,
          jiraCloud
        );
      }
      
      // Handle validation result
      if (result.connection_valid && result.configured) {
        setValidationSuccess(result.message || 'JIRA settings are valid and connection is successful');
        setValidationError(null);
        setIsValidated(true);
      } else {
        // Validation failed
        const errorMsg = result.error || result.message || 'JIRA validation failed';
        setValidationError(errorMsg);
        setIsValidated(false);
      }
    } catch (err: any) {
      setValidationError(err.message || 'Failed to validate JIRA configuration');
      setIsValidated(false);
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const settingsUpdate: { [key: string]: any } = {
        jira_url: jiraUrl || null,
        jira_email: email || null,
        jira_cloud: jiraCloud,
      };

      // Only include API token if it was changed by the user (not MASK and not empty)
      if (apiToken && apiToken !== MASK && apiToken !== '') {
        settingsUpdate.jira_api_token = apiToken;
      }

      await etlApiService.updateSettings(settingsUpdate);
      
      // After save, update API token state - if a token was sent, mark it as saved (show MASK)
      if (settingsUpdate.jira_api_token) {
        setApiToken(MASK);
      }
      
      // Update original values after successful save
      originalValuesRef.current = {
        jiraUrl: jiraUrl.trim(),
        email: email.trim(),
        jiraCloud: jiraCloud,
      };
      
      // Reset validation state after save
      setIsValidated(false);
      setValidationSuccess(null);
      setValidationError(null);
      
      onShowToast('JIRA connection settings saved successfully!');
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
        <h3 className="font-semibold mb-2">JIRA Connection Settings</h3>
        <p className="text-sm text-gray-600 mb-4">
          Configure your JIRA connection details. The API token will be masked for security.
        </p>
        
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <label className="text-sm font-medium text-gray-700 w-full sm:w-48 flex-shrink-0">
              JIRA URL *:
            </label>
            <input
              type="text"
              value={jiraUrl}
              onChange={(e) => {
                setJiraUrl(e.target.value);
                setIsValidated(false);
              }}
              placeholder="https://your-instance.atlassian.net"
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <label className="text-sm font-medium text-gray-700 w-full sm:w-48 flex-shrink-0">
              Email *:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setIsValidated(false);
              }}
              placeholder="user@example.com"
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <label className="text-sm font-medium text-gray-700 w-full sm:w-48 flex-shrink-0">
              API Token *:
            </label>
            <input
              type="password"
              value={apiToken}
              onChange={(e) => {
                setApiToken(e.target.value);
                setIsValidated(false);
              }}
              placeholder="Enter API token"
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <label className="text-sm font-medium text-gray-700 w-full sm:w-48 flex-shrink-0">
              JIRA on Cloud:
            </label>
            <div className="flex-1 flex items-center space-x-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={jiraCloud}
                  onChange={(e) => {
                    setJiraCloud(e.target.checked);
                    setIsValidated(false);
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  {jiraCloud ? 'Yes (Cloud)' : 'No (On-Prem)'}
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleValidate}
            disabled={validating}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {validating ? 'Validating...' : 'Validate'}
          </button>
        </div>

        {validationError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm mt-2">
            <div className="font-semibold mb-1">Validation Error</div>
            <div>{validationError}</div>
          </div>
        )}
        {validationSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm mt-2">
            {validationSuccess}
          </div>
        )}
      </div>
      
      <div className="flex justify-start gap-2">
        <button
          onClick={handleSave}
          disabled={loading || !isValidated || !hasChanges()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : '💾 Save'}
        </button>
      </div>
      {!isValidated && (
        <p className="text-xs text-gray-500 mt-2">
          Please validate the JIRA configuration before saving.
        </p>
      )}
      {isValidated && !hasChanges() && (
        <p className="text-xs text-gray-500 mt-2">
          No changes to save. Settings are already saved.
        </p>
      )}
    </div>
  );
}

