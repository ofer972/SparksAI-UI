'use client';

import React from 'react';

interface AuditLog {
  id: number;
  user_id?: string;
  severity: string;
  endpoint_path: string;
  action?: string;
  http_method: string;
  status_code: number;
  created_at: string;
  tokens_used?: number;
  response_time_seconds: number;
  body_raw?: string;
  query_raw?: string;
  response_body?: string;
  ip_address?: string;
  [key: string]: any;
}

interface AuditLogDetailModalProps {
  log: AuditLog;
  onClose: () => void;
}

interface ChangeAudit {
  change_type: string;
  entity_id?: number;
  changes: Array<{
    field: string;
    from: any;
    to: any;
  }>;
  user_email: string;
}

const AuditLogDetailModal: React.FC<AuditLogDetailModalProps> = ({ log, onClose }) => {
  let changeAudit: ChangeAudit | null = null;

  // Parse body_raw if it's a change audit
  if (log.body_raw) {
    try {
      const parsed = JSON.parse(log.body_raw);
      if (parsed.change_type && (parsed.change_type === 'goal_update' || parsed.change_type === 'settings_update')) {
        changeAudit = parsed;
      }
    } catch (e) {
      // Not JSON or not a change audit
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-surface border-b border-outline p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-content-primary">Audit Log Details</h2>
          <button
            onClick={onClose}
            className="text-content-tertiary hover:text-content-primary"
          >
            ✕
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-content-secondary">ID</label>
              <div className="text-sm text-content-primary">{log.id}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-content-secondary">Created At</label>
              <div className="text-sm text-content-primary">{new Date(log.created_at).toLocaleString()}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-content-secondary">User ID</label>
              <div className="text-sm text-content-primary">{log.user_id || '—'}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-content-secondary">HTTP Method</label>
              <div className="text-sm text-content-primary">{log.http_method}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-content-secondary">Endpoint</label>
              <div className="text-sm text-content-primary break-words">{log.endpoint_path}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-content-secondary">Action</label>
              <div className="text-sm text-content-primary">{log.action || '—'}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-content-secondary">Status Code</label>
              <div className="text-sm text-content-primary">{log.status_code}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-content-secondary">Severity</label>
              <div className="text-sm text-content-primary">{log.severity}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-content-secondary">Tokens Used</label>
              <div className="text-sm text-content-primary">{log.tokens_used != null ? log.tokens_used : '—'}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-content-secondary">Response Time</label>
              <div className="text-sm text-content-primary">{log.response_time_seconds.toFixed(2)}s</div>
            </div>
            {log.ip_address && (
              <div>
                <label className="text-xs font-medium text-content-secondary">IP Address</label>
                <div className="text-sm text-content-primary">{log.ip_address}</div>
              </div>
            )}
          </div>

          {changeAudit && (
            <div className="border-t border-outline pt-4 mt-4">
              <h3 className="text-md font-semibold text-content-primary mb-3">Change Audit</h3>
              {changeAudit.entity_id && (
                <div className="mb-4">
                  <label className="text-xs font-medium text-content-secondary">Entity ID</label>
                  <div className="text-sm text-content-primary">{changeAudit.entity_id}</div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-content-secondary mb-2 block">Changes</label>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border border-outline">
                    <thead className="bg-surface-elevated">
                      <tr>
                        <th className="px-4 py-3 text-left border border-outline font-semibold">Field</th>
                        <th className="px-4 py-3 text-left border border-outline font-semibold">From</th>
                        <th className="px-4 py-3 text-left border border-outline font-semibold">To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changeAudit.changes.map((change, idx) => (
                        <tr key={idx} className="border border-outline">
                          <td className="px-4 py-3 border border-outline font-medium">{change.field}</td>
                          <td className="px-4 py-3 border border-outline break-words">
                            {typeof change.from === 'object' ? JSON.stringify(change.from, null, 2) : String(change.from ?? '—')}
                          </td>
                          <td className="px-4 py-3 border border-outline break-words">
                            {typeof change.to === 'object' ? JSON.stringify(change.to, null, 2) : String(change.to ?? '—')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {log.body_raw && !changeAudit && (
            <div className="border-t border-outline pt-4 mt-4">
              <label className="text-xs font-medium text-content-secondary mb-2 block">Body Raw</label>
              <pre className="bg-surface-elevated p-3 rounded text-xs overflow-x-auto border border-outline">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(log.body_raw), null, 2);
                  } catch {
                    return log.body_raw;
                  }
                })()}
              </pre>
            </div>
          )}

          {log.query_raw && (
            <div className="border-t border-outline pt-4 mt-4">
              <label className="text-xs font-medium text-content-secondary mb-2 block">Query Raw</label>
              <pre className="bg-surface-elevated p-3 rounded text-xs overflow-x-auto border border-outline">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(log.query_raw), null, 2);
                  } catch {
                    return log.query_raw;
                  }
                })()}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogDetailModal;

