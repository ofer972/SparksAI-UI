'use client';

import React, { useState, useRef, useEffect as useEffectReact } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ViewRecordModal } from '@/components/ViewRecordModal';
import { EntityConfig } from '@/lib/entityConfig';
import AIChatModal from '@/components/AIChatModal';
import { Recommendation } from '@/lib/config';

// Constants
const CARD_DESCRIPTION_MAX_LENGTH = 750;

interface AICard {
  id: number;
  date: string;
  team_name: string;
  card_name: string;
  card_type: string;
  priority: string;
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
  chatType?: string; // Chat type for AI chat: "Team_insights" or "PI_insights"
  piName?: string; // PI name for PI insights context
}

const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'critical':
      return {
        border: 'border-red-600',
        frame: 'border-red-600',
        bg: 'bg-red-600',
        text: 'text-red-700'
      };
    case 'high':
      return {
        border: 'border-yellow-500',
        frame: 'border-yellow-500',
        bg: 'bg-yellow-500',
        text: 'text-yellow-600'
      };
    case 'medium':
      return {
        border: 'border-orange-500',
        frame: 'border-orange-500',
        bg: 'bg-orange-500',
        text: 'text-orange-600'
      };
    case 'low':
      return {
        border: 'border-green-500',
        frame: 'border-green-500',
        bg: 'bg-green-500',
        text: 'text-green-600'
      };
    default:
      return {
        border: 'border-gray-500',
        frame: 'border-gray-500',
        bg: 'bg-gray-500',
        text: 'text-gray-600'
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

const parseSprintGoalJson = (jsonString: string | undefined): Record<string, any>[] | null => {
  if (!jsonString || jsonString.trim() === '') {
    return null;
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    
    // Handle direct array (already in table format)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as Record<string, any>[];
    }
    
    // Handle object containing DashboardSummary or other arrays
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      // Check for DashboardSummary first (most common for Sprint Goals)
      if (parsed.DashboardSummary && Array.isArray(parsed.DashboardSummary) && parsed.DashboardSummary.length > 0) {
        // Transform from flat format [{header: "Goal", text: "..."}, {header: "Linkage", text: "3"}, ...] 
        // to table format [{Goal: "...", Linkage: "3", Progress: "0%", Alert: "🔴"}, ...]
        const flatArray = parsed.DashboardSummary;
        const tableRows: Record<string, any>[] = [];
        
        // Group items by chunks - every 4 items form a row (Goal, Linkage, Progress, Alert)
        // Limit to 8 rows maximum (32 items)
        const maxItems = Math.min(flatArray.length, 32);
        for (let i = 0; i < maxItems; i += 4) {
          if (i + 3 < maxItems) {
            const goalItem = flatArray[i];
            const linkageItem = flatArray[i + 1];
            const progressItem = flatArray[i + 2];
            const alertItem = flatArray[i + 3];
            
            // Extract the field name from header (remove emoji and normalize)
            const getFieldName = (header: string) => {
              const lower = header.toLowerCase();
              if (lower.includes('goal')) return 'Goal';
              if (lower.includes('linkage') || lower.includes('link')) return 'Linkage';
              if (lower.includes('progress')) return 'Progress';
              if (lower.includes('alert')) return 'Alert';
              return header; // fallback
            };
            
            const row: Record<string, any> = {};
            row[getFieldName(goalItem.header)] = String(goalItem.text || '').trim();
            row[getFieldName(linkageItem.header)] = String(linkageItem.text || '').trim();
            row[getFieldName(progressItem.header)] = String(progressItem.text || '').trim();
            row[getFieldName(alertItem.header)] = String(alertItem.text || '').trim();
            
            tableRows.push(row);
          }
        }
        
        if (tableRows.length > 0) {
          return tableRows;
        }
      }
      
      // Check other common property names that might contain arrays
      const arrayKeys = ['items', 'data', 'goals', 'sprint_goals', 'rows', 'records'];
      for (const key of arrayKeys) {
        if (parsed[key] && Array.isArray(parsed[key]) && parsed[key].length > 0) {
          return parsed[key] as Record<string, any>[];
        }
      }
      
      // If object itself is an array-like structure, try to extract values
      const values = Object.values(parsed);
      if (values.length > 0 && Array.isArray(values[0]) && values[0].length > 0) {
        return values[0] as Record<string, any>[];
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing Sprint Goal information_json:', error);
    return null;
  }
};

export default function AICardsInsight({ 
  cards, 
  loading, 
  error, 
  onRefetch,
  title = "AI Insights",
  emptyMessage = "No AI insights available at this time.",
  config,
  chatType = "Team_insights", // Default to Team_insights
  piName // Optional PI name for PI insights
}: AICardsInsightProps) {
  // State for detail modal
  const [selectedCard, setSelectedCard] = useState<AICard | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // State for AI Chat modal
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [selectedInsightId, setSelectedInsightId] = useState<number | null>(null);
  const [selectedTeamName, setSelectedTeamName] = useState<string>('');

  // State for expanded recommendations per card (cardId -> boolean)
  const [expandedRecommendations, setExpandedRecommendations] = useState<Record<number, boolean>>({});
  
  // State for expanded "read more" tooltips per recommendation (recId -> boolean)
  const [expandedRecTooltips, setExpandedRecTooltips] = useState<Record<number, boolean>>({});
  
  // State for button positions per recommendation (recId -> {top, left})
  const [buttonPositions, setButtonPositions] = useState<Record<number, {top: number, left: number}>>({});

  // Handle click outside to close tooltips
  useEffectReact(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if any tooltip is open
      const hasOpenTooltips = Object.values(expandedRecTooltips).some(isOpen => isOpen);
      
      if (hasOpenTooltips) {
        // Check if the click target is not inside any tooltip or "see more" button
        const target = event.target as HTMLElement;
        const isInsideTooltip = target.closest('[data-tooltip-content]');
        const isInsideButton = target.closest('[data-tooltip-button]');
        
        if (!isInsideTooltip && !isInsideButton) {
          // Close all tooltips
          setExpandedRecTooltips({});
          setButtonPositions({});
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expandedRecTooltips]);

  const toggleRecommendation = (cardId: number) => {
    setExpandedRecommendations(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const isRecommendationExpanded = (cardId: number) => {
    return expandedRecommendations[cardId] || false;
  };
  
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

  if (loading) {
    return (
      <div className="h-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full h-full">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-gray-200 animate-pulse min-h-[221px]">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-1"></div>
              <div className="h-3 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <div className="text-red-500 text-4xl mb-3">⚠️</div>
          <h2 className="text-sm font-semibold mb-2">Error Loading AI Cards</h2>
          <p className="text-xs text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-8 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center border-2 border-blue-200">
            <div className="text-gray-400 text-3xl">📋</div>
          </div>
          <h2 className="text-base font-bold text-gray-800 mb-2">No AI Cards Available</h2>
          <p className="text-sm text-gray-600">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  // Decide which cards have meaningful content to show
  const hasContent = (c: AICard) => {
    if (c && typeof c.description === 'string' && c.description.trim().length > 0) return true;
    // Check parsed JSON content
    if (c.card_type === 'Sprint Goal') {
      const sprintGoalItems = parseSprintGoalJson(c.information_json);
      if (sprintGoalItems && sprintGoalItems.length > 0) return true;
    }
    const informationItems = parseInformationJson(c.information_json);
    if (informationItems && informationItems.length > 0) return true;
    return false;
  };

  const visibleCards = Array.isArray(cards) ? cards.filter(hasContent) : [];
  
  // Always show 4 card positions (2x2 grid), even if we have fewer cards
  const maxCardsToShow = 4;
  const cardsToDisplay = visibleCards.slice(0, maxCardsToShow);
  const emptySlots = Math.max(0, maxCardsToShow - cardsToDisplay.length);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full auto-rows-fr">
        {cardsToDisplay.map((card) => {
            const colors = getPriorityColor(card.priority);
            const priorityIcon = getPriorityIcon(card.priority);
            
            // Use consistent text size for all cards
            const dynamicTextSize = 'text-sm';
            const dynamicSpacing = 'space-y-2';
            const dynamicLineHeight = 'leading-normal';
            
            return (
              <div key={card.id} className={`bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 pt-1 pb-4 px-4 border-2 ${colors.border} ${colors.frame} relative overflow-hidden flex flex-col`}>
                {/* Decorative colored strip at top */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${colors.border.replace('border-', 'bg-')}`}></div>
                
                {/* Header Section */}
                <div className="flex items-center justify-between mb-2 mt-1">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <div className="relative group flex-shrink-0">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center border-2 border-blue-200 shadow-sm">
                        <span className="text-lg cursor-pointer">
                          {priorityIcon}
                        </span>
                      </div>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 shadow-lg">
                        {card.priority}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-gray-800 truncate">{card.card_name}</h3>
                      {/* Date Badge after title */}
                      {card.date && (
                        <div className="px-2 py-0.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-lg text-[10px] text-indigo-700 font-semibold shadow-sm flex-shrink-0">
                          {(() => {
                            const date = new Date(card.date);
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
                      <button 
                        onClick={() => handleViewCard(card)}
                        className="text-[10px] text-blue-600 hover:text-blue-800 cursor-pointer bg-transparent border-none p-0 font-semibold hover:underline transition-colors flex-shrink-0"
                        title="Click to view details"
                      >
                        ID: {card.id}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center flex-shrink-0 ml-2">
                    {/* AI Chat Button at top right */}
                    <button 
                      onClick={() => handleAIChat(card)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-2 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md hover:shadow-lg border border-blue-500 flex items-center gap-1 flex-shrink-0 whitespace-nowrap"
                    >
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      AI Chat
                    </button>
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className={`${dynamicTextSize} ${dynamicLineHeight} text-gray-600 max-w-none w-full h-full break-words whitespace-normal hyphens-auto overflow-hidden transition-all duration-200`}>
                    {(() => {
                      // Handle Sprint Goal cards with JSON table format
                      if (card.card_type === 'Sprint Goal') {
                        const sprintGoalItems = parseSprintGoalJson(card.information_json);
                        
                        if (sprintGoalItems && sprintGoalItems.length > 0) {
                          // Get column headers dynamically from the first item
                          const firstItem = sprintGoalItems[0];
                          let columns = firstItem && typeof firstItem === 'object' ? Object.keys(firstItem) : [];
                          
                          if (columns.length === 0) {
                            // Fallback if no columns found
                            return null;
                          }
                          
                          // Check if "Goal" column exists (case-insensitive) and move it to first position
                          const goalColumnIndex = columns.findIndex(col => col.toLowerCase().includes('goal'));
                          if (goalColumnIndex !== -1) {
                            const goalColumn = columns[goalColumnIndex];
                            columns = [goalColumn, ...columns.filter(col => col !== goalColumn)];
                          }
                          
                          return (
                            <div className="w-full overflow-auto rounded-lg border border-gray-300 mb-4" style={{ maxHeight: '150px' }}>
                              <table 
                                className="text-sm border-collapse w-full" 
                                style={{ tableLayout: 'auto' }}
                              >
                                <thead className="sticky top-0 bg-gray-50 z-10">
                                  <tr>
                                    {columns.map((column) => {
                                      const isGoalColumn = column.toLowerCase().includes('goal');
                                      const isAlertColumn = column.toLowerCase() === 'alert';
                                      return (
                                        <th 
                                          key={column} 
                                          className={`border-b-2 border-gray-300 px-2 py-1.5 bg-gray-100 font-semibold text-gray-700 text-sm ${
                                            isGoalColumn || isAlertColumn ? 'text-left' : 'text-center'
                                          }`}
                                          style={isGoalColumn ? { minWidth: '200px' } : { minWidth: '80px' }}
                                        >
                                          {column.charAt(0).toUpperCase() + column.slice(1)}
                                        </th>
                                      );
                                    })}
                                  </tr>
                                </thead>
                                <tbody>
                                  {sprintGoalItems.map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                      {columns.map((column) => {
                                        const isGoalColumn = column.toLowerCase().includes('goal');
                                        const isAlertColumn = column.toLowerCase() === 'alert';
                                        const value = item[column];
                                        return (
                                          <td 
                                            key={column} 
                                            className={`border-b border-gray-200 px-2 py-1.5 text-sm text-gray-600 ${
                                              isGoalColumn || isAlertColumn
                                                ? 'whitespace-normal break-words text-left' 
                                                : 'text-center'
                                            } ${
                                              isAlertColumn 
                                                ? 'text-base' 
                                                : ''
                                            }`}
                                          >
                                            {column.toLowerCase() === 'progress' && typeof value === 'number'
                                              ? `${value}%`
                                              : String(value ?? '').trim()
                                            }
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        }
                        
                        // Fallback to description (markdown) for Sprint Goal cards when information_json is empty
                        return (
                          <div className="mb-4">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => <p className={`${dynamicTextSize} ${dynamicLineHeight} text-gray-600 mb-1`}>{children}</p>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              em: ({ children }) => <em className="italic">{children}</em>,
                              ul: ({ children }) => <ul className={`list-disc list-inside ${dynamicTextSize} text-gray-600`}>{children}</ul>,
                              ol: ({ children }) => <ol className={`list-decimal list-inside ${dynamicTextSize} text-gray-600`}>{children}</ol>,
                              li: ({ children }) => <li className={`${dynamicTextSize} text-gray-600`}>{children}</li>,
                              code: ({ children }) => <code className={`bg-gray-100 px-1 rounded ${dynamicTextSize}`}>{children}</code>,
                              pre: ({ children }) => <pre className={`bg-gray-100 p-2 rounded ${dynamicTextSize} overflow-x-auto`}>{children}</pre>,
                              h1: ({ children }) => <h1 className={`${dynamicTextSize} font-bold text-gray-800 mb-1`}>{children}</h1>,
                              h2: ({ children }) => <h2 className={`${dynamicTextSize} font-bold text-gray-800 mb-1`}>{children}</h2>,
                              h3: ({ children }) => <h3 className={`${dynamicTextSize} font-semibold text-gray-800 mb-1`}>{children}</h3>,
                              blockquote: ({ children }) => <blockquote className={`border-l-2 border-gray-300 pl-2 italic text-gray-600 ${dynamicTextSize}`}>{children}</blockquote>,
                              table: ({ children }) => <table className={`w-full ${dynamicTextSize} border-collapse border border-gray-300 table-fixed h-full`}>{children}</table>,
                              thead: ({ children }) => <thead>{children}</thead>,
                              tbody: ({ children }) => <tbody className="h-full">{children}</tbody>,
                              tr: ({ children }) => <tr>{children}</tr>,
                              th: ({ children }) => {
                                const text = children?.toString() || '';
                                if (text.includes('Goal') || text.includes('🎯')) {
                                  return <th className="border border-gray-300 px-1 py-0.5 bg-gray-100 font-semibold text-left w-2/3">{children}</th>;
                                }
                                return <th className="border border-gray-300 px-1 py-0.5 bg-gray-100 font-semibold text-center">{children}</th>;
                              },
                              td: ({ children }) => {
                                const text = children?.toString() || '';
                                
                                // Apply goal cell styling only for "Sprint Goal" card type
                                if (card.card_type === 'Sprint Goal') {
                                  // For sprint goal cards, ensure full text, left-aligned
                                  return <td className="border border-gray-300 px-1 py-0.5 text-left w-2/3 whitespace-normal break-words overflow-visible">{children}</td>;
                                }
                                
                                // Other card types remain center-aligned
                                return <td className="border border-gray-300 px-1 py-0.5 text-center">{children}</td>;
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
                      }
                      
                      // Parse information_json for non-Sprint Goal cards
                      const informationItems = parseInformationJson(card.information_json);
                      
                      if (informationItems && informationItems.length > 0) {
                        return (
                          <div className={`${dynamicSpacing} mb-4`}>
                            {informationItems.map((item, index) => (
                              <div key={index} className={`${dynamicTextSize} ${dynamicLineHeight}`}>
                                <span className="font-bold" style={{ color: '#2563eb', fontWeight: '700' }}>
                                  {item.header}{!item.header.endsWith(':') ? ':' : ''}
                                </span>
                                <span className="text-gray-600 ml-1">
                                  {item.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      
                      // Fallback to description (markdown) for other card types when information_json is empty
                      return (
                        <div className="mb-4">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <p className={`${dynamicTextSize} ${dynamicLineHeight} text-gray-600 mb-1`}>{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            ul: ({ children }) => <ul className={`list-disc list-inside ${dynamicTextSize} text-gray-600`}>{children}</ul>,
                            ol: ({ children }) => <ol className={`list-decimal list-inside ${dynamicTextSize} text-gray-600`}>{children}</ol>,
                            li: ({ children }) => <li className={`${dynamicTextSize} text-gray-600`}>{children}</li>,
                            code: ({ children }) => <code className={`bg-gray-100 px-1 rounded ${dynamicTextSize}`}>{children}</code>,
                            pre: ({ children }) => <pre className={`bg-gray-100 p-2 rounded ${dynamicTextSize} overflow-x-auto`}>{children}</pre>,
                            h1: ({ children }) => <h1 className={`${dynamicTextSize} font-bold text-gray-800 mb-1`}>{children}</h1>,
                            h2: ({ children }) => <h2 className={`${dynamicTextSize} font-bold text-gray-800 mb-1`}>{children}</h2>,
                            h3: ({ children }) => <h3 className={`${dynamicTextSize} font-semibold text-gray-800 mb-1`}>{children}</h3>,
                            blockquote: ({ children }) => <blockquote className={`border-l-2 border-gray-300 pl-2 italic text-gray-600 ${dynamicTextSize}`}>{children}</blockquote>,
                            table: ({ children }) => <table className={`w-full ${dynamicTextSize} border-collapse border border-gray-300 table-fixed h-full`}>{children}</table>,
                            thead: ({ children }) => <thead>{children}</thead>,
                            tbody: ({ children }) => <tbody className="h-full">{children}</tbody>,
                            tr: ({ children }) => <tr>{children}</tr>,
                            th: ({ children }) => {
                              const text = children?.toString() || '';
                              if (text.includes('Goal') || text.includes('🎯')) {
                                return <th className="border border-gray-300 px-1 py-0.5 bg-gray-100 font-semibold text-left w-2/3">{children}</th>;
                              }
                              return <th className="border border-gray-300 px-1 py-0.5 bg-gray-100 font-semibold text-center">{children}</th>;
                            },
                            td: ({ children }) => {
                              const text = children?.toString() || '';
                              
                              // Apply goal cell styling only for "Sprint Goal" card type
                              if (card.card_type === 'Sprint Goal') {
                                // For sprint goal cards, ensure full text, left-aligned
                                return <td className="border border-gray-300 px-1 py-0.5 text-left w-2/3 whitespace-normal break-words overflow-visible">{children}</td>;
                              }
                              
                              // Other card types remain center-aligned
                              return <td className="border border-gray-300 px-1 py-0.5 text-center">{children}</td>;
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
                
                {/* Recommendations Section and AI Chat Button */}
                {card.recommendations && card.recommendations.length > 0 && (() => {
                  const recommendationsToShow = card.recommendations;
                  
                  return (
                    <div className="mt-6 pt-0.5 flex-shrink-0">
                      <div className="flex items-center mb-1">
                        <h4 className="text-xs font-bold text-gray-700">Recommendations</h4>
                      </div>
                      {/* Recommendations panel */}
                      <div className="relative">
                        <div className="border-2 border-gray-300 rounded-lg shadow-sm w-full p-2 overflow-hidden">
                        <style dangerouslySetInnerHTML={{__html: `
                          .recommendations-table-scroll {
                            overflow-y: auto;
                            scrollbar-width: none;
                            -ms-overflow-style: none;
                          }
                          .recommendations-table-scroll::-webkit-scrollbar {
                            display: none;
                          }
                          .recommendations-table-scroll:hover {
                            scrollbar-width: thin;
                            scrollbar-color: #94a3b8 #f7fafc;
                          }
                          .recommendations-table-scroll:hover::-webkit-scrollbar {
                            display: block;
                            width: 8px;
                          }
                          .recommendations-table-scroll:hover::-webkit-scrollbar-track {
                            background: #f7fafc;
                            border-radius: 4px;
                          }
                          .recommendations-table-scroll:hover::-webkit-scrollbar-thumb {
                            background: #94a3b8;
                            border-radius: 4px;
                          }
                          .recommendations-table-scroll:hover::-webkit-scrollbar-thumb:hover {
                            background: #64748b;
                          }
                        `}} />
                        <div className="recommendations-table-scroll max-h-[200px] overflow-y-auto">
                          <div className="space-y-1">
                            {recommendationsToShow.map((rec: Recommendation) => {
                              const recPriorityIcon = getPriorityIcon(rec.priority);
                              const fullText = `${rec.rational || ''}${rec.rational && rec.action_text ? ' - ' : ''}${rec.action_text || ''}`;
                              const isTooLong = fullText.length > 50;
                              const isTooltipOpen = isRecTooltipExpanded(rec.id);
                              const buttonPosition = buttonPositions[rec.id];
                              
                              return (
                                <div key={rec.id} className={`flex items-center gap-2 border-b border-gray-200 py-1 last:border-b-0`}>
                                  <div className="flex-shrink-0 w-4 flex items-center justify-center">
                                    <span className="text-xs">{recPriorityIcon}</span>
                                  </div>
                                  <div className="flex-1 min-w-0 overflow-hidden">
                                    <div className={`${dynamicTextSize} text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis`}>
                                      {rec.rational && (
                                        <span className="font-bold text-purple-600">
                                          {rec.rational}
                                        </span>
                                      )}
                                      {rec.rational && rec.action_text && <span className="mx-1 text-gray-400">-</span>}
                                      {rec.action_text}
                                    </div>
                                  </div>
                                  {/* "see more" button inline at the end of each recommendation */}
                                  <button
                                    data-tooltip-button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const panel = e.currentTarget.closest('.border-2.border-gray-300');
                                      if (panel) {
                                        const rect = panel.getBoundingClientRect();
                                        toggleRecTooltip(rec.id, e.currentTarget);
                                        // Update position to left of panel
                                        setButtonPositions(prev => ({
                                          ...prev,
                                          [rec.id]: {
                                            top: rect.bottom + window.scrollY,
                                            left: rect.left + window.scrollX
                                          }
                                        }));
                                      }
                                    }}
                                    className="text-blue-600 hover:text-blue-800 text-xs flex-shrink-0"
                                    title="See more"
                                  >
                                    👁️
                                  </button>
                                  {/* Tooltip/Balloon with full text - rendered with portal */}
                                  {isTooltipOpen && typeof window !== 'undefined' && buttonPosition && createPortal(
                                    <div 
                                      data-tooltip-content
                                      className="fixed"
                                      style={{ 
                                        top: `${buttonPosition.top + 4}px`,
                                        left: `${buttonPosition.left}px`,
                                        zIndex: 10001
                                      }}
                                    >
                                      <div 
                                        className="bg-white border-2 border-blue-300 rounded-lg shadow-2xl p-4 min-w-[300px] max-w-[450px]"
                                      >
                                        <div className="text-sm text-gray-700 leading-relaxed whitespace-normal break-words">
                                          {rec.rational && (
                                            <span className="font-bold text-purple-600">
                                              {rec.rational}
                                            </span>
                                          )}
                                          {rec.rational && rec.action_text && <span className="mx-1 text-gray-400">-</span>}
                                          {rec.action_text}
                                        </div>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleRecTooltip(rec.id);
                                          }}
                                          className="mt-3 text-blue-600 hover:text-blue-800 text-xs font-semibold underline"
                                        >
                                          Close
                                        </button>
                                      </div>
                                    </div>,
                                    document.body
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
        })}
        {/* Empty placeholder slots to maintain grid layout */}
        {Array.from({ length: emptySlots }).map((_, index) => (
          <div key={`empty-${index}`} className="bg-white rounded-xl shadow-md border-2 border-gray-200 opacity-0 pointer-events-none" aria-hidden="true">
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
    </div>
  );
}
