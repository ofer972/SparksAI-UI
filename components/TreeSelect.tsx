'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ApiService } from '@/lib/api';
import { Group, Team } from '@/lib/config';

interface TreeNode {
  id: string;
  type: 'group' | 'team';
  name: string;
  data: Group | Team;
  children: TreeNode[];
}

interface TreeSelectProps {
  selectedValue: string | null; // Can be "group:ID" or "team:ID"
  onSelect: (value: string | null, label: string, type: 'group' | 'team') => void;
  placeholder?: string;
}

export default function TreeSelect({ selectedValue, onSelect, placeholder = 'Select team or group' }: TreeSelectProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const apiService = useMemo(() => new ApiService(), []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsData, teamsData] = await Promise.all([
        apiService.getAllGroups(),
        apiService.getAllTeams(),
      ]);
      
      setGroups(Array.isArray(groupsData) ? groupsData : groupsData.groups || []);
      setTeams(Array.isArray(teamsData) ? teamsData : teamsData.teams || []);
    } catch (err) {
      console.error('Failed to load groups and teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (): TreeNode[] => {
    const groupMap = new Map<number, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // Create group nodes
    groups.forEach(group => {
      const node: TreeNode = {
        id: `group:${group.group_key}`,
        type: 'group',
        name: group.group_name,
        data: group,
        children: [],
      };
      groupMap.set(group.group_key, node);
    });

    // Build group hierarchy
    groups.forEach(group => {
      const node = groupMap.get(group.group_key);
      if (!node) return;

      if (group.parent_group_key) {
        const parent = groupMap.get(group.parent_group_key);
        if (parent) {
          parent.children.push(node);
        } else {
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    // Add teams to their groups
    teams.forEach(team => {
      const teamNode: TreeNode = {
        id: `team:${team.team_key}`,
        type: 'team',
        name: team.team_name,
        data: team,
        children: [],
      };

      if (team.group_key) {
        const group = groupMap.get(team.group_key);
        if (group) {
          group.children.push(teamNode);
        }
      }
    });

    return rootNodes;
  };

  const tree = useMemo(() => buildTree(), [groups, teams]);

  const toggleGroupExpansion = (groupId: number) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleSelect = (node: TreeNode) => {
    if (node.type === 'group') {
      const group = node.data as Group;
      onSelect(`group:${group.group_key}`, group.group_name, 'group');
    } else {
      const team = node.data as Team;
      onSelect(`team:${team.team_key}`, team.team_name, 'team');
    }
    setIsOpen(false);
  };

  const getSelectedLabel = (): string => {
    if (!selectedValue) return placeholder;

    const [type, id] = selectedValue.split(':');
    if (type === 'group') {
      const group = groups.find(g => g.group_key === parseInt(id));
      return group ? group.group_name : placeholder;
    } else {
      const team = teams.find(t => t.team_key === parseInt(id));
      return team ? team.team_name : placeholder;
    }
  };

  const renderNode = (node: TreeNode, depth: number = 0): JSX.Element => {
    if (node.type === 'group') {
      const group = node.data as Group;
      const isExpanded = expandedGroups.has(group.group_key);
      const hasChildren = node.children.length > 0;
      const isSelected = selectedValue === node.id;

      return (
        <div key={node.id}>
          <div
            className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer ${
              isSelected ? 'bg-blue-50' : ''
            }`}
            style={{ paddingLeft: `${depth * 16 + 12}px` }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) {
                  toggleGroupExpansion(group.group_key);
                }
              }}
              className={`w-4 h-4 flex items-center justify-center ${
                hasChildren ? '' : 'invisible'
              }`}
            >
              {hasChildren && (
                <svg
                  className={`w-3 h-3 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>

            <div
              onClick={() => handleSelect(node)}
              className="flex items-center gap-2 flex-1"
            >
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className={`text-sm ${isSelected ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>
                {group.group_name}
              </span>
            </div>
          </div>

          {isExpanded && hasChildren && (
            <div>
              {node.children.map(child => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    } else {
      const team = node.data as Team;
      const isSelected = selectedValue === node.id;

      return (
        <div
          key={node.id}
          className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer ${
            isSelected ? 'bg-blue-50' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 28}px` }}
          onClick={() => handleSelect(node)}
        >
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className={`text-sm ${isSelected ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>
            {team.team_name}
          </span>
        </div>
      );
    }
  };

  const handleToggleOpen = () => {
    if (!isOpen && buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect());
    }
    setIsOpen(!isOpen);
  };

  const renderDropdownContent = () => {
    if (!isOpen || !buttonRect || !isMounted) return null;

    const dropdownContent = (
      <>
        {/* Backdrop to capture clicks and prevent interaction with elements below */}
        <div 
          className="fixed inset-0 z-[10000]" 
          style={{ pointerEvents: 'auto' }}
          onClick={() => setIsOpen(false)}
        />
        <div 
          ref={dropdownRef}
          className="fixed z-[10001] bg-white border border-gray-300 rounded-lg shadow-2xl max-h-96 overflow-y-auto" 
          style={{ 
            top: `${buttonRect.bottom + 8}px`,
            left: `${buttonRect.left}px`,
            width: `${buttonRect.width}px`,
            pointerEvents: 'auto'
          }}
        >
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : tree.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No groups or teams available</div>
          ) : (
            <>
              <div
                className={`px-3 py-2 hover:bg-gray-50 cursor-pointer ${
                  !selectedValue ? 'bg-blue-50' : ''
                }`}
                onClick={() => {
                  onSelect(null, placeholder, 'team');
                  setIsOpen(false);
                }}
              >
                <span className={`text-sm ${!selectedValue ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>
                  All Teams
                </span>
              </div>
              <div className="border-t border-gray-200"></div>
              {tree.map(node => renderNode(node, 0))}
            </>
          )}
        </div>
      </>
    );

    return createPortal(dropdownContent, document.body);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggleOpen}
        className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center justify-between hover:border-gray-400 transition-colors"
      >
        <span className="text-sm text-gray-700 truncate">{getSelectedLabel()}</span>
        <svg
          className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {renderDropdownContent()}
    </div>
  );
}

