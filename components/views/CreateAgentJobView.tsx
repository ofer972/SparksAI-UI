'use client';

import { useState, useEffect } from 'react';
import { ApiService } from '@/lib/api';
import { InsightType } from '@/lib/config';
import Toast from '@/components/Toast';
import ErrorModal from '@/components/ErrorModal';

export default function CreateAgentJobView() {
  const apiService = new ApiService();

  // State
  const [insightTypes, setInsightTypes] = useState<InsightType[]>([]);
  const [availablePIs, setAvailablePIs] = useState<string[]>([]);
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [selectedPI, setSelectedPI] = useState<Record<string | number, string>>({});
  const [selectedTeam, setSelectedTeam] = useState<Record<string | number, string>>({});
  const [selectedGroup, setSelectedGroup] = useState<Record<string | number, string>>({});
  const [globalPIFilter, setGlobalPIFilter] = useState<string>('');
  const [loading, setLoading] = useState<Record<string | number, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch available PIs for dropdown
  const fetchPIs = async () => {
    try {
      const pisResponse = await apiService.getPIs();
      if (pisResponse.pis && pisResponse.pis.length > 0) {
        const piNames = pisResponse.pis.map(pi => pi.pi_name);
        setAvailablePIs(piNames);
      }
    } catch (err) {
      console.error('Failed to fetch PIs:', err);
    }
  };

  // Fetch available Teams for dropdown
  const fetchTeams = async () => {
    try {
      const teamsResponse = await apiService.getTeams();
      if (teamsResponse.teams && teamsResponse.teams.length > 0) {
        setAvailableTeams(teamsResponse.teams);
      }
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    }
  };

  // Fetch available Groups for dropdown
  const fetchGroups = async () => {
    try {
      const groupsResponse = await apiService.getGroups();
      if (groupsResponse.groups && groupsResponse.groups.length > 0) {
        setAvailableGroups(groupsResponse.groups);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    }
  };

  // Fetch active insight types
  const fetchInsightTypes = async () => {
    setFetching(true);
    setFetchError(null);
    try {
      const response = await apiService.getActiveInsightTypes();
      // Normalize field names - API returns snake_case, we need camelCase
      const normalizedTypes = response.insight_types.map((type: any) => {
        const normalized = {
          id: type.id,
          name: type.name || type.insight_type || 'Unknown',
          insight_type: type.insight_type,
          description: type.description || type.insight_description || '',
          insight_description: type.insight_description || type.description || '',
          requirePI: Boolean(type.pi_insight ?? type.requirePI ?? type.requires_pi ?? type.require_pi ?? false),
          requireTeam: Boolean(type.team_insight ?? type.requireTeam ?? type.requires_team ?? type.require_team ?? false),
          requireGroup: Boolean(type.group_insight ?? type.requireGroup ?? type.requires_group ?? type.require_group ?? false),
          requireSprint: Boolean(type.sprint_insight ?? type.requireSprint ?? false),
          active: Boolean(type.active ?? type.is_active ?? false),
          ...type // Keep original fields for reference
        };
        return normalized;
      });
      setInsightTypes(normalizedTypes);
    } catch (err) {
      console.error('Error fetching insight types:', err);
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch insight types');
    } finally {
      setFetching(false);
    }
  };

  // Fetch all data on mount
  useEffect(() => {
    fetchInsightTypes();
    fetchPIs();
    fetchTeams();
    fetchGroups();
  }, []);

  // Apply global PI filter when insight types or filter changes
  useEffect(() => {
    if (globalPIFilter && insightTypes.length > 0) {
      const piInsightIds = insightTypes
        .filter(type => type.requirePI === true)
        .map(type => type.id);
      
      setSelectedPI(prev => {
        const updated = { ...prev };
        piInsightIds.forEach(id => {
          updated[id] = globalPIFilter;
        });
        return updated;
      });
    }
  }, [globalPIFilter, insightTypes]);

  // Handle global PI filter - applies to all PI insights
  const handleGlobalPIFilter = (pi: string) => {
    setGlobalPIFilter(pi);
  };

  // Create job handler
  const handleCreateJob = async (insightType: InsightType) => {
    // Validation
    if (insightType.requirePI && !selectedPI[insightType.id]) {
      setErrorModal('PI is required for this insight type');
      return;
    }
    if (insightType.requireTeam && !selectedTeam[insightType.id]) {
      setErrorModal('Team is required for this insight type');
      return;
    }
    if (insightType.requireGroup && !selectedGroup[insightType.id]) {
      setErrorModal('Group is required for this insight type');
      return;
    }

    setLoading(prev => ({ ...prev, [insightType.id]: true }));
    try {
      // Use insight type name (job_type) instead of ID
      const jobType = insightType.name || insightType.insight_type || 'Unknown';
      
      const response = await apiService.createAgentJob(
        jobType,
        selectedTeam[insightType.id] || undefined,
        selectedPI[insightType.id] || undefined,
        selectedGroup[insightType.id] || undefined
      );

      if (response?.success) {
        // Build toast message with agent name, PI, team, and group if they exist
        const agentName = insightType.name || 'Agent';
        const parts: string[] = [`${agentName} job created`];
        
        if (selectedPI[insightType.id]) {
          parts.push(`PI: ${selectedPI[insightType.id]}`);
        }
        
        if (selectedTeam[insightType.id]) {
          parts.push(`Team: ${selectedTeam[insightType.id]}`);
        }
        
        if (selectedGroup[insightType.id]) {
          parts.push(`Group: ${selectedGroup[insightType.id]}`);
        }
        
        setToast(parts.join(', '));
      } else {
        setErrorModal(response?.message || 'Failed to create job');
      }
    } catch (err) {
      setErrorModal(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setLoading(prev => ({ ...prev, [insightType.id]: false }));
    }
  };

  // Render card for each insight type
  const renderInsightTypeCard = (insightType: InsightType) => {
    const canCreate = 
      (!insightType.requirePI || selectedPI[insightType.id]) &&
      (!insightType.requireTeam || selectedTeam[insightType.id]) &&
      (!insightType.requireGroup || selectedGroup[insightType.id]);
    const isLoading = loading[insightType.id] || false;

  return (
      <div key={insightType.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 p-3 flex flex-col w-full">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-base font-bold text-gray-900 flex-1">
            {insightType.name || `Insight Type ${insightType.id}`}
          </h3>
          <div className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            insightType.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {insightType.active ? 'Active' : 'Inactive'}
          </div>
        </div>
        
        {insightType.description && (
          <p className="text-xs text-gray-600 mb-3 leading-relaxed">
            {insightType.description}
          </p>
        )}
        
        <div className="space-y-2 flex-1">
          {insightType.requirePI && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-700 whitespace-nowrap min-w-[50px]">
                PI:
              </label>
              <select
                value={selectedPI[insightType.id] || ''}
                onChange={(e) => setSelectedPI(prev => ({
                  ...prev,
                  [insightType.id]: e.target.value
                }))}
                className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                disabled={isLoading}
              >
                <option value="">Select PI</option>
                {availablePIs.length > 0 ? (
                  availablePIs.map(pi => (
                    <option key={pi} value={pi}>{pi}</option>
                  ))
                ) : (
                  <option value="" disabled>Loading PIs...</option>
                )}
              </select>
            </div>
          )}
          
          {insightType.requireTeam && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-700 whitespace-nowrap min-w-[50px]">
                Team:
              </label>
              <select
                value={selectedTeam[insightType.id] || ''}
                onChange={(e) => setSelectedTeam(prev => ({
                  ...prev,
                  [insightType.id]: e.target.value
                }))}
                className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                disabled={isLoading}
              >
                <option value="">Select Team</option>
                {availableTeams.length > 0 ? (
                  availableTeams.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))
                ) : (
                  <option value="" disabled>Loading Teams...</option>
                )}
              </select>
            </div>
          )}
          
          {insightType.requireGroup && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-700 whitespace-nowrap min-w-[50px]">
                Group:
              </label>
              <select
                value={selectedGroup[insightType.id] || ''}
                onChange={(e) => setSelectedGroup(prev => ({
                  ...prev,
                  [insightType.id]: e.target.value
                }))}
                className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                disabled={isLoading}
              >
                <option value="">Select Group</option>
                {availableGroups.length > 0 ? (
                  availableGroups.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))
                ) : (
                  <option value="" disabled>Loading Groups...</option>
                )}
              </select>
            </div>
          )}
        </div>

        {(!insightType.requirePI && !insightType.requireTeam && !insightType.requireGroup) && (
          <p className="text-xs text-gray-500 italic mb-2">No filters required for this insight type.</p>
        )}

        <div className="mt-3 flex justify-center">
                <button
            onClick={() => handleCreateJob(insightType)}
            disabled={!canCreate || isLoading}
            className="w-full px-4 py-2 text-xs font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </span>
            ) : 'Create Job'}
                </button>
              </div>
      </div>
    );
  };

  // Separate insight types into PI Insights and Sprint Insights
  // PI Insights: pi_insight = true
  const piInsights = insightTypes.filter(type => type.requirePI === true);
  
  // Sprint Insights: pi_insight = false AND (sprint_insight = true OR team_insight = true OR group_insight = true)
  const sprintInsights = insightTypes.filter(type => 
    type.requirePI === false && 
    (type.requireSprint === true || type.requireTeam === true || type.requireGroup === true)
  );

  return (
    <div className="h-full flex flex-col">{/* Removed space-y-6 overflow-auto pb-6 */}
      {fetching && (
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 font-medium">Loading insight types...</p>
          </div>
        </div>
      )}

      {fetchError && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-5 shadow-sm max-w-md">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm font-medium text-red-800">{fetchError}</div>
            </div>
          </div>
        </div>
      )}

      {!fetching && !fetchError && insightTypes.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-gray-600 font-medium">No active insight types found.</p>
          </div>
        </div>
      )}

      {!fetching && !fetchError && insightTypes.length > 0 && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
          {/* PI Insights Container */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 p-4 shadow-lg flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 mb-3 flex-shrink-0">
              <div className="p-2 bg-green-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">PI Insights</h2>
            </div>
            
            {/* Global PI Filter */}
            <div className="mb-3 bg-white rounded-lg p-3 shadow-sm border border-green-100 flex-shrink-0">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Apply to All PIs:
              </label>
              <select
                value={globalPIFilter}
                onChange={(e) => handleGlobalPIFilter(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                disabled={piInsights.length === 0}
              >
                <option value="">Select PI</option>
                {availablePIs.length > 0 ? (
                  availablePIs.map(pi => (
                    <option key={pi} value={pi}>{pi}</option>
                  ))
                ) : (
                  <option value="" disabled>Loading PIs...</option>
                )}
              </select>
            </div>

            {piInsights.length > 0 ? (
              <div className="space-y-3 overflow-y-auto flex-1">
                {piInsights.map(renderInsightTypeCard)}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <p className="text-gray-500 font-medium">No PI Insights available</p>
              </div>
            )}
          </div>

          {/* Sprint Insights Container */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-4 shadow-lg flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 mb-3 flex-shrink-0">
              <div className="p-2 bg-blue-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Sprint Insights</h2>
            </div>

            {sprintInsights.length > 0 ? (
              <div className="space-y-3 overflow-y-auto flex-1">
                {sprintInsights.map(renderInsightTypeCard)}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <p className="text-gray-500 font-medium">No Sprint Insights available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Toast */}
      {toast && (
        <Toast
          message={toast}
          type="success"
          onClose={() => setToast(null)}
        />
      )}

      {/* Error Modal/Popup */}
      {errorModal && (
        <ErrorModal
          message={errorModal}
          onClose={() => setErrorModal(null)}
        />
      )}
    </div>
  );
}
