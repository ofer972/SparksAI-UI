'use client';

import React from 'react';
import Image from 'next/image';

interface SparksAILogoProps {
  collapsed?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function SparksAILogo({ collapsed = false, size = 'medium' }: SparksAILogoProps) {
  const sizeClasses = {
    small: 'w-16 h-16',    // 64px
    medium: 'w-28 h-28',   // 112px - bigger and clearer
    large: 'w-32 h-32'     // 128px
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
          width={size === 'small' ? 64 : size === 'medium' ? 112 : 128}
          height={size === 'small' ? 64 : size === 'medium' ? 112 : 128}
          className="w-full h-full object-contain"
          quality={100}
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
