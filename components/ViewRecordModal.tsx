import React, { useState, useEffect } from 'react';
import { EntityConfig } from '@/lib/entityConfig';

interface ViewRecordModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  item: T | null;
  config: EntityConfig<T>;
}

export function ViewRecordModal<T extends Record<string, any>>({
  isOpen,
  onClose,
  item,
  config,
}: ViewRecordModalProps<T>) {
  const [detailData, setDetailData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item && config.fetchDetail) {
      fetchDetail();
    } else if (isOpen && item) {
      // Use the item data directly if no detail fetch function
      setDetailData(item);
    }
  }, [isOpen, item]);

  const fetchDetail = async () => {
    if (!item || !config.fetchDetail) return;
    
    try {
      setLoading(true);
      setError(null);
      const primaryKeyValue = item[config.primaryKey];
      const detail = await config.fetchDetail(String(primaryKeyValue));
      setDetailData(detail);
    } catch (err) {
      console.error('Error fetching detail:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const displayData = detailData || item;
  if (!displayData) return null;

  const formatValue = (value: any, key: keyof T) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    
    // Special formatting for dates
    if (key === 'created_at' || key === 'claimed_at' || key === 'completed_at' || key === 'updated_at' || key === 'date') {
      try {
        const date = new Date(value);
        return date.toLocaleString();
      } catch {
        return String(value);
      }
    }
    
    return String(value);
  };

  const isLongText = (value: any) => {
    return typeof value === 'string' && value.length > 200;
  };

  const isLongTextField = (key: keyof T, value: any) => {
    // Use config if provided
    if (config.longTextFields) {
      return config.longTextFields.includes(key);
    }
    
    // Fallback to common long text field names
    const longTextFields = [
      'description', 'result', 'error', 'input_sent', 'full_information', 
      'information_json', 'data', 'content', 'message', 'details', 'notes'
    ];
    
    return longTextFields.includes(String(key)) || isLongText(value);
  };

  const isNormalField = (key: keyof T) => {
    // Use config if provided
    if (config.normalFields) {
      return config.normalFields.includes(key);
    }
    
    // Fallback to common normal field names (short fields that should be displayed in grid)
    const normalFields = [
      'id', 'job_id', 'card_id', 'log_id', 'transcript_id',
      'status', 'type', 'job_type', 'card_type', 'log_type',
      'team_name', 'team', 'claimed_by', 'created_by', 'user',
      'priority', 'level', 'severity',
      'created_at', 'updated_at', 'claimed_at', 'completed_at', 'date',
      'source', 'category', 'subcategory'
    ];
    
    return normalFields.includes(String(key));
  };

  const renderNormalField = (key: keyof T, value: any) => {
    const formattedValue = formatValue(value, key);
    
    return (
      <div key={String(key)} className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 items-start">
        <span className="text-sm font-medium text-gray-700">
          {String(key).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
        </span>
        <span className="text-sm text-gray-900">{formattedValue}</span>
      </div>
    );
  };

  const renderLongTextField = (key: keyof T, value: any) => {
    const formattedValue = formatValue(value, key);
    
    return (
      <div key={String(key)} className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-2">
          {String(key).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
        </div>
        <div className="bg-gray-50 p-3 rounded text-sm text-gray-900 whitespace-pre-wrap max-h-64 overflow-y-auto">
          {formattedValue}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {config.title} Details
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-112px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading details...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-2">Error loading details</div>
              <div className="text-sm text-gray-500">{error}</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Normal Fields Section */}
              <div>
                <h4 className="text-md font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
                  Overview
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(displayData)
                    .filter(([key, value]) => isNormalField(key as keyof T))
                    .map(([key, value]) => renderNormalField(key as keyof T, value))
                  }
                </div>
              </div>

              {/* Long Text Fields Section */}
              {Object.entries(displayData).some(([key, value]) => isLongTextField(key as keyof T, value)) && (
                <div>
                  <h4 className="text-md font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
                    Details
                  </h4>
                  <div className="space-y-4">
                    {Object.entries(displayData)
                      .filter(([key, value]) => isLongTextField(key as keyof T, value))
                      .map(([key, value]) => renderLongTextField(key as keyof T, value))
                    }
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-3 pt-3 pb-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
