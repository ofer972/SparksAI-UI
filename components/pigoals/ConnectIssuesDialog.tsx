'use client';

import React, { useState, useEffect } from 'react';
import { ApiService } from '@/lib/api';
import { getTypeColor } from '../hierarchyTable/utils';

interface ConnectIssuesDialogProps {
 isOpen: boolean;
 onClose: () => void;
 goal: {
 id: number;
 text: string;
 teamName?: string;
 groupName?: string;
 isGroup?: boolean;
 };
 scopeType: 'pi' | 'sprint' | 'release';
 scopeContext: {
 piName?: string;
 sprintId?: number;
 releaseId?: number;
 };
 connectedEpicKeys: string[];
 onConnect: (selectedKeys: string[]) => Promise<void>;
}

export default function ConnectIssuesDialog({
 isOpen,
 onClose,
 goal,
 scopeType,
 scopeContext,
 connectedEpicKeys,
 onConnect,
}: ConnectIssuesDialogProps) {
 const [availableEpics, setAvailableEpics] = useState<Array<{ issue_key: string; summary: string; issue_type?: string | null }>>([]);
 const [selectedEpicKeys, setSelectedEpicKeys] = useState<string[]>([]);
 const [epicSearchQuery, setEpicSearchQuery] = useState('');
 const [loadingEpics, setLoadingEpics] = useState(false);

 useEffect(() => {
 if (!isOpen) {
 setAvailableEpics([]);
 setSelectedEpicKeys([]);
 setEpicSearchQuery('');
 return;
 }

 if (!((scopeType === 'pi' && scopeContext.piName) || (scopeType === 'sprint' && scopeContext.sprintId) || (scopeType === 'release' && scopeContext.releaseId))) {
 return;
 }

 const fetchEpics = async () => {
 setLoadingEpics(true);
 const apiService = new ApiService();
 
 try {
 const params: any = {
 scope_type: scopeType,
 };
 
 if (scopeType === 'pi' && scopeContext.piName) {
 params.pi_name = scopeContext.piName;
 } else if (scopeType === 'sprint' && scopeContext.sprintId) {
 params.sprint_id = scopeContext.sprintId;
 } else if (scopeType === 'release' && scopeContext.releaseId) {
 params.release_id = scopeContext.releaseId;
 }

 if (goal.isGroup && goal.groupName) {
 params.team_name = goal.groupName;
 params.isGroup = true;
 } else if (goal.teamName) {
 params.team_name = goal.teamName;
 params.isGroup = false;
 }

 const response = await apiService.getIssuesForScope(params);
 const allEpics = (response.data?.issues || []) as Array<{ issue_key: string; summary: string; issue_type?: string | null }>;
 const filteredEpics = allEpics.filter((epic: any) => 
 !connectedEpicKeys.includes(epic.issue_key)
 );

 setAvailableEpics(filteredEpics);
 } catch (err) {
 console.error('Error fetching epics:', err);
 setAvailableEpics([]);
 } finally {
 setLoadingEpics(false);
 }
 };

 fetchEpics();
 }, [isOpen, goal, scopeType, scopeContext, connectedEpicKeys]);

 const handleConnect = async () => {
 if (selectedEpicKeys.length === 0) return;
 await onConnect(selectedEpicKeys);
 onClose();
 };

 const filteredEpics = availableEpics.filter(epic => {
 if (!epicSearchQuery) return true;
 const query = epicSearchQuery.toLowerCase();
 return (
 epic.issue_key.toLowerCase().includes(query) ||
 (epic.summary && epic.summary.toLowerCase().includes(query))
 );
 });

 const selectAll = () => {
 setSelectedEpicKeys(filteredEpics.map(epic => epic.issue_key));
 };

 const clearAll = () => {
 setSelectedEpicKeys([]);
 };

 const toggleEpic = (epicKey: string) => {
 setSelectedEpicKeys(prev => {
 if (prev.includes(epicKey)) {
 return prev.filter(key => key !== epicKey);
 } else {
 return [...prev, epicKey];
 }
 });
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
 <div className="bg-surface rounded-xl shadow-2xl max-w-lg w-full flex flex-col" style={{ height: '550px' }}>
 <div className="px-4 py-2.5 border-b border-outline">
 <h3 className="text-lg font-bold text-content-primary">
 Connect Issues to Goal
 {goal.isGroup && goal.groupName && (
 <span className="text-sm font-normal text-content-tertiary ml-2">({goal.groupName})</span>
 )}
 {!goal.isGroup && goal.teamName && (
 <span className="text-sm font-normal text-content-tertiary ml-2">({goal.teamName})</span>
 )}
 </h3>
 <p className="text-xs text-content-tertiary mt-0.5">
 Goal: <span className="font-semibold">{goal.text}</span>
 </p>
 </div>

 <div className="p-3 flex-1 overflow-hidden flex flex-col min-h-0">
 <p className="text-xs text-content-muted mb-2 flex-shrink-0">
 Showing {filteredEpics.length} issue{filteredEpics.length !== 1 ? 's' : ''}
 </p>

 <div className="mb-2 flex-shrink-0">
 <input
 type="text"
 value={epicSearchQuery}
 onChange={(e) => setEpicSearchQuery(e.target.value)}
 placeholder="Search issues..."
 className="w-full px-3 py-1.5 text-sm border border-outline-strong bg-surface-elevated text-content-primary dark:placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600"
 />
 </div>

 <div className="flex gap-2 mb-2 flex-shrink-0">
 <button
 onClick={selectAll}
 className="text-xs text-brand hover:text-blue-700 hover:text-blue-300 font-medium"
 >
 Select All
 </button>
 <span className="text-content-muted">|</span>
 <button
 onClick={clearAll}
 className="text-xs text-brand hover:text-blue-700 hover:text-blue-300 font-medium"
 >
 Clear All
 </button>
 </div>

 <div className="flex-1 overflow-y-auto border border-outline rounded-lg min-h-0">
 {loadingEpics ? (
 <div className="p-3 text-center text-content-muted text-xs">
 Loading issues...
 </div>
 ) : filteredEpics.length === 0 ? (
 <div className="p-3 text-center text-content-muted text-xs">
 {epicSearchQuery 
 ? 'No issues found matching your search' 
 : 'No issues available'
 }
 </div>
 ) : (
 <div className="divide-y divide-gray-200 divide-outline">
 {filteredEpics.map(epic => (
 <label
 key={epic.issue_key}
 className="flex items-center gap-2 px-3 py-2 hover:bg-surface-elevated cursor-pointer transition-colors"
 >
 <input
 type="checkbox"
 checked={selectedEpicKeys.includes(epic.issue_key)}
 onChange={() => toggleEpic(epic.issue_key)}
 className="w-3.5 h-3.5 text-brand border-outline-strong rounded focus:ring-blue-400 dark:focus:ring-blue-600"
 />
 <div className="flex-1 flex items-center gap-2">
 <span className="text-xs font-semibold text-content-primary">{epic.issue_key}</span>
 {epic.issue_type && (
 <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${getTypeColor(epic.issue_type)}`}>
 [{epic.issue_type}]
 </span>
 )}
 <span className="text-xs text-content-secondary">{epic.summary || ''}</span>
 </div>
 </label>
 ))}
 </div>
 )}
 </div>

 <div className="mt-2 text-xs text-content-tertiary flex-shrink-0 h-4">
 {selectedEpicKeys.length > 0 && (
 <span>{selectedEpicKeys.length} issue{selectedEpicKeys.length !== 1 ? 's' : ''} selected</span>
 )}
 </div>
 </div>

 <div className="px-4 py-2.5 bg-surface-elevated rounded-b-xl flex gap-2 flex-shrink-0">
 <button
 onClick={onClose}
 className="flex-1 bg-surface-elevated text-content-secondary text-sm border border-outline-strong py-1.5 rounded-lg hover:bg-surface-secondary transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={handleConnect}
 disabled={selectedEpicKeys.length === 0 || loadingEpics}
 className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white text-sm py-1.5 rounded-lg hover:from-blue-600 hover:to-blue-700 dark:hover:from-blue-500 dark:hover:to-blue-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
 >
 Connect {selectedEpicKeys.length} Issue{selectedEpicKeys.length !== 1 ? 's' : ''}
 </button>
 </div>
 </div>
 </div>
 );
}

