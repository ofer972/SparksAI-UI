import React from 'react';
import { EntityConfig } from './entityConfig';
// Team AI Cards Entity Configuration
export interface TeamAICard {
  id: number;
  date: string;
  team_name: string;
  card_name: string;
  card_type: string;
  priority: string;
  source: string;
  source_job_id?: string | number;
  description: string;
  full_information: string;
  information_json?: string;
}

export const teamAICardsConfig: EntityConfig<TeamAICard> = {
  endpoints: {
    list: '/api/v1/team-ai-cards',
    detail: '/api/v1/team-ai-cards',
  },
  
  fetchList: async () => {
    const { ApiService } = await import('./api');
    const apiService = new ApiService();
    return apiService.getTeamAICards();
  },
  
  fetchDetail: async (id: string) => {
    const { ApiService } = await import('./api');
    const apiService = new ApiService();
    return apiService.getTeamAICardDetail(id);
  },
  
  primaryKey: 'id',
  title: 'Team AI Cards',
  
  // Only specify what's special (overrides)
  columnOverrides: {
    'id': { 
      width: '80px', 
      align: 'center',
      render: (value, item, onViewItem) => (
        <button 
          onClick={() => onViewItem?.(item)}
          className="text-blue-600 underline hover:text-blue-800 cursor-pointer bg-transparent border-none p-0 font-inherit"
        >
          {value}
        </button>
      )
    },
    'priority': { width: '100px', align: 'center' },
    'date': { width: '120px', align: 'center' },
    'description': { width: '200px' },
  },
  
  fieldColors: {
    'priority': (priority: string) => {
      switch (priority?.toLowerCase()) {
        case 'critical':
          return 'text-red-600 font-semibold';
        case 'high':
          return 'text-yellow-600 font-semibold';
        case 'medium':
          return 'text-orange-600 font-semibold';
        case 'low':
          return 'text-green-600 font-semibold';
        default:
          return 'text-gray-600 font-semibold';
      }
    }
  },
  
  formatCellValue: (value: any, key: keyof TeamAICard) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    
    // Special formatting for dates
    if (key === 'date') {
      try {
        const date = new Date(value);
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const day = date.getDate();
        const year = date.getFullYear();
        return `${month} ${day} ${year}`;
      } catch {
        return String(value);
      }
    }
    
    // Special formatting for description
    if (key === 'description' && typeof value === 'string') {
      if (value.length > 100) {
        return value.substring(0, 100) + '...';
      }
      return value;
    }
    
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...';
    }
    return String(value);
  },
  
  // Field categorization for detail view
  normalFields: ['id', 'card_name', 'card_type', 'priority', 'team_name', 'date', 'source', 'source_job_id'],
  longTextFields: ['description', 'full_information', 'information_json'],
};
