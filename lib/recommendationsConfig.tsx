import React from 'react';
import { EntityConfig } from './entityConfig';

// Recommendations Entity Configuration
export interface Recommendation {
  id: number;
  team_name: string;
  date: string;
  action_text: string;
  rational: string;
  full_information: string;
  priority: string;
  status: string;
  information_json?: string;
}

export const recommendationsConfig: EntityConfig<Recommendation> = {
  endpoints: {
    list: '/recommendations/getTeamTop',
    detail: '/recommendations',
  },
  
  fetchList: async () => {
    // Not used in RecommendationsInsight, but required by EntityConfig
    return [];
  },
  
  // No fetchDetail - we'll use the item data directly since there's no detail endpoint
  // ViewRecordModal will use the item data directly when fetchDetail is undefined
  
  primaryKey: 'id',
  title: 'Recommendations',
  
  // Field categorization for detail view
  normalFields: ['id', 'team_name', 'date', 'priority', 'status'],
  longTextFields: ['action_text', 'rational', 'full_information', 'information_json'],
  markdownFields: ['action_text', 'rational', 'full_information'],
  
  formatCellValue: (value: any, key: keyof Recommendation) => {
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
    
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...';
    }
    return String(value);
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
};

