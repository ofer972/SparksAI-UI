'use client';

import { useState, useEffect } from 'react';
import { ApiService } from '@/lib/api';

interface PIFilterProps {
  selectedPI: string;
  onPIChange: (pi: string) => void;
  className?: string;
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

export default function PIFilter({ selectedPI, onPIChange, className = '' }: PIFilterProps) {
  const [pis, setPis] = useState<PI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPIs = async () => {
      try {
        setLoading(true);
        const apiService = new ApiService();
        const response = await apiService.getPIs();
        
        if (response.pis) {
          setPis(response.pis);
          // Set default PI if none selected
          if (!selectedPI && response.pis.length > 0) {
            onPIChange(response.pis[0].pi_name);
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
      } finally {
        setLoading(false);
      }
    };

    fetchPIs();
  }, [selectedPI, onPIChange]);

  if (loading) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <span className="text-xs font-medium text-gray-700">PI:</span>
        <select className="border border-gray-300 rounded px-2 py-1 text-xs" disabled>
          <option>Loading...</option>
        </select>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <span className="text-xs font-medium text-gray-700">PI:</span>
        <select className="border border-gray-300 rounded px-2 py-1 text-xs" disabled>
          <option>Error loading PIs</option>
        </select>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <span className="text-xs font-medium text-gray-700">PI:</span>
      <select
        value={selectedPI}
        onChange={(e) => onPIChange(e.target.value)}
        className="border border-gray-300 rounded px-2 py-1 text-xs"
      >
        {pis.map((pi) => (
          <option key={pi.pi_name} value={pi.pi_name}>
            {pi.pi_name}
          </option>
        ))}
      </select>
    </div>
  );
}
