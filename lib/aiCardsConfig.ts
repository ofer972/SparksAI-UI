// AI Cards Entity Configuration
import { EntityConfig } from './entityConfig';

export interface AICard {
  id: number;
  date: string;
  updated_at: string;
  team_name: string;
  group_name?: string;
  pi?: string;
  card_name: string;
  insight_type: string;
  priority: string;
  priority_color?: string; // Color from backend: "Red", "Yellow", "Green", "Gray"
  source: string;
  source_job_id?: string | number;
  description: string;
  full_information: string;
  information_json?: string;
}

export const aiCardsConfig: EntityConfig<AICard> = {
  endpoints: {
    list: '/ai-insights',
    detail: '/ai-insights',
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
  title: 'AI Cards',
  
  // Define column order explicitly
  columns: [
    { key: 'id', label: 'ID', width: '80px', align: 'center' },
    { key: 'updated_at', label: 'Date', width: '120px', align: 'center' },
    { key: 'pi', label: 'PI', width: '120px', align: 'left' },
    { key: 'card_name', label: 'Card Name', width: '200px', align: 'left' },
    { key: 'insight_type', label: 'Insight Type', width: '150px', align: 'left' },
    { key: 'priority', label: 'Priority', width: '100px', align: 'center' },
    { key: 'team_name', label: 'Team Name', width: '150px', align: 'left' },
    { key: 'group_name', label: 'Group Name', width: '150px', align: 'left' },
    { key: 'source', label: 'Source', width: '120px', align: 'left' },
    { key: 'description', label: 'Description', width: '200px', align: 'left' },
  ],
  
  // Only specify what's special (overrides)
  columnOverrides: {
    'id': { width: '80px', align: 'center' },
    'priority': { width: '100px', align: 'center' },
    'updated_at': { width: '120px', align: 'center' },
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
  
  formatCellValue: (value: any, key: keyof AICard) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    
    // Special formatting for updated_at (date + time, matching card views)
    if (key === 'updated_at') {
      try {
        const date = new Date(value);
        const dateOptions: Intl.DateTimeFormatOptions = { 
          month: 'short', 
          day: 'numeric' 
        };
        const timeOptions: Intl.DateTimeFormatOptions = {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        };
        const formattedDate = date.toLocaleDateString('en-US', dateOptions);
        const formattedTime = date.toLocaleTimeString('en-US', timeOptions);
        return `${formattedDate} ${formattedTime}`;
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
  normalFields: ['id', 'updated_at', 'pi', 'card_name', 'insight_type', 'priority', 'team_name', 'group_name', 'source_job_id', 'source'],
  longTextFields: ['description', 'full_information', 'information_json'],
  markdownFields: ['description', 'full_information'], // Render these fields as markdown
};
