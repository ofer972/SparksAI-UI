import { useState, useEffect } from 'react';
import { ApiService } from '@/lib/api';

interface AgentJobDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
}

export default function AgentJobDetailModal({ 
  isOpen, 
  onClose, 
  jobId 
}: AgentJobDetailModalProps) {
  const [jobDetail, setJobDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && jobId) {
      fetchJobDetail();
    }
  }, [isOpen, jobId]);

  const fetchJobDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiService = new ApiService();
      const response = await apiService.getAgentJobDetail(jobId);
      
      setJobDetail(response);
    } catch (err) {
      console.error('Error fetching job detail:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch job details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Agent Job Details
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
              <span className="ml-2 text-gray-600">Loading job details...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-2">Error loading job details</div>
              <div className="text-sm text-gray-500">{error}</div>
            </div>
          ) : jobDetail ? (
            <div className="space-y-4">
              {/* Job Overview Section */}
              <div className="grid grid-cols-2 gap-8">
                <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 items-start">
                  <span className="text-sm font-medium text-gray-700">Job ID:</span>
                  <span className="text-sm text-gray-900">{jobDetail.job_id}</span>

                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <span className={`text-sm font-semibold ${
                    jobDetail.status === 'completed' ? 'text-green-600' :
                    jobDetail.status === 'error' ? 'text-red-600' : 'text-blue-600'
                  }`}>{jobDetail.status}</span>

                  <span className="text-sm font-medium text-gray-700">Type:</span>
                  <span className="text-sm text-gray-900">{jobDetail.job_type}</span>

                  <span className="text-sm font-medium text-gray-700">Team:</span>
                  <span className="text-sm text-gray-900">{jobDetail.team_name}</span>
                </div>
                <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 items-start">
                  <span className="text-sm font-medium text-gray-700">Claimed By:</span>
                  <span className="text-sm text-gray-900">{jobDetail.claimed_by}</span>

                  <span className="text-sm font-medium text-gray-700">Created:</span>
                  <span className="text-sm text-gray-900">{jobDetail.created_at ? new Date(jobDetail.created_at).toLocaleString() : '-'}</span>

                  <span className="text-sm font-medium text-gray-700">Claimed:</span>
                  <span className="text-sm text-gray-900">{jobDetail.claimed_at ? new Date(jobDetail.claimed_at).toLocaleString() : '-'}</span>

                  <span className="text-sm font-medium text-gray-700">Completed:</span>
                  <span className="text-sm text-gray-900">{jobDetail.completed_at ? new Date(jobDetail.completed_at).toLocaleString() : '-'}</span>
                </div>
              </div>

              {/* Input Sent Section */}
              {jobDetail.input_sent && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Input Sent:</div>
                  <div className="bg-gray-50 p-3 rounded text-sm text-gray-900 whitespace-pre-wrap h-64 overflow-y-auto">
                    {jobDetail.input_sent}
                  </div>
                </div>
              )}

              {/* Data Sections */}
              {jobDetail.data && (
                <div className="space-y-4">
                  {Object.entries(jobDetail.data).map(([sectionKey, sectionValue]) => (
                    <div key={sectionKey}>
                      <div className="text-sm font-bold text-gray-900 mb-2 uppercase">
                        {sectionKey.replace(/_/g, ' ')}
                      </div>
                      <div className="bg-gray-50 p-3 rounded text-sm text-gray-900 whitespace-pre-wrap h-64 overflow-y-auto">
                        {typeof sectionValue === 'object' ? 
                          JSON.stringify(sectionValue, null, 2) : 
                          String(sectionValue)
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Result Section */}
              {jobDetail.result && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Result:</div>
                  <div className="bg-gray-50 p-3 rounded text-sm text-gray-900 whitespace-pre-wrap h-64 overflow-y-auto">
                    {jobDetail.result}
                  </div>
                </div>
              )}

              {/* Error Section */}
              {jobDetail.error && (
                <div>
                  <div className="text-sm font-medium text-red-700 mb-2">Error:</div>
                  <div className="bg-red-50 p-3 rounded text-sm text-red-900 whitespace-pre-wrap h-64 overflow-y-auto">
                    {jobDetail.error}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No job details available
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
