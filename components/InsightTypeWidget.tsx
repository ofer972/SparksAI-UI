'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { ApiService, authFetch } from '@/lib/api';
import { buildBackendUrl } from '@/lib/config';
import AICardsInsight from './insights/AICardsInsight';
import ReportCard from './reporting/ReportCard';
import AIChatModal from './AIChatModal';
import { aiCardsConfig } from '@/lib/aiCardsConfig';
import type { AICard } from '@/lib/aiCardsConfig';
import PIFilter from './PIFilter';
import { TeamSelect, GroupSelect } from './filters';
import { useTeamsGroups } from '@/contexts/TeamsGroupsContext';
import { getPITerminology } from '@/lib/piTerminology';

interface InsightTypeWidgetProps {
 insightTypeId: string;
 insightTypeName?: string;
 filters?: {
 pi?: string;
 team_name?: string;
 group_name?: string;
 };
 globalFilters?: Record<string, any>; // Dashboard global filters (PI, team, etc.) - acts as controlledFilters
 initialPinnedFilters?: string[]; // Saved pinned filter keys to restore on load
 onClose?: () => void;
 onFiltersChange?: (filters: { pi?: string; team_name?: string; group_name?: string }) => void; // Callback to update widget filters
 onPinnedFiltersChange?: (pinnedFilterKeys: string[]) => void; // Callback to update pinned filters
 widgetId?: string; // Widget ID for filter updates
}

export default function InsightTypeWidget({
 insightTypeId,
 insightTypeName,
 filters = {},
 globalFilters = {},
 initialPinnedFilters = [],
 onClose,
 onFiltersChange,
 onPinnedFiltersChange,
 widgetId,
}: InsightTypeWidgetProps) {
 console.log('[InsightTypeWidget] Component mounted/rendered:', {
 insightTypeId,
 insightTypeName,
 filters,
 globalFilters,
 });
 
 const [cards, setCards] = useState<AICard[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [insightType, setInsightType] = useState<string>('');
 const [insightTypeDisplayName, setInsightTypeDisplayName] = useState<string>(''); // Store the display name (name field, not insight_type)
 const [insightTypeMetadata, setInsightTypeMetadata] = useState<{
 requirePI?: boolean;
 requireTeam?: boolean;
 requireGroup?: boolean;
 }>({});
 const [selectedCardForChat, setSelectedCardForChat] = useState<AICard | null>(null);
 const [fullInfoTooltipOpen, setFullInfoTooltipOpen] = useState<boolean>(false);
 const [fullInfoTooltipPosition, setFullInfoTooltipPosition] = useState<{ top: number; left: number } | null>(null);
 const eyeIconRef = useRef<HTMLButtonElement | null>(null);
 
 // Use localFilters state (same pattern as ReportPanel)
 type FiltersState = {
 pi?: string;
 team_name?: string;
 group_name?: string;
 [key: string]: any; // Index signature for dynamic access
 };
 
 const [localFilters, setLocalFilters] = React.useState<FiltersState>(() =>
 filters ? { ...filters } : {}
 );
 
 // Track which filter keys are pinned (custom/locked)
 const [pinnedFilters, setPinnedFilters] = useState<Set<string>>(() => 
 new Set(initialPinnedFilters || [])
 );
 
 // Helper to merge filters (same as ReportPanel)
 const mergeFilters = (
 base: FiltersState,
 override?: FiltersState
 ): FiltersState => {
 if (!override) {
 return base;
 }
 const next: FiltersState = { ...base };
 for (const [key, value] of Object.entries(override)) {
 if (value === undefined || value === null || value === '') {
 delete next[key as keyof FiltersState];
 } else {
 next[key as keyof FiltersState] = value;
 }
 }
 return next;
 };
 
 // Helper to compare filter values
 const areFiltersEqual = (val1: any, val2: any): boolean => {
 if (val1 === val2) return true;
 if (val1 == null || val2 == null) return val1 === val2;
 return false;
 };
 
 const controlledKey = React.useMemo(
 () => JSON.stringify(globalFilters || {}),
 [globalFilters]
 );
 
 const { teams, groups } = useTeamsGroups();

 // Fetch insight type name and metadata if not provided
 useEffect(() => {
 const fetchInsightTypeName = async () => {
 if (insightTypeName) {
 setInsightType(insightTypeName);
 setInsightTypeDisplayName(insightTypeName); // Use provided name as display name
 return;
 }

 try {
 const api = new ApiService();
 const response = await api.getActiveInsightTypes();
 const foundType = response.insight_types.find(
 (type: any) => type.id.toString() === insightTypeId
 );
 if (foundType) {
        // Use the same logic as InsightTypeSelector: name || insight_type || 'Unknown'
        const displayName = foundType.name || foundType.insight_type || 'Unknown';
        // For filtering, use insight_id (the actual identifier)
        const typeName = foundType.id || '';
 const metadata = {
 requirePI: Boolean(foundType.pi_insight ?? foundType.requirePI ?? foundType.requires_pi ?? foundType.require_pi ?? false),
 requireTeam: Boolean(foundType.team_insight ?? foundType.requireTeam ?? foundType.requires_team ?? foundType.require_team ?? false),
 requireGroup: Boolean(foundType.group_insight ?? foundType.requireGroup ?? foundType.requires_group ?? foundType.require_group ?? false),
 };
 console.log('[InsightTypeWidget] Fetched insight type:', {
 insightTypeId,
 foundType,
 displayName,
 typeName,
 metadata,
 });
 setInsightType(typeName); // Use for filtering
 setInsightTypeDisplayName(displayName); // Use for display (matches modal)
 setInsightTypeMetadata(metadata);
 } else {
 console.warn('[InsightTypeWidget] Insight type not found:', insightTypeId);
 setInsightTypeDisplayName(`Insight Type ${insightTypeId}`);
 }
 } catch (err) {
 console.error('Failed to fetch insight type:', err);
 }
 };

 fetchInsightTypeName();
 }, [insightTypeId, insightTypeName]);

 // Initialize localFilters from initialFilters (same as ReportPanel)
 React.useEffect(() => {
 if (filters) {
 setLocalFilters((prev) => mergeFilters(filters, prev));
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 // Apply controlled filters (globalFilters) to unpinned filter keys (same logic as ReportPanel)
 React.useEffect(() => {
 if (globalFilters) {
 setLocalFilters((prev) => {
 // Convert globalFilters to insight filter format (pi, team_name, group_name)
 const filteredControlled: FiltersState = {};
 
 // Apply PI if not pinned
 if (!pinnedFilters.has('pi') && globalFilters.pi) {
 filteredControlled.pi = globalFilters.pi;
 }
 
 // Determine if the current global selection is a team or group
 const isGlobalGroup = globalFilters.isGroup === true || 
 (globalFilters.selectedTreeValue && globalFilters.selectedTreeValue.startsWith('group:'));
 const isGlobalTeam = globalFilters.isGroup === false || 
 (globalFilters.selectedTreeValue && globalFilters.selectedTreeValue.startsWith('team:'));
 
 // Apply team/group filters based on insight type requirements
 // Only apply if the global filter type matches what the insight requires
 if (insightTypeMetadata.requireTeam && insightTypeMetadata.requireGroup) {
 // Both required - apply both if not pinned
 if (!pinnedFilters.has('team_name') && globalFilters.team_name) {
 filteredControlled.team_name = globalFilters.team_name;
 }
 if (!pinnedFilters.has('group_name') && globalFilters.group_name) {
 filteredControlled.group_name = globalFilters.group_name;
 }
 } else if (insightTypeMetadata.requireTeam && !insightTypeMetadata.requireGroup) {
 // Only team required - only apply if global filter is a team
 if (!pinnedFilters.has('team_name')) {
 if (globalFilters.selectedTreeValue) {
 const treeValue = globalFilters.selectedTreeValue;
 if (treeValue.startsWith('team:')) {
 const teamKey = parseInt(treeValue.split(':')[1]);
 const team = teams.find(t => t.team_key === teamKey);
 if (team) {
 filteredControlled.team_name = team.team_name;
 }
 }
 // Ignore if it's a group
 } else if (globalFilters.team_name && isGlobalTeam) {
 filteredControlled.team_name = globalFilters.team_name;
 }
 }
 } else if (insightTypeMetadata.requireGroup && !insightTypeMetadata.requireTeam) {
 // Only group required - only apply if global filter is a group
 if (!pinnedFilters.has('group_name')) {
 if (globalFilters.selectedTreeValue) {
 const treeValue = globalFilters.selectedTreeValue;
 if (treeValue.startsWith('group:')) {
 const groupKey = parseInt(treeValue.split(':')[1]);
 const group = groups.find(g => g.group_key === groupKey);
 if (group) {
 filteredControlled.group_name = group.group_name;
 }
 }
 // Ignore if it's a team
 } else if (globalFilters.group_name && isGlobalGroup) {
 filteredControlled.group_name = globalFilters.group_name;
 }
 }
 }
 
 const next = mergeFilters(prev, filteredControlled);
 
 // Clear unpinned filters if controlled filters are empty
 if (Object.keys(filteredControlled).length === 0) {
 const cleared: FiltersState = { ...next };
 for (const key of Object.keys(prev)) {
 if (!(key in (filters ?? {})) && !pinnedFilters.has(key)) {
 delete cleared[key as keyof FiltersState];
 }
 }
 return cleared;
 }
 
 return next;
 });
 }
 }, [controlledKey, globalFilters, pinnedFilters, teams, groups, insightTypeMetadata, filters]);

 // insightFilters is just localFilters (same pattern as ReportPanel)
 // The merging with global filters is already handled in the useEffect above
 const insightFilters = React.useMemo(() => {
 return { ...localFilters };
 }, [localFilters]);

 // Ref to track previous filter values to prevent unnecessary API calls
 const prevFiltersRef = React.useRef<string>('');
 const prevInsightTypeRef = React.useRef<string>('');
 const hasLoadedRef = React.useRef<boolean>(false);

 // Load insight cards matching the type and filters
 const loadCards = React.useCallback(async (bypassCache: boolean = false) => {
 // Don't load if we don't have an insight type yet (unless we have insightTypeName as fallback)
 const effectiveType = insightType || insightTypeName;
 if (!effectiveType) {
 console.log('[InsightTypeWidget] loadCards: No insight type, skipping');
 setLoading(false);
 return;
 }

 console.log('[InsightTypeWidget] loadCards: Starting API call to getTopCardsWithRecommendations', {
 effectiveType,
 insightFilters,
 });

 setLoading(true);
 setError(null);
 try {
 // Build query parameters for getTopCardsWithRecommendations endpoint
 const params = new URLSearchParams({
 limit: '1', // Get 1 card per widget selection
 });

 // Add insight_type parameter - this is required to filter cards by the specific insight type
 if (effectiveType) {
 params.append('insight_type', effectiveType);
 }

 console.log('[InsightTypeWidget] Building API params with filters:', {
 effectiveType,
 insightFilters,
 insightTypeMetadata,
 });

 // Add filters based on insight type requirements
 // Only send filters that are required by the insight type to avoid API errors
 // For group-based insights: send group_name and isGroup=true
 // For team-based insights: send team_name and isGroup=false
 // For PI-based insights: only send pi
 
 if (insightTypeMetadata.requirePI && insightFilters.pi) {
 params.append('pi', insightFilters.pi);
 }
 
 if (insightTypeMetadata.requireTeam && insightFilters.team_name) {
 // Only add team_name if this insight type requires a team
 // Don't add if it requires a group instead
 if (!insightTypeMetadata.requireGroup) {
 params.append('team_name', insightFilters.team_name);
 params.append('isGroup', 'false');
 }
 }
 
 if (insightTypeMetadata.requireGroup && insightFilters.group_name) {
 // Only add group_name if this insight type requires a group
 // Don't add if it requires a team instead
 if (!insightTypeMetadata.requireTeam) {
 params.append('group_name', insightFilters.group_name);
 params.append('isGroup', 'true');
 }
 }
 
 // If both team and group are required, send both with appropriate parameters
 if (insightTypeMetadata.requireTeam && insightTypeMetadata.requireGroup) {
 if (insightFilters.team_name) {
 params.append('team_name', insightFilters.team_name);
 }
 if (insightFilters.group_name) {
 params.append('group_name', insightFilters.group_name);
 }
 // When both are required, determine isGroup based on which one is present/primary
 if (insightFilters.group_name) {
 params.append('isGroup', 'true');
 } else if (insightFilters.team_name) {
 params.append('isGroup', 'false');
 }
 }
 
 // Add bypass_cache parameter if requested
 if (bypassCache === true) {
 params.append('bypass_cache', 'true');
 }
 
 console.log('[InsightTypeWidget] Built API params:', {
 params: params.toString(),
 insightTypeMetadata,
 insightFilters,
 bypassCache,
 });

 // Fetch insight cards using getTopCardsWithRecommendations endpoint
 const url = `${buildBackendUrl('/ai-insights/getTopCardsWithRecommendations')}?${params.toString()}`;
 console.log('[InsightTypeWidget] loadCards: Calling API:', url);
 
 const response = await authFetch(url);
 
 console.log('[InsightTypeWidget] loadCards: API response status:', response.status);
 
 if (!response.ok) {
 throw new Error(`Failed to fetch insight cards: ${response.status} ${response.statusText}`);
 }
 
 const result = await response.json();
 // Handle API response structure: { success: true, data: { ai_cards: [...], count: number }, message: string }
 // The getTopCardsWithRecommendations endpoint returns data.ai_cards
 let allCards: AICard[] = [];
 
 if (result.data) {
 // Check for ai_cards (getTopCardsWithRecommendations format)
 if (Array.isArray(result.data.ai_cards)) {
 allCards = result.data.ai_cards;
 } else if (Array.isArray(result.data.cards)) {
 // Fallback for other formats
 allCards = result.data.cards;
 } else if (Array.isArray(result.data)) {
 // Direct array
 allCards = result.data;
 }
 } else if (Array.isArray(result.cards)) {
 allCards = result.cards;
 } else if (Array.isArray(result)) {
 allCards = result;
 }
 
 // Ensure allCards is an array before filtering
 if (!Array.isArray(allCards)) {
 console.error('Expected array but got:', allCards);
 allCards = [];
 }
 
 // Filter cards to match the specific insight type
 // Match by insight_id (case-insensitive, trimmed)
 const normalizedInsightId = (insightType || insightTypeName || '').trim();
 
 console.log('[InsightTypeWidget] Filtering cards:', {
 allCardsCount: allCards.length,
 insightId: normalizedInsightId,
 insightTypeId,
 cardTypes: allCards.map(c => ({ id: c.id, insight_id: c.insight_id })),
 });
 
 // If we have an insight ID to filter by, filter the cards
 // Otherwise, show all cards (shouldn't happen, but handle gracefully)
 let filteredCards = allCards;
 if (normalizedInsightId) {
 filteredCards = allCards.filter((card: AICard) => {
 const cardId = (card.insight_id || '').trim();
 // Case-insensitive comparison
 const matches = cardId.toLowerCase() === normalizedInsightId.toLowerCase();
 
 if (!matches && allCards.length <= 5) {
 console.log('[InsightTypeWidget] Card does not match:', {
 cardId: card.id,
 cardType,
 normalizedCardType: cardType.toLowerCase(),
 insightType: normalizedInsightType,
 normalizedInsightType: normalizedInsightType.toLowerCase(),
 matches,
 });
 }
 
 return matches;
 });
 }
 
 console.log('[InsightTypeWidget] Filtered cards count:', filteredCards.length, 'out of', allCards.length, 'insightType:', normalizedInsightType);
 
 setCards(filteredCards);
 } catch (err: any) {
 setError(err.message || 'Failed to load insight cards');
 } finally {
 setLoading(false);
 }
 }, [insightType, insightFilters, insightTypeName, insightTypeMetadata]);

 // Load insight cards when type or filters change (but not on every render)
 useEffect(() => {
 const effectiveType = insightType || insightTypeName || '';
 
 // Create a stable key for filters to detect actual changes
 const filtersKey = JSON.stringify(insightFilters);
 const insightTypeKey = effectiveType;
 
 // Check if filters or insight type actually changed
 const filtersChanged = prevFiltersRef.current !== filtersKey;
 const typeChanged = prevInsightTypeRef.current !== insightTypeKey;
 
 // Only call loadCards if:
 // 1. We have an insight type AND (filters changed OR type changed OR this is the first load)
 if (effectiveType && (filtersChanged || typeChanged || !hasLoadedRef.current)) {
 console.log('[InsightTypeWidget] Calling loadCards - filters or type changed:', {
 insightType: effectiveType,
 filtersChanged,
 typeChanged,
 isFirstLoad: !hasLoadedRef.current,
 filtersKey,
 });
 
 prevFiltersRef.current = filtersKey;
 prevInsightTypeRef.current = insightTypeKey;
 hasLoadedRef.current = true;
 
 loadCards();
 } else if (!effectiveType) {
 console.log('[InsightTypeWidget] Not calling loadCards - no insight type:', {
 insightType,
 insightTypeName,
 });
 } else {
 console.log('[InsightTypeWidget] Skipping loadCards - no changes detected');
 }
 }, [insightType, insightTypeName, insightFilters, loadCards]);

 // Get the most recent card's date for the date badge
 const mostRecentCard = cards.length > 0 ? cards[0] : null;
 const dateBadge = mostRecentCard?.updated_at ? (() => {
 const date = new Date(mostRecentCard.updated_at);
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
 })() : null;

 // Toggle pin state for a filter key
 const togglePin = React.useCallback((filterKey: string) => {
 setPinnedFilters((prev) => {
 const newPinned = new Set(prev);
 if (newPinned.has(filterKey)) {
 // Unpinning - remove from set
 newPinned.delete(filterKey);
 // When unpinning, immediately apply global filter value if available
 if (globalFilters) {
 const updates: FiltersState = {};
 if (filterKey === 'pi' && globalFilters.pi) {
 updates.pi = globalFilters.pi;
 } else if (filterKey === 'team_name' && globalFilters.team_name) {
 updates.team_name = globalFilters.team_name;
 } else if (filterKey === 'group_name' && globalFilters.group_name) {
 updates.group_name = globalFilters.group_name;
 } else if (filterKey === 'team_name' || filterKey === 'group_name') {
 // Handle selectedTreeValue
 if (globalFilters.selectedTreeValue) {
 const treeValue = globalFilters.selectedTreeValue;
 if (treeValue.startsWith('team:')) {
 const teamKey = parseInt(treeValue.split(':')[1]);
 const team = teams.find(t => t.team_key === teamKey);
 if (team) {
 updates.team_name = team.team_name;
 }
 } else if (treeValue.startsWith('group:')) {
 const groupKey = parseInt(treeValue.split(':')[1]);
 const group = groups.find(g => g.group_key === groupKey);
 if (group) {
 updates.group_name = group.group_name;
 }
 }
 }
 }
 if (Object.keys(updates).length > 0) {
 setFilters(updates);
 }
 }
 } else {
 // Pinning - add to set
 newPinned.add(filterKey);
 }
 
 // Notify parent of pinned filters change
 const pinnedArray = Array.from(newPinned);
 onPinnedFiltersChange?.(pinnedArray);
 
 return newPinned;
 });
 }, [globalFilters, teams, groups, onPinnedFiltersChange]);

 // Generate filter badges from localFilters (same pattern as ReportPanel)
 const filterBadges = React.useMemo(() => {
 const badges: Array<{ label: string; value: string; filterKey: string; isPinned: boolean }> = [];
 
 if (localFilters.pi) {
 badges.push({
      label: getPITerminology(),
      value: localFilters.pi,
      filterKey: 'pi',
 isPinned: pinnedFilters.has('pi'),
 });
 }
 
 if (localFilters.team_name) {
 badges.push({
 label: 'Team',
 value: localFilters.team_name,
 filterKey: 'team_name',
 isPinned: pinnedFilters.has('team_name'),
 });
 }
 
 if (localFilters.group_name) {
 badges.push({
 label: 'Group',
 value: localFilters.group_name,
 filterKey: 'group_name',
 isPinned: pinnedFilters.has('group_name'),
 });
 }
 
 return badges;
 }, [localFilters, pinnedFilters]);

 // Handle AI chat - open chat for the first card if available (only if cards exist)
 const handleAIChat = () => {
 if (cards.length > 0) {
 setSelectedCardForChat(cards[0]);
 }
 };
 
 // Don't show AI chat button if there are no cards
 const showAIChat = cards.length > 0;

 // Calculate tooltip position for full information
 const calculateTooltipPosition = useCallback((): { top: number; left: number } | null => {
 const buttonElement = eyeIconRef.current;
 if (!buttonElement) return null;
 
 const tooltipWidth = 500;
 const tooltipHeight = 400;
 const viewportWidth = window.innerWidth;
 const viewportHeight = window.innerHeight;
 const padding = 10;
 const gap = 8;
 
 const rect = buttonElement.getBoundingClientRect();
 const buttonCenterX = rect.left + rect.width / 2;
 const buttonCenterY = rect.top + rect.height / 2;
 
 // Try to position below first, then above, then adjust
 let left = buttonCenterX - tooltipWidth / 2;
 let top = rect.bottom + gap;
 
 // Adjust if tooltip would go off right edge
 if (left + tooltipWidth > viewportWidth - padding) {
 left = viewportWidth - tooltipWidth - padding;
 }
 
 // Adjust if tooltip would go off left edge
 if (left < padding) {
 left = padding;
 }
 
 // Check if there's enough space below
 const spaceBelow = viewportHeight - rect.bottom - gap;
 const spaceAbove = rect.top - gap;
 
 if (spaceBelow >= tooltipHeight) {
 // Position below
 top = rect.bottom + gap;
 } else if (spaceAbove >= tooltipHeight) {
 // Position above
 top = rect.top - tooltipHeight - gap;
 } else {
 // Not enough space on either side, choose the side with more space
 if (spaceBelow > spaceAbove) {
 top = rect.bottom + gap;
 if (top + tooltipHeight > viewportHeight - padding) {
 top = viewportHeight - tooltipHeight - padding;
 }
 } else {
 top = rect.top - tooltipHeight - gap;
 if (top < padding) {
 top = padding;
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
 const handleViewFullInfo = (event?: React.MouseEvent) => {
 if (event) {
 event.stopPropagation();
 }
 
 if (fullInfoTooltipOpen) {
 setFullInfoTooltipOpen(false);
 setFullInfoTooltipPosition(null);
 } else {
 // Set open state first, then calculate position in useEffect
 setFullInfoTooltipOpen(true);
 }
 };

 // Calculate tooltip position when tooltip opens
 useEffect(() => {
 if (fullInfoTooltipOpen && eyeIconRef.current) {
 const position = calculateTooltipPosition();
 if (position) {
 setFullInfoTooltipPosition(position);
 } else {
 // If we can't calculate position, close the tooltip
 setFullInfoTooltipOpen(false);
 }
 }
 }, [fullInfoTooltipOpen, calculateTooltipPosition]);

 // Handle click outside to close tooltip
 useEffect(() => {
 if (!fullInfoTooltipOpen) return;

 const handleClickOutside = (event: MouseEvent) => {
 const target = event.target as HTMLElement;
 // Check if click is outside the tooltip and not on the eye icon button
 if (target && !target.closest('[data-tooltip-content]') && target !== eyeIconRef.current && !eyeIconRef.current?.contains(target)) {
 setFullInfoTooltipOpen(false);
 setFullInfoTooltipPosition(null);
 }
 };

 document.addEventListener('mousedown', handleClickOutside);
 return () => {
 document.removeEventListener('mousedown', handleClickOutside);
 };
 }, [fullInfoTooltipOpen]);

 // Create title suffix (date badge only) - goes after title on left side
 const titleSuffix = (
 <>
 {dateBadge && (
 <div className="px-2 py-0.5 bg-surface-elevated border-2 border-outline-strong rounded-md text-[10px] text-content-tertiary font-medium flex-shrink-0 shadow-sm">
 {dateBadge}
 </div>
 )}
 </>
 );

 // Actions for the right side (eye icon and other action buttons)
 const actions = (
 <>
 {mostRecentCard?.full_information && (
 <button
 type="button"
 ref={(el) => {
 if (el) {
 eyeIconRef.current = el;
 }
 }}
 onClick={(e) => {
 e.stopPropagation();
 handleViewFullInfo(e);
 }}
 className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-surface-elevated border-2 border-outline-strong text-content-tertiary hover:bg-surface-secondary hover:border-outline-strong hover:border-outline-strong focus:outline-none focus:ring-2 focus:ring-brand transition-all duration-200 shadow-sm relative z-50 pointer-events-auto"
 aria-label="View full information"
 title="View full information"
 >
 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
 <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
 </svg>
 </button>
 )}
 </>
 );

 // setFilters function with auto-pin logic (same as ReportPanel)
 const setFilters = React.useCallback(
 (updater: FiltersState | ((prev: FiltersState) => FiltersState)) => {
 setLocalFilters((prev) => {
 const updated =
 typeof updater === 'function'
 ? updater(prev)
 : mergeFilters(prev, updater);
 
 // Auto-pin filters that are changed manually (detect if controlled filters exist)
 if (globalFilters) {
 const changedKeys = new Set<string>();
 for (const key of Object.keys(updated)) {
 if (key in globalFilters && !areFiltersEqual(updated[key], globalFilters[key])) {
 changedKeys.add(key);
 }
 }
 if (changedKeys.size > 0) {
 setPinnedFilters((prevPinned) => {
 const newPinned = new Set(prevPinned);
 changedKeys.forEach((key) => newPinned.add(key));
 
 // Notify parent of pinned filters change
 onPinnedFiltersChange?.(Array.from(newPinned));
 
 return newPinned;
 });
 }
 }
 
 // Notify parent of filter changes
 onFiltersChange?.(updated);
 return updated;
 });
 },
 [onFiltersChange, globalFilters, onPinnedFiltersChange]
 );

 // Handle filter changes
 const handlePIFilterChange = (pi: string) => {
 // Explicitly pin the PI filter when manually changed
 setPinnedFilters((prev) => {
 const newPinned = new Set(prev);
 if (pi) {
 newPinned.add('pi');
 } else {
 newPinned.delete('pi');
 }
 onPinnedFiltersChange?.(Array.from(newPinned));
 return newPinned;
 });
 
 setFilters({ pi: pi || undefined });
 };

 // Handle team-only selection
 const handleTeamSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
 const teamName = e.target.value;
 
 // Explicitly pin the team_name filter when manually changed
 setPinnedFilters((prev) => {
 const newPinned = new Set(prev);
 if (teamName) {
 newPinned.add('team_name');
 } else {
 newPinned.delete('team_name');
 }
 onPinnedFiltersChange?.(Array.from(newPinned));
 return newPinned;
 });
 
 if (insightTypeMetadata.requireTeam && insightTypeMetadata.requireGroup) {
 // Both required - update team_name only
 setFilters((prev) => ({
 ...prev,
 team_name: teamName || undefined,
 }));
 } else {
 // Only team required - set team_name and clear group_name
 setFilters({
 team_name: teamName || undefined,
 group_name: undefined,
 });
 }
 };

 // Handle group-only selection
 const handleGroupSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
 const groupName = e.target.value;
 
 // Explicitly pin the group_name filter when manually changed
 setPinnedFilters((prev) => {
 const newPinned = new Set(prev);
 if (groupName) {
 newPinned.add('group_name');
 } else {
 newPinned.delete('group_name');
 }
 onPinnedFiltersChange?.(Array.from(newPinned));
 return newPinned;
 });
 
 if (insightTypeMetadata.requireTeam && insightTypeMetadata.requireGroup) {
 // Both required - update group_name only
 setFilters((prev) => ({
 ...prev,
 group_name: groupName || undefined,
 }));
 } else {
 // Only group required - set group_name and clear team_name
 setFilters({
 team_name: undefined,
 group_name: groupName || undefined,
 });
 }
 };

 // Get current values for selects
 const currentTeamName = localFilters.team_name || '';
 const currentGroupName = localFilters.group_name || '';

 // Create filter inputs based on insight type requirements
 const filtersContent = (
 <div className="flex flex-wrap items-center gap-3">
 {insightTypeMetadata.requirePI && (
 <div className="flex items-center gap-2 min-w-[150px]">
      <label className="text-xs font-semibold text-content-secondary whitespace-nowrap">{getPITerminology()}:</label>
 <PIFilter
 selectedPI={localFilters.pi || ''}
 onPIChange={handlePIFilterChange}
 className="text-xs"
 />
 </div>
 )}
 
 {/* Only team required - show simple team select */}
 {insightTypeMetadata.requireTeam && !insightTypeMetadata.requireGroup && (
 <div className="flex items-center gap-2 min-w-[200px]">
 <label className="text-xs font-semibold text-content-secondary whitespace-nowrap">Team:</label>
 <TeamSelect
 value={currentTeamName || null}
 onChange={(teamName) => {
 // Manually pin the filter when changed
 setPinnedFilters((prev) => {
 const newPinned = new Set(prev);
 if (teamName) {
 newPinned.add('team_name');
 } else {
 newPinned.delete('team_name');
 }
 onPinnedFiltersChange?.(Array.from(newPinned));
 return newPinned;
 });
 
 setFilters({
 team_name: teamName || undefined,
 group_name: undefined,
 });
 }}
 size="xs"
 fullWidth
 className="flex-1"
 />
 </div>
 )}
 
 {/* Only group required - show simple group select */}
 {insightTypeMetadata.requireGroup && !insightTypeMetadata.requireTeam && (
 <div className="flex items-center gap-2 min-w-[200px]">
 <label className="text-xs font-semibold text-content-secondary whitespace-nowrap">Group:</label>
 <GroupSelect
 value={currentGroupName || null}
 onChange={(groupName) => {
 // Manually pin the filter when changed
 setPinnedFilters((prev) => {
 const newPinned = new Set(prev);
 if (groupName) {
 newPinned.add('group_name');
 } else {
 newPinned.delete('group_name');
 }
 onPinnedFiltersChange?.(Array.from(newPinned));
 return newPinned;
 });
 
 setFilters({
 team_name: undefined,
 group_name: groupName || undefined,
 });
 }}
 size="xs"
 fullWidth
 className="flex-1"
 />
 </div>
 )}
 
 {/* Both team and group required - show both separately */}
 {insightTypeMetadata.requireTeam && insightTypeMetadata.requireGroup && (
 <>
 <div className="flex items-center gap-2 min-w-[200px]">
 <label className="text-xs font-semibold text-content-secondary whitespace-nowrap">Team:</label>
 <TeamSelect
 value={currentTeamName || null}
 onChange={(teamName) => {
 // Manually pin the filter when changed
 setPinnedFilters((prev) => {
 const newPinned = new Set(prev);
 if (teamName) {
 newPinned.add('team_name');
 } else {
 newPinned.delete('team_name');
 }
 onPinnedFiltersChange?.(Array.from(newPinned));
 return newPinned;
 });
 
 setFilters((prev) => ({
 ...prev,
 team_name: teamName || undefined,
 }));
 }}
 size="xs"
 fullWidth
 className="flex-1"
 />
 </div>
 <div className="flex items-center gap-2 min-w-[200px]">
 <label className="text-xs font-semibold text-content-secondary whitespace-nowrap">Group:</label>
 <GroupSelect
 value={currentGroupName || null}
 onChange={(groupName) => {
 // Manually pin the filter when changed
 setPinnedFilters((prev) => {
 const newPinned = new Set(prev);
 if (groupName) {
 newPinned.add('group_name');
 } else {
 newPinned.delete('group_name');
 }
 onPinnedFiltersChange?.(Array.from(newPinned));
 return newPinned;
 });
 
 setFilters((prev) => ({
 ...prev,
 group_name: groupName || undefined,
 }));
 }}
 size="xs"
 fullWidth
 className="flex-1"
 />
 </div>
 </>
 )}
 
 {!insightTypeMetadata.requirePI && !insightTypeMetadata.requireTeam && !insightTypeMetadata.requireGroup && (
 <div className="text-xs text-content-muted italic">
 No filters required for this insight type.
 </div>
 )}
 </div>
 );

 // Use the insight type display name (matches what's shown in the add widget modal)
 const cardTitle = insightTypeDisplayName || insightTypeName || `Insight Type ${insightTypeId}`;
 
 // Get priority_color from the most recent card (first card in the array)
 const mostRecentCardPriorityColor = cards.length > 0 ? (cards[0] as any)?.priority_color : undefined;

 return (
 <ReportCard
 title={cardTitle}
 onClose={onClose}
 defaultCollapsed={false}
 onRefresh={() => loadCards(true)} // Pass bypassCache=true for refresh
 onAIChat={showAIChat ? handleAIChat : undefined}
 filters={filtersContent}
 filterBadges={filterBadges}
 onTogglePin={togglePin}
 actions={actions}
 titleSuffix={titleSuffix}
 isInsightCard={true}
 priorityColor={mostRecentCardPriorityColor}
 >
 <div className="h-full overflow-auto">
 {loading ? (
 <div className="flex items-center justify-center h-full min-h-[200px]">
 <div className="flex flex-col items-center">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 border-blue-400 mb-2"></div>
 <div className="text-sm text-content-tertiary">Loading insight cards...</div>
 </div>
 </div>
 ) : error ? (
 <div className="flex items-center justify-center h-full min-h-[200px]">
 <div className="bg-danger-bg border border-danger-border rounded-lg p-4 text-sm text-danger-text max-w-md">
 {error}
 </div>
 </div>
 ) : cards.length === 0 ? (
 <div className="flex items-center justify-center h-full min-h-[200px]">
 <div className="text-center p-4">
 <div className="text-content-muted text-4xl mb-3">📋</div>
 <h3 className="text-sm font-semibold mb-2 text-content-secondary">No insight cards found</h3>
 <p className="text-xs text-content-muted">Try adjusting the filters above to find insight cards for this type.</p>
 </div>
 </div>
 ) : (
 <AICardsInsight
 cards={cards}
 loading={false}
 error={null}
 onRefetch={loadCards}
 title={insightTypeName || `Insight Type ${insightTypeId}`}
 emptyMessage="No insight cards available"
 config={{} as any}
 chatType="Team_insights"
 fullWidth={true}
 showHeader={false}
 />
 )}
 </div>

 {/* Full Information Tooltip */}
 {typeof window !== 'undefined' && mostRecentCard && fullInfoTooltipOpen && fullInfoTooltipPosition && mostRecentCard.full_information && (
 createPortal(
 <div
 data-tooltip-content
 className="fixed z-[10002]"
 style={{
 top: `${fullInfoTooltipPosition.top}px`,
 left: `${fullInfoTooltipPosition.left}px`,
 }}
 >
 <div className="bg-surface border-2 border-outline-strong dark:border-slate-600 rounded shadow-2xl overflow-hidden" style={{ width: '500px', height: '400px' }}>
 <div className="flex items-center justify-between px-4 py-3 bg-surface-secondary border-b-2 border-outline-strong">
 <h4 className="text-sm font-bold text-content-primary uppercase">Full Information</h4>
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleViewFullInfo();
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
 blockquote: ({ children }) => <blockquote className="border-l-2 border-outline-strong pl-2 italic text-content-tertiary mb-2">{children}</blockquote>,
 }}
 >
 {mostRecentCard.full_information}
 </ReactMarkdown>
 </div>
 </div>
 </div>
 </div>,
 document.body
 )
 )}

 {/* AI Chat Modal */}
 {selectedCardForChat && (
 <AIChatModal
 isOpen={!!selectedCardForChat}
 onClose={() => setSelectedCardForChat(null)}
 insightsId={selectedCardForChat.id}
 teamName={selectedCardForChat.team_name || ''}
 chatType="Team_insights"
 />
 )}
 </ReportCard>
 );
}

