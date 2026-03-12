'use client';

import React, { useState, useContext } from 'react';
import { getReportHelpContent, REPORT_IDS_WITH_HELP } from '@/lib/reportHelpContent';
import { ReportCardHeaderRectContext } from './ReportCard';
import ReportHelpDialog from './ReportHelpDialog';

interface ReportHelpButtonProps {
  reportId: string | undefined;
  reportTitle?: string;
  className?: string;
}

/**
 * Small "?" help icon (same pattern as Dora/PR reports). Only renders if reportId has help content.
 * Click opens ReportHelpDialog with one-sentence description and edge cases.
 */
export default function ReportHelpButton({
  reportId,
  reportTitle,
  className = '',
}: ReportHelpButtonProps) {
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const getHeaderRect = useContext(ReportCardHeaderRectContext);
  const hasHelp = reportId && REPORT_IDS_WITH_HELP.includes(reportId);

  if (!hasHelp) return null;

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAnchorRect(getHeaderRect?.() ?? null);
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-content-tertiary hover:text-content-primary ${className}`}
        aria-label="Report help"
        title="How this report works"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
      <ReportHelpDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        reportId={reportId}
        reportTitle={reportTitle}
        anchorRect={anchorRect}
      />
    </>
  );
}
