'use client';

import React from 'react';
import { getReportHelpContent } from '@/lib/reportHelpContent';

interface ReportHelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string | undefined;
  reportTitle?: string;
  /** When set, dialog is positioned just under this rect (e.g. report header); otherwise centered. */
  anchorRect?: DOMRect | null;
}

const DIALOG_MAX_WIDTH_PX = 768; // 48rem
const GAP_PX = 8;

export default function ReportHelpDialog({
  isOpen,
  onClose,
  reportId,
  reportTitle,
  anchorRect,
}: ReportHelpDialogProps) {
  const help = reportId ? getReportHelpContent(reportId) : undefined;

  if (!isOpen) return null;
  if (!help) {
    onClose();
    return null;
  }

  const title = reportTitle || 'Report help';

  const positionStyle: React.CSSProperties = anchorRect
    ? (() => {
        const top = anchorRect.bottom + GAP_PX;
        let left = anchorRect.left;
        if (typeof window !== 'undefined') {
          if (left + DIALOG_MAX_WIDTH_PX > window.innerWidth - 16) left = window.innerWidth - DIALOG_MAX_WIDTH_PX - 16;
          if (left < 16) left = 16;
        }
        return { top, left, maxWidth: DIALOG_MAX_WIDTH_PX };
      })()
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={`bg-surface rounded-lg shadow-xl w-full max-h-[85vh] flex flex-col border border-outline ${!positionStyle ? 'max-w-[48rem]' : ''}`}
        style={
          positionStyle
            ? { position: 'fixed', top: positionStyle.top, left: positionStyle.left, width: '100%', maxWidth: positionStyle.maxWidth, zIndex: 51 }
            : undefined
        }
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-outline flex-shrink-0">
          <h2 className="text-sm font-semibold text-content-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-secondary text-content-secondary"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0 text-content-primary">
          <p className="text-sm text-content-secondary mb-4">{help.oneLiner}</p>
          {help.edgeCases && help.edgeCases.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-content-primary mb-2">How we count (edge cases)</h3>
              <ul className="list-disc list-inside text-sm text-content-secondary space-y-1.5">
                {help.edgeCases.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="border-t border-outline px-5 py-3 flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-brand text-white rounded-md hover:opacity-90 transition-opacity text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
