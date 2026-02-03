'use client';

import { useState, useEffect, useRef } from 'react';
import TeamGroupFilter from './TeamGroupFilter';
import { ApiService } from '@/lib/api';
import { useAISprintGoals } from '@/hooks/useAISprintGoals';
import { useUserSprintGoals } from '@/hooks/useUserSprintGoals';
import GoalsPanel from './GoalsPanel';
import GoalsConfirmationModal from './pigoals/GoalsConfirmationModal';
import ErrorModal from './ErrorModal';
import { useDefaultTeamGroup } from '@/hooks/useDefaultTeamGroup';

interface Sprint {
 sprint_id: number;
 sprint_name: string;
 start_date: string | null;
 end_date: string | null;
 team_name?: string; // Optional - not always returned from backend
}

export default function SprintGoalsTab() {
 const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);
 const [availableSprints, setAvailableSprints] = useState<Sprint[]>([]);
 const [loadingSprints, setLoadingSprints] = useState(true);
 const [selectedTeamValue, setSelectedTeamValue] = useState<string | null>(null);
 const [selectedTeamType, setSelectedTeamType] = useState<'team' | 'group' | null>(null);
  const [selectedTeamName, setSelectedTeamName] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

 const apiService = new ApiService();
 const hasInitializedRef = useRef(false);

 // Use separate hooks for AI and User goals
 const {
 hierarchyData: aiHierarchyData,
 loading: aiLoading,
 error: aiGoalsError,
 refetch: refetchAIGoals,
 } = useAISprintGoals(
 selectedSprintId || undefined,
 selectedTeamName || undefined,
 selectedTeamType === 'group',
 !!selectedSprintId // enabled only when sprint is selected
 );

 const {
 hierarchyData: userHierarchyData,
 loading: userLoading,
 error: nonAiGoalsError,
 refetch: refetchUserGoals,
 } = useUserSprintGoals(
 selectedSprintId || undefined,
 selectedTeamName || undefined,
 selectedTeamType === 'group',
 !!selectedSprintId // enabled only when sprint is selected
 );

 const loadingGoals = aiLoading || userLoading;

 // Fetch available sprints
 useEffect(() => {
 const fetchSprints = async () => {
 try {
 setLoadingSprints(true);
 const response = await apiService.getAvailableSprints(
 selectedTeamName || undefined,
 selectedTeamType === 'group'
 );
         if (response.success && response.data?.sprints) {
         // Display what the backend returns - no additional filtering
         const sprints = response.data.sprints;
         
         setAvailableSprints(sprints);
 
         // Preserve selected sprint if it exists in new list, otherwise select first sprint
         setSelectedSprintId((currentSprintId) => {
           if (currentSprintId !== null) {
             const sprintExists = sprints.some((s: Sprint) => s.sprint_id === currentSprintId);
             if (sprintExists) {
               // Selected sprint exists in new list - preserve it
               return currentSprintId;
             } else if (sprints.length > 0) {
               // Selected sprint not in new list - auto-select first sprint
               return sprints[0].sprint_id;
             }
             // No sprints available - clear selection
             return null;
           } else if (sprints.length > 0) {
             // No sprint selected - auto-select first sprint
             return sprints[0].sprint_id;
           }
           return null;
         });
 }
 } catch (err) {
 console.error('Error fetching sprints:', err);
 } finally {
 setLoadingSprints(false);
 }
 };
 fetchSprints();
 }, [selectedTeamName, selectedTeamType]);

 // Load default team/group from user preferences
 useDefaultTeamGroup({
 selectedTeamValue,
 setSelectedTeamValue,
 setSelectedTeamType,
 setSelectedTeamName,
 });

 const handleTeamGroupChange = (value: string | null, type: 'group' | 'team', name: string) => {
 setSelectedTeamValue(value);
 setSelectedTeamType(type);
 setSelectedTeamName(name);
 // Don't clear sprint - it will be preserved or auto-selected in useEffect
 };

 const handleSuggestGoals = () => {
 if (!selectedSprintId) return;
 setShowConfirmModal(true);
 };

 const handleConfirm = async () => {
 setShowConfirmModal(false);
 setLoading(true);
 setErrorMessage(null);

 try {
 await apiService.generateSprintGoals(
 selectedSprintId!,
 selectedTeamName || undefined,
 selectedTeamType === 'group'
 );
 // Refresh both AI and User goals after successful generation
 refetchAIGoals();
 refetchUserGoals();
 } catch (err) {
 const errorMsg = err instanceof Error ? err.message : 'Failed to generate Sprint goals';
 setErrorMessage(errorMsg);
 } finally {
 setLoading(false);
 }
 };

 const handleCancel = () => {
 setShowConfirmModal(false);
 };

 const isButtonEnabled = !!selectedSprintId && !!selectedTeamName;
 const teamGroupText = selectedTeamName 
 ? `${selectedTeamType === 'group' ? 'group' : 'team'} ${selectedTeamName}`
 : 'all teams';

 const selectedSprint = availableSprints.find(s => s.sprint_id === selectedSprintId);

 return (
 <div className="h-full flex flex-col space-y-4">
 {/* Filters and Button Section - Same Row */}
 <div className="p-4 bg-surface-elevated rounded-lg border border-outline">
 <div className="flex flex-col md:flex-row gap-4 items-center">
 {/* Sprint Filter - Label and field in one line */}
 <div className="flex items-center gap-2">
 <label className="text-sm font-medium text-content-secondary whitespace-nowrap">
 Sprint <span className="text-danger-text">*</span>
 </label>
 <select
 value={selectedSprintId || ''}
 onChange={(e) => setSelectedSprintId(e.target.value ? parseInt(e.target.value, 10) : null)}
 disabled={loadingSprints}
 className="w-64 md:w-80 px-2 py-1 border border-outline-strong rounded text-xs bg-surface-elevated text-content-primary hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand disabled:opacity-50 disabled:cursor-not-allowed h-[34px]"
 >
 <option value="">Select Sprint</option>
 {availableSprints.map((sprint) => (
 <option key={sprint.sprint_id} value={sprint.sprint_id}>
 {sprint.sprint_name} {sprint.start_date && sprint.end_date 
 ? `(${new Date(sprint.start_date).toLocaleDateString()} - ${new Date(sprint.end_date).toLocaleDateString()})`
 : ''}
 </option>
 ))}
 </select>
 </div>

 {/* Team/Group Filter - Label and field in one line */}
 <div className="flex items-center gap-2">
 <label className="text-sm font-medium text-content-secondary whitespace-nowrap">
 Team/Group <span className="text-danger-text">*</span>
 </label>
 <div className="w-64">
 <TeamGroupFilter
 value={selectedTeamValue}
 onChange={handleTeamGroupChange}
 placeholder="Select team or group"
 allowClear={false}
 />
 </div>
 {/* Suggest Goals Button - With padding after team/group filter */}
 <div className="flex-shrink-0 ml-4">
 <button
 onClick={handleSuggestGoals}
 disabled={!isButtonEnabled || loading}
 className={`
 px-3 py-1 rounded-lg text-sm font-normal transition-colors whitespace-nowrap h-[26px]
 ${isButtonEnabled && !loading
 ? 'bg-brand text-white hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2'
 : 'bg-gray-300 bg-surface-secondary text-content-muted cursor-not-allowed'
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
 {selectedSprintId && (
 <div className="flex-1 flex flex-col min-h-0">
 {/* Two Panels Side by Side - AI panel 35% width, User panel 65% width */}
 <div className="flex-1 grid grid-cols-1 lg:grid-cols-[35%_65%] gap-4 min-h-0">
 {/* AI Generated Goals Panel */}
 <GoalsPanel
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
 scopeType="sprint"
 sprintId={selectedSprintId}
 teamName={selectedTeamName || undefined}
 isGroup={selectedTeamType === 'group'}
 />

 {/* User-Confirmed Goals Panel */}
 <GoalsPanel
 title="User-Confirmed Goals"
 hierarchyData={userHierarchyData}
 type="user"
 loading={loadingGoals}
 error={nonAiGoalsError}
 onRefresh={refetchUserGoals}
 scopeType="sprint"
 sprintId={selectedSprintId}
 teamName={selectedTeamName || undefined}
 isGroup={selectedTeamType === 'group'}
 />
 </div>
 </div>
 )}

 {/* Confirmation Modal */}
 <GoalsConfirmationModal
 isOpen={showConfirmModal}
 onClose={handleCancel}
 onConfirm={handleConfirm}
 title="Confirm Generate Goals"
 message={
 <>
 <p className="mb-2">
 Do you want to suggest goals for Sprint <span className="font-semibold">{selectedSprint?.sprint_name || selectedSprintId}</span>
 {selectedTeamName && (
 <> and {teamGroupText}</>
 )}
 {!selectedTeamName && (
 <> and all teams</>
 )}
 ?
 </p>
 <p className="text-xs text-content-tertiary italic">
 This may take a minute or so to complete.
 </p>
 </>
 }
 variant="info"
 isLoading={loading}
 />

 {/* Error Modal */}
 {errorMessage && (
 <ErrorModal
 title="Can't Suggest Goals"
 message={errorMessage}
 onClose={() => setErrorMessage(null)}
 />
 )}
 </div>
 );
}

