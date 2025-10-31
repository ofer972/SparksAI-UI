'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ViewRecordModal } from '@/components/ViewRecordModal';
import { EntityConfig } from '@/lib/entityConfig';
import AIChatModal from '@/components/AIChatModal';

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
        for (let i = 0; i < flatArray.length; i += 4) {
          if (i + 3 < flatArray.length) {
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
        <div className="grid grid-cols-2 gap-3 w-full h-full">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-gray-200 animate-pulse min-h-[170px]">
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
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <div className="text-gray-400 text-4xl mb-3">📋</div>
          <h2 className="text-sm font-semibold mb-2">No AI Cards Available</h2>
          <p className="text-xs text-gray-600">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="grid grid-cols-2 gap-3 w-full h-full">
        {[...Array(4)].map((_, index) => {
          const card = cards[index];
          
          if (card) {
            const colors = getPriorityColor(card.priority);
            const priorityIcon = getPriorityIcon(card.priority);
            
            return (
              <div key={card.id} className={`bg-white rounded-lg shadow-lg pt-1 pb-4 px-4 border-l-4 border ${colors.border} ${colors.frame} min-h-[170px] relative`}>
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <div className="relative group">
                      <span className="text-lg cursor-pointer">
                        {priorityIcon}
                      </span>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        {card.priority}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-800">{card.card_name}</h3>
                  </div>
                  <div className="absolute left-1/2 transform -translate-x-1/2 top-0">
                    <button 
                      onClick={() => handleViewCard(card)}
                      className="text-xs text-blue-600 underline hover:text-blue-800 cursor-pointer bg-transparent border-none p-0 font-medium"
                      title="Click to view details"
                    >
                      ID: {card.id}
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 font-medium">
                    {card.card_type}
                  </div>
                </div>
                
                <div className="mb-1 flex-1">
                  <div className="text-xs text-gray-600 max-w-none w-full h-full overflow-visible">
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
                            <div className="w-full overflow-auto max-h-32 -mt-1" style={{ width: '100%', display: 'block' }}>
                              <table 
                                className="text-xs border-collapse border border-gray-300" 
                                style={{ width: '90%', marginLeft: 0, marginRight: 'auto', textAlign: 'center' }}
                              >
                                <thead>
                                  <tr>
                                    {columns.map((column) => {
                                      const isGoalColumn = column.toLowerCase().includes('goal');
                                      return (
                                        <th 
                                          key={column} 
                                          className={`border border-gray-300 px-1 py-0 bg-gray-100 font-semibold ${
                                            isGoalColumn ? 'text-left w-3/5' : 'w-auto'
                                          }`}
                                          style={isGoalColumn ? { textAlign: 'left', width: '60%' } : { textAlign: 'center' }}
                                        >
                                          {column.charAt(0).toUpperCase() + column.slice(1)}
                                        </th>
                                      );
                                    })}
                                  </tr>
                                </thead>
                                <tbody>
                                  {sprintGoalItems.map((item, index) => (
                                    <tr key={index}>
                                      {columns.map((column) => {
                                        const isGoalColumn = column.toLowerCase().includes('goal');
                                        const value = item[column];
                                        return (
                                          <td 
                                            key={column} 
                                            className={`border border-gray-300 px-1 py-0 ${
                                              isGoalColumn 
                                                ? 'whitespace-normal break-words' 
                                                : ''
                                            } ${
                                              column.toLowerCase() === 'alert' 
                                                ? 'text-lg' 
                                                : ''
                                            }`}
                                            style={isGoalColumn ? { textAlign: 'left', width: '60%' } : { textAlign: 'center' }}
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
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => <p className="text-xs text-gray-600 mb-1">{children}</p>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              em: ({ children }) => <em className="italic">{children}</em>,
                              ul: ({ children }) => <ul className="list-disc list-inside text-xs text-gray-600">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside text-xs text-gray-600">{children}</ol>,
                              li: ({ children }) => <li className="text-xs text-gray-600">{children}</li>,
                              code: ({ children }) => <code className="bg-gray-100 px-1 rounded text-xs">{children}</code>,
                              pre: ({ children }) => <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">{children}</pre>,
                              h1: ({ children }) => <h1 className="text-sm font-bold text-gray-800 mb-1">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-xs font-bold text-gray-800 mb-1">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-xs font-semibold text-gray-800 mb-1">{children}</h3>,
                              blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-300 pl-2 italic text-gray-600">{children}</blockquote>,
                              table: ({ children }) => <table className="w-full text-xs border-collapse border border-gray-300 table-fixed h-full">{children}</table>,
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
                        );
                      }
                      
                      // Parse information_json for non-Sprint Goal cards
                      const informationItems = parseInformationJson(card.information_json);
                      
                      if (informationItems && informationItems.length > 0) {
                        return (
                          <div className="space-y-2">
                            {informationItems.map((item, index) => (
                              <div key={index} className="text-xs">
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
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <p className="text-xs text-gray-600 mb-1">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            ul: ({ children }) => <ul className="list-disc list-inside text-xs text-gray-600">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside text-xs text-gray-600">{children}</ol>,
                            li: ({ children }) => <li className="text-xs text-gray-600">{children}</li>,
                            code: ({ children }) => <code className="bg-gray-100 px-1 rounded text-xs">{children}</code>,
                            pre: ({ children }) => <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">{children}</pre>,
                            h1: ({ children }) => <h1 className="text-sm font-bold text-gray-800 mb-1">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-xs font-bold text-gray-800 mb-1">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-xs font-semibold text-gray-800 mb-1">{children}</h3>,
                            blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-300 pl-2 italic text-gray-600">{children}</blockquote>,
                            table: ({ children }) => <table className="w-full text-xs border-collapse border border-gray-300 table-fixed h-full">{children}</table>,
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
                      );
                    })()}
                  </div>
                </div>
                
                {/* Fixed AI Chat Button - positioned at bottom-right */}
                <button 
                  onClick={() => handleAIChat(card)}
                  className="absolute bottom-2 right-2 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-full text-xs font-medium transition-colors shadow-sm hover:shadow-md"
                >
                  AI Chat
                </button>
              </div>
            );
          } else {
            // Render empty placeholder card to maintain layout
            return (
              <div key={`placeholder-${index}`} className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-gray-200 min-h-[170px]">
                {/* Empty placeholder to maintain grid structure */}
              </div>
            );
          }
        })}
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
