'use client';

import { useState, useEffect } from 'react';

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

const getActionButtonText = (actionText: string) => {
  const text = actionText.toLowerCase();
  if (text.includes('schedule') || text.includes('meeting')) {
    return 'Schedule';
  } else if (text.includes('generate') || text.includes('report')) {
    return 'Generate';
  } else if (text.includes('optimization') || text.includes('process')) {
    return 'Explore';
  } else if (text.includes('flow') || text.includes('delivery')) {
    return 'Prioritize';
  } else if (text.includes('transparency') || text.includes('trust')) {
    return 'Facilitate';
  } else {
    return 'View';
  }
};

const getShortDescription = (actionText: string) => {
  // Extract a shorter description from the action text
  if (actionText.includes(':')) {
    const parts = actionText.split(':');
    if (parts.length > 1) {
      return parts[1].trim().substring(0, 50) + '...';
    }
  }
  return actionText.substring(0, 50) + '...';
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

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          team_name: teamName,
        });
        
        const response = await fetch(`https://sparksai-backend-production.up.railway.app/api/v1/recommendations/getTop?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: RecommendationsResponse = await response.json();
        
        if (data.success && data.data.recommendations) {
          setRecommendations(data.data.recommendations.slice(0, 3)); // Limit to 3 recommendations
        } else {
          throw new Error(data.message || 'Failed to fetch recommendations');
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
      <div className="bg-white rounded-lg shadow-sm p-3">
        <h3 className="text-sm font-semibold mb-2">Recommendations</h3>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded animate-pulse">
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
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-3">
        <h3 className="text-sm font-semibold mb-2">Recommendations</h3>
        <div className="text-center py-4">
          <div className="text-red-500 text-2xl mb-2">⚠️</div>
          <p className="text-xs text-gray-600">Error loading recommendations</p>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-3">
        <h3 className="text-sm font-semibold mb-2">Recommendations</h3>
        <div className="text-center py-4">
          <div className="text-gray-400 text-2xl mb-2">💡</div>
          <p className="text-xs text-gray-600">No recommendations available for {teamName}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-3">
      <h3 className="text-sm font-semibold mb-2">Recommendations</h3>
      <div className="space-y-2">
        {recommendations.map((recommendation) => {
          const actionText = getActionButtonText(recommendation.action_text);
          const shortDescription = getShortDescription(recommendation.action_text);
          const priorityIcon = getPriorityIcon(recommendation.priority);
          const formattedDate = formatDate(recommendation.date);
          
          return (
            <div key={recommendation.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center space-x-3">
                <div>
                  <div className="text-sm font-medium text-gray-800">
                    {recommendation.action_text.split(':')[0] || recommendation.action_text.substring(0, 40) + '...'}
                  </div>
                  <div className="text-xs text-gray-600">
                    {shortDescription}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-xs text-gray-500">{formattedDate}</div>
                <div className="relative group">
                  <span className="text-sm cursor-pointer">
                    {priorityIcon}
                  </span>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    {recommendation.priority}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors">
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
