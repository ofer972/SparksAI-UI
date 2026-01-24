'use client';

import React from 'react';

interface JiraSetupModalProps {
  isOpen: boolean;
  hasPermission: boolean;
  onConfirm: () => void;
  onClose?: () => void;
}

export default function JiraSetupModal({
  isOpen,
  hasPermission,
  onConfirm,
  onClose,
}: JiraSetupModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose || onConfirm}
      />
      
      {/* Modal */}
      <div className="relative bg-gradient-to-b from-gray-50 to-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Content */}
        <div className="px-6 py-8">
          {/* Icon */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          </div>
          
          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-800 text-center mb-3 leading-tight">
            {hasPermission ? 'JIRA Setup Required' : 'JIRA Configuration Needed'}
          </h3>
          
          {/* Message */}
          <p className="text-[15px] text-gray-600 text-center mb-8 leading-relaxed">
            {hasPermission 
              ? 'You need first to set up Jira. Please configure your JIRA connection settings to continue.'
              : 'JIRA setup is required. Please contact your administrator to configure JIRA settings.'}
          </p>
          
          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirm}
              className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg transition-colors duration-150 font-medium text-[15px]"
            >
              {hasPermission ? 'Go to Settings' : 'OK'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

