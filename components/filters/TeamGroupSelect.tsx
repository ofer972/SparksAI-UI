'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
import { createPortal } from 'react-dom';

interface TreeNode {
 type: 'group' | 'team';
 id: number;
 name: string;
 children?: TreeNode[];
}

export type SelectionMode = 'tree' | 'team-only' | 'group-only';

interface TeamGroupSelectProps {
 // Selection mode
 mode?: SelectionMode; // 'tree' (default), 'team-only', or 'group-only'
 
 // Current value
 value: string | null; //"group:ID" or"team:ID" or null (for tree), or just name string for simple modes
 
 // Change handler
 onChange: (value: string | null, type: 'group' | 'team', name: string) => void;
 
 // Display options
 placeholder?: string;
 className?: string;
 allowClear?: boolean;
 showAllOption?: boolean; // Show"All Teams" /"All Groups" option
 
 // Styling
 size?: 'xs' | 'sm' | 'md'; // Text size
 fullWidth?: boolean; // Whether to take full width
}

export default function TeamGroupSelect({
 mode = 'tree',
 value,
 onChange,
 placeholder,
 className = '',
 allowClear = true,
 showAllOption = false,
 size = 'xs',
 fullWidth = false,
}: TeamGroupSelectProps) {
 const { treeData, loading, groups, teams, error: contextError } = useTeamsGroups();
 const [isOpen, setIsOpen] = useState(false);
 const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
 const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
 const [isMounted, setIsMounted] = useState(false);
 const dropdownRef = useRef<HTMLDivElement>(null);
 const buttonRef = useRef<HTMLButtonElement>(null);

 // Set default placeholder based on mode
 const effectivePlaceholder = placeholder || (
 mode === 'team-only' ? 'Select Team' :
 mode === 'group-only' ? 'Select Group' :
 'Select team or group'
 );

 useEffect(() => {
 setIsMounted(true);
 }, []);

 // Prevent body scroll and handle escape key when dropdown is open
 useEffect(() => {
 if (isOpen) {
 document.body.style.overflow = 'hidden';
 
 const handleEscape = (e: KeyboardEvent) => {
 if (e.key === 'Escape') {
 setIsOpen(false);
 }
 };
 
 document.addEventListener('keydown', handleEscape);
 
 return () => {
 document.body.style.overflow = '';
 document.removeEventListener('keydown', handleEscape);
 };
 }
 }, [isOpen]);

 const getDisplayText = () => {
 if (!value) return effectivePlaceholder;

 if (mode === 'team-only') {
 // Value is team_name
 const team = teams.find(t => t.team_name === value);
 return team ? `👥 ${team.team_name}` : effectivePlaceholder;
 }

 if (mode === 'group-only') {
 // Value is group_name
 const group = groups.find(g => g.group_name === value);
 return group ? `📁 ${group.group_name}` : effectivePlaceholder;
 }

 // Tree mode: value is"type:ID"
 const [type, idStr] = value.split(':');
 const id = parseInt(idStr, 10);

 if (type === 'group') {
 const group = groups.find(g => g.group_key === id);
 return group ? `📁 ${group.group_name}` : effectivePlaceholder;
 } else if (type === 'team') {
 const team = teams.find(t => t.team_key === id);
 return team ? `👥 ${team.team_name}` : effectivePlaceholder;
 }

 return effectivePlaceholder;
 };

 const handleToggle = () => {
 if (buttonRef.current) {
 const rect = buttonRef.current.getBoundingClientRect();
 setButtonRect(rect);
 }
 setIsOpen(!isOpen);
 };

 // Calculate if dropdown should open above or below
 const getDropdownPosition = () => {
 if (!buttonRect) return { top: '0px', bottom: 'auto' };
 
 const dropdownMaxHeight = 300;
 const spacing = 4;
 const viewportHeight = window.innerHeight;
 const spaceBelow = viewportHeight - buttonRect.bottom;
 const spaceAbove = buttonRect.top;
 
 if (spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow) {
 return {
 bottom: `${viewportHeight - buttonRect.top + spacing}px`,
 top: 'auto',
 };
 }
 
 return {
 top: `${buttonRect.bottom + spacing}px`,
 bottom: 'auto',
 };
 };

 const handleSelect = (selectedValue: string, type: 'group' | 'team', name: string) => {
 onChange(selectedValue, type, name);
 setIsOpen(false);
 };

 const handleClear = (e: React.MouseEvent) => {
 e.stopPropagation();
 onChange(null, 'team', '');
 setIsOpen(false);
 };

 const toggleGroup = (groupId: number, e: React.MouseEvent) => {
 e.stopPropagation();
 setExpandedGroups(prev => {
 const next = new Set(prev);
 if (next.has(groupId)) {
 next.delete(groupId);
 } else {
 next.add(groupId);
 }
 return next;
 });
 };

 // Render tree node for tree mode
 const renderTreeNode = (node: TreeNode, level: number = 0): React.ReactNode => {
 const isGroup = node.type === 'group';
 const isExpanded = expandedGroups.has(node.id);
 const currentValue = `${node.type}:${node.id}`;
 const isSelected = value === currentValue;

 return (
 <div key={`${node.type}-${node.id}`}>
 <div
 className={`flex items-center px-2 py-1.5 hover:bg-brand/10 cursor-pointer text-sm whitespace-nowrap text-content-secondary ${
 isSelected ? 'bg-brand/20 font-semibold' : ''
 }`}
 style={{ paddingLeft: `${level * 16 + 8}px` }}
 onClick={() => handleSelect(currentValue, node.type, node.name)}
 >
 {isGroup && (
 <span
 className="mr-1 text-content-muted hover:text-content-secondary flex-shrink-0"
 onClick={(e) => toggleGroup(node.id, e)}
 >
 {isExpanded ? '▼' : '▶'}
 </span>
 )}
 <span className="mr-2 flex-shrink-0">{isGroup ? '📁' : '👥'}</span>
 <span className="flex-shrink-0">{node.name}</span>
 </div>
 {isGroup && isExpanded && node.children && (
 <div>
 {node.children.map(child => renderTreeNode(child, level + 1))}
 </div>
 )}
 </div>
 );
 };

 const buildTreeNodes = (data: any[]): TreeNode[] => {
 return data.map(node => ({
 type: node.type,
 id: node.id,
 name: node.name,
 children: node.children ? buildTreeNodes(node.children) : [],
 }));
 };

 // Render simple list for team-only or group-only mode
 const renderSimpleList = () => {
 const items = mode === 'team-only' ? teams : groups;
 const icon = mode === 'team-only' ? '👥' : '📁';

 return items.map(item => {
 const itemValue = mode === 'team-only' 
 ? (item as any).team_name 
 : (item as any).group_name;
 const isSelected = value === itemValue;

 return (
 <div
 key={mode === 'team-only' ? (item as any).team_key : (item as any).group_key}
 className={`flex items-center px-3 py-2 hover:bg-brand/10 cursor-pointer text-sm whitespace-nowrap text-content-secondary ${
 isSelected ? 'bg-brand/20 font-semibold' : ''
 }`}
 onClick={() => handleSelect(
 itemValue,
 mode === 'team-only' ? 'team' : 'group',
 itemValue
 )}
 >
 <span className="mr-2 flex-shrink-0">{icon}</span>
 <span className="flex-shrink-0">{itemValue}</span>
 </div>
 );
 });
 };

 const treeNodes = mode === 'tree' ? buildTreeNodes(treeData) : [];
 const position = getDropdownPosition();
 
 // Size classes
 const sizeClasses = {
 xs: 'text-xs px-2 py-1',
 sm: 'text-sm px-3 py-1.5',
 md: 'text-base px-4 py-2',
 };
 
 const dropdownContent = (
 <>
 {/* Backdrop */}
 <div
 className="fixed inset-0 z-[9998]"
 onClick={() => setIsOpen(false)}
 style={{ cursor: 'default' }}
 />
 {/* Dropdown */}
 <div
 ref={dropdownRef}
 className="fixed bg-surface border border-outline-strong rounded shadow-lg z-[9999]"
 style={{
 ...position,
 left: buttonRect ? `${buttonRect.left}px` : '0px',
 minWidth: buttonRect ? `${buttonRect.width}px` : '140px',
 maxWidth: '400px',
 maxHeight: '300px',
 overflowX: 'auto',
 overflowY: 'auto',
 }}
 >
 {loading ? (
 <div className="px-3 py-2 text-sm text-content-muted whitespace-nowrap">Loading...</div>
 ) : (
 <>
 {/* Show"All" option if enabled */}
 {showAllOption && (
 <>
 <div
 className={`px-3 py-2 hover:bg-brand/10 cursor-pointer text-sm text-content-secondary ${
 !value ? 'bg-brand/20 font-semibold' : ''
 }`}
 onClick={() => handleSelect(null as any, mode === 'group-only' ? 'group' : 'team', '')}
 >
 {mode === 'group-only' ? 'All Groups' : 'All Teams'}
 </div>
 <div className="border-t border-outline"></div>
 </>
 )}
 
 {/* Clear selection option */}
 {allowClear && value && !showAllOption && (
 <div
 className="px-3 py-2 text-sm text-content-tertiary hover:bg-surface-secondary cursor-pointer border-b border-outline whitespace-nowrap"
 onClick={handleClear}
 >
 Clear selection
 </div>
 )}
 
 {/* Render content based on mode */}
 {mode === 'tree' && treeNodes.length === 0 && (
 <div className="px-3 py-2 text-sm text-content-muted whitespace-nowrap">
   {contextError ? contextError : 'No teams or groups available. Sign in or ensure your org has teams/groups configured.'}
 </div>
 )}
 {mode === 'tree' && treeNodes.length > 0 && treeNodes.map(node => renderTreeNode(node))}
 {(mode === 'team-only' || mode === 'group-only') && renderSimpleList()}
 </>
 )}
 </div>
 </>
 );

 return (
 <>
 <button
 ref={buttonRef}
 type="button"
 onClick={handleToggle}
 className={`border border-outline-strong rounded ${sizeClasses[size]} bg-surface-elevated text-content-primary hover:bg-surface-secondary focus:outline-none focus:ring-1 focus:ring-brand ${fullWidth ? 'w-full' : 'min-w-[140px]'} text-left flex items-center justify-between ${className}`}
 disabled={loading}
 >
 <span className="truncate">{loading ? 'Loading...' : getDisplayText()}</span>
 <span className="ml-2 flex-shrink-0">{isOpen ? '▲' : '▼'}</span>
 </button>
 {isMounted && isOpen && typeof window !== 'undefined' && createPortal(dropdownContent, document.body)}
 </>
 );
}
