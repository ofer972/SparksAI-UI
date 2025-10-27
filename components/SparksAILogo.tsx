'use client';

import React from 'react';
import Image from 'next/image';

interface SparksAILogoProps {
  collapsed?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function SparksAILogo({ collapsed = false, size = 'medium' }: SparksAILogoProps) {
  const sizeClasses = {
    small: 'w-12 h-12',    // 50% bigger: 8*1.5 = 12
    medium: 'w-18 h-18',   // 50% bigger: 12*1.5 = 18
    large: 'w-24 h-24'     // 50% bigger: 16*1.5 = 24
  };

  // Hide the logo when sidebar is collapsed
  if (collapsed) {
    return null;
  }

  return (
    <div className="flex items-center justify-center w-full">
      <div className={`${sizeClasses[size]} relative`}>
        <Image
          src="/SparksAI.png"
          alt="SparksAI Logo"
          width={size === 'small' ? 48 : size === 'medium' ? 72 : 96}
          height={size === 'small' ? 48 : size === 'medium' ? 72 : 96}
          className="w-full h-full object-contain"
          priority
          onError={(e) => {
            // Fallback to a simple text logo if image fails to load
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <div className="hidden w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 rounded-full text-white font-bold text-xs">
          SA
        </div>
      </div>
    </div>
  );
}
