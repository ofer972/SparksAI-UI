'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ReportDefinition } from '@/lib/config';

interface AddReportsModalProps {
 isOpen: boolean;
 onClose: () => void;
 availableReports: ReportDefinition[];
 currentReportIds: string[];
 onUpdateReports: (reportIds: string[]) => void;
}

export default function AddReportsModal({
 isOpen,
 onClose,
 availableReports,
 currentReportIds,
 onUpdateReports,
}: AddReportsModalProps) {
 // Initialize with currently displayed reports
 const [selectedReports, setSelectedReports] = useState<Set<string>>(() => new Set(currentReportIds));

 // Prevent immediate close on mobile
 const [justOpened, setJustOpened] = useState(false);

 // Track if modal was previously open to avoid resetting selection during interaction
 const prevIsOpenRef = useRef(isOpen);

 // Reset selection only when modal transitions from closed to open
 useEffect(() => {
 const wasJustOpened = !prevIsOpenRef.current && isOpen;
 prevIsOpenRef.current = isOpen;
 
 if (wasJustOpened) {
 console.log('AddReportsModal: Modal opened, initializing selection');
 setSelectedReports(new Set(currentReportIds));
 // Lock body scroll on mobile when modal is open
 document.body.style.overflow = 'hidden';
 // Set flag to prevent immediate close
 setJustOpened(true);
 setTimeout(() => setJustOpened(false), 300);
 } else if (!isOpen) {
 // Restore body scroll when modal closes
 document.body.style.overflow = '';
 setJustOpened(false);
 }
 
 return () => {
 if (!isOpen) {
 document.body.style.overflow = '';
 }
 };
 }, [isOpen]); // Removed currentReportIds from dependencies

 const handleToggle = (reportId: string) => {
 console.log('AddReportsModal: handleToggle called for reportId:', reportId);
 setSelectedReports((prev) => {
 const next = new Set(prev);
 if (next.has(reportId)) {
 console.log('AddReportsModal: Removing report:', reportId);
 next.delete(reportId);
 } else {
 console.log('AddReportsModal: Adding report:', reportId);
 next.add(reportId);
 }
 console.log('AddReportsModal: New selection:', Array.from(next));
 return next;
 });
 };

 const handleApply = () => {
 onUpdateReports(Array.from(selectedReports));
 onClose();
 };

 console.log('AddReportsModal: Render called, isOpen:', isOpen);
 
 if (!isOpen) {
 console.log('AddReportsModal: Modal is closed, not rendering', { isOpen });
 return null;
 }

 console.log('AddReportsModal: Modal IS OPEN - Rendering modal - SHOULD BE VISIBLE NOW');
 console.log('Available reports:', availableReports.length);
 console.log('Available reports details:', availableReports.map(r => ({ id: r.report_id, name: r.report_name })));
 console.log('Current report IDs:', currentReportIds);
 console.log('Selected reports:', Array.from(selectedReports));

 const handleBackdropClick = (e: React.MouseEvent) => {
 // Prevent immediate close on mobile (touch events can trigger click immediately)
 if (justOpened) {
 console.log('AddReportsModal: Prevented immediate close (just opened)');
 return;
 }
 console.log('AddReportsModal: Backdrop clicked, closing modal');
 onClose();
 };

 return (
 <div 
 className="fixed inset-0 flex items-center justify-center p-4" 
 onClick={handleBackdropClick}
 style={{ 
 position: 'fixed', 
 top: 0, 
 left: 0, 
 right: 0, 
 bottom: 0,
 zIndex: 999999,
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 backgroundColor: 'rgba(0, 0, 0, 0.5)'
 }}
 >
 <div
 className="bg-surface rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] md:max-h-[80vh] flex flex-col relative"
 onClick={(e) => e.stopPropagation()}
 style={{ zIndex: 1000000 }}
 >
 {/* Header */}
 <div className="px-6 py-4 border-b border-outline flex items-center justify-between flex-shrink-0">
 <h2 className="text-lg font-semibold text-content-primary">Manage Dashboard Reports</h2>
 <button
 onClick={onClose}
 className="text-content-muted hover:text-content-secondary dark:hover:text-slate-300 transition-colors"
 aria-label="Close"
 >
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>

 {/* Content */}
 <div className="flex-1 overflow-auto p-6">
 <div className="space-y-2">
 {availableReports.length === 0 ? (
 <div className="text-center text-content-muted py-8">
 No reports available
 </div>
 ) : (
 availableReports.map((report) => {
 const isChecked = selectedReports.has(report.report_id);
 const isCurrentlyDisplayed = currentReportIds.includes(report.report_id);
 
 return (
 <div
 key={report.report_id}
 className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
 isChecked 
 ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/30' 
 : 'border-outline hover:bg-surface-elevated hover:border-outline-strong'
 }`}
 onClick={() => {
 console.log('AddReportsModal: Div clicked for report:', report.report_id);
 handleToggle(report.report_id);
 }}
 >
 <input
 type="checkbox"
 checked={isChecked}
 onChange={() => {}}
 readOnly
 className="mt-1 h-4 w-4 text-brand focus:ring-brand border-outline-strong rounded cursor-pointer pointer-events-none"
 />
 <div className="flex-1">
 <div className="font-semibold text-content-primary flex items-center gap-2">
 {report.report_name}
 {isCurrentlyDisplayed && (
 <span className="text-xs text-positive-text bg-green-100 dark:bg-green-950/40 px-2 py-0.5 rounded">
 ✓ On Dashboard
 </span>
 )}
 </div>
 {report.description && (
 <div className="text-sm text-content-muted mt-1">{report.description}</div>
 )}
 <div className="text-xs text-content-muted mt-1">
 Type: {report.chart_type}
 </div>
 </div>
 </div>
 );
 })
 )}
 </div>
 </div>

 {/* Footer */}
 <div className="px-6 py-4 border-t border-outline flex items-center justify-between flex-shrink-0">
 <div className="text-sm text-content-tertiary">
 {selectedReports.size} report{selectedReports.size !== 1 ? 's' : ''} selected
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={onClose}
 className="px-4 py-2 border border-outline-strong text-content-secondary rounded-lg hover:bg-surface-elevated transition-colors text-sm font-medium"
 >
 Cancel
 </button>
 <button
 onClick={handleApply}
 className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors text-sm font-medium"
 >
 Apply Changes
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}

