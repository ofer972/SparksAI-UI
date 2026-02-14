'use client';

import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface GenericReportFilterMultiSelectProps {
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Max height of the dropdown list (default 280px) */
  maxHeight?: number;
}

function getDisplayText(selectedValues: string[], options: string[], placeholder: string): string {
  if (selectedValues.length === 0) return placeholder;
  if (options.length > 0 && selectedValues.length === options.length) return 'All selected';
  if (selectedValues.length <= 2) return selectedValues.join(', ');
  return `${selectedValues.length} selected`;
}

export default function GenericReportFilterMultiSelect({
  options,
  selectedValues,
  onChange,
  placeholder = 'All',
  disabled = false,
  className = '',
  maxHeight = 280,
}: GenericReportFilterMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const open = useCallback(() => {
    if (disabled) return;
    const el = triggerRef.current;
    if (el) {
      setTriggerRect(el.getBoundingClientRect());
      setIsOpen(true);
    }
  }, [disabled]);

  const close = useCallback(() => {
    setIsOpen(false);
    setTriggerRect(null);
  }, []);

  const toggleOption = useCallback(
    (option: string) => {
      if (selectedValues.includes(option)) {
        onChange(selectedValues.filter((v) => v !== option));
      } else {
        onChange([...selectedValues, option]);
      }
    },
    [selectedValues, onChange]
  );

  const displayText = getDisplayText(selectedValues, options, placeholder);
  const isEmpty = selectedValues.length === 0;

  const menuContent =
    isOpen &&
    triggerRect &&
    typeof document !== 'undefined' &&
    createPortal(
      <>
        <div className="fixed inset-0 z-40" onClick={close} aria-hidden />
        <div
          className="fixed z-50 bg-surface border border-outline rounded-lg shadow-lg overflow-hidden flex flex-col min-w-[200px]"
          style={{
            top: triggerRect.bottom + 4,
            left: triggerRect.left,
            width: Math.max(triggerRect.width, 200),
            maxHeight: `${maxHeight}px`,
          }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-outline bg-surface-elevated flex-shrink-0">
            <span className="text-xs font-medium text-content-secondary">
              {selectedValues.length} of {options.length} selected
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onChange(options)}
                className="text-xs text-brand hover:text-blue-700 font-medium"
              >
                Select All
              </button>
              <span className="text-content-muted">|</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-content-secondary hover:text-content-primary font-medium"
              >
                Clear All
              </button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 min-h-0">
            {options.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-content-tertiary">No options available</div>
            ) : (
              options.map((option) => (
                <label
                  key={option}
                  className="flex items-center px-3 py-2 hover:bg-surface-elevated cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option)}
                    onChange={() => toggleOption(option)}
                    className="h-4 w-4 text-brand focus:ring-brand border-outline rounded"
                  />
                  <span className="ml-3 text-sm text-content-primary">{option}</span>
                </label>
              ))
            )}
          </div>
        </div>
      </>,
      document.body
    );

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        onClick={open}
        disabled={disabled}
        className="w-full px-2 py-1.5 text-left border border-outline rounded-md text-sm bg-surface text-content-primary focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
      >
        <span className={`truncate ${isEmpty ? 'text-content-tertiary' : 'text-content-primary'}`}>{displayText}</span>
        <svg className="w-4 h-4 text-content-muted flex-shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {menuContent}
    </div>
  );
}
