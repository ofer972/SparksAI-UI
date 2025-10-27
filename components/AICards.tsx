'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ApiService } from '@/lib/api';

// Constants
const CARD_DESCRIPTION_MAX_LENGTH = 750;

interface AICardProps {
  teamName: string;
}

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
}

interface AICardsResponse {
  success: boolean;
  data: {
    ai_cards: AICard[];
    count: number;
    team_name: string;
    limit: number;
  };
  message: string;
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

export default function AICards({ teamName }: AICardProps) {
  const [cards, setCards] = useState<AICard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleAIChat = (card: AICard) => {
    // Each card will have its own behavior based on content
    console.log('AI Chat clicked for card:', {
      id: card.id,
      cardName: card.card_name,
      cardType: card.card_type,
      priority: card.priority,
      description: card.description.substring(0, 100) + '...'
    });
    
    // TODO: Implement specific behavior based on card content
    // This could open a chat modal, navigate to a specific page, etc.
    alert(`AI Chat for ${card.card_name} (${card.card_type}) - Priority: ${card.priority}`);
  };

  useEffect(() => {
    const fetchAICards = async () => {
      try {
        setLoading(true);
        const apiService = new ApiService();
        const response = await apiService.getAICards(teamName);
        
        if (response.ai_cards) {
          setCards(response.ai_cards);
        } else {
          throw new Error('Failed to fetch AI cards');
        }
      } catch (err) {
        console.error('Error fetching AI cards:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch AI cards');
      } finally {
        setLoading(false);
      }
    };

    if (teamName) {
      fetchAICards();
    }
  }, [teamName]);

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
          <p className="text-xs text-gray-600">No AI insights available for {teamName} at this time.</p>
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
              <div key={card.id} className={`bg-white rounded-lg shadow-lg pt-2 pb-4 px-4 border-l-4 border ${colors.border} ${colors.frame} min-h-[170px] relative`}>
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
                  <div className="text-xs text-gray-500 font-medium">
                    {card.card_type}
                  </div>
                </div>
                
                <div className="mb-1 flex-1">
                  <div className="text-xs text-gray-600 prose prose-sm max-w-none w-full h-full overflow-visible">
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
    </div>
  );
}
