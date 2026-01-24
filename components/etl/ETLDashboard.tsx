'use client';

import { ETLSettings, Job } from '@/lib/etl';
import ETLJobStatus from './ETLJobStatus';

interface ETLDashboardProps {
  settings: ETLSettings | null;
  jobStatus: { current_job: Job | null; last_finished_job: Job | null } | null;
  customFields: { [field_id: string]: string };
  refreshingStatus: boolean;
  onRefreshJobStatus: () => void;
  onShowETLSettings: () => void;
  onShowETLSyncActions: () => void;
}

function etlGetFieldDisplayName(fieldId: string | null | undefined, customFields: { [field_id: string]: string }): string {
  if (!fieldId) return 'Not Set';
  if (fieldId === 'sprint') return 'Sprint (System Default)';
  const fieldName = customFields?.[fieldId];
  return fieldName ? `${fieldName} (${fieldId})` : fieldId;
}

function formatDate(timestamp: string | null): string {
  if (!timestamp) return 'Never';
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid';
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    return `${day} ${month} ${year} ${time}`;
  } catch {
    return 'Error';
  }
}

export default function ETLDashboard({
  settings,
  jobStatus,
  customFields,
  refreshingStatus,
  onRefreshJobStatus,
}: ETLDashboardProps) {
  return (
    <div className="h-full flex flex-col overflow-hidden bg-surface">
      {/* Content - Single Column, No Scroll */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="h-full flex flex-col gap-6">
          {/* Job Status - Fixed height */}
          <div className="flex-shrink-0">
            <ETLJobStatus 
              jobStatus={jobStatus} 
              lastHistoryBackfill={settings?.history_last_backfill_timestamp || null}
              showHeader={true}
              refreshingStatus={refreshingStatus}
              onRefresh={onRefreshJobStatus}
            />
          </div>

          {/* Last Sync Issue / History */}
          <div className="flex-shrink-0 bg-surface rounded-lg shadow-sm border border-outline p-4">
            <h3 className="text-sm font-semibold text-content-primary mb-3">Last Sync Issue / History</h3>
            <div className="space-y-3">
              {settings?.periodic_sync_of_data_minutes && (
                <div className="flex flex-col sm:flex-row">
                  <span className="text-xs font-bold text-black w-full sm:w-48 flex-shrink-0 mb-1 sm:mb-0">Sync Data period:</span>
                  <span className="text-xs font-bold text-brand">
                    {settings.periodic_sync_of_data_minutes} minutes
                  </span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs font-medium text-black w-full sm:w-48 flex-shrink-0 mb-1 sm:mb-0">Last Sync Issues:</span>
                <span className="text-xs text-brand">
                  {formatDate(settings?.last_import_timestamp || null)}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs font-medium text-black w-full sm:w-48 flex-shrink-0 mb-1 sm:mb-0">Last History Backfill:</span>
                <span className="text-xs text-brand">
                  {formatDate(settings?.history_last_backfill_timestamp || null)}
                </span>
              </div>
            </div>
          </div>

          {/* Project Keys & Fields */}
          <div className="flex-1 bg-surface rounded-lg shadow-sm border border-outline p-4 overflow-auto">
            <h3 className="text-sm font-semibold text-content-primary mb-3">Project Keys & Fields</h3>
            <div className="space-y-3">
              {/* Selected Project Keys */}
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs font-medium text-black w-full sm:w-48 flex-shrink-0 mb-1 sm:mb-0">Selected Project Keys:</span>
                <span className="text-xs text-brand">
                  {settings?.selected_project_keys && settings.selected_project_keys.length > 0
                    ? settings.selected_project_keys.join(', ')
                    : 'None (All projects will be synced)'}
                </span>
              </div>

              {/* JQL Scope */}
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs font-medium text-black w-full sm:w-48 flex-shrink-0 mb-1 sm:mb-0">JQL Scope:</span>
                <span className="text-xs text-brand">
                  {((settings as any)?.jql_scope && String((settings as any).jql_scope).trim()) 
                    ? String((settings as any).jql_scope) 
                    : 'None'}
                </span>
              </div>

              {/* Field IDs */}
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs font-medium text-black w-full sm:w-48 flex-shrink-0 mb-1 sm:mb-0">Selected PI Custom Field ID:</span>
                <span className="text-xs text-brand">{etlGetFieldDisplayName(settings?.selected_pi_custom_field_id, customFields)}</span>
              </div>
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs font-medium text-black w-full sm:w-48 flex-shrink-0 mb-1 sm:mb-0">Selected Sprint Field ID:</span>
                <span className="text-xs text-brand">{etlGetFieldDisplayName(settings?.selected_sprint_field_id, customFields)}</span>
              </div>
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs font-medium text-black w-full sm:w-48 flex-shrink-0 mb-1 sm:mb-0">Selected Sizing Field ID:</span>
                <span className="text-xs text-brand">{etlGetFieldDisplayName(settings?.selected_sizing_field_id, customFields)}</span>
              </div>
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs font-medium text-black w-full sm:w-48 flex-shrink-0 mb-1 sm:mb-0">Selected Team Name Field ID:</span>
                <span className="text-xs text-brand">{etlGetFieldDisplayName(settings?.selected_team_name_field_id, customFields)}</span>
              </div>
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs font-medium text-black w-full sm:w-48 flex-shrink-0 mb-1 sm:mb-0">Selected Flagged Field ID:</span>
                <span className="text-xs text-brand">{etlGetFieldDisplayName(settings?.selected_flagged_field_id, customFields)}</span>
              </div>

              {/* Selected Custom Fields */}
              <div className="flex flex-col sm:flex-row">
                <span className="text-xs font-medium text-black w-full sm:w-48 flex-shrink-0 mb-1 sm:mb-0">Selected Custom Fields:</span>
                <div className="space-y-1">
                  {settings?.selected_custom_fields && settings.selected_custom_fields.length > 0
                    ? settings.selected_custom_fields.map(id => {
                        const fieldName = customFields[id];
                        const displayText = fieldName ? `${fieldName} (${id})` : id;
                        return (
                          <div key={id} className="text-xs text-brand">
                            {displayText}
                          </div>
                        );
                      })
                    : <span className="text-xs text-brand">None</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
