'use client';

import React, { useState } from 'react';
import AICards from '@/components/AICards';
import SprintKPIs, { type KPIDashboardData } from '@/components/SprintKPIs';
import PIMetrics from '@/components/PIMetrics';

interface TeamAIInsightsViewProps {
 selectedPI?: string;
 selectedTeam: string;
 selectedTreeType: 'team' | 'group';
 selectedCategories: string[];
 isLoading: boolean;
 isReady: boolean;
 onOpenKPIDashboard?: (data: KPIDashboardData) => void;
}

export default function TeamAIInsightsView({
 selectedPI,
 selectedTeam,
 selectedTreeType,
 selectedCategories,
 isLoading,
 isReady,
 onOpenKPIDashboard,
}: TeamAIInsightsViewProps) {
 const [mobileMetricsTab, setMobileMetricsTab] = useState<'team' | 'pi'>('team');
 
 // Auto-switch mobile tabs based on which filters are available
 React.useEffect(() => {
 // If only PI is selected (no team), switch to PI tab
 if (selectedPI && !selectedTeam) {
 setMobileMetricsTab('pi');
 }
 // If team is selected, switch to team tab (prioritize team over PI)
 else if (selectedTeam) {
 setMobileMetricsTab('team');
 }
 }, [selectedTeam, selectedPI]);
 // Wait for settings to load before rendering to avoid fetching with wrong team
 if (!isReady || isLoading) {
 return (
 <div className="flex items-center justify-center h-full min-h-[400px]">
 <div className="text-center px-4">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4"></div>
 <p className="text-content-tertiary">Loading team insights...</p>
 </div>
 </div>
 );
 }
 
 // Check if no PI, team, or group is selected (after settings are loaded)
 const noPISelected = !selectedPI || 
 selectedPI.trim() === '' || 
 selectedPI === 'Select PI';
 
 const noTeamSelected = !selectedTeam || 
 selectedTeam.trim() === '' || 
 selectedTeam === 'Select team or group' ||
 selectedTeam.trim() === 'Select team or group';
 
 // Only show error if ALL filters are empty (no PI, no team, no group)
 if (noPISelected && noTeamSelected) {
 return (
 <div className="flex items-center justify-center h-full min-h-[400px]">
 <div className="text-center px-4">
 <div className="text-6xl mb-4">👥</div>
 <h2 className="text-2xl font-semibold text-content-primary mb-2">Select a Team or a Group or PI</h2>
 <p className="text-content-tertiary max-w-md mx-auto">
 Please select a team, group, or PI from the dropdown above to view AI insights and metrics.
 </p>
 </div>
 </div>
 );
 }
 
 return (
 <>
 <div className="pt-2 pb-2 pr-2 pl-[7px]" style={{ zoom: 0.90 }}>
 <AICards 
 piName={selectedPI}
 teamName={selectedTeam} 
 categories={selectedCategories.length > 0 ? selectedCategories : undefined}
 isGroup={selectedTreeType === 'group'}
 />
 </div>
 {/* Metrics on mobile with tabs - inline after content */}
 {(selectedTeam || selectedPI) && (
 <div className="md:hidden mt-4 bg-transparent" style={{ overflow: 'visible' }}>
 {/* Tabs */}
 <div className="flex space-x-1 bg-transparent px-3 pt-2">
 {selectedTeam && (
 <button
 onClick={() => setMobileMetricsTab('team')}
 className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-t-lg border transition-colors whitespace-nowrap ${
 mobileMetricsTab === 'team'
 ? 'bg-surface text-brand border-x border-t border-outline-strong border-b-white border-b-surface -mb-px relative z-10'
 : 'bg-surface-elevated text-content-tertiary border border-outline hover:bg-surface-secondary hover:bg-surface-secondary'
 }`}
 >
 Sprint Metrics
 </button>
 )}
 {selectedPI && (
 <button
 onClick={() => setMobileMetricsTab('pi')}
 className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-t-lg border transition-colors whitespace-nowrap ${
 mobileMetricsTab === 'pi'
 ? 'bg-surface text-brand border-x border-t border-outline-strong border-b-white border-b-surface -mb-px relative z-10'
 : 'bg-surface-elevated text-content-tertiary border border-outline hover:bg-surface-secondary hover:bg-surface-secondary'
 }`}
 >
 PI Metrics
 </button>
 )}
 </div>
 
 {/* Metrics Content */}
 <div className="border-t border-outline-strong" style={{ zoom: 0.90, overflow: 'visible' }}>
 <div className="px-3 py-2 bg-surface" style={{ overflow: 'visible' }}>
                {mobileMetricsTab === 'team' && selectedTeam ? (
                  <SprintKPIs 
                    teamName={selectedTeam} 
                    isGroup={selectedTreeType === 'group'} 
                    singleRowLayout={true}
                    onOpenKPIDashboard={onOpenKPIDashboard}
                    selectedMetrics={['sprint_velocity', 'sprint_predictability', 'sprint_wip', 'sprint_completion', 'sprint_days_left']}
                    layout="wide"
                  />
                ) : mobileMetricsTab === 'pi' && selectedPI ? (
 <PIMetrics piName={selectedPI} teamName={selectedTeam} isGroup={selectedTreeType === 'group'} singleRowLayout={true} />
 ) : null}
 </div>
 </div>
 </div>
 )}
 </>
 );
}

