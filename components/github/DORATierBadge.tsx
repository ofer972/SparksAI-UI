'use client';

interface DORATierBadgeProps {
  tier: string; // 'elite' | 'high' | 'medium' | 'low' - from backend
  tierLabel: string; // From backend
  onClick: () => void;
}

export default function DORATierBadge({ tier, tierLabel, onClick }: DORATierBadgeProps) {
  // Frontend maps tier to colors (NOT from backend)
  const tierColors = {
    elite: { background: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    high: { background: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    medium: { background: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
    low: { background: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  };

  const colors = tierColors[tier as keyof typeof tierColors] || tierColors.low;

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity ${colors.background} ${colors.text} ${colors.border}`}
    >
      {tierLabel.toUpperCase()}
    </button>
  );
}



