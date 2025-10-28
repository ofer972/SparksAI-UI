'use client';

import { useState, useEffect } from 'react';
import { ApiService } from '@/lib/api';

interface MultiPIFilterProps {
  selectedPIs: string[];
  onPIsChange: (pis: string[]) => void;
  className?: string;
  maxSelections?: number;
}

interface PI {
  pi_name: string;
  start_date: string;
  end_date: string;
  planning_grace_days: number;
  prep_grace_days: number;
  updated_at: string;
}

interface PIResponse {
  success: boolean;
  data: {
    pis: PI[];
    count: number;
  };
  message: string;
}

export default function MultiPIFilter({ 
  selectedPIs, 
  onPIsChange, 
  className = '',
  maxSelections = 4 
}: MultiPIFilterProps) {
  const [pis, setPis] = useState<PI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchPIs = async () => {
      try {
        setLoading(true);
        const apiService = new ApiService();
        const response = await apiService.getPIs();
        
        if (response.pis) {
          setPis(response.pis);
          // Set default PI if none selected
          if (selectedPIs.length === 0 && response.pis.length > 0) {
            onPIsChange([response.pis[0].pi_name]);
          }
        } else {
          throw new Error('Failed to fetch PIs');
        }
      } catch (err) {
        console.error('Error fetching PIs:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch PIs');
        // Fallback to default PI
        setPis([{
          pi_name: 'Q32025',
          start_date: '2025-06-29',
          end_date: '2025-10-04',
          planning_grace_days: 5,
          prep_grace_days: 5,
          updated_at: '2025-10-22T13:10:47.185201+00:00'
        }]);
        if (selectedPIs.length === 0) {
          onPIsChange(['Q32025']);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPIs();
  }, [selectedPIs, onPIsChange]);

  const handlePIChange = (piName: string, checked: boolean) => {
    if (checked) {
      if (selectedPIs.length < maxSelections) {
        onPIsChange([...selectedPIs, piName]);
      }
    } else {
      onPIsChange(selectedPIs.filter(pi => pi !== piName));
    }
  };

  const handleSelectAll = () => {
    const availablePIs = pis.slice(0, maxSelections).map(pi => pi.pi_name);
    onPIsChange(availablePIs);
  };

  const handleClearAll = () => {
    onPIsChange([]);
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-xs font-medium text-gray-700">PIs:</span>
        <div className="border border-gray-300 rounded px-2 py-1 text-xs bg-gray-100">
          Loading...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-xs font-medium text-gray-700">PIs:</span>
        <div className="border border-gray-300 rounded px-2 py-1 text-xs bg-red-100 text-red-600">
          Error loading PIs
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center space-x-2">
        <span className="text-xs font-medium text-gray-700">PIs:</span>
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="border border-gray-300 rounded px-2 py-1 text-xs bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px] text-left flex items-center justify-between"
          >
            <span>
              {selectedPIs.length === 0 
                ? 'Select PIs' 
                : selectedPIs.length === 1 
                  ? selectedPIs[0] 
                  : `${selectedPIs.length} PIs selected`
              }
            </span>
            <span className="ml-1">{isOpen ? '▲' : '▼'}</span>
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-300 rounded shadow-lg z-10">
              <div className="p-2 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">
                    Select up to {maxSelections} PIs
                  </span>
                  <div className="space-x-1">
                    <button
                      onClick={handleSelectAll}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Select All
                    </button>
                    <span className="text-xs text-gray-300">|</span>
                    <button
                      onClick={handleClearAll}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="max-h-48 overflow-y-auto">
                {pis.map((pi) => {
                  const isChecked = selectedPIs.includes(pi.pi_name);
                  const isDisabled = !isChecked && selectedPIs.length >= maxSelections;
                  
                  return (
                    <label
                      key={pi.pi_name}
                      className={`flex items-center px-3 py-2 text-xs hover:bg-gray-50 cursor-pointer ${
                        isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handlePIChange(pi.pi_name, e.target.checked)}
                        disabled={isDisabled}
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="flex-1">{pi.pi_name}</span>
                      {isChecked && (
                        <span className="text-blue-600 text-xs">✓</span>
                      )}
                    </label>
                  );
                })}
              </div>
              
              {selectedPIs.length > 0 && (
                <div className="p-2 border-t border-gray-200 bg-gray-50">
                  <div className="text-xs text-gray-600">
                    Selected: {selectedPIs.join(', ')}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
