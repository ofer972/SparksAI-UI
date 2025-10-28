import { EntityConfig } from './entityConfig';

// PI AI Cards Entity Configuration
export interface PIAICard {
  id: number;
  date: string;
  pi_name: string;
  card_name: string;
  card_type: string;
  priority: string;
  source: string;
  description: string;
  full_information: string;
  information_json?: string;
}

export const piAICardsConfig: EntityConfig<PIAICard> = {
  endpoints: {
    list: '/api/v1/pi-ai-cards/getCards',
    detail: '/api/v1/pi-ai-cards/getCard', // hypothetical detail endpoint
  },
  
  columns: [
    { key: 'id', label: 'ID', type: 'number' },
    { key: 'card_name', label: 'Card Name', type: 'text' },
    { key: 'card_type', label: 'Card Type', type: 'text' },
    { key: 'priority', label: 'Priority', type: 'text' },
    { key: 'source', label: 'Source', type: 'text' },
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'full_information', label: 'Full Information', type: 'text' },
  ],
  
  // Custom data fetcher for PI AI cards
  fetchData: async (piName: string) => {
    const apiService = new ApiService();
    return apiService.getPIAICards(piName);
  },
};
