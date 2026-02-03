'use client';

import React, { useState, useRef, useCallback, useEffect as useEffectReact } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { ViewRecordModal } from '@/components/ViewRecordModal';
import { EntityConfig } from '@/lib/entityConfig';
import AIChatModal from '@/components/AIChatModal';
import { Recommendation } from '@/lib/config';

// Constants
const CARD_DESCRIPTION_MAX_LENGTH = 750;

interface AICard {
 id: number;
 updated_at: string;
 team_name: string;
 card_name: string;
 insight_type: string; // Changed from card_type to insight_type
 card_type?: string; // Keep for backward compatibility
 priority: string;
 priority_color?: string; // Color from backend:"Red","Yellow","Green","Gray"
 source: string;
 description: string;
 full_information: string;
 information_json?: string;
 recommendations?: Recommendation[];
 recommendations_count?: number;
}

interface AICardsInsightProps {
 cards: AICard[];
 loading: boolean;
 error: string | null;
 onRefetch: () => void;
 title?: string;
 emptyMessage?: string;
 config: EntityConfig<any>;
 chatType?: string; // Chat type for AI chat:"Team_insights" or"PI_insights"
 piName?: string; // PI name for PI insights context
 fullWidth?: boolean; // If true, cards take full width (single column) instead of 2-column grid
 showHeader?: boolean; // If false, don't show individual card headers (for use inside ReportCard)
}

// Map priority_color from backend to Tailwind CSS classes
const getPriorityColorFromColor = (priorityColor?: string) => {
 switch (priorityColor) {
 case 'Red':
 return {
 headerGradient: 'bg-gradient-to-r from-red-100 to-red-200 dark:from-red-950/40 dark:to-red-900/40',
 border: 'border-danger-border',
 iconBorder: 'border-red-500 dark:border-red-600',
 text: 'text-danger-text'
 };
 case 'Yellow':
 return {
 headerGradient: 'bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-amber-700/60 dark:to-amber-600/60',
 border: 'border-yellow-200 dark:border-amber-400',
 iconBorder: 'border-yellow-400 dark:border-amber-400',
 text: 'text-yellow-700 dark:text-amber-100'
 };
 case 'Green':
 return {
 headerGradient: 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-800/50 dark:to-green-700/50',
 border: 'border-positive-border',
 iconBorder: 'border-green-400 dark:border-green-500',
 text: 'text-green-700 dark:text-green-200'
 };
    default: // Gray or undefined
      return {
        headerGradient: 'bg-gradient-to-r from-surface to-surface-elevated',
        border: 'border-outline',
        iconBorder: 'border-outline-strong dark:border-slate-600',
 text: 'text-content-secondary'
 };
 }
};

// Fallback function for when priority_color is not available (uses priority string)
const getPriorityColor = (priority: string) => {
 switch (priority.toLowerCase()) {
 case 'critical':
 return {
 headerGradient: 'bg-gradient-to-r from-red-100 to-red-200 dark:from-red-950/40 dark:to-red-900/40',
 border: 'border-danger-border',
 iconBorder: 'border-red-500 dark:border-red-600',
 text: 'text-danger-text'
 };
 case 'high':
 return {
 headerGradient: 'bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-amber-700/60 dark:to-amber-600/60',
 border: 'border-yellow-200 dark:border-amber-400',
 iconBorder: 'border-yellow-400 dark:border-amber-400',
 text: 'text-yellow-700 dark:text-amber-100'
 };
 case 'medium':
 return {
 headerGradient: 'bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/40 dark:to-orange-900/40',
 border: 'border-orange-200 dark:border-orange-800',
 iconBorder: 'border-orange-400 dark:border-orange-600',
 text: 'text-orange-700 dark:text-orange-300'
 };
 case 'low':
 return {
 headerGradient: 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-800/50 dark:to-green-700/50',
 border: 'border-positive-border',
 iconBorder: 'border-green-400 dark:border-green-500',
 text: 'text-green-700 dark:text-green-200'
 };
    default:
      return {
        headerGradient: 'bg-gradient-to-r from-surface to-surface-elevated',
        border: 'border-outline',
        iconBorder: 'border-outline-strong dark:border-slate-600',
 text: 'text-content-secondary'
 };
 }
};

const getPriorityIcon = (priority: string) => {
 switch (priority.toLowerCase()) {
 case 'critical':
 return '🚨'; // Red alarm/siren icon
 case 'high':
 return '⚠️'; // Yellow warning triangle
 case 'medium':
 return '🟠'; // Orange circle
 case 'low':
 return '🟢'; // Green circle
 default:
 return '⚪'; // White circle
 }
};

// Get icon based on priority_color for header title
const getPriorityColorIcon = (priorityColor?: string) => {
 switch (priorityColor) {
 case 'Red':
 return '🚨'; // Red alarm/siren icon
 case 'Yellow':
 return '⚠️'; // Yellow warning triangle
 case 'Green':
 return '✅'; // Green checkmark
 default: // Gray or undefined
 return 'ℹ️'; // Info icon
 }
};

interface InformationItem {
 header: string;
 text: string;
}

const parseInformationJson = (jsonString: string | undefined): InformationItem[] | null => {
 if (!jsonString || jsonString.trim() === '') {
 return null;
 }
 
 try {
 const parsed = JSON.parse(jsonString);
 
 // Handle direct array
 if (Array.isArray(parsed)) {
 return parsed;
 }
 
 // Handle object - only extract DashboardSummary (or variations)
 if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
 // Look for DashboardSummary with flexible key matching
 const keys = Object.keys(parsed);
 const dashboardSummaryKey = keys.find(key => 
 key.toLowerCase().replace(/[_\s]/g, '') === 'dashboardsummary'
 );
 
 if (dashboardSummaryKey && Array.isArray(parsed[dashboardSummaryKey])) {
 return parsed[dashboardSummaryKey] as InformationItem[];
 }
 }
 
 return null;
 } catch (error) {
 console.error('Error parsing information_json:', error);
 return null;
 }
};

export default function AICardsInsight({ 
 cards, 
 loading, 
 error, 
 onRefetch,
 title ="AI Insights",
 emptyMessage ="No AI insights available at this time.",
 config,
 chatType ="Team_insights", // Default to Team_insights
 piName, // Optional PI name for PI insights
 fullWidth = false, // Default to 2-column grid
 showHeader = true // Default to showing headers
}: AICardsInsightProps) {
 // Removed view mode toggle - always use grid view

 // State for detail modal
 const [selectedCard, setSelectedCard] = useState<AICard | null>(null);
 const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

 // State for AI Chat modal
 const [isChatModalOpen, setIsChatModalOpen] = useState(false);
 const [selectedInsightId, setSelectedInsightId] = useState<number | null>(null);
 const [selectedTeamName, setSelectedTeamName] = useState<string>('');

 // Removed collapsed recommendations state - recommendations are always visible now
 
 // State for expanded"read more" tooltips per recommendation (recId -> boolean)
 const [expandedRecTooltips, setExpandedRecTooltips] = useState<Record<number, boolean>>({});
 
 // State for button positions per recommendation (recId -> {top, left})
 const [buttonPositions, setButtonPositions] = useState<Record<number, {top: number, left: number}>>({});
 
 // State for full information tooltip (cardId -> boolean)
 const [fullInfoTooltipOpen, setFullInfoTooltipOpen] = useState<Record<number, boolean>>({});
 
 // State for full information tooltip positions (cardId -> {top, left})
 const [fullInfoTooltipPositions, setFullInfoTooltipPositions] = useState<Record<number, {top: number, left: number}>>({});
 
 // Ref to store button elements for positioning
 const eyeIconRefs = useRef<Record<number, HTMLElement>>({});

 // Calculate tooltip position for a given card
 const calculateTooltipPosition = useCallback((cardId: number): { top: number; left: number } | null => {
 const buttonElement = eyeIconRefs.current[cardId];
 if (!buttonElement) return null;
 
 const tooltipWidth = 500; // Fixed tooltip width
 const tooltipHeight = 400; // Fixed tooltip height
 const viewportWidth = window.innerWidth;
 const viewportHeight = window.innerHeight;
 const padding = 10; // Padding from screen edges
 const gap = 10; // Gap between icon and tooltip
 
 const rect = buttonElement.getBoundingClientRect();
 const iconCenterX = rect.left + rect.width / 2;
 
 // Calculate horizontal position (centered on icon)
 let left = iconCenterX - tooltipWidth / 2;
 
 // Adjust if tooltip would go off right edge
 if (left + tooltipWidth > viewportWidth - padding) {
 left = viewportWidth - tooltipWidth - padding;
 }
 
 // Adjust if tooltip would go off left edge
 if (left < padding) {
 left = padding;
 }
 
 // Calculate vertical position - check if there's space below first
 const spaceBelow = viewportHeight - rect.bottom - gap;
 const spaceAbove = rect.top - gap;
 
 let top: number;
 
 // If there's enough space below, position below the icon
 if (spaceBelow >= tooltipHeight) {
 top = rect.bottom + gap;
 // Ensure it doesn't go off bottom
 if (top + tooltipHeight > viewportHeight - padding) {
 top = viewportHeight - tooltipHeight - padding;
 }
 } 
 // If not enough space below but enough space above, position above
 else if (spaceAbove >= tooltipHeight) {
 top = rect.top - tooltipHeight - gap;
 // Ensure it doesn't go off top
 if (top < padding) {
 top = padding;
 }
 }
 // If neither has enough space, choose the side with more space
 else {
 if (spaceBelow >= spaceAbove) {
 // Position below, but adjust to fit
 top = rect.bottom + gap;
 if (top + tooltipHeight > viewportHeight - padding) {
 top = viewportHeight - tooltipHeight - padding;
 }
 if (top < padding) {
 top = padding;
 }
 } else {
 // Position above, but adjust to fit
 top = rect.top - tooltipHeight - gap;
 if (top < padding) {
 top = padding;
 }
 if (top + tooltipHeight > viewportHeight - padding) {
 top = viewportHeight - tooltipHeight - padding;
 }
 }
 }
 
 // Final boundary checks
 if (top < padding) {
 top = padding;
 }
 if (top + tooltipHeight > viewportHeight - padding) {
 top = viewportHeight - tooltipHeight - padding;
 }
 if (left < padding) {
 left = padding;
 }
 if (left + tooltipWidth > viewportWidth - padding) {
 left = viewportWidth - tooltipWidth - padding;
 }
 
 return { top, left };
 }, []);

 // Toggle full information tooltip
 const toggleFullInfoTooltip = (cardId: number, event?: React.MouseEvent) => {
 if (event) {
 event.stopPropagation();
 }
 
 setFullInfoTooltipOpen(prev => {
 const isCurrentlyOpen = prev[cardId];
 const newState = { ...prev };
 
 if (isCurrentlyOpen) {
 delete newState[cardId];
 delete eyeIconRefs.current[cardId];
 setFullInfoTooltipPositions(prevPos => {
 const newPos = { ...prevPos };
 delete newPos[cardId];
 return newPos;
 });
 } else {
 newState[cardId] = true;
 
 // Calculate position
 const position = calculateTooltipPosition(cardId);
 if (position) {
 setFullInfoTooltipPositions(prevPos => ({
 ...prevPos,
 [cardId]: position
 }));
 }
 }
 
 return newState;
 });
 };

 // Handle click outside to close tooltips
 useEffectReact(() => {
 const handleClickOutside = (event: MouseEvent) => {
 // Check if any tooltip is open
 const hasOpenTooltips = Object.values(expandedRecTooltips).some(isOpen => isOpen);
 const hasOpenFullInfoTooltips = Object.values(fullInfoTooltipOpen).some(isOpen => isOpen);
 
 if (hasOpenTooltips || hasOpenFullInfoTooltips) {
 // Check if the click target is not inside any tooltip or"see more" button
 const target = event.target as HTMLElement;
 const isInsideTooltip = target.closest('[data-tooltip-content]');
 const isInsideButton = target.closest('[data-tooltip-button]');
 
 if (!isInsideTooltip && !isInsideButton) {
 // Close all tooltips
 setExpandedRecTooltips({});
 setButtonPositions({});
 setFullInfoTooltipOpen({});
 setFullInfoTooltipPositions({});
 }
 }
 };

 document.addEventListener('mousedown', handleClickOutside);
 return () => {
 document.removeEventListener('mousedown', handleClickOutside);
 };
 }, [expandedRecTooltips, fullInfoTooltipOpen]);

 // Handle scroll to recalculate tooltip positions
 useEffectReact(() => {
 const handleScroll = () => {
 // Recalculate positions for all open tooltips
 const openTooltipIds = Object.keys(fullInfoTooltipOpen)
 .filter(cardId => fullInfoTooltipOpen[Number(cardId)])
 .map(Number);
 
 if (openTooltipIds.length > 0) {
 const newPositions: Record<number, { top: number; left: number }> = {};
 
 openTooltipIds.forEach(cardId => {
 const position = calculateTooltipPosition(cardId);
 if (position) {
 newPositions[cardId] = position;
 }
 });
 
 if (Object.keys(newPositions).length > 0) {
 setFullInfoTooltipPositions(prevPos => ({
 ...prevPos,
 ...newPositions
 }));
 }
 }
 };

 window.addEventListener('scroll', handleScroll, true); // Use capture phase to catch all scrolls
 window.addEventListener('resize', handleScroll);
 
 return () => {
 window.removeEventListener('scroll', handleScroll, true);
 window.removeEventListener('resize', handleScroll);
 };
 }, [fullInfoTooltipOpen, calculateTooltipPosition]);

 
 
 const toggleRecTooltip = (recId: number, buttonElement?: HTMLButtonElement) => {
 // Store button position when opening
 if (buttonElement && !expandedRecTooltips[recId]) {
 const rect = buttonElement.getBoundingClientRect();
 setButtonPositions(prev => ({
 ...prev,
 [recId]: {
 top: rect.bottom + window.scrollY,
 left: rect.left + window.scrollX
 }
 }));
 }
 
 setExpandedRecTooltips(prev => ({
 ...prev,
 [recId]: !prev[recId]
 }));
 };
 
 const isRecTooltipExpanded = (recId: number) => {
 return expandedRecTooltips[recId] || false;
 };

 const handleAIChat = (card: AICard) => {
 setSelectedInsightId(card.id);
 // For PI insights, use card.team_name if available, otherwise empty
 // team_name might still be present in PI cards, but selected_pi will be used
 setSelectedTeamName(card.team_name || '');
 setIsChatModalOpen(true);
 };

 const closeChatModal = () => {
 setIsChatModalOpen(false);
 setSelectedInsightId(null);
 setSelectedTeamName('');
 };

 const handleViewCard = (card: AICard) => {
 setSelectedCard(card);
 setIsDetailModalOpen(true);
 };

 const closeDetailModal = () => {
 setIsDetailModalOpen(false);
 setSelectedCard(null);
 };
 
 // Removed toggleCardCollapse and isCardCollapsed - no longer needed for grid-only view
 
 // Removed toggleRecommendationsCollapse and isRecommendationsCollapsed - recommendations are always visible

 if (loading) {
 return (
 <div className="h-full">
 <div className={`grid ${fullWidth ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-3 w-full h-full auto-rows-fr`}>
 {[...Array(3)].map((_, i) => (
 <div key={i} className="bg-surface rounded-lg shadow-lg p-4 border-l-4 border-outline animate-pulse min-h-[300px]">
 <div className="h-4 bg-gray-200 bg-surface-secondary rounded mb-2"></div>
 <div className="h-3 bg-gray-200 bg-surface-secondary rounded mb-1"></div>
 <div className="h-3 bg-gray-200 bg-surface-secondary rounded mb-2"></div>
 <div className="h-8 bg-gray-200 bg-surface-secondary rounded"></div>
 </div>
 ))}
 </div>
 </div>
 );
 }

 if (error) {
 return (
 <div className="h-full flex items-center justify-center">
 <div className="bg-surface rounded-lg shadow-sm p-6 text-center border-2 border-outline">
 <div className="text-danger-text text-4xl mb-3">⚠️</div>
 <h2 className="text-sm font-semibold text-content-primary mb-2">Error Loading AI Cards</h2>
 <p className="text-xs text-content-tertiary">{error}</p>
 </div>
 </div>
 );
 }

 if (cards.length === 0) {
 return (
 <div className="h-full flex items-center justify-center">
 <div className="bg-surface rounded-xl shadow-lg border-2 border-outline p-8 text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-brand/10 to-brand/20 flex items-center justify-center border-2 border-blue-200 border-blue-700">
 <div className="text-content-muted text-3xl">📋</div>
 </div>
 <h2 className="text-base font-bold text-content-primary mb-2">No AI Cards Available</h2>
 <p className="text-sm text-content-tertiary">{emptyMessage}</p>
 </div>
 </div>
 );
 }

// Decide which cards have meaningful content to show
const hasContent = (c: AICard) => {
if (c && typeof c.description === 'string' && c.description.trim().length > 0) return true;
// Check parsed JSON content - use same method for all cards
const informationItems = parseInformationJson(c.information_json);
if (informationItems && informationItems.length > 0) return true;
return false;
};

 const visibleCards = Array.isArray(cards) ? cards.filter(hasContent) : [];
 
 // Sort cards by estimated content height (from shortest to tallest)
 const getCardContentLength = (card: AICard): number => {
 let length = 0;
 
 // Description length
 if (card.description) {
 length += card.description.length;
 }
 
 // Information JSON length
 if (card.information_json) {
 length += card.information_json.length;
 }
 
 // Recommendations count
 if (card.recommendations && card.recommendations.length > 0) {
 length += card.recommendations.length * 100; // Estimate 100 chars per recommendation
 }
 
 return length;
 };
 
 const sortedCards = [...visibleCards].sort((a, b) => {
 return getCardContentLength(a) - getCardContentLength(b);
 });
 
 // Always show 4 card positions (2x2 grid), even if we have fewer cards
 const maxCardsToShow = 4;
 const cardsToDisplay = sortedCards.slice(0, maxCardsToShow);
 const emptySlots = Math.max(0, maxCardsToShow - cardsToDisplay.length);

 // Removed renderTwoColumnCard function - only using grid view now

 return (
 <div className="mb-0">
 {/* Grid View */}
 <div className={`grid ${fullWidth ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} ${showHeader ? 'gap-3' : 'gap-0'} w-full items-start`}>
 {cardsToDisplay.map((card) => {
 // Use priority_color if available, otherwise fall back to priority string
 const colors = card.priority_color 
 ? getPriorityColorFromColor(card.priority_color)
 : getPriorityColor(card.priority);
 const priorityIcon = getPriorityIcon(card.priority);
 const priorityColorIcon = getPriorityColorIcon(card.priority_color);
 
 // Use consistent text size for all cards
 const dynamicTextSize = 'text-sm';
 const dynamicSpacing = 'space-y-2';
 const dynamicLineHeight = 'leading-normal';
 
 return (
 <div key={card.id} className={`${showHeader ? 'bg-surface rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-outline' : 'bg-surface border-2 border-outline rounded-xl'} overflow-hidden flex flex-col group/card`}>
 {/* Report Header - Only show if showHeader is true */}
 {showHeader && (
 <div className={`flex items-center justify-between px-4 py-2 ${colors.headerGradient} border-b-2 border-outline rounded-t-xl`}>
 <div className="flex items-center gap-2 flex-1 min-w-0">
 <span className="text-lg flex-shrink-0" aria-label={`Priority: ${card.priority_color || card.priority}`}>
 {priorityColorIcon}
 </span>
 <h2 className="text-base font-bold text-content-primary truncate">{card.card_name}</h2>
 {/* Date badge - only show when showHeader is true (not on custom dashboard) */}
 {card.updated_at && (
 <div className="px-2 py-0.5 bg-surface-elevated border-2 border-outline-strong rounded-md text-[10px] text-content-tertiary font-medium flex-shrink-0 shadow-sm">
 {(() => {
 const date = new Date(card.updated_at);
 const dateOptions: Intl.DateTimeFormatOptions = { 
 month: 'short', 
 day: 'numeric' 
 };
 const timeOptions: Intl.DateTimeFormatOptions = {
 hour: '2-digit',
 minute: '2-digit',
 hour12: false
 };
 const formattedDate = date.toLocaleDateString('en-US', dateOptions);
 const formattedTime = date.toLocaleTimeString('en-US', timeOptions);
 return `${formattedDate} ${formattedTime}`;
 })()}
 </div>
 )}
 {/* ID badge - only show when showHeader is true (not on custom dashboard) */}
 {card.id && (
 <div className="px-2 py-0.5 bg-surface-elevated border-2 border-outline-strong rounded-md text-[10px] text-content-tertiary font-medium flex-shrink-0 shadow-sm">
 ID: {card.id}
 </div>
 )}
 {/* Eye icon for Full Information tooltip - moved to left after ID */}
 {card.full_information && (
 <button
 ref={(el) => {
 if (el) {
 eyeIconRefs.current[card.id] = el;
 }
 }}
 onClick={(e) => toggleFullInfoTooltip(card.id, e)}
 data-tooltip-button={`full-info-${card.id}`}
 className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-surface-elevated border-2 border-outline-strong text-content-tertiary hover:bg-surface-secondary hover:border-outline-strong hover:border-outline-strong focus:outline-none focus:ring-2 focus:ring-brand transition-all duration-200 shadow-sm flex-shrink-0"
 aria-label="View full information"
 title="View full information"
 >
 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
 <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
 </svg>
 </button>
 )}
 </div>
 <div className="flex items-center justify-end flex-shrink-0">
 {/* AI Chat Button - replaced icon with text button */}
 {chatType && (
 <button 
 onClick={() => handleAIChat(card)}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover dark:bg-blue-700 dark:hover:bg-brand text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand transition-all duration-200 shadow-sm"
 aria-label="AI Chat for this card"
 title="Open AI chat for this card"
 >
 <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
 <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
 <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
 </svg>
 AI Chat
 </button>
 )}
 </div>
 </div>
 )}
 
 <div className={`flex-1 flex flex-col min-h-0 bg-surface`}>
 {/* Insights Title Header */}
 <div className="flex-shrink-0 flex items-center gap-2 px-5 pt-4 pb-0 bg-surface">
 <h4 className="text-xs font-bold text-content-secondary uppercase tracking-wide">Insights</h4>
 </div>
 <div className={`flex-1 overflow-auto ${showHeader ? 'px-5 pt-0 pb-2' : 'px-4 pt-0 pb-2 mt-3'}`}>
 <div className={`${dynamicTextSize} ${dynamicLineHeight} text-content-secondary max-w-none w-full break-words whitespace-normal hyphens-auto`}>
{(() => {
// Parse information_json for all cards using the same method
const informationItems = parseInformationJson(card.information_json);
 
 if (informationItems && informationItems.length > 0) {
 return (
                <div className="space-y-0 mb-4">
                  {informationItems.map((item, index) => (
                    <div key={index} className={`py-2.5 border-b border-outline last:border-b-0 hover:bg-blue-50/50 hover:bg-surface-elevated/50 transition-colors rounded-md px-2 -mx-2 ${index === 0 ? 'border-t-0' : ''}`}>
                      <span className="font-semibold text-blue-800 dark:text-brand text-sm">{item.header}</span>
                      <span className="text-content-secondary text-sm leading-relaxed ml-2">
 <ReactMarkdown
 remarkPlugins={[remarkGfm]}
 components={{
 p: ({ children }) => <span className="inline">{children}</span>,
 strong: ({ children }) => <strong className="font-semibold text-content-primary">{children}</strong>,
 em: ({ children }) => <em className="italic">{children}</em>,
 ul: ({ children }) => <ul className={`list-disc list-inside ${dynamicTextSize} text-content-secondary`}>{children}</ul>,
 ol: ({ children }) => <ol className={`list-decimal list-inside ${dynamicTextSize} text-content-secondary`}>{children}</ol>,
 li: ({ children }) => <li className={`${dynamicTextSize} text-content-secondary`}>{children}</li>,
 code: ({ children }) => <code className={`bg-surface-secondary px-1 rounded text-brand ${dynamicTextSize}`}>{children}</code>,
 }}
 >
 {item.text}
 </ReactMarkdown>
 </span>
 </div>
 ))}
 </div>
 );
 }
 
// Fallback to description (markdown) for all card types when information_json is empty
return (
<div className="mb-4">
<ReactMarkdown
remarkPlugins={[remarkGfm]}
components={{
p: ({ children }) => <p className={`${dynamicTextSize} ${dynamicLineHeight} text-content-secondary mb-1`}>{children}</p>,
strong: ({ children }) => <strong className="font-semibold text-content-primary">{children}</strong>,
em: ({ children }) => <em className="italic">{children}</em>,
ul: ({ children }) => <ul className={`list-disc list-inside ${dynamicTextSize} text-content-secondary`}>{children}</ul>,
ol: ({ children }) => <ol className={`list-decimal list-inside ${dynamicTextSize} text-content-secondary`}>{children}</ol>,
li: ({ children }) => <li className={`${dynamicTextSize} text-content-secondary`}>{children}</li>,
code: ({ children }) => <code className={`bg-surface-secondary px-1 rounded text-brand ${dynamicTextSize}`}>{children}</code>,
pre: ({ children }) => <pre className={`bg-surface-secondary p-2 rounded ${dynamicTextSize} overflow-x-auto border-2 border-outline`}>{children}</pre>,
h1: ({ children }) => <h1 className={`${dynamicTextSize} font-bold text-content-primary mb-1`}>{children}</h1>,
h2: ({ children }) => <h2 className={`${dynamicTextSize} font-bold text-content-primary mb-1`}>{children}</h2>,
h3: ({ children }) => <h3 className={`${dynamicTextSize} font-semibold text-content-primary mb-1`}>{children}</h3>,
blockquote: ({ children }) => <blockquote className={`border-l-2 border-blue-400 pl-2 italic text-content-secondary ${dynamicTextSize}`}>{children}</blockquote>,
table: ({ children }) => <table className={`w-full ${dynamicTextSize} border-collapse border-2 border-outline table-fixed h-full`}>{children}</table>,
thead: ({ children }) => <thead>{children}</thead>,
tbody: ({ children }) => <tbody className="h-full">{children}</tbody>,
tr: ({ children }) => <tr>{children}</tr>,
th: ({ children }) => {
const text = children?.toString() || '';
if (text.includes('Goal') || text.includes('🎯')) {
return <th className="border-2 border-outline px-1 py-0.5 bg-surface-secondary font-semibold text-left w-2/3">{children}</th>;
}
return <th className="border-2 border-outline px-1 py-0.5 bg-surface-secondary font-semibold text-center">{children}</th>;
},
td: ({ children }) => {
// Unified styling for all card types - center-aligned
return <td className="border-2 border-outline px-1 py-0.5 text-center">{children}</td>;
},
}}
>
{(() => {
// Apply character limit
if (card.description.length > CARD_DESCRIPTION_MAX_LENGTH) {
return `${card.description.substring(0, CARD_DESCRIPTION_MAX_LENGTH)}...`;
}
return card.description;
})()}
</ReactMarkdown>
</div>
);
 })()}
 </div>
 </div>
 </div>
 
 {/* Recommendations Section - Always visible */}
 {card.recommendations && card.recommendations.length > 0 && (
        <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-r from-surface to-surface-elevated">
          <div className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-surface to-surface-elevated">
 <h4 className="text-xs font-bold text-content-secondary uppercase tracking-wide">Recommendations</h4>
 <span className="text-xs font-semibold text-blue-800 dark:text-brand bg-surface-elevated px-1.5 py-0.5 rounded-md border-2 border-blue-200 dark:border-brand shadow-sm">{card.recommendations.length}</span>
 </div>
 <div className="flex-1 flex flex-col min-h-0 px-5 pb-4 pt-2">
 <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
 {card.recommendations.map((rec: Recommendation, index: number) => {
 return (
 <React.Fragment key={rec.id}>
 <div className="text-sm leading-relaxed text-content-secondary">
 {rec.rational && (
 <span className="font-semibold text-blue-800 dark:text-brand">{rec.rational}</span>
 )}
 {rec.rational && rec.action_text && <span className="mx-1.5 text-gray-300 text-content-muted">•</span>}
 <span className="text-content-secondary">{rec.action_text}</span>
 </div>
 {card.recommendations && index < card.recommendations.length - 1 && (
 <div className="border-b border-outline my-2"></div>
 )}
 </React.Fragment>
 );
 })}
 </div>
 </div>
 </div>
 )}
 </div>
 );
 })}
 {/* Empty placeholder slots to maintain grid layout */}
 {Array.from({ length: emptySlots }).map((_, index) => (
 <div key={`empty-${index}`} className="bg-surface rounded-lg shadow-md border-2 border-outline-strong opacity-0 pointer-events-none h-full" aria-hidden="true">
 </div>
 ))}
 </div>
 
 {/* Detail Modal */}
 <ViewRecordModal
 isOpen={isDetailModalOpen}
 onClose={closeDetailModal}
 item={selectedCard}
 config={config}
 />

 {/* AI Chat Modal */}
 {selectedInsightId !== null && (
 <AIChatModal
 isOpen={isChatModalOpen}
 onClose={closeChatModal}
 chatType={chatType}
 insightsId={selectedInsightId}
 teamName={selectedTeamName}
 piName={piName}
 />
 )}

 {/* Full Information Tooltips */}
 {typeof window !== 'undefined' && cards.map((card) => {
 const isTooltipOpen = fullInfoTooltipOpen[card.id];
 const tooltipPosition = fullInfoTooltipPositions[card.id];
 
 if (!isTooltipOpen || !tooltipPosition || !card.full_information) {
 return null;
 }
 
 return createPortal(
 <div
 data-tooltip-content
 className="fixed z-[10002]"
 style={{
 top: `${tooltipPosition.top}px`,
 left: `${tooltipPosition.left}px`,
 }}
 >
 <div className="bg-surface border-2 border-outline-strong dark:border-slate-600 rounded shadow-2xl overflow-hidden" style={{ width: '500px', height: '400px' }}>
 <div className="flex items-center justify-between px-4 py-3 bg-surface-secondary border-b-2 border-outline-strong">
 <h4 className="text-sm font-bold text-content-primary uppercase">Full Information</h4>
 <button
 onClick={(e) => {
 e.stopPropagation();
 toggleFullInfoTooltip(card.id);
 }}
 className="w-7 h-7 flex items-center justify-center bg-surface-elevated border-2 border-outline-strong rounded text-content-tertiary hover:text-red-600 dark:hover:text-red-400 hover:border-red-500 dark:hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
 >
 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>
 <div className="bg-surface p-4 text-sm text-content-primary overflow-y-auto" style={{ height: 'calc(100% - 56px)' }}>
 <div className="prose prose-sm max-w-none">
 <ReactMarkdown
 remarkPlugins={[remarkGfm, remarkBreaks]}
 components={{
 p: ({ children }) => <p className="text-sm text-content-primary mb-2">{children}</p>,
 strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
 em: ({ children }) => <em className="italic">{children}</em>,
 ul: ({ children }) => <ul className="list-disc list-inside text-sm text-content-primary mb-2">{children}</ul>,
 ol: ({ children }) => <ol className="list-decimal list-inside text-sm text-content-primary mb-2">{children}</ol>,
 li: ({ children }) => <li className="text-sm text-content-primary">{children}</li>,
 code: ({ children }) => <code className="bg-surface-secondary px-1 rounded text-xs">{children}</code>,
 pre: ({ children }) => <pre className="bg-surface-secondary p-2 rounded text-xs overflow-x-auto whitespace-pre-wrap">{children}</pre>,
 h1: ({ children }) => <h1 className="text-lg font-bold text-content-primary mb-2">{children}</h1>,
 h2: ({ children }) => <h2 className="text-base font-bold text-content-primary mb-2">{children}</h2>,
 h3: ({ children }) => <h3 className="text-sm font-semibold text-content-primary mb-2">{children}</h3>,
 blockquote: ({ children }) => <blockquote className="border-l-2 border-outline pl-2 italic text-content-tertiary mb-2">{children}</blockquote>,
 }}
 >
 {card.full_information}
 </ReactMarkdown>
 </div>
 </div>
 </div>
 </div>,
 document.body
 );
 })}
 </div>
 );
}
