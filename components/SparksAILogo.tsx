'use client';

import React from 'react';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';

interface SparksAILogoProps {
  collapsed?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function SparksAILogo({ collapsed = false, size = 'medium' }: SparksAILogoProps) {
  const { theme } = useTheme();
  const sizeClasses = {
    small: 'w-20 h-20',    // 80px (was 64px)
    medium: 'w-[100px] h-[40px]',   // 100px x 40px (was 80x32)
    large: 'w-40 h-40'     // 160px (was 128px)
  };

  // Determine which logo to use based on theme
  const isDarkTheme = theme === 'midnight' || theme === 'dark';
  const logoSource = isDarkTheme ? '/SparksAIBlack.png' : '/SparksAI.png';

  // Determine which collapsed icon to use based on theme
  const collapsedLogoSource = isDarkTheme ? '/logoblack.png' : '/logowhite.png';

  // Show icon logo when sidebar is collapsed
  if (collapsed) {
    return (
      <div className="w-10 h-10 relative">
        <Image
          src={collapsedLogoSource}
          alt="SparksAI"
          width={40}
          height={40}
          className="w-full h-full object-contain"
          quality={100}
          priority
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} relative`}>
        <Image
          src={logoSource}
          alt="SparksAI Logo"
          width={size === 'small' ? 80 : size === 'medium' ? 100 : 160}
          height={size === 'small' ? 80 : size === 'medium' ? 40 : 160}
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
  );
}
