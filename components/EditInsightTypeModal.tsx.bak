'use client';

import { useState, useEffect } from 'react';
import { InsightType } from '@/lib/config';
import CronEditor from './CronEditor';
import MultiSelectDropdown from './MultiSelectDropdown';

interface CronConfig {
  day_of_week?: string;
  hour?: number;
  minute?: number;
}

interface EditInsightTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  insightType: InsightType | null;
  insightCategories: string[];
  onSave: (data: { 
    insight_type?: string; 
    insight_description: string; 
    insight_categories: string[]; 
    active: boolean;
    cron_config?: CronConfig | null;
  }) => Promise<void>;
}

export default function EditInsightTypeModal({
  isOpen,
  onClose,
  insightType,
  insightCategories,
  onSave,
}: EditInsightTypeModalProps) {
  const [insightTypeName, setInsightTypeName] = useState('');
  const [insightDescription, setInsightDescription] = useState('');
  const [active, setActive] = useState(false);
  const [includedCategories, setIncludedCategories] = useState<string[]>([]);
  const [cronConfig, setCronConfig] = useState<CronConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form data when modal opens or insightType changes
  useEffect(() => {
    if (isOpen && insightType) {
      setInsightTypeName(insightType.insight_type || '');
      setInsightDescription(insightType.insight_description || '');
      setActive(insightType.active ?? false);
      // Use insight_categories if available, fallback to categories for backward compatibility
      setIncludedCategories(insightType.insight_categories || insightType.categories || []);
      setCronConfig(insightType.cron_config || null);
      setError(null);
    }
  }, [isOpen, insightType]);

  const handleCategoriesChange = (categories: string[]) => {
    setIncludedCategories(categories);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSave({
        insight_type: insightTypeName,
        insight_description: insightDescription,
        insight_categories: includedCategories,
        active: active,
        cron_config: cronConfig,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save insight type');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Edit Insight Type
                </h3>
                {insightType && (
                  <p className="text-sm text-gray-600 mt-0.5">
                    {insightType.insight_type}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Active Status */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="active" className="block text-sm font-medium text-gray-900">
                      Status
                    </label>
                    <p className="text-xs text-gray-600 mt-1">
                      {active ? 'This insight type is currently active and will be generated' : 'This insight type is currently inactive'}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="active"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="active" className="ml-3 text-sm font-medium text-gray-700">
                      {active ? 'Active' : 'Inactive'}
                    </label>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Description
                </label>
                <textarea
                  value={insightDescription}
                  onChange={(e) => setInsightDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Enter a detailed description of this insight type..."
                />
              </div>

              {/* Categories */}
              <MultiSelectDropdown
                label="Insight Categories"
                options={insightCategories}
                selectedValues={includedCategories}
                onChange={handleCategoriesChange}
                placeholder="Select categories..."
              />

              {/* Cron Schedule */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <CronEditor
                  value={cronConfig}
                  onChange={setCronConfig}
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer with buttons - sticky at bottom */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-xl">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-white text-gray-700 border border-gray-300 py-3 px-6 rounded-lg hover:bg-gray-50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
            >
              Cancel
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                const form = document.querySelector('form');
                if (form) {
                  form.requestSubmit();
                }
              }}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

