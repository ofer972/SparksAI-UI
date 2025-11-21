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

interface TeamGroupFilterProps {
  value: string | null; // "group:ID" or "team:ID" or null
  onChange: (value: string | null, type: 'group' | 'team', name: string) => void;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
}

export default function TeamGroupFilter({
  value,
  onChange,
  placeholder = 'Select team or group',
  className = '',
  allowClear = true,
}: TeamGroupFilterProps) {
  const { treeData, loading, groups, teams } = useTeamsGroups();
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

  const getDisplayText = () => {
    if (!value) return placeholder;

    const [type, idStr] = value.split(':');
    const id = parseInt(idStr, 10);

    if (type === 'group') {
      const group = groups.find(g => g.group_key === id);
      return group ? `📁 ${group.group_name}` : placeholder;
    } else if (type === 'team') {
      const team = teams.find(t => t.team_key === id);
      return team ? `👥 ${team.team_name}` : placeholder;
    }

    return placeholder;
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

  const renderTreeNode = (node: TreeNode, level: number = 0): React.ReactNode => {
    const isGroup = node.type === 'group';
    const isExpanded = expandedGroups.has(node.id);
    const currentValue = `${node.type}:${node.id}`;
    const isSelected = value === currentValue;

    return (
      <div key={`${node.type}-${node.id}`}>
        <div
          className={`flex items-center px-2 py-1.5 hover:bg-blue-50 cursor-pointer text-sm whitespace-nowrap ${
            isSelected ? 'bg-blue-100 font-semibold' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => handleSelect(currentValue, node.type, node.name)}
        >
          {isGroup && (
            <span
              className="mr-1 text-gray-500 hover:text-gray-700 flex-shrink-0"
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

  const treeNodes = buildTreeNodes(treeData);

  const position = getDropdownPosition();
  
  const dropdownContent = (
    <>
      {/* Backdrop to prevent interaction with page */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={() => setIsOpen(false)}
        style={{ cursor: 'default' }}
      />
      {/* Dropdown */}
      <div
        ref={dropdownRef}
        className="fixed bg-white border border-gray-300 rounded shadow-lg z-[9999]"
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
          <div className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">Loading...</div>
        ) : treeNodes.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">No teams or groups available</div>
        ) : (
          <>
            {allowClear && value && (
              <div
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 cursor-pointer border-b whitespace-nowrap"
                onClick={handleClear}
              >
                Clear selection
              </div>
            )}
            {treeNodes.map(node => renderTreeNode(node))}
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
        className={`px-2 py-1 border border-gray-300 rounded text-xs bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[140px] text-left flex items-center justify-between ${className}`}
        disabled={loading}
      >
        <span className="truncate">{loading ? 'Loading...' : getDisplayText()}</span>
        <span className="ml-2 flex-shrink-0">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isMounted && isOpen && typeof window !== 'undefined' && createPortal(dropdownContent, document.body)}
    </>
  );
}

