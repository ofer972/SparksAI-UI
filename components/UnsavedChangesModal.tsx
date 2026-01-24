import React from 'react';
import Image from 'next/image';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export default function UnsavedChangesModal({
  isOpen,
  onSave,
  onDiscard,
  onCancel,
}: UnsavedChangesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative bg-gradient-to-b from-surface to-surface-elevated rounded-3xl shadow-2xl border-2 border-outline w-full max-w-xs overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Content */}
        <div className="px-6 py-8">
          {/* Logo Icon */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-surface-elevated rounded-2xl shadow-lg border border-outline flex items-center justify-center p-3">
              <div className="w-full h-full relative">
                <Image
                  src="/SparksAI.png"
                  alt="SparksAI"
                  width={80}
                  height={32}
                  className="w-full h-full object-contain"
                  quality={100}
                  priority
                />
              </div>
            </div>
          </div>
          
          {/* Title */}
          <h3 className="text-xl font-semibold text-content-primary text-center mb-3 leading-tight">
            Want to save your changes?
          </h3>
          
          {/* Message */}
          <p className="text-[15px] text-content-secondary text-center mb-8 leading-relaxed">
            Your changes will be lost if you don't save them.
          </p>
          
          {/* Actions */}
          <div className="flex flex-col gap-3">
            {/* Save Button */}
            <button
              onClick={onSave}
              className="w-full px-6 py-2 bg-brand hover:bg-brand-hover active:bg-brand/90 text-white rounded-lg transition-colors duration-150 font-medium text-[15px] shadow-sm"
            >
              Save
            </button>
            
            {/* Don't Save Button */}
            <button
              onClick={onDiscard}
              className="w-full px-6 py-2 bg-surface-secondary hover:bg-surface-tertiary active:bg-outline text-content-primary rounded-lg transition-colors duration-150 font-medium text-[15px] border border-outline-strong"
            >
              Don't Save
            </button>
            
            {/* Cancel Button */}
            <button
              onClick={onCancel}
              className="w-full px-6 py-2 bg-surface-secondary hover:bg-surface-tertiary active:bg-outline text-content-primary rounded-lg transition-colors duration-150 font-medium text-[15px] border border-outline-strong"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

