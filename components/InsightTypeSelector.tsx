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

// Each instance has a unique key like "typeId::0", "typeId::1", etc.
type InstanceKey = string;

function makeInstanceKey(typeId: string, index: number): InstanceKey {
  return `${typeId}::${index}`;
}

function parseInstanceKey(key: InstanceKey): { typeId: string; index: number } {
  const sepIdx = key.lastIndexOf('::');
  return {
    typeId: key.substring(0, sepIdx),
    index: parseInt(key.substring(sepIdx + 2), 10),
  };
}

interface InsightTypeSelectorProps {
 onUpdateSelections?: (selections: Map<string, InsightTypeSelection>) => void;
 currentSelections?: Map<string, InsightTypeSelection>; // Current selections on dashboard (instance-keyed)
 defaultFilters?: { pi?: string; team_name?: string; isGroup?: boolean }; // Default filters from topbar for pre-populating
}

export default function InsightTypeSelector({
 onUpdateSelections,
 currentSelections = new Map(),
 defaultFilters,
}: InsightTypeSelectorProps) {
 const apiService = new ApiService();

 // State
 const [insightTypes, setInsightTypes] = useState<InsightType[]>([]);
 const [availablePIs, setAvailablePIs] = useState<string[]>([]);
 const [availableTeams, setAvailableTeams] = useState<string[]>([]);
 const [availableGroups, setAvailableGroups] = useState<string[]>([]);
 // Instance-keyed filters: key is "typeId::index"
 const [selectedPI, setSelectedPI] = useState<Record<InstanceKey, string>>({});
 const [selectedTeam, setSelectedTeam] = useState<Record<InstanceKey, string>>({});
 const [selectedGroup, setSelectedGroup] = useState<Record<InstanceKey, string>>({});
 // Track instance count per type
 const [instanceCounts, setInstanceCounts] = useState<Map<string, number>>(new Map());
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
 const newInstanceCounts = new Map<string, number>();
 const newSelectedPI: Record<InstanceKey, string> = {};
 const newSelectedTeam: Record<InstanceKey, string> = {};
 const newSelectedGroup: Record<InstanceKey, string> = {};

 currentSelections.forEach((selection, instanceKey) => {
   const { typeId } = parseInstanceKey(instanceKey);
   newInstanceCounts.set(typeId, (newInstanceCounts.get(typeId) || 0) + 1);
   if (selection.filters.pi) {
     newSelectedPI[instanceKey] = selection.filters.pi;
   }
   if (selection.filters.team_name) {
     newSelectedTeam[instanceKey] = selection.filters.team_name;
   }
   if (selection.filters.group_name) {
     newSelectedGroup[instanceKey] = selection.filters.group_name;
   }
 });

 setInstanceCounts(newInstanceCounts);
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
 if (onUpdateSelections) {
 // Mark that we're updating from user interaction to prevent re-initialization
 isUpdatingFromUserRef.current = true;
 skipNextUpdateRef.current = true;
 
 const selections = new Map<string, InsightTypeSelection>();
 instanceCounts.forEach((count, typeId) => {
   for (let i = 0; i < count; i++) {
     const instKey = makeInstanceKey(typeId, i);
     const filters: InsightTypeSelection['filters'] = {};
     if (selectedPI[instKey]) {
       filters.pi = selectedPI[instKey];
     }
     if (selectedTeam[instKey]) {
       filters.team_name = selectedTeam[instKey];
     }
     if (selectedGroup[instKey]) {
       filters.group_name = selectedGroup[instKey];
     }
     selections.set(instKey, {
       insightTypeId: typeId,
       filters,
     });
   }
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
 }, [instanceCounts, selectedPI, selectedTeam, selectedGroup, onUpdateSelections]);

 // Add an instance of an insight type
 const addInstance = (typeId: string) => {
   setInstanceCounts(prev => {
     const next = new Map(prev);
     const currentCount = next.get(typeId) || 0;
     const newIndex = currentCount;
     next.set(typeId, currentCount + 1);

     // Pre-populate filters from defaultFilters if available
     const insightType = insightTypes.find(t => t.id === typeId);
     if (insightType && defaultFilters) {
       const instKey = makeInstanceKey(typeId, newIndex);
       if (insightType.requirePI && defaultFilters.pi) {
         setSelectedPI(p => ({ ...p, [instKey]: defaultFilters.pi! }));
       }
       if (insightType.requireTeam && !insightType.requireGroup &&
           defaultFilters.team_name && defaultFilters.isGroup === false &&
           availableTeams.includes(defaultFilters.team_name)) {
         setSelectedTeam(p => ({ ...p, [instKey]: defaultFilters.team_name! }));
       }
       if (insightType.requireGroup && !insightType.requireTeam &&
           defaultFilters.team_name && defaultFilters.isGroup === true &&
           availableGroups.includes(defaultFilters.team_name)) {
         setSelectedGroup(p => ({ ...p, [instKey]: defaultFilters.team_name! }));
       }
     }

     return next;
   });
 };

 // Remove the last instance of an insight type
 const removeInstance = (typeId: string) => {
   setInstanceCounts(prev => {
     const next = new Map(prev);
     const currentCount = next.get(typeId) || 0;
     if (currentCount <= 0) return prev;

     const removedIndex = currentCount - 1;
     const instKey = makeInstanceKey(typeId, removedIndex);

     // Clean up filters for removed instance
     setSelectedPI(p => {
       const n = { ...p };
       delete n[instKey];
       return n;
     });
     setSelectedTeam(p => {
       const n = { ...p };
       delete n[instKey];
       return n;
     });
     setSelectedGroup(p => {
       const n = { ...p };
       delete n[instKey];
       return n;
     });

     if (currentCount === 1) {
       next.delete(typeId);
     } else {
       next.set(typeId, currentCount - 1);
     }
     return next;
   });
 };

 // Render filter controls for a single instance, wrapped in a sub-panel
 const renderInstanceFilters = (insightType: InsightType, instanceIndex: number) => {
   const instKey = makeInstanceKey(insightType.id, instanceIndex);
   const count = instanceCounts.get(insightType.id) || 0;
   const hasFilters = insightType.requirePI || insightType.requireTeam || insightType.requireGroup;

   return (
     <div
       key={instKey}
       className="group/instance rounded-lg border border-outline-strong/60 bg-surface-elevated/50 dark:bg-surface-elevated/30 px-5 py-2.5 transition-all hover:border-blue-400/50 dark:hover:border-blue-500/40 hover:shadow-sm"
     >
       {hasFilters ? (
         <div className="flex items-center gap-4">
           {count > 1 && (
             <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300">
               {instanceIndex + 1}
             </span>
           )}
           {insightType.requirePI && (
             <div className="flex items-center gap-2 flex-1 min-w-0">
               <label className="text-xs font-medium text-content-secondary whitespace-nowrap">PI</label>
               <select
                 value={selectedPI[instKey] || ''}
                 onChange={(e) => setSelectedPI(prev => ({ ...prev, [instKey]: e.target.value }))}
                 className="w-full px-2.5 py-1.5 text-xs border border-outline rounded-md focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand bg-surface text-content-primary transition-colors"
               >
                 <option value="">Select PI...</option>
                 {availablePIs.length > 0 ? (
                   availablePIs.map(pi => <option key={pi} value={pi}>{pi}</option>)
                 ) : (
                   <option value="" disabled>Loading...</option>
                 )}
               </select>
             </div>
           )}
           {insightType.requireTeam && (
             <div className="flex items-center gap-2 flex-1 min-w-0">
               <label className="text-xs font-medium text-content-secondary whitespace-nowrap">Team</label>
               <select
                 value={selectedTeam[instKey] || ''}
                 onChange={(e) => setSelectedTeam(prev => ({ ...prev, [instKey]: e.target.value }))}
                 className="w-full px-2.5 py-1.5 text-xs border border-outline rounded-md focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand bg-surface text-content-primary transition-colors"
               >
                 <option value="">Select Team...</option>
                 {availableTeams.length > 0 ? (
                   availableTeams.map(team => <option key={team} value={team}>{team}</option>)
                 ) : (
                   <option value="" disabled>Loading...</option>
                 )}
               </select>
             </div>
           )}
           {insightType.requireGroup && (
             <div className="flex items-center gap-2 flex-1 min-w-0">
               <label className="text-xs font-medium text-content-secondary whitespace-nowrap">Group</label>
               <select
                 value={selectedGroup[instKey] || ''}
                 onChange={(e) => setSelectedGroup(prev => ({ ...prev, [instKey]: e.target.value }))}
                 className="w-full px-2.5 py-1.5 text-xs border border-outline rounded-md focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand bg-surface text-content-primary transition-colors"
               >
                 <option value="">Select Group...</option>
                 {availableGroups.length > 0 ? (
                   availableGroups.map(group => <option key={group} value={group}>{group}</option>)
                 ) : (
                   <option value="" disabled>Loading...</option>
                 )}
               </select>
             </div>
           )}
         </div>
       ) : (
         <div className="flex items-center gap-3">
           {count > 1 && (
             <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300">
               {instanceIndex + 1}
             </span>
           )}
           <p className="text-xs text-content-muted italic">No filters required</p>
         </div>
       )}
     </div>
   );
 };

 // Render card for each insight type
 const renderInsightTypeCard = (insightType: InsightType) => {
   const count = instanceCounts.get(insightType.id) || 0;
   const hasInstances = count > 0;

   return (
     <div
       key={insightType.id}
       className={`rounded-xl border transition-all duration-200 ${
         hasInstances
           ? 'border-blue-400/70 dark:border-blue-500/50 bg-gradient-to-b from-blue-50/80 to-white dark:from-blue-950/20 dark:to-surface shadow-md shadow-blue-100/50 dark:shadow-blue-950/30'
           : 'border-outline bg-surface shadow-sm hover:shadow-md hover:border-blue-300/50 dark:hover:border-blue-600/40'
       }`}
     >
       {/* Header */}
       <div className="flex items-center justify-between px-4 py-3">
         <div className="flex items-center gap-3 flex-1 min-w-0">
           <h3 className="text-sm font-semibold text-content-primary truncate">
             {insightType.name || `Insight Type ${insightType.id}`}
           </h3>
           <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
             insightType.active
               ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
               : 'bg-surface-secondary text-content-tertiary'
           }`}>
             {insightType.active ? 'Active' : 'Inactive'}
           </span>
           {hasInstances && (
             <span className="flex-shrink-0 text-[10px] font-medium text-blue-500 dark:text-blue-400">
               {count} {count === 1 ? 'card' : 'cards'}
             </span>
           )}
         </div>

         {/* +/- counter */}
         <div className="flex-shrink-0 flex items-center rounded-lg border border-outline-strong/80 bg-surface-elevated overflow-hidden">
           <button
             onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeInstance(insightType.id); }}
             disabled={count === 0}
             className="px-2.5 py-1.5 text-sm text-content-tertiary hover:text-content-primary hover:bg-surface-secondary active:bg-surface-secondary/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
           >
             −
           </button>
           <span className="px-2 py-1.5 text-xs font-semibold min-w-[1.75rem] text-center text-content-secondary border-x border-outline-strong/60 bg-surface tabular-nums">
             {count}
           </span>
           <button
             onClick={(e) => { e.preventDefault(); e.stopPropagation(); addInstance(insightType.id); }}
             className="px-2.5 py-1.5 text-sm text-content-tertiary hover:text-content-primary hover:bg-surface-secondary active:bg-surface-secondary/80 transition-colors"
           >
             +
           </button>
         </div>
       </div>

       {/* Description */}
       {insightType.description && (
         <p className="px-4 pb-2 text-xs text-content-tertiary leading-relaxed">
           {insightType.description}
         </p>
       )}

       {/* Instance panels */}
       {hasInstances && (
         <div className="px-5 pb-3">
           <div className="grid grid-cols-2 gap-2">
             {Array.from({ length: count }, (_, i) => renderInstanceFilters(insightType, i))}
           </div>
         </div>
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
 <div className="space-y-3">
 <p className="text-xs text-content-tertiary">
 Use the +/− buttons to add insight cards to your dashboard. Each card can have its own filters.
 </p>
 <div className="grid grid-cols-1 gap-3">
 {insightTypes.map(renderInsightTypeCard)}
 </div>
 </div>
 );
}
