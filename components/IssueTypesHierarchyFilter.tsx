'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ApiService } from '@/lib/api';
import type { IssueTypesHierarchyResponse } from '@/lib/config';

interface IssueTypesHierarchyFilterProps {
  value: number | undefined; // Selected hierarchy level number
  onChange: (hierarchyLevel: number | undefined) => void;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
}

interface IssueTypeItem {
  name: string;
  hierarchyLevel: number;
}

export default function IssueTypesHierarchyFilter({
  value,
  onChange,
  placeholder = 'Select issue type',
  className = '',
  allowClear = true,
}: IssueTypesHierarchyFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [issueTypes, setIssueTypes] = useState<IssueTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const apiService = new ApiService();

  useEffect(() => {
    setIsMounted(true);
    // Fetch issue types hierarchy
    const fetchIssueTypes = async () => {
      try {
        const response = await apiService.getIssueTypesHierarchy();
        if (response.success && response.data?.levels) {
          // Flatten the levels into a single array with hierarchy level info
          // Filter out level 0 and null levels (only show level 1 and above)
          const flattened: IssueTypeItem[] = [];
          response.data.levels.forEach((level) => {
            // Filter out level 0 and null levels
            if (level.hierarchyLevel !== null && level.hierarchyLevel !== 0) {
              level.issue_types.forEach((issueType) => {
                flattened.push({
                  name: issueType,
                  hierarchyLevel: level.hierarchyLevel,
                });
              });
            }
          });
          // Sort by hierarchy level descending (3 → 2 → 1)
          flattened.sort((a, b) => b.hierarchyLevel - a.hierarchyLevel);
          setIssueTypes(flattened);
        }
      } catch (err) {
        console.error('Error fetching issue types hierarchy:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchIssueTypes();
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

  // Get display text - show selected issue type name
  const getDisplayText = () => {
    if (value === undefined || value === null) return placeholder;
    const selectedItem = issueTypes.find((item) => item.hierarchyLevel === value);
    return selectedItem ? selectedItem.name : placeholder;
  };

  const handleToggle = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonRect(rect);
    }
    setIsOpen(!isOpen);
  };

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

  const handleSelect = (hierarchyLevel: number) => {
    onChange(hierarchyLevel);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
    setIsOpen(false);
  };

  // Group issue types by hierarchy level for visual hierarchy
  const groupedByLevel = issueTypes.reduce((acc, item) => {
    if (!acc[item.hierarchyLevel]) {
      acc[item.hierarchyLevel] = [];
    }
    acc[item.hierarchyLevel].push(item);
    return acc;
  }, {} as Record<number, IssueTypeItem[]>);

  // Get max hierarchy level for indentation calculation
  const maxLevel = issueTypes.length > 0
    ? Math.max(...issueTypes.map((item) => item.hierarchyLevel))
    : 0;

  const position = getDropdownPosition();

  const dropdownContent = (
    <>
      <div
        className="fixed inset-0 z-[9998]"
        onClick={() => setIsOpen(false)}
        style={{ cursor: 'default' }}
      />
      <div
        ref={dropdownRef}
        className="fixed bg-surface border border-outline rounded shadow-lg z-[9999]"
        style={{
          ...position,
          left: buttonRect ? `${buttonRect.left}px` : '0px',
          minWidth: buttonRect ? `${buttonRect.width}px` : '200px',
          maxWidth: '400px',
          maxHeight: '300px',
          overflowX: 'auto',
          overflowY: 'auto',
        }}
      >
        {loading ? (
          <div className="px-3 py-2 text-sm text-content-tertiary whitespace-nowrap">Loading...</div>
        ) : issueTypes.length === 0 ? (
          <div className="px-3 py-2 text-sm text-content-tertiary whitespace-nowrap">No issue types available</div>
        ) : (
          <>
            {allowClear && value !== undefined && value !== null && (
              <div
                className="px-3 py-2 text-sm text-content-secondary hover:bg-surface-secondary cursor-pointer border-b whitespace-nowrap"
                onClick={handleClear}
              >
                Clear selection
              </div>
            )}
            {/* Render levels in descending order (3 → 2 → 1 → 0) */}
            {Object.keys(groupedByLevel)
              .map(Number)
              .sort((a, b) => b - a)
              .map((level) => {
                const items = groupedByLevel[level];
                if (!items || !Array.isArray(items)) {
                  return null;
                }
                return (
                  <div key={level}>
                    {items.map((item) => {
                      // Calculate indentation: higher level = less indent
                      const indent = (maxLevel - item.hierarchyLevel) * 20;
                      const isSelected = value === item.hierarchyLevel;

                      return (
                        <div
                          key={`${item.hierarchyLevel}-${item.name}`}
                          className={`px-3 py-2 text-sm text-content-primary hover:bg-surface-elevated cursor-pointer whitespace-nowrap ${
                            isSelected ? 'bg-brand/20 text-brand font-semibold' : ''
                          }`}
                          style={{ paddingLeft: `${12 + indent}px` }}
                          onClick={() => handleSelect(item.hierarchyLevel)}
                        >
                          {item.name}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
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
        className={`px-2 py-1 border border-outline rounded text-xs bg-surface hover:bg-surface-elevated focus:outline-none focus:ring-1 focus:ring-brand min-w-[140px] text-left flex items-center justify-between ${className}`}
        disabled={loading}
      >
        <span className="truncate">{loading ? 'Loading...' : getDisplayText()}</span>
        <span className="ml-2 flex-shrink-0">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isMounted && isOpen && typeof window !== 'undefined' && createPortal(dropdownContent, document.body)}
    </>
  );
}

