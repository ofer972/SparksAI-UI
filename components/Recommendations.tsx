'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ApiService } from '@/lib/api';

// Constants
const MAX_RECOMMENDATIONS = 3;
const RECOMMENDATION_TEXT_MAX_LENGTH = 200;

interface RecommendationsProps {
  teamName: string;
}

interface Recommendation {
  id: number;
  team_name: string;
  date: string;
  action_text: string;
  rational: string;
  full_information: string;
  priority: string;
  status: string;
}

interface RecommendationsResponse {
  success: boolean;
  data: {
    recommendations: Recommendation[];
    count: number;
    team_name: string;
    limit: number;
  };
  message: string;
}

const getRecommendationIcon = (actionText: string) => {
  const text = actionText.toLowerCase();
  if (text.includes('schedule') || text.includes('meeting') || text.includes('discussion')) {
    return '📅'; // Calendar/schedule icon
  } else if (text.includes('generate') || text.includes('report') || text.includes('document')) {
    return '📄'; // Document/report icon
  } else if (text.includes('optimization') || text.includes('process') || text.includes('workflow')) {
    return '🔧'; // Wrench/tool icon
  } else if (text.includes('flow') || text.includes('delivery') || text.includes('momentum')) {
    return '⚡'; // Lightning/flow icon
  } else if (text.includes('transparency') || text.includes('trust') || text.includes('collaboration')) {
    return '🤝'; // Handshake/collaboration icon
  } else {
    return '💡'; // Lightbulb/default icon
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

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric',
    month: 'short', 
    day: 'numeric' 
  });
};

export default function Recommendations({ teamName }: RecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);

  const handleReason = (recommendation: Recommendation) => {
    setSelectedRecommendation(recommendation);
  };

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const apiService = new ApiService();
        const response = await apiService.getRecommendations(teamName);
        
        if (response.recommendations) {
          setRecommendations(response.recommendations.slice(0, 3)); // Limit to 3 recommendations
        } else {
          throw new Error('Failed to fetch recommendations');
        }
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
      } finally {
        setLoading(false);
      }
    };

    if (teamName) {
      fetchRecommendations();
    }
  }, [teamName]);

  if (loading) {
    return (
      <div className="px-3 pt-3">
        <h3 className="text-sm font-semibold mb-1">Recommendations</h3>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm px-3 py-2 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div>
                    <div className="h-3 bg-gray-200 rounded w-32 mb-1"></div>
                    <div className="h-2 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-3 bg-gray-200 rounded w-8"></div>
                  <div className="h-4 bg-gray-200 rounded w-4"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-3 pt-3">
        <h3 className="text-sm font-semibold mb-1">Recommendations</h3>
        <div className="text-center py-4">
          <div className="text-red-500 text-2xl mb-1">⚠️</div>
          <p className="text-xs text-gray-600">Error loading recommendations</p>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="px-3 pt-3">
        <h3 className="text-sm font-semibold mb-1">Recommendations</h3>
        <div className="text-center py-4">
          <div className="text-gray-400 text-2xl mb-1">💡</div>
          <p className="text-xs text-gray-600">No recommendations available for {teamName}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pt-3">
      <h3 className="text-sm font-semibold mb-1">Recommendations</h3>
      <div className="space-y-2">
        {[...Array(3)].map((_, index) => {
          const recommendation = recommendations[index];
          
          if (recommendation) {
            const priorityIcon = getPriorityIcon(recommendation.priority);
            const colors = getPriorityColor(recommendation.priority);
            const formattedDate = formatDate(recommendation.date);
            
            return (
              <div key={recommendation.id} className="bg-white rounded-lg shadow-sm px-3 py-2 border border-gray-300 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <div className="text-xs text-gray-600 prose prose-sm max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <p className="text-xs text-gray-600 mb-1">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-gray-800">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            ul: ({ children }) => <ul className="list-disc list-inside text-xs text-gray-600">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside text-xs text-gray-600">{children}</ol>,
                            li: ({ children }) => <li className="text-xs text-gray-600">{children}</li>,
                          }}
                        >
                          {recommendation.action_text.length > RECOMMENDATION_TEXT_MAX_LENGTH 
                            ? `${recommendation.action_text.substring(0, RECOMMENDATION_TEXT_MAX_LENGTH)}...`
                            : recommendation.action_text
                          }
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-xs text-gray-500">{formattedDate}</div>
                    <div className="relative group">
                      <span className="text-sm cursor-pointer">
                        {priorityIcon}
                      </span>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        {recommendation.priority}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                      </div>
                    </div>
                    {/* Reason Button - positioned on same row as date, after priority icon */}
                    <button 
                      onClick={() => handleReason(recommendation)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-full text-xs font-medium transition-colors shadow-sm hover:shadow-md"
                    >
                      Reason
                    </button>
                  </div>
                </div>
              </div>
            );
          } else {
            // Render empty placeholder container
            return (
              <div key={`placeholder-${index}`} className="bg-white rounded-lg shadow-sm px-3 py-2">
                {/* Empty placeholder to maintain layout */}
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}
