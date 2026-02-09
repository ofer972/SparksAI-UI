'use client';

import React, { useState } from 'react';

interface SaveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => Promise<void>;
  initialName?: string;
  initialDescription?: string;
  isUpdate?: boolean;
}

export default function SaveReportModal({
  isOpen,
  onClose,
  onSave,
  initialName = '',
  initialDescription = '',
  isUpdate = false
}: SaveReportModalProps) {
  const [reportName, setReportName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setReportName(initialName);
      setDescription(initialDescription);
      setError(null);
    }
  }, [isOpen, initialName, initialDescription]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setError(null);
    
    // Validate report name
    if (!reportName || !reportName.trim()) {
      setError('Report name is required');
      return;
    }
    
    if (reportName.length > 100) {
      setError('Report name must be 100 characters or less');
      return;
    }

    setSaving(true);
    try {
      await onSave(reportName.trim(), description.trim());
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save report';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          {/* Header */}
          <h3 className="text-lg font-semibold text-content-primary mb-4">
            {isUpdate ? 'Update Report' : 'Save Report'}
          </h3>

          {/* Form */}
          <div className="space-y-4">
            {/* Report Name */}
            <div>
              <label className="block text-sm font-medium text-content-primary mb-1">
                Report Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                maxLength={100}
                className="w-full px-3 py-2 border border-outline rounded-md text-sm bg-surface-elevated text-content-primary focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="Enter report name"
                disabled={saving}
              />
              <div className="text-xs text-content-tertiary mt-1">
                {reportName.length}/100 characters
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-content-primary mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-outline rounded-md text-sm bg-surface-elevated text-content-primary focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                placeholder="Enter report description (optional)"
                disabled={saving}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-danger-bg border border-danger-border rounded-md p-3 text-sm text-danger-text">
                {error}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !reportName.trim()}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : (isUpdate ? 'Update' : 'Save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

