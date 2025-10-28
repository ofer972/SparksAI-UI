// PI AI Cards Entity Configuration
import { EntityConfig } from './entityConfig';
import { ApiService } from './api';
import { AICard } from './config';

// PI AI Cards use the same structure as Team AI Cards
export type PIAICard = AICard;

export const piAICardsConfig: EntityConfig<PIAICard> = {
  endpoints: {
    list: '/api/v1/pi-ai-cards/getCards',
    detail: '/api/v1/pi-ai-cards/getCard', // hypothetical detail endpoint
  },
  
  fetchList: async (piName?: string) => {
    const apiService = new ApiService();
    const result = await apiService.getPIAICards(piName || 'Q32025');
    return result.ai_cards || [];
  },
  
  columns: [
    { key: 'id', label: 'ID' },
    { key: 'card_name', label: 'Card Name' },
    { key: 'card_type', label: 'Card Type' },
    { key: 'priority', label: 'Priority' },
    { key: 'source', label: 'Source' },
    { key: 'date', label: 'Date' },
    { key: 'description', label: 'Description' },
    { key: 'full_information', label: 'Full Information' },
  ],
  
  primaryKey: 'id',
  title: 'PI AI Cards',
  
  searchFields: ['card_name', 'card_type', 'priority', 'team_name', 'description'],
};
