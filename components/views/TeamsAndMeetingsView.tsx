'use client';

import { useState } from 'react';
import TeamManagementTab from '../TeamManagementTab';
import MeetingsManagementTab from '../MeetingsManagementTab';

export default function TeamsAndMeetingsView() {
 const [activeTab, setActiveTab] = useState<'teams' | 'meetings'>('teams');

 const tabs = [
 {
 id: 'teams',
 label: 'Team Management',
 icon: (
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
 </svg>
 ),
 },
 {
 id: 'meetings',
 label: 'Teams Meetings',
 icon: (
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
 </svg>
 ),
 },
 ];

 return (
 <div className="h-full flex flex-col px-4 md:px-6">
 {/* Tab Navigation */}
 <div className="flex-shrink-0 mt-4">
 <div className="px-4 md:pl-0 md:pr-6">
 {/* Mobile: 3 tabs per row grid */}
 <nav className="grid grid-cols-2 gap-1 md:hidden">
 {tabs.map((tab) => {
 const isActive = activeTab === tab.id;
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as 'teams' | 'meetings')}
 className={`
 flex flex-col items-center justify-center px-2 py-2 text-xs font-medium rounded-t-lg border transition-colors
 ${isActive ? 'bg-surface text-brand border-x border-t border-outline-strong border-b-white border-b-surface -mb-px relative z-10' : 'bg-surface-elevated text-content-tertiary border border-outline hover:bg-surface-secondary hover:bg-surface-secondary'}
 `}
 >
 <span className="mb-1">{tab.icon}</span>
 <span className="truncate text-center leading-tight">{tab.label}</span>
 </button>
 );
 })}
 </nav>

 {/* Desktop: single row */}
 <nav className="hidden md:flex md:flex-nowrap gap-1 md:justify-start">
 {tabs.map((tab) => {
 const isActive = activeTab === tab.id;
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as 'teams' | 'meetings')}
 className={`
 flex items-center px-4 py-2.5 text-sm font-medium rounded-t-lg border transition-colors whitespace-nowrap
 ${isActive ? 'bg-surface text-brand border-x border-t border-outline-strong border-b-white border-b-surface -mb-px relative z-10' : 'bg-surface-elevated text-content-tertiary border border-outline hover:bg-surface-secondary hover:bg-surface-secondary'}
 `}
 >
 <span className="mr-2">{tab.icon}</span>
 <span>{tab.label}</span>
 </button>
 );
 })}
 </nav>
 </div>
 </div>

 {/* Tab Content */}
 <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-surface border border-outline-strong rounded-tr-lg rounded-b-lg shadow-sm mb-4">
 <div className="flex-1 overflow-hidden flex flex-col min-h-0 p-4 md:p-6">
 {activeTab === 'teams' ? (
 <TeamManagementTab />
 ) : (
 <MeetingsManagementTab />
 )}
 </div>
 </div>
 </div>
 );
}
