'use client';

import React from 'react';

type TileSize = 'kube' | 'medium' | 'large' | 'wide';

export type HomeTileProps = {
 title: string;
 subtitle?: string;
 value?: string;
 delta?: {
 value: string;
 direction: 'up' | 'down' | 'flat';
 label?: string;
 };
 hint?: string;
 icon?: React.ReactNode;
 size?: TileSize;
 tone?: 'neutral' | 'info' | 'success' | 'warning';
 onClick?: () => void;
};

const toneStyles: Record<NonNullable<HomeTileProps['tone']>, string> = {
 neutral: 'bg-surface border-outline hover:border-outline-strong',
 info: 'bg-gradient-to-br from-white to-blue-50 from-surface dark:to-blue-950/40 border-blue-200/60 dark:border-blue-800/60 hover:border-blue-300/60 dark:hover:border-blue-700/60',
 success: 'bg-gradient-to-br from-white to-emerald-50 from-surface dark:to-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60 hover:border-emerald-300/60 dark:hover:border-emerald-700/60',
 warning: 'bg-gradient-to-br from-white to-amber-50 from-surface dark:to-amber-950/40 border-amber-200/60 dark:border-amber-800/60 hover:border-amber-300/60 dark:hover:border-amber-700/60',
};

const sizeStyles: Record<TileSize, string> = {
 kube: 'col-span-6 sm:col-span-4 lg:col-span-3',
 medium: 'col-span-12 sm:col-span-6 lg:col-span-4',
 large: 'col-span-12 lg:col-span-6',
 wide: 'col-span-12',
};

export default function HomeTile({
 title,
 subtitle,
 value,
 delta,
 hint,
 icon,
 size = 'medium',
 tone = 'neutral',
 onClick,
}: HomeTileProps) {
 const clickable = typeof onClick === 'function';

 return (
 <button
 type="button"
 onClick={onClick}
 disabled={!clickable}
 className={[
 sizeStyles[size],
 'group relative w-full text-left rounded-2xl border shadow-sm transition-all duration-200',
 toneStyles[tone],
 clickable
 ? 'hover:shadow-md hover:-translate-y-[1px] active:translate-y-0'
 : 'opacity-80 cursor-default',
 'focus:outline-none focus:ring-2 focus:ring-brand',
 ].join(' ')}
 title={clickable ? `Open ${title}` : title}
 aria-label={clickable ? `Open ${title}` : title}
 >
 <div className="p-4">
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0">
 <div className="flex items-center gap-2 min-w-0">
 {icon ? (
 <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface/70 bg-surface-elevated/70 border border-outline text-content-secondary flex-shrink-0">
 {icon}
 </span>
 ) : null}
 <div className="min-w-0">
 <div className="text-sm font-semibold text-content-primary truncate">{title}</div>
 {subtitle ? (
 <div className="text-xs text-content-tertiary truncate">{subtitle}</div>
 ) : null}
 </div>
 </div>
 </div>

 {clickable ? (
 <span className="text-content-muted group-hover:text-content-secondary dark:group-hover:text-content-muted transition-colors flex-shrink-0">
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
 </svg>
 </span>
 ) : null}
 </div>

 <div className="mt-3">
 {value ? (
 <div className="text-2xl font-semibold tracking-tight text-content-primary">{value}</div>
 ) : (
 <div className="h-7 w-24 rounded-md bg-surface-secondary border border-outline animate-pulse" />
 )}

 {delta ? (
 <div className="mt-2 flex items-center gap-2">
 <span
 className={[
 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border',
 delta.direction === 'up'
 ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 text-emerald-400 border-emerald-200 dark:border-emerald-700'
 : delta.direction === 'down'
 ? 'bg-danger-bg text-red-700 text-red-400 border-red-200 dark:border-red-700'
 : 'bg-surface-elevated/50 text-content-secondary border-outline',
 ].join(' ')}
 >
 {delta.direction === 'up' ? (
 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M7 14l5-5 5 5" />
 </svg>
 ) : delta.direction === 'down' ? (
 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M7 10l5 5 5-5" />
 </svg>
 ) : (
 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
 </svg>
 )}
 <span>{delta.value}</span>
 </span>
 <span className="text-[11px] text-content-muted">{delta.label ?? 'vs prev period'}</span>
 </div>
 ) : hint ? (
 <div className="mt-1 text-xs text-content-tertiary">{hint}</div>
 ) : (
 <div className="mt-2 h-3 w-40 rounded bg-surface-secondary border border-outline animate-pulse" />
 )}
 </div>
 </div>
 </button>
 );
}

