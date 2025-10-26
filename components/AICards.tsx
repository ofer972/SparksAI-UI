'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

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
        bg: 'bg-red-600',
        text: 'text-red-700',
        button: 'bg-red-600 hover:bg-red-700'
      };
    case 'high':
      return {
        border: 'border-yellow-500',
        bg: 'bg-yellow-500',
        text: 'text-yellow-600',
        button: 'bg-yellow-500 hover:bg-yellow-600'
      };
    case 'medium':
      return {
        border: 'border-orange-500',
        bg: 'bg-orange-500',
        text: 'text-orange-600',
        button: 'bg-orange-500 hover:bg-orange-600'
      };
    case 'low':
      return {
        border: 'border-green-500',
        bg: 'bg-green-500',
        text: 'text-green-600',
        button: 'bg-green-500 hover:bg-green-600'
      };
    default:
      return {
        border: 'border-gray-500',
        bg: 'bg-gray-500',
        text: 'text-gray-600',
        button: 'bg-gray-500 hover:bg-gray-600'
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

const getActionButtonText = (cardType: string) => {
  switch (cardType.toLowerCase()) {
    case 'daily progress':
      return 'View Progress';
    case 'communication':
      return 'Review Analysis';
    case 'sprint goal':
      return 'View Goals';
    default:
      return 'View Details';
  }
};

export default function AICards({ teamName }: AICardProps) {
  const [cards, setCards] = useState<AICard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAICards = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          team_name: teamName,
        });
        
        const response = await fetch(`https://sparksai-backend-production.up.railway.app/api/v1/team-ai-cards/getCards?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: AICardsResponse = await response.json();
        
        if (data.success && data.data.ai_cards) {
          setCards(data.data.ai_cards);
        } else {
          throw new Error(data.message || 'Failed to fetch AI cards');
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
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 w-full">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-gray-200 animate-pulse min-h-[200px]">
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
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="text-red-500 text-4xl mb-3">⚠️</div>
        <h2 className="text-sm font-semibold mb-2">Error Loading AI Cards</h2>
        <p className="text-xs text-gray-600">{error}</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="text-gray-400 text-4xl mb-3">📋</div>
        <h2 className="text-sm font-semibold mb-2">No AI Cards Available</h2>
        <p className="text-xs text-gray-600">No AI insights available for {teamName} at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 w-full">
        {cards.slice(0, 4).map((card) => {
          const colors = getPriorityColor(card.priority);
          const actionText = getActionButtonText(card.card_type);
          const priorityIcon = getPriorityIcon(card.priority);
          
          console.log('Card:', card.card_name, 'Priority:', card.priority, 'Border class:', colors.border);
          
          return (
            <div key={card.id} className={`bg-white rounded-lg shadow-lg p-4 border-l-4 ${colors.border} min-h-[200px]`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{priorityIcon}</span>
                  <h3 className="text-sm font-semibold text-gray-800">{card.card_name}</h3>
                </div>
                <div className="text-xs text-gray-500 font-medium">{card.card_type}</div>
              </div>
              
              <div className="mb-2">
                <div className="text-xs text-gray-600 prose prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="text-xs text-gray-600 mb-1">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      ul: ({ children }) => <ul className="list-disc list-inside text-xs text-gray-600">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside text-xs text-gray-600">{children}</ol>,
                      li: ({ children }) => <li className="text-xs text-gray-600">{children}</li>,
                      code: ({ children }) => <code className="bg-gray-100 px-1 rounded text-xs">{children}</code>,
                      pre: ({ children }) => <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">{children}</pre>,
                    }}
                  >
                    {card.description.length > 200 
                      ? `${card.description.substring(0, 200)}...` 
                      : card.description
                    }
                  </ReactMarkdown>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button className={`${colors.button} text-white px-3 py-1 rounded text-xs font-medium transition-colors`}>
                  {actionText}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
