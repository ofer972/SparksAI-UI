import { EntityConfig } from './entityConfig';
import { buildApiUrl, ApiResponse } from './config';

export interface TranscriptRecord {
  id: string | number;
  [key: string]: any;
}

export const transcriptsConfig: EntityConfig<TranscriptRecord> = {
  endpoints: {
    list: '/transcripts',
    detail: '/transcripts',
  },

  fetchList: async () => {
    const response = await fetch(buildApiUrl('/transcripts'));
    if (!response.ok) {
      throw new Error(`Failed to fetch transcripts: ${response.statusText}`);
    }
    const result = await response.json();
    // Accept common shapes
    if (Array.isArray(result)) return result;
    if (result?.success && Array.isArray(result.data)) return result.data;
    if (result?.data?.transcripts && Array.isArray(result.data.transcripts)) return result.data.transcripts;
    return [];
  },

  fetchDetail: async (id: string) => {
    const url = `${buildApiUrl('/transcripts')}/${id}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch transcript detail: ${response.statusText}`);
    }
    const result: ApiResponse<any> = await response.json();
    if (result?.success && result.data) {
      return result.data.transcript || result.data;
    }
    return result as any;
  },

  primaryKey: 'id',
  title: 'Transcripts',
  
  formatCellValue: (value: any, key: keyof TranscriptRecord) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    
    // Special formatting for date fields
    if (key === 'transcript_date_time' || key === 'created_at' || key === 'updated_at') {
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
  
  // DataTable will auto-discover all columns from the API response
  // Field categorization for detail modal view only
  normalFields: ['id', 'file_name', 'origin', 'team_name', 'pi', 'transcript_date_time', 'type', 'created_at', 'updated_at'] as any,
  longTextFields: ['raw_text'] as any,
};


