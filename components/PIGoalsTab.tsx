'use client';

import { useState, useEffect, useRef } from 'react';
import TeamGroupFilter from './TeamGroupFilter';
import { ApiService } from '@/lib/api';
import { useAIGoals } from '@/hooks/useAIGoals';
import { useUserGoals } from '@/hooks/useUserGoals';
import PIGoalsPanel from './PIGoalsPanel';

export default function PIGoalsTab() {
  const [selectedPI, setSelectedPI] = useState<string>('');
  const [availablePIs, setAvailablePIs] = useState<string[]>([]);
  const [loadingPIs, setLoadingPIs] = useState(true);
  const [selectedTeamValue, setSelectedTeamValue] = useState<string | null>(null);
  const [selectedTeamType, setSelectedTeamType] = useState<'team' | 'group' | null>(null);
  const [selectedTeamName, setSelectedTeamName] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const apiService = new ApiService();
  const hasInitializedRef = useRef(false);
  const isAutoSelectingRef = useRef(false);

  // Use separate hooks for AI and User goals
  const {
    hierarchyData: aiHierarchyData,
    loading: aiLoading,
    error: aiGoalsError,
    refetch: refetchAIGoals,
  } = useAIGoals(
    selectedPI,
    selectedTeamName || undefined,
    selectedTeamType === 'group',
    !!selectedPI // enabled only when PI is selected
  );

  const {
    hierarchyData: userHierarchyData,
    loading: userLoading,
    error: nonAiGoalsError,
    refetch: refetchUserGoals,
  } = useUserGoals(
    selectedPI,
    selectedTeamName || undefined,
    selectedTeamType === 'group',
    !!selectedPI // enabled only when PI is selected
  );

  const loadingGoals = aiLoading || userLoading;

  // Fetch available PIs
  useEffect(() => {
    const fetchPIs = async () => {
      try {
        setLoadingPIs(true);
        const response = await apiService.getPIs();
        if (response.pis && Array.isArray(response.pis)) {
          const piNames = response.pis.map((pi: any) => pi.pi_name);
          setAvailablePIs(piNames);
        }
      } catch (err) {
        console.error('Error fetching PIs:', err);
      } finally {
        setLoadingPIs(false);
      }
    };
    fetchPIs();
  }, []);

  // Auto-fetch current PI on mount if no PI is selected
  useEffect(() => {
    const fetchCurrentPI = async () => {
      // Only run once on mount
      if (hasInitializedRef.current) return;
      
      // Check if PI is already selected (shouldn't happen on mount, but just in case)
      if (selectedPI) {
        hasInitializedRef.current = true;
        return;
      }
      
      hasInitializedRef.current = true;
      
      try {
        console.log('[PIGoalsTab] Fetching current PI...');
        isAutoSelectingRef.current = true;
        const piResponse = await apiService.getCurrentAndNextPIs();
        console.log('[PIGoalsTab] PI response:', piResponse);
        
        // The API returns {current_pis: [], next_pis: []} structure
        const currentPIs = (piResponse as any).current_pis || [];
        if (currentPIs.length > 0) {
          // Use the first PI from the current_pis list
          const currentPIName = currentPIs[0].pi_name;
          console.log('[PIGoalsTab] Setting current PI to:', currentPIName);
          setSelectedPI(currentPIName);
        } else {
          console.warn('[PIGoalsTab] No current PIs returned from API');
          isAutoSelectingRef.current = false;
        }
      } catch (piErr) {
        console.error('[PIGoalsTab] Failed to load current PI:', piErr);
        // Continue without PI - user can select one manually
        isAutoSelectingRef.current = false;
      }
    };
    
    fetchCurrentPI();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleTeamGroupChange = (value: string | null, type: 'group' | 'team', name: string) => {
    setSelectedTeamValue(value);
    setSelectedTeamType(type);
    setSelectedTeamName(name);
  };

  const handleSuggestGoals = () => {
    if (!selectedPI) return;
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    setShowConfirmModal(false);
    setLoading(true);

    try {
      await apiService.generatePIGoals(
        selectedPI,
        selectedTeamName || undefined,
        selectedTeamType === 'group'
      );
      // Refresh both AI and User goals after successful generation
      refetchAIGoals();
      refetchUserGoals();
    } catch (err) {
      console.error('Error generating PI goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
  };

  // Clear auto-selecting flag when PI is set (after state update)
  useEffect(() => {
    if (selectedPI && isAutoSelectingRef.current) {
      // PI was just set from auto-select, clear the flag
      isAutoSelectingRef.current = false;
    }
  }, [selectedPI]);


  const isButtonEnabled = !!selectedPI;
  const teamGroupText = selectedTeamName 
    ? `${selectedTeamType === 'group' ? 'group' : 'team'} ${selectedTeamName}`
    : 'all teams';

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Filters and Button Section - Same Row */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* PI Filter - Label and field in one line */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              PI <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedPI}
              onChange={(e) => setSelectedPI(e.target.value)}
              disabled={loadingPIs}
              className="w-32 md:w-40 px-2 py-1 border border-gray-300 rounded text-xs bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed h-[34px]"
            >
              <option value="">Select PI</option>
              {availablePIs.map((pi) => (
                <option key={pi} value={pi}>
                  {pi}
                </option>
              ))}
            </select>
          </div>

          {/* Team/Group Filter - Label and field in one line */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Team/Group <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <div className="w-64">
              <TeamGroupFilter
                value={selectedTeamValue}
                onChange={handleTeamGroupChange}
                placeholder="Select team or group (optional)"
                allowClear={true}
              />
            </div>
            {/* Suggest Goals Button - With padding after team/group filter */}
            <div className="flex-shrink-0 ml-4">
              <button
                onClick={handleSuggestGoals}
                disabled={!isButtonEnabled || loading}
                className={`
                  px-6 py-2 rounded-lg font-medium transition-colors whitespace-nowrap h-[34px]
                  ${isButtonEnabled && !loading
                    ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {loading ? 'Generating...' : 'Suggest Goals'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Goals Table Section - Two Panels */}
      {selectedPI && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Two Panels Side by Side - AI panel 40% width, User panel takes remaining space */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[40%_1fr] gap-4 min-h-0">
            {/* AI Generated Goals Panel */}
            <PIGoalsPanel
              title="AI Generated Goals"
              hierarchyData={aiHierarchyData}
              type="ai"
              loading={loadingGoals}
              error={aiGoalsError}
              onConfirmGoals={async (goalIds: number[]) => {
                const apiService = new ApiService();
                // Call single endpoint with all goal IDs
                await apiService.updatePIGoalsAiToUser(goalIds);
                // Refresh both panels after moving goals
                refetchAIGoals();
                refetchUserGoals();
              }}
              onRefresh={refetchAIGoals}
            />

            {/* User-Confirmed Goals Panel */}
            <PIGoalsPanel
              title="User-Confirmed Goals"
              hierarchyData={userHierarchyData}
              type="user"
              loading={loadingGoals}
              error={nonAiGoalsError}
              onRefresh={refetchUserGoals}
              piName={selectedPI}
              teamName={selectedTeamName || undefined}
              isGroup={selectedTeamType === 'group'}
            />
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              {/* Content */}
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Confirm Generate Goals
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Do you want to suggest goals for PI <span className="font-semibold">{selectedPI}</span>
                  {selectedTeamName && (
                    <> and {teamGroupText}</>
                  )}
                  {!selectedTeamName && (
                    <> and all teams</>
                  )}
                  ?
                </p>
                <p className="text-xs text-gray-500 mb-6 italic">
                  This may take a minute or so to complete.
                </p>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

