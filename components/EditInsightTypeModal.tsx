'use client';

import { useState, useEffect } from 'react';
import { InsightType } from '@/lib/config';

interface EditInsightTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  insightType: InsightType | null;
  insightCategories: string[];
  onSave: (data: { insight_type?: string; insight_description: string; insight_categories: string[]; active: boolean }) => Promise<void>;
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
      setError(null);
    }
  }, [isOpen, insightType]);

  const toggleCategory = (category: string) => {
    setIncludedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((name) => name !== category)
        : [...prev, category]
    );
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
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 overflow-y-auto flex-1">
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Insight Type
              </h3>
              {insightType && (
                <input
                  type="text"
                  value={insightTypeName}
                  onChange={(e) => setInsightTypeName(e.target.value)}
                  className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Insight Type"
                />
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Active Checkbox */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="active" className="ml-2 block text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={insightDescription}
                  onChange={(e) => setInsightDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter insight description"
                />
              </div>

              {/* Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insight Categories
                </label>
                <div className="border border-gray-300 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                  {insightCategories.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-2 bg-gray-50">No categories available</p>
                  ) : (
                    <table className="w-full">
                      <tbody>
                        {insightCategories.map((category, index) => {
                          const isIncluded = includedCategories.includes(category);
                          return (
                            <tr
                              key={category}
                              className={`border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                              }`}
                            >
                              <td className="p-2">
                                <label className="flex items-center gap-2 cursor-pointer w-full">
                                  <input
                                    type="checkbox"
                                    checked={isIncluded}
                                    onChange={() => toggleCategory(category)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <span className="text-sm font-medium text-gray-900">
                                    {category}
                                  </span>
                                </label>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
        {/* Footer with buttons - sticky at bottom */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

