'use client';

import React from 'react';
import SettingsScreen from '@/components/SettingsScreen';

export default function SystemSettingsView() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden min-h-0">
        <SettingsScreen />
      </div>
    </div>
  );
}

