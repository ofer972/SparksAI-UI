// Example: AI Cards Entity Configuration
import { EntityConfig } from './entityConfig';

export interface AICard {
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

export const aiCardsConfig: EntityConfig<AICard> = {
  endpoints: {
    list: '/api/v1/team-ai-cards/getCards',
    detail: '/api/v1/team-ai-cards/getCard', // hypothetical detail endpoint
  },
  
  fetchList: async (teamName?: string) => {
    const { ApiService } = await import('./api');
    const apiService = new ApiService();
    const result = await apiService.getAICards(teamName || 'AutoDesign-Dev');
    return result.ai_cards;
  },
  
  fetchDetail: async (id: string) => {
    // Hypothetical detail fetch - would need to be implemented in ApiService
    const { ApiService } = await import('./api');
    const apiService = new ApiService();
    return apiService.getTeamAICardDetail(id);
  },
  
  columns: [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      searchable: true,
      width: '80px',
      align: 'center',
    },
    {
      key: 'card_name',
      label: 'Card Name',
      sortable: true,
      searchable: true,
      width: '200px',
    },
    {
      key: 'card_type',
      label: 'Type',
      sortable: true,
      searchable: true,
      width: '120px',
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      searchable: true,
      width: '100px',
      align: 'center',
    },
    {
      key: 'team_name',
      label: 'Team',
      sortable: true,
      searchable: true,
      width: '120px',
    },
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      searchable: false,
      width: '120px',
      align: 'center',
    },
    {
      key: 'description',
      label: 'Description',
      sortable: false,
      searchable: true,
      width: '300px',
    },
  ],
  
  primaryKey: 'id',
  title: 'AI Cards',
  
  searchFields: ['card_name', 'card_type', 'priority', 'team_name', 'description'],
  
  formatCellValue: (value: any, key: keyof AICard) => {
    if (value === null || value === undefined) return '-';
    
    if (key === 'date') {
      try {
        const date = new Date(value);
        return date.toLocaleDateString();
      } catch {
        return String(value);
      }
    }
    
    if (key === 'description' && typeof value === 'string') {
      if (value.length > 100) {
        return value.substring(0, 100) + '...';
      }
      return value;
    }
    
    return String(value);
  },
  
  // Field categorization for detail view
  normalFields: ['id', 'card_name', 'card_type', 'priority', 'team_name', 'date', 'source'],
  longTextFields: ['description', 'full_information', 'information_json'],
};
