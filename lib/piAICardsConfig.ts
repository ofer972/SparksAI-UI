// PI AI Cards Entity Configuration
import { EntityConfig } from './entityConfig';
import { ApiService } from './api';
import { AICard } from './config';

// PI AI Cards use the same structure as Team AI Cards
export type PIAICard = AICard;

export const piAICardsConfig: EntityConfig<PIAICard> = {
  endpoints: {
    list: '/api/v1/pi-ai-cards',
    detail: '/api/v1/pi-ai-cards',
  },

  fetchList: async () => {
    const apiService = new ApiService();
    return apiService.getPIAICardsList();
  },

  fetchDetail: async (id: string) => {
    const apiService = new ApiService();
    return apiService.getPIAICardDetail(id);
  },

  primaryKey: 'id',
  title: 'PI AI Cards',

  // Column overrides similar to Team AI Cards
  columnOverrides: {
    id: { width: '80px', align: 'center' },
    priority: { width: '100px', align: 'center' },
    date: { width: '120px', align: 'center' },
    description: { width: '200px' },
  },

  fieldColors: {
    priority: (priority: string) => {
      switch ((priority || '').toLowerCase()) {
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
    },
  },

  formatCellValue: (value: any, key: keyof PIAICard) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);

    if (key === 'date') {
      try {
        const d = new Date(value as any);
        return d.toLocaleDateString();
      } catch {
        return String(value);
      }
    }
    if (key === 'description' && typeof value === 'string') {
      return value.length > 100 ? value.substring(0, 100) + '...' : value;
    }
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...';
    }
    return String(value);
  },

  normalFields: ['id', 'card_name', 'card_type', 'priority', 'team_name', 'date', 'source'],
  longTextFields: ['description', 'full_information', 'information_json'],
};
