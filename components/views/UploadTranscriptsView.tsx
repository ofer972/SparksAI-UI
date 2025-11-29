'use client';

import React from 'react';
import UploadTranscripts from '@/components/UploadTranscripts';

interface UploadTranscriptsViewProps {
  selectedTeam: string;
  selectedPI: string;
  onTeamChange: (team: string) => void;
  onPIChange: (pi: string) => void;
}

export default function UploadTranscriptsView({
  selectedTeam,
  selectedPI,
  onTeamChange,
  onPIChange,
}: UploadTranscriptsViewProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <UploadTranscripts 
          selectedTeam={selectedTeam} 
          selectedPI={selectedPI}
          onTeamChange={onTeamChange}
          onPIChange={onPIChange}
        />
      </div>
    </div>
  );
}

