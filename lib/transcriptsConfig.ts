import { EntityConfig } from './entityConfig';
import { buildApiUrl, ApiResponse } from './config';

export interface TranscriptRecord {
  id: string | number;
  [key: string]: any;
}

export const transcriptsConfig: EntityConfig<TranscriptRecord> = {
  endpoints: {
    list: '/api/v1/transcripts',
    detail: '/api/v1/transcripts',
  },

  fetchList: async () => {
    const response = await fetch(buildApiUrl('/api/v1/transcripts'));
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
    const url = `${buildApiUrl('/api/v1/transcripts')}/${id}`;
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
  // DataTable will auto-discover all columns from the API response
  // Field categorization for detail modal view only
  normalFields: ['id', 'file_name', 'origin', 'pi', 'transcript_date', 'type', 'created_at', 'updated_at'] as any,
  longTextFields: ['raw_text'] as any,
};


