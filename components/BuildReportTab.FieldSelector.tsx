'use client';

import React from 'react';
import { sortFieldsSelectedFirst } from './BuildReportTab.helpers';

export interface ReportField {
  column_name: string;
  display_name: string;
  type: string;
}

interface FieldSelectorProps {
  fields: ReportField[];
  selectedFields: string[];
  onToggle: (columnName: string) => void;
  disabled?: boolean;
  showReorderButtons?: boolean;
  onMoveUp?: (columnName: string) => void;
  onMoveDown?: (columnName: string) => void;
}

export default function FieldSelector({
  fields,
  selectedFields,
  onToggle,
  disabled = false,
  showReorderButtons = false,
  onMoveUp,
  onMoveDown,
}: FieldSelectorProps) {
  const sortedFields = sortFieldsSelectedFirst(fields, selectedFields);

  return (
    <div className={`border border-outline rounded-md bg-surface-elevated max-h-[196px] overflow-y-auto ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {fields.length === 0 ? (
        <div className="p-2 text-sm text-content-tertiary">No fields available</div>
      ) : (
        <div className="p-1">
          {sortedFields.map((field, index) => {
            const isSelected = selectedFields.includes(field.column_name);
            const isFirst = index === 0;
            const isLast = index === sortedFields.length - 1;
            
            return (
              <div
                key={field.column_name}
                className={`flex items-center gap-1 px-2 py-1 rounded ${disabled ? '' : 'hover:bg-surface-secondary'} ${isSelected ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}
              >
                <label className={`flex items-center flex-1 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(field.column_name)}
                    disabled={disabled}
                    className="w-4 h-4 text-brand border-outline-strong rounded focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className={`ml-2 text-sm flex-1 ${disabled ? 'text-content-tertiary' : 'text-content-secondary'}`}>{field.display_name}</span>
                </label>
                
                {/* Up/Down arrows - only show for selected fields, side by side */}
                {isSelected && !disabled && showReorderButtons && (
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveUp?.(field.column_name);
                      }}
                      disabled={isFirst}
                      className="p-1 text-content-tertiary hover:text-content-primary disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveDown?.(field.column_name);
                      }}
                      disabled={isLast}
                      className="p-1 text-content-tertiary hover:text-content-primary disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

