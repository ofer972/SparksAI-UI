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
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative bg-gradient-to-b from-gray-50 to-white rounded-3xl shadow-2xl w-full max-w-xs overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Content */}
        <div className="px-10 py-8">
          {/* Logo Icon */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center p-3">
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
          <h3 className="text-xl font-semibold text-gray-800 text-center mb-3 leading-tight">
            Want to save your changes?
          </h3>
          
          {/* Message */}
          <p className="text-[15px] text-gray-600 text-center mb-8 leading-relaxed">
            Your changes will be lost if you don't save them.
          </p>
          
          {/* Actions */}
          <div className="flex flex-col gap-3">
            {/* Save Button */}
            <button
              onClick={onSave}
              className="w-full px-6 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg transition-colors duration-150 font-medium text-[15px]"
            >
              Save
            </button>
            
            {/* Don't Save Button */}
            <button
              onClick={onDiscard}
              className="w-full px-6 py-3.5 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-800 rounded-lg transition-colors duration-150 font-medium text-[15px]"
            >
              Don't Save
            </button>
            
            {/* Cancel Button */}
            <button
              onClick={onCancel}
              className="w-full px-6 py-3.5 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-800 rounded-lg transition-colors duration-150 font-medium text-[15px]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

