'use client';

import React, { useState, useEffect } from 'react';
import { ApiService } from '@/lib/api';
import TreeSelect from './TreeSelect';

interface InsightCard {
  id: number;
  card_name: string;
  insight_type: string;
  team_name?: string;
  group_name?: string;
  pi?: string;
  updated_at: string;
}

interface InsightCardSelectorProps {
  onSelectCard?: (cardId: string) => void; // Single select (legacy)
  onSelectCards?: (cardIds: string[]) => void; // Multi-select (legacy)
  selectedCardIds?: string[]; // For multi-select mode (legacy)
  onUpdateCounts?: (counts: Record<string, number>) => void; // Counter-based mode (new)
  currentCounts?: Record<string, number>; // Current counts for counter-based mode
  filters?: {
    teamName?: string;
    groupName?: string;
    piName?: string;
    categories?: string[];
  };
}

export default function InsightCardSelector({
  onSelectCard,
  onSelectCards,
  selectedCardIds = [],
  onUpdateCounts,
  currentCounts = {},
  filters,
}: InsightCardSelectorProps) {
  const [cards, setCards] = useState<InsightCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Counter-based mode: track counts for each insight card
  const [cardCounts, setCardCounts] = useState<Map<string, number>>(() => {
    const counts = new Map<string, number>();
    Object.entries(currentCounts).forEach(([id, count]) => {
      counts.set(id, count);
    });
    return counts;
  });
  
  // Update counts when currentCounts prop changes (when modal opens)
  useEffect(() => {
    if (onUpdateCounts) {
      const counts = new Map<string, number>();
      Object.entries(currentCounts).forEach(([id, count]) => {
        counts.set(id, count);
      });
      setCardCounts(counts);
    }
  }, [currentCounts, onUpdateCounts]);
  
  // Notify parent of count changes
  useEffect(() => {
    if (onUpdateCounts) {
      const countsObj: Record<string, number> = {};
      cardCounts.forEach((count, id) => {
        if (count > 0) {
          countsObj[id] = count;
        }
      });
      onUpdateCounts(countsObj);
    }
  }, [cardCounts, onUpdateCounts]);
  
  // Filter state
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedPI, setSelectedPI] = useState<string>('');
  const [selectedTreeType, setSelectedTreeType] = useState<'team' | 'group'>('team');
  const [selectedTreeValue, setSelectedTreeValue] = useState<string | null>(null);

  useEffect(() => {
    loadInsightCards();
  }, [selectedTeam, selectedGroup, selectedPI]);

  const loadInsightCards = async () => {
    setLoading(true);
    setError(null);
    try {
      const api = new ApiService();
      
      // Determine insight type based on selection
      let insightType = 'team';
      let teamName = selectedTeam;
      let groupName = selectedGroup;
      
      if (selectedGroup) {
        insightType = 'group';
      } else if (selectedPI) {
        insightType = 'pi';
      }
      
      // Fetch insight cards
      const response = await fetch(
        `/api/ai-insights?insight_type=${insightType}${teamName ? `&team_name=${teamName}` : ''}${groupName ? `&group_name=${groupName}` : ''}${selectedPI ? `&pi=${selectedPI}` : ''}&limit=100`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch insight cards');
      }
      
      const data = await response.json();
      setCards(data.data || data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load insight cards');
    } finally {
      setLoading(false);
    }
  };

  const handleTreeSelect = (value: string | null, label: string, type: 'team' | 'group') => {
    setSelectedTreeValue(value);
    setSelectedTreeType(type);
    
    if (type === 'team' && value) {
      // Extract team name from tree value (format: "team:7" or just "7")
      const teamId = value.includes(':') ? value.split(':')[1] : value;
      setSelectedTeam(teamId);
      setSelectedGroup('');
    } else if (type === 'group' && value) {
      // Extract group name from tree value
      const groupId = value.includes(':') ? value.split(':')[1] : value;
      setSelectedGroup(groupId);
      setSelectedTeam('');
    } else {
      setSelectedTeam('');
      setSelectedGroup('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team / Group
            </label>
            <TreeSelect
              selectedValue={selectedTreeValue}
              onSelect={handleTreeSelect}
              placeholder="Select team or group"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PI (optional)
            </label>
            <input
              type="text"
              value={selectedPI}
              onChange={(e) => setSelectedPI(e.target.value)}
              placeholder="Enter PI name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={loadInsightCards}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Cards List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading insight cards...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No insight cards found. Adjust your filters and try again.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((card) => {
            const cardId = card.id.toString();
            const currentCount = cardCounts.get(cardId) || 0;
            const hasInstances = currentCount > 0;
            
            return (
              <div
                key={card.id}
                className={`p-4 border-2 rounded-lg hover:shadow-md transition-all ${
                  hasInstances
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{card.card_name}</h3>
                  {onUpdateCounts ? (
                    <div className="flex items-center gap-2">
                      {hasInstances && (
                        <span className="text-xs text-gray-600 mr-1">
                          {currentCount} on dashboard
                        </span>
                      )}
                      <div className="flex items-center gap-1 border border-gray-300 rounded">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCardCounts(prev => {
                              const next = new Map(prev);
                              const current = next.get(cardId) || 0;
                              if (current > 0) {
                                next.set(cardId, current - 1);
                                if (current === 1) {
                                  next.delete(cardId);
                                }
                              }
                              return next;
                            });
                          }}
                          disabled={currentCount === 0}
                          className="px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          −
                        </button>
                        <span className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center">
                          {currentCount}
                        </span>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCardCounts(prev => {
                              const next = new Map(prev);
                              next.set(cardId, (next.get(cardId) || 0) + 1);
                              return next;
                            });
                          }}
                          className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        if (onSelectCards) {
                          // Multi-select mode (legacy)
                          const isSelected = selectedCardIds.includes(cardId);
                          if (isSelected) {
                            onSelectCards(selectedCardIds.filter(id => id !== cardId));
                          } else {
                            onSelectCards([...selectedCardIds, cardId]);
                          }
                        } else if (onSelectCard) {
                          // Single select mode (legacy)
                          onSelectCard(cardId);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {onSelectCards && selectedCardIds.includes(cardId) && (
                        <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                    {card.insight_type}
                  </span>
                  {card.team_name && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      Team: {card.team_name}
                    </span>
                  )}
                  {card.group_name && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                      Group: {card.group_name}
                    </span>
                  )}
                  {card.pi && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                      PI: {card.pi}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Updated: {new Date(card.updated_at).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

