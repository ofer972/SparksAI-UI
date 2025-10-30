import { EditableEntityConfig, Prompt, FormFieldConfig } from './entityConfig';

export const promptsConfig: EditableEntityConfig<Prompt> = {
  endpoints: {
    list: '/api/v1/prompts',
    detail: '/api/v1/prompts',
  },
  
  fetchList: async () => {
    const { ApiService } = await import('./api');
    const apiService = new ApiService();
    return apiService.getPrompts();
  },
  
  fetchDetail: async (id: string) => {
    // ID format: email/promptName
    const [email, promptName] = id.split('/');
    const { ApiService } = await import('./api');
    const apiService = new ApiService();
    return apiService.getPromptDetail(email, promptName);
  },
  
  deleteItem: async (id: string) => {
    const [email, promptName] = id.split('/');
    const { ApiService } = await import('./api');
    const apiService = new ApiService();
    return apiService.deletePrompt(email, promptName);
  },
  
  createItem: async (data: Partial<Prompt>) => {
    const { ApiService } = await import('./api');
    const apiService = new ApiService();
    return apiService.createPrompt(data as {
      email_address: string;
      prompt_name: string;
      prompt_description: string;
      prompt_type: string;
      prompt_active: boolean;
    });
  },
  
  updateItem: async (id: string, data: Partial<Prompt>) => {
    const [email, promptName] = id.split('/');
    const { ApiService } = await import('./api');
    const apiService = new ApiService();
    // API requires all fields, ensure we have them all
    return apiService.updatePrompt(email, promptName, data as {
      email_address: string;
      prompt_name: string;
      prompt_description: string;
      prompt_type: string;
      prompt_active: boolean;
    });
  },
  
  primaryKey: 'email_address',
  title: 'Prompts',
  
  // Form configuration for edit/create
  editableFields: [
    {
      key: 'email_address',
      label: 'Email Address',
      type: 'text',
      required: true,
      placeholder: 'user@example.com',
    },
    {
      key: 'prompt_name',
      label: 'Prompt Name',
      type: 'text',
      required: true,
      placeholder: 'DailySummary',
    },
    {
      key: 'prompt_description',
      label: 'Description',
      type: 'textarea',
      required: true,
      placeholder: 'Generate a daily summary of team activities',
      validation: {
        minLength: 10,
      },
    },
    {
      key: 'prompt_type',
      label: 'Type',
      type: 'select',
      required: true,
      options: [
        { value: 'Team Dashboard', label: 'Team Dashboard' },
        { value: 'PI Dashboard', label: 'PI Dashboard' },
      ],
    },
    {
      key: 'prompt_active',
      label: 'Active',
      type: 'boolean',
      required: false,
    },
  ],
  
  // Enable operations
  allowCreate: true,
  allowEdit: true,
  allowDelete: true,
  
  // Column overrides
  columnOverrides: {
    'email_address': { width: '200px' },
    'prompt_name': { width: '150px' },
    'prompt_type': { width: '120px', align: 'center' },
    'prompt_active': { width: '80px', align: 'center' },
  },
  
  fieldColors: {
    'prompt_active': (value: boolean) => {
      return value ? 'text-green-600 font-semibold' : 'text-gray-500';
    },
  },
  
  formatCellValue: (value: any, key: keyof Prompt) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Active' : 'Inactive';
    
    if (key === 'prompt_description' && typeof value === 'string') {
      if (value.length > 100) {
        return value.substring(0, 100) + '...';
      }
      return value;
    }
    
    return String(value);
  },
  
  normalFields: ['email_address', 'prompt_name', 'prompt_type', 'prompt_active'],
  longTextFields: ['prompt_description'],
  
  searchFields: ['email_address', 'prompt_name', 'prompt_description', 'prompt_type'],
};


