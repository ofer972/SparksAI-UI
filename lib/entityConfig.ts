// Generic Entity Configuration Types
export interface ColumnConfig<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  searchable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, item: T) => React.ReactNode;
  className?: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface EntityConfig<T> {
  // API Configuration
  endpoints: {
    list: string;
    detail?: string;
    delete?: string;
  };
  
  // Data fetching functions
  fetchList: (params?: any) => Promise<T[]>;
  fetchDetail?: (id: string) => Promise<T>;
  deleteItem?: (id: string) => Promise<void>;
  
  // UI Configuration
  columns: ColumnConfig<T>[];
  primaryKey: keyof T;
  title: string;
  
  // Optional configurations
  filters?: FilterConfig[];
  searchFields?: (keyof T)[];
  
  // Custom formatting
  formatCellValue?: (value: any, key: keyof T, item: T) => string | React.ReactNode;
  getStatusColor?: (value: any) => string;
  
  // Field categorization for detail view
  normalFields?: (keyof T)[]; // Fields to show in overview grid
  longTextFields?: (keyof T)[]; // Fields to show in details section
}

// Agent Jobs Entity Configuration
export interface AgentJob {
  job_id: string;
  status: string;
  job_type: string;
  team_name: string;
  claimed_by: string;
  created_at: string;
  claimed_at: string;
  completed_at?: string;
  input_sent?: string;
  result?: string;
  error?: string;
  data?: any;
}

export const agentJobsConfig: EntityConfig<AgentJob> = {
  endpoints: {
    list: '/api/v1/agent-jobs',
    detail: '/api/v1/agent-jobs',
  },
  
  fetchList: async () => {
    const { ApiService } = await import('./api');
    const apiService = new ApiService();
    return apiService.getAgentJobs();
  },
  
  fetchDetail: async (id: string) => {
    const { ApiService } = await import('./api');
    const apiService = new ApiService();
    return apiService.getAgentJobDetail(id);
  },
  
  columns: [
    {
      key: 'job_id',
      label: 'Job ID',
      sortable: true,
      searchable: true,
      width: '120px',
      align: 'center',
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      searchable: true,
      width: '100px',
      align: 'center',
    },
    {
      key: 'job_type',
      label: 'Type',
      sortable: true,
      searchable: true,
      width: '120px',
    },
    {
      key: 'team_name',
      label: 'Team',
      sortable: true,
      searchable: true,
      width: '120px',
    },
    {
      key: 'claimed_by',
      label: 'Claimed By',
      sortable: true,
      searchable: true,
      width: '120px',
    },
    {
      key: 'claimed_at',
      label: 'Claimed At',
      sortable: true,
      searchable: false,
      width: '140px',
      align: 'center',
    },
    {
      key: 'result',
      label: 'Result',
      sortable: false,
      searchable: true,
      width: '200px',
    },
    {
      key: 'error',
      label: 'Error',
      sortable: false,
      searchable: true,
      width: '120px',
    },
  ],
  
  primaryKey: 'job_id',
  title: 'Agent Jobs',
  
  searchFields: ['job_id', 'status', 'job_type', 'team_name', 'claimed_by', 'result', 'error'],
  
  formatCellValue: (value: any, key: keyof AgentJob) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    
    // Special formatting for specific columns
    if (key === 'claimed_at') {
      try {
        const date = new Date(value);
        return date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      } catch {
        return String(value);
      }
    }
    
    if (key === 'result' && typeof value === 'string') {
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
  
  getStatusColor: (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'text-green-600 font-semibold';
      case 'error':
        return 'text-red-600 font-semibold';
      default:
        return 'text-blue-600 font-semibold';
    }
  },
  
  // Field categorization for detail view
  normalFields: ['job_id', 'status', 'job_type', 'team_name', 'claimed_by', 'created_at', 'claimed_at', 'completed_at'],
  longTextFields: ['input_sent', 'result', 'error', 'data'],
};
