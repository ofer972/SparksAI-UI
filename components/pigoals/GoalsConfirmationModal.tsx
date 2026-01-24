import React from 'react';

interface GoalsConfirmationModalProps {
 isOpen: boolean;
 onClose: () => void;
 onConfirm: () => void;
 title: string;
 message: string | React.ReactNode;
 confirmButtonText?: string;
 variant?: 'info' | 'danger';
 isLoading?: boolean;
}

export default function GoalsConfirmationModal({
 isOpen,
 onClose,
 onConfirm,
 title,
 message,
 confirmButtonText = 'Confirm',
 variant = 'info',
 isLoading = false,
}: GoalsConfirmationModalProps) {
 if (!isOpen) return null;

 const iconBgColor = variant === 'danger' ? 'bg-danger-bg' : 'bg-brand/20';
 const iconTextColor = variant === 'danger' ? 'text-danger-text' : 'text-brand';
 const buttonColor = variant === 'danger' ? 'bg-red-600 dark:bg-red-700 hover:bg-red-700 hover:bg-red-600' : 'bg-brand hover:bg-brand-hover';

 return (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
 <div className="bg-surface rounded-lg shadow-xl max-w-md w-full mx-4">
 <div className="p-6">
 {/* Header */}
 <div className="flex items-center justify-center mb-4">
 <div className={`w-12 h-12 ${iconBgColor} rounded-full flex items-center justify-center`}>
 {variant === 'danger' ? (
 <svg className={`w-6 h-6 ${iconTextColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
 </svg>
 ) : (
 <svg className={`w-6 h-6 ${iconTextColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 )}
 </div>
 </div>

 {/* Content */}
 <div className="text-center">
 <h3 className="text-lg font-semibold text-content-primary mb-2">
 {title}
 </h3>
 <div className="text-sm text-content-tertiary mb-6">
 {message}
 </div>

 {/* Action Buttons */}
 <div className="flex gap-2">
 <button
 onClick={onClose}
 disabled={isLoading}
 className="flex-1 bg-gray-600 bg-surface-elevated text-white py-2 px-4 rounded-lg hover:bg-gray-700 hover:bg-surface-secondary transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Cancel
 </button>
 <button
 onClick={onConfirm}
 disabled={isLoading}
 className={`flex-1 ${buttonColor} text-white py-2 px-4 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
 >
 {isLoading ? 'Processing...' : confirmButtonText}
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

