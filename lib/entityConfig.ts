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

// Form Field Configuration for Editable Tables
export interface FormFieldConfig<T> {
  key: keyof T;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'email' | 'date' | 'boolean';
  required?: boolean;
  placeholder?: string;
  options?: { value: string | number; label: string }[]; // For select fields
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    custom?: (value: any) => string | null; // Return error message or null
  };
  disabled?: boolean;
  readonly?: boolean;
  helpText?: string; // Helper text to display below the field
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
  primaryKey: keyof T;
  title: string;
  
  // Optional configurations
  filters?: FilterConfig[];
  searchFields?: (keyof T)[];
  
  // Override system (only specify what's special)
  columns?: ColumnConfig<T>[]; // Override auto-discovered columns
  columnOverrides?: Partial<Record<keyof T, Partial<ColumnConfig<T>>>>; // Override specific columns
  fieldColors?: Record<string, (value: any) => string>; // Special coloring for specific fields
  hiddenFields?: (keyof T)[]; // Fields to hide from table
  
  // Custom formatting
  formatCellValue?: (value: any, key: keyof T, item: T) => string | React.ReactNode;
  
  // Field categorization for detail view (override auto-categorization)
  normalFields?: (keyof T)[]; // Fields to show in overview grid
  longTextFields?: (keyof T)[]; // Fields to show in details section
  markdownFields?: (keyof T)[]; // Fields to render as markdown
}

// Extended configuration for editable entities
export interface EditableEntityConfig<T> extends EntityConfig<T> {
  // Edit-specific configuration
  editableFields?: FormFieldConfig<T>[];
  updateEndpoint?: string;
  updateItem?: (id: string, data: Partial<T>) => Promise<T>;
  createEndpoint?: string;
  createItem?: (data: Partial<T>) => Promise<T>;
  
  // Form behavior
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  
  // Validation
  validateForm?: (data: Partial<T>) => Record<string, string>; // field errors
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
  
  primaryKey: 'job_id',
  title: 'Agent Jobs',
  
  // Only specify what's special (overrides)
  columnOverrides: {
    'job_id': { width: '80px', align: 'center' },
    'status': { width: '100px', align: 'center' },
    'claimed_at': { width: '140px', align: 'center' },
    'result': { width: '200px' },
  },
  
  fieldColors: {
    'status': (status: string) => {
      switch (status?.toLowerCase()) {
        case 'completed':
          return 'text-green-600 font-semibold';
        case 'error':
          return 'text-red-600 font-semibold';
        default:
          return 'text-blue-600 font-semibold';
      }
    }
  },
  
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
  
  // Field categorization for detail view
  normalFields: ['job_id', 'status', 'job_type', 'team_name', 'claimed_by', 'created_at', 'claimed_at', 'completed_at'],
  longTextFields: ['input_sent', 'result', 'error', 'data'],
  markdownFields: ['input_sent'],
};

// Prompt Entity Configuration
export interface Prompt {
  email_address: string;
  prompt_name: string;
  prompt_description: string;
  prompt_type: string;
  prompt_active: boolean;
  created_at?: string;
  updated_at?: string;
}
