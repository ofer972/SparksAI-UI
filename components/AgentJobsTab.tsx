import { useState } from 'react';
import { useAgentJobs } from '@/hooks/useAgentJobs';
import AgentJobDetailModal from './AgentJobDetailModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';

export default function AgentJobsTab() {
  const { jobs, loading, error, refetch } = useAgentJobs();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: '',
    direction: 'asc'
  });
  
  // Filter state
  const [filterText, setFilterText] = useState('');

  // Ensure jobs is always an array
  const safeJobs = Array.isArray(jobs) ? jobs : [];

  // Apply text filter
  const filteredJobs = safeJobs.filter(job => {
    if (!filterText) return true;
    return Object.values(job).some(value => 
      String(value).toLowerCase().includes(filterText.toLowerCase())
    );
  });

  // Get available columns from the first job
  const availableColumns = safeJobs.length > 0 ? Object.keys(safeJobs[0]).map(key => ({
    key,
    label: key === 'job_id' ? 'Job ID' : key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  })) : [];

  const handleSort = (key: string) => {
    if (sortConfig.key === key) {
      setSortConfig({
        key,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      setSortConfig({ key, direction: 'asc' });
    }
  };

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleViewJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setIsDetailModalOpen(true);
  };

  const handleDeleteJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setIsDeleteModalOpen(true);
  };

  const formatCellValue = (value: any, key: string) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    
    // Special formatting for specific columns
    if (key === 'claimed_at') {
      // Format date to show time with minutes only
      try {
        const date = new Date(value);
        return date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      } catch {
        return String(value);
      }
    }
    
    if (key === 'result' && typeof value === 'string') {
      // For results, show more text but still truncate very long ones
      if (value.length > 100) {
        return value.substring(0, 100) + '...';
      }
      return value;
    }
    
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...';
    }
    return String(value);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'text-green-600 font-semibold';
      case 'error':
        return 'text-red-600 font-semibold';
      default:
        return 'text-blue-600 font-semibold';
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) {
      return (
        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortConfig.direction === 'asc' ? (
      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const SkeletonRow = () => (
    <tr className="border-b border-gray-200">
      {[...Array(availableColumns.length + 1)].map((_, index) => (
        <td key={index} className={`py-2 px-3 ${
          index < availableColumns.length ? 'border-r border-gray-200' : 'border-l border-gray-200'
        }`}>
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        </td>
      ))}
    </tr>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Agent Jobs</h2>
          <button
            onClick={refetch}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        
        {/* Search Filter */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filter jobs..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-50">
              {availableColumns.map((column, index) => (
                <th 
                  key={column.key}
                  className={`py-2 px-3 cursor-pointer hover:bg-gray-100 font-semibold text-gray-700 ${
                    column.key === 'job_id' ? 'text-center' : 'text-left'
                  } ${
                    index < availableColumns.length - 1 ? 'border-r border-gray-200' : ''
                  } ${
                    column.key === 'result' ? 'min-w-80 max-w-md' : ''
                  } ${
                    column.key === 'error' ? 'max-w-32' : ''
                  }`}
                  onClick={() => handleSort(column.key)}
                >
                  <div className={`flex items-center gap-1 ${
                    column.key === 'job_id' ? 'justify-center' : ''
                  }`}>
                    {column.label}
                    <SortIcon columnKey={column.key} />
                  </div>
                </th>
              ))}
              <th className="py-2 px-3 text-center text-gray-500 font-semibold border-l border-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : error ? (
              <tr>
                <td colSpan={availableColumns.length + 1} className="py-8 text-center text-red-600">
                  Error: {error}
                  <div className="text-xs text-gray-500 mt-2">Check console for more details</div>
                </td>
              </tr>
            ) : availableColumns.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-gray-500">
                  No data available. Waiting for API response...
                </td>
              </tr>
            ) : (
              sortedJobs.map((job, index) => (
                <tr key={index} className={`border-b border-gray-200 ${
                  index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                }`}>
                  {availableColumns.map((column, colIndex) => (
                    <td 
                      key={column.key}
                      className={`py-2 px-3 ${
                        column.key === 'job_id' ? 'text-center' : 'text-left'
                      } ${
                        colIndex < availableColumns.length - 1 ? 'border-r border-gray-200' : ''
                      } ${
                        column.key === 'status' ? getStatusColor(job[column.key]) : ''
                      } ${
                        column.key === 'result' ? 'text-sm min-w-80 max-w-md' : ''
                      } ${
                        column.key === 'error' ? 'text-xs max-w-32' : ''
                      }`}
                    >
                      {formatCellValue(job[column.key], column.key)}
                    </td>
                  ))}
                  <td className="py-2 px-3 text-center border-l border-gray-200">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleViewJob(job.job_id || job.id || index.toString())}
                        className="text-blue-600 hover:text-blue-800 transition-colors p-1 rounded hover:bg-blue-50"
                        title="View Details"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteJob(job.job_id || job.id || index.toString())}
                        className="text-red-600 hover:text-red-800 transition-colors p-1 rounded hover:bg-red-50"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sortedJobs.length === 0 && !loading && !error && (
        <div className="text-center py-8 text-gray-500">
          No agent jobs found.
        </div>
      )}

      {/* Modals */}
      <AgentJobDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        jobId={selectedJobId || ''}
      />
      
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        itemName="agent job"
      />
    </div>
  );
}
