'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
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
  const { groups, teams, loading } = useTeamsGroups();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent body scroll and handle escape key when dropdown is open
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Handle escape key
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

  const tree = useMemo(() => {
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

    // Add teams to their groups or as unassigned
    // With many-to-many, a team can appear in multiple groups
    teams.forEach(team => {
      if (team.group_keys && team.group_keys.length > 0) {
        // Add this team to each of its groups
        team.group_keys.forEach((groupKey: number) => {
          const teamNode: TreeNode = {
            id: `team:${team.team_key}`,
            type: 'team',
            name: team.team_name,
            data: team,
            children: [],
          };

          const group = groupMap.get(groupKey);
          if (group) {
            group.children.push(teamNode);
          } else {
            // Group doesn't exist in map, add to roots
            rootNodes.push(teamNode);
          }
        });
      } else {
        // Team has no groups, add to unassigned section at root
        const teamNode: TreeNode = {
          id: `team:${team.team_key}`,
          type: 'team',
          name: team.team_name,
          data: team,
          children: [],
        };
        rootNodes.push(teamNode);
      }
    });

    return rootNodes;
  }, [groups, teams]);

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
      return group ? `📁 ${group.group_name}` : placeholder;
    } else {
      const team = teams.find(t => t.team_key === parseInt(id));
      return team ? `👥 ${team.team_name}` : placeholder;
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
            className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer whitespace-nowrap ${
              isSelected ? 'bg-blue-50' : ''
            }`}
            style={{ paddingLeft: `${depth * 16 + 12}px` }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) {
                  toggleGroupExpansion(group.group_key);
                }
              }}
              className={`w-4 h-4 flex items-center justify-center flex-shrink-0 ${
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
              <span className="flex-shrink-0">📁</span>
              <span className={`text-sm flex-shrink-0 ${isSelected ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>
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
          className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer whitespace-nowrap ${
            isSelected ? 'bg-blue-50' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 28}px` }}
          onClick={() => handleSelect(node)}
        >
          <span className="flex-shrink-0">👥</span>
          <span className={`text-sm flex-shrink-0 ${isSelected ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>
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

  // Calculate if dropdown should open above or below
  const getDropdownPosition = () => {
    if (!buttonRect) return { top: '0px', bottom: 'auto' };
    
    const dropdownMaxHeight = 384; // max-h-96 = 384px
    const spacing = 8;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    
    // If not enough space below but enough space above, open upward
    if (spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow) {
      return {
        bottom: `${viewportHeight - buttonRect.top + spacing}px`,
        top: 'auto',
      };
    }
    
    // Otherwise open downward (default)
    return {
      top: `${buttonRect.bottom + spacing}px`,
      bottom: 'auto',
    };
  };

  const renderDropdownContent = () => {
    if (!isOpen || !buttonRect || !isMounted) return null;

    const position = getDropdownPosition();

    const dropdownContent = (
      <>
        {/* Backdrop to capture clicks and prevent interaction with elements below */}
        <div 
          className="fixed inset-0 z-[10000]" 
          style={{ pointerEvents: 'auto', cursor: 'default' }}
          onClick={() => setIsOpen(false)}
        />
        <div 
          ref={dropdownRef}
          className="fixed z-[10001] bg-white border border-gray-300 rounded-lg shadow-2xl max-h-96" 
          style={{ 
            ...position,
            left: `${buttonRect.left}px`,
            minWidth: `${buttonRect.width}px`,
            maxWidth: '400px',
            pointerEvents: 'auto',
            overflowX: 'auto',
            overflowY: 'auto',
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
        type="button"
        ref={buttonRef}
        onClick={handleToggleOpen}
        className="w-full px-4 py-1 bg-white border border-gray-300 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center justify-between hover:border-gray-400 transition-colors"
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

