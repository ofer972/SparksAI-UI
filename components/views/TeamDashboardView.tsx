'use client';

import React from 'react';
import TeamDashboard from '@/components/TeamDashboard';

interface TeamDashboardViewProps {
  selectedTeam: string;
  selectedTreeType: 'team' | 'group';
  selectedTreeValue: string | null;
}

export default function TeamDashboardView({
  selectedTeam,
  selectedTreeType,
  selectedTreeValue,
}: TeamDashboardViewProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <TeamDashboard 
          selectedTeam={selectedTeam} 
          selectedTreeType={selectedTreeType}
          selectedTreeValue={selectedTreeValue}
        />
      </div>
    </div>
  );
}

