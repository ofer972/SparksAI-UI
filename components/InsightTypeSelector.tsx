'use client';

import { useState, useEffect, useRef } from 'react';
import { ApiService } from '@/lib/api';
import { InsightType } from '@/lib/config';

interface InsightTypeSelection {
 insightTypeId: string;
 filters: {
 pi?: string;
 team_name?: string;
 group_name?: string;
 };
}

interface InsightTypeSelectorProps {
 onUpdateSelections?: (selections: Map<string, InsightTypeSelection>) => void;
 currentSelections?: Map<string, InsightTypeSelection>; // Current selections on dashboard
}

export default function InsightTypeSelector({
 onUpdateSelections,
 currentSelections = new Map(),
}: InsightTypeSelectorProps) {
 const apiService = new ApiService();

 // State
 const [insightTypes, setInsightTypes] = useState<InsightType[]>([]);
 const [availablePIs, setAvailablePIs] = useState<string[]>([]);
 const [availableTeams, setAvailableTeams] = useState<string[]>([]);
 const [availableGroups, setAvailableGroups] = useState<string[]>([]);
 const [selectedPI, setSelectedPI] = useState<Record<string, string>>({});
 const [selectedTeam, setSelectedTeam] = useState<Record<string, string>>({});
 const [selectedGroup, setSelectedGroup] = useState<Record<string, string>>({});
 const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
 const [fetching, setFetching] = useState(true);
 const [fetchError, setFetchError] = useState<string | null>(null);
 
 // Track if we've initialized from props to prevent re-initialization loops
 const initializedFromPropsRef = useRef(false);
 const lastCurrentSelectionsRef = useRef<string>('');
 const isUpdatingFromUserRef = useRef(false);
 const skipNextUpdateRef = useRef(false);

 // Initialize selections from currentSelections prop (only once on mount, or when modal reopens)
 useEffect(() => {
 // Skip if we're currently updating from user interaction or if we're skipping this update
 if (isUpdatingFromUserRef.current || skipNextUpdateRef.current) {
 skipNextUpdateRef.current = false;
 return;
 }
 
 // Serialize currentSelections to detect actual changes
 const currentSelectionsKey = JSON.stringify(
 Array.from(currentSelections.entries())
 .sort(([a], [b]) => a.localeCompare(b))
 .map(([id, sel]) => [id, JSON.stringify(sel)])
 );

 // Only initialize if:
 // 1. We haven't initialized yet, OR
 // 2. The currentSelections actually changed (not just a new object reference)
 if (currentSelections.size > 0 && 
 (!initializedFromPropsRef.current || lastCurrentSelectionsRef.current !== currentSelectionsKey)) {
 const newSelectedTypes = new Set<string>();
 const newSelectedPI: Record<string, string> = {};
 const newSelectedTeam: Record<string, string> = {};
 const newSelectedGroup: Record<string, string> = {};

 currentSelections.forEach((selection, typeId) => {
 newSelectedTypes.add(typeId);
 if (selection.filters.pi) {
 newSelectedPI[typeId] = selection.filters.pi;
 }
 if (selection.filters.team_name) {
 newSelectedTeam[typeId] = selection.filters.team_name;
 }
 if (selection.filters.group_name) {
 newSelectedGroup[typeId] = selection.filters.group_name;
 }
 });

 setSelectedTypes(newSelectedTypes);
 setSelectedPI(newSelectedPI);
 setSelectedTeam(newSelectedTeam);
 setSelectedGroup(newSelectedGroup);
 
 initializedFromPropsRef.current = true;
 lastCurrentSelectionsRef.current = currentSelectionsKey;
 } else if (currentSelections.size === 0 && initializedFromPropsRef.current) {
 // Reset initialization flag if currentSelections becomes empty
 initializedFromPropsRef.current = false;
 lastCurrentSelectionsRef.current = '';
 }
 }, [currentSelections]);

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

 // Notify parent of selection changes
 useEffect(() => {
 // Always notify parent of changes, but skip if we're currently initializing from props
 // to prevent circular updates. However, if currentSelections is empty (new dashboard),
 // we should still notify when user makes selections.
 if (onUpdateSelections) {
 // Mark that we're updating from user interaction to prevent re-initialization
 isUpdatingFromUserRef.current = true;
 skipNextUpdateRef.current = true; // Skip the next prop update to break the loop
 
 const selections = new Map<string, InsightTypeSelection>();
 selectedTypes.forEach(typeId => {
 const filters: InsightTypeSelection['filters'] = {};
 if (selectedPI[typeId]) {
 filters.pi = selectedPI[typeId];
 }
 if (selectedTeam[typeId]) {
 filters.team_name = selectedTeam[typeId];
 }
 if (selectedGroup[typeId]) {
 filters.group_name = selectedGroup[typeId];
 }
 selections.set(typeId, {
 insightTypeId: typeId,
 filters,
 });
 });
 
 console.log('[InsightTypeSelector] Notifying parent of selection changes:', {
 selectionsSize: selections.size,
 selectedTypesSize: selectedTypes.size,
 selections: Array.from(selections.entries()),
 initializedFromProps: initializedFromPropsRef.current,
 });
 
 // Update the last known selections to prevent re-initialization
 const selectionsKey = JSON.stringify(
 Array.from(selections.entries())
 .sort(([a], [b]) => a.localeCompare(b))
 .map(([id, sel]) => [id, JSON.stringify(sel)])
 );
 lastCurrentSelectionsRef.current = selectionsKey;
 
 // Mark as initialized if we have selections (even if props were empty)
 if (selections.size > 0) {
 initializedFromPropsRef.current = true;
 }
 
 onUpdateSelections(selections);
 
 // Reset the flag after a short delay to allow parent to update
 setTimeout(() => {
 isUpdatingFromUserRef.current = false;
 }, 50);
 }
 }, [selectedTypes, selectedPI, selectedTeam, selectedGroup, onUpdateSelections]);

 // Toggle selection of an insight type
 const toggleTypeSelection = (typeId: string) => {
 setSelectedTypes(prev => {
 const next = new Set(prev);
 if (next.has(typeId)) {
 next.delete(typeId);
 // Clear filters when deselected
 setSelectedPI(prevPI => {
 const nextPI = { ...prevPI };
 delete nextPI[typeId];
 return nextPI;
 });
 setSelectedTeam(prevTeam => {
 const nextTeam = { ...prevTeam };
 delete nextTeam[typeId];
 return nextTeam;
 });
 setSelectedGroup(prevGroup => {
 const nextGroup = { ...prevGroup };
 delete nextGroup[typeId];
 return nextGroup;
 });
 } else {
 next.add(typeId);
 }
 return next;
 });
 };

 // Check if a type can be selected (all required filters are filled)
 const canSelectType = (insightType: InsightType) => {
 if (!selectedTypes.has(insightType.id)) {
 return true; // Can always select
 }
 // If already selected, check if required filters are filled
 return (
 (!insightType.requirePI || selectedPI[insightType.id]) &&
 (!insightType.requireTeam || selectedTeam[insightType.id]) &&
 (!insightType.requireGroup || selectedGroup[insightType.id])
 );
 };

 // Render card for each insight type
 const renderInsightTypeCard = (insightType: InsightType) => {
 const isSelected = selectedTypes.has(insightType.id);
 const canSelect = canSelectType(insightType);

 return (
 <div
 key={insightType.id}
 className={`bg-surface rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 p-3 flex flex-col w-full ${
 isSelected ? 'border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/30' : 'border-outline'
 }`}
 >
 <div className="flex items-start justify-between mb-2">
 <div className="flex items-center gap-2 flex-1">
 <input
 type="checkbox"
 checked={isSelected}
 onChange={() => toggleTypeSelection(insightType.id)}
 disabled={!canSelect}
 className="w-4 h-4 text-brand border-outline-strong rounded focus:ring-brand"
 />
 <h3 className="text-base font-bold text-content-primary flex-1">
 {insightType.name || `Insight Type ${insightType.id}`}
 </h3>
 </div>
 <div className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
 insightType.active ? 'bg-green-100 dark:bg-green-950/40 text-green-700 text-green-400' : 'bg-surface-secondary text-content-tertiary'
 }`}>
 {insightType.active ? 'Active' : 'Inactive'}
 </div>
 </div>
 
 {insightType.description && (
 <p className="text-xs text-content-tertiary mb-3 leading-relaxed ml-6">
 {insightType.description}
 </p>
 )}
 
 {isSelected && (
 <div className="space-y-2 flex-1 ml-6">
 {insightType.requirePI && (
 <div className="flex items-center gap-2">
 <label className="text-xs font-semibold text-content-secondary whitespace-nowrap min-w-[50px]">
 PI:
 </label>
 <select
 value={selectedPI[insightType.id] || ''}
 onChange={(e) => setSelectedPI(prev => ({
 ...prev,
 [insightType.id]: e.target.value
 }))}
 className="flex-1 px-2 py-1.5 text-xs border border-outline-strong rounded-md focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-surface-elevated text-content-primary"
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
 <label className="text-xs font-semibold text-content-secondary whitespace-nowrap min-w-[50px]">
 Team:
 </label>
 <select
 value={selectedTeam[insightType.id] || ''}
 onChange={(e) => setSelectedTeam(prev => ({
 ...prev,
 [insightType.id]: e.target.value
 }))}
 className="flex-1 px-2 py-1.5 text-xs border border-outline-strong rounded-md focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-surface-elevated text-content-primary"
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
 <label className="text-xs font-semibold text-content-secondary whitespace-nowrap min-w-[50px]">
 Group:
 </label>
 <select
 value={selectedGroup[insightType.id] || ''}
 onChange={(e) => setSelectedGroup(prev => ({
 ...prev,
 [insightType.id]: e.target.value
 }))}
 className="flex-1 px-2 py-1.5 text-xs border border-outline-strong rounded-md focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-surface-elevated text-content-primary"
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
 )}

 {(!insightType.requirePI && !insightType.requireTeam && !insightType.requireGroup) && isSelected && (
 <p className="text-xs text-content-muted italic mb-2 ml-6">No filters required for this insight type.</p>
 )}
 </div>
 );
 };

 if (fetching) {
 return (
 <div className="flex items-center justify-center py-12">
 <div className="text-center">
 <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 border-blue-400 mb-4"></div>
 <p className="text-content-tertiary font-medium">Loading insight types...</p>
 </div>
 </div>
 );
 }

 if (fetchError) {
 return (
 <div className="p-6">
 <div className="bg-red-50 dark:bg-red-950/30 border-2 border-danger-border rounded-lg p-5 shadow-sm">
 <div className="flex items-center gap-3">
 <svg className="w-6 h-6 text-danger-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 <div className="text-sm font-medium text-red-800 text-red-400">{fetchError}</div>
 </div>
 </div>
 </div>
 );
 }

 if (insightTypes.length === 0) {
 return (
 <div className="flex items-center justify-center py-12">
 <div className="text-center">
 <svg className="w-16 h-16 mx-auto text-content-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
 </svg>
 <p className="text-content-tertiary font-medium">No active insight types found.</p>
 </div>
 </div>
 );
 }

 return (
 <div className="space-y-4">
 <div className="text-sm text-content-tertiary mb-4">
 Select insight types to add to your dashboard. Each type can be added once with its required filters.
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {insightTypes.map(renderInsightTypeCard)}
 </div>
 </div>
 );
}

