import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
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
      
      // Handle composite keys (e.g., prompts use email_address + prompt_name)
      let detailId: string;
      if (config.title === 'Prompts' && 'email_address' in item && 'prompt_name' in item) {
        // Construct composite ID for prompts: email_address/prompt_name
        detailId = `${(item as any).email_address}/${(item as any).prompt_name}`;
      } else {
        // Use primary key for other entities
        const primaryKeyValue = item[config.primaryKey];
        detailId = String(primaryKeyValue);
      }
      
      const detail = await config.fetchDetail(detailId);
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
    
    // Simple auto-detection: if it's a string > 100 chars, it's long text
    return typeof value === 'string' && value.length > 100;
  };

  const isNormalField = (key: keyof T) => {
    // Use config if provided
    if (config.normalFields) {
      return config.normalFields.includes(key);
    }
    
    // Simple auto-detection: everything else is normal
    return true;
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
    const isMarkdown = config.markdownFields?.includes(key);
    const isInformationJson = String(key) === 'information_json';
    
    // Format information_json as readable JSON
    let displayValue = formattedValue;
    if (isInformationJson && typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        displayValue = JSON.stringify(parsed, null, 2);
      } catch {
        // If parsing fails, use original value
        displayValue = formattedValue;
      }
    }
    
    return (
      <div key={String(key)} className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-2">
          {String(key).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
        </div>
        <div className="bg-gray-50 p-3 rounded text-sm text-gray-900 max-h-64 overflow-y-auto">
          {isMarkdown ? (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  p: ({ children }) => <p className="text-sm text-gray-900 mb-2">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  ul: ({ children }) => <ul className="list-disc list-inside text-sm text-gray-900 mb-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside text-sm text-gray-900 mb-2">{children}</ol>,
                  li: ({ children }) => <li className="text-sm text-gray-900">{children}</li>,
                  code: ({ children }) => <code className="bg-gray-100 px-1 rounded text-xs">{children}</code>,
                  pre: ({ children }) => <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto whitespace-pre-wrap">{children}</pre>,
                  h1: ({ children }) => <h1 className="text-lg font-bold text-gray-900 mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-bold text-gray-900 mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-900 mb-2">{children}</h3>,
                  blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-300 pl-2 italic text-gray-600 mb-2">{children}</blockquote>,
                }}
              >
                {String(displayValue)}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="whitespace-pre-wrap font-mono text-xs">{displayValue}</div>
          )}
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
                  {(() => {
                    const entries = Object.entries(displayData).filter(([key, value]) => isNormalField(key as keyof T));
                    
                    // Sort by normalFields order if configured
                    if (config.normalFields && config.normalFields.length > 0) {
                      entries.sort(([keyA], [keyB]) => {
                        const indexA = config.normalFields!.indexOf(keyA as keyof T);
                        const indexB = config.normalFields!.indexOf(keyB as keyof T);
                        // Fields in normalFields come first, ordered by array
                        // Fields not in normalFields come after, in original order
                        if (indexA === -1 && indexB === -1) return 0;
                        if (indexA === -1) return 1;
                        if (indexB === -1) return -1;
                        return indexA - indexB;
                      });
                    }
                    
                    return entries.map(([key, value]) => renderNormalField(key as keyof T, value));
                  })()}
                </div>
              </div>

              {/* Long Text Fields Section */}
              {Object.entries(displayData).some(([key, value]) => isLongTextField(key as keyof T, value)) && (
                <div>
                  <h4 className="text-md font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
                    Details
                  </h4>
                  <div className="space-y-4">
                    {(() => {
                      const entries = Object.entries(displayData).filter(([key, value]) => isLongTextField(key as keyof T, value));
                      
                      // Sort by longTextFields order if configured
                      if (config.longTextFields && config.longTextFields.length > 0) {
                        entries.sort(([keyA], [keyB]) => {
                          const indexA = config.longTextFields!.indexOf(keyA as keyof T);
                          const indexB = config.longTextFields!.indexOf(keyB as keyof T);
                          // Fields in longTextFields come first, ordered by array
                          // Fields not in longTextFields come after, in original order
                          if (indexA === -1 && indexB === -1) return 0;
                          if (indexA === -1) return 1;
                          if (indexB === -1) return -1;
                          return indexA - indexB;
                        });
                      }
                      
                      return entries.map(([key, value]) => renderLongTextField(key as keyof T, value));
                    })()}
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
