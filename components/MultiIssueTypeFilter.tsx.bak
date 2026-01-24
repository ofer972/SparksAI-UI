'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface MultiIssueTypeFilterProps {
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
  availableTypes: string[];
  className?: string;
  placeholder?: string;
}

export default function MultiIssueTypeFilter({
  selectedTypes,
  onTypesChange,
  availableTypes,
  className = '',
  placeholder = 'Select issue types',
}: MultiIssueTypeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
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
    if (selectedTypes.length === 0) return placeholder;
    if (selectedTypes.length === 1) return selectedTypes[0];
    return `${selectedTypes.length} types selected`;
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

  const handleTypeToggle = (type: string) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter(t => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  const handleSelectAll = () => {
    onTypesChange([...availableTypes]);
  };

  const handleClearAll = () => {
    onTypesChange([]);
  };

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
        {availableTypes.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">No issue types available</div>
        ) : (
          <>
            <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-gray-600 hover:text-gray-800 font-medium"
              >
                Clear All
              </button>
            </div>
            {availableTypes.map(type => {
              const isSelected = selectedTypes.includes(type);
              return (
                <div
                  key={type}
                  className={`px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                    isSelected ? 'bg-blue-100' : ''
                  }`}
                  onClick={() => handleTypeToggle(type)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleTypeToggle(type)}
                    className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className={isSelected ? 'font-semibold' : ''}>{type}</span>
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
        className={`px-2 py-1 border border-gray-300 rounded text-xs bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[140px] text-left flex items-center justify-between ${className}`}
      >
        <span className="truncate">{getDisplayText()}</span>
        <span className="ml-2 flex-shrink-0">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isMounted && isOpen && typeof window !== 'undefined' && createPortal(dropdownContent, document.body)}
    </>
  );
}

