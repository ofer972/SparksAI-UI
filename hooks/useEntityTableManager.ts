import { useState, useEffect, useCallback } from 'react';
import { EntityConfig } from './entityConfig';

export interface UseEntityTableManagerReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  
  // Modal states
  selectedItem: T | null;
  isDetailModalOpen: boolean;
  isDeleteModalOpen: boolean;
  
  // Table states
  sortConfig: { key: keyof T; direction: 'asc' | 'desc' };
  filterText: string;
  
  // Actions
  handleViewItem: (item: T) => void;
  handleDeleteItem: (item: T) => void;
  handleSort: (key: keyof T) => void;
  handleFilterChange: (text: string) => void;
  closeModals: () => void;
  
  // Computed data
  filteredData: T[];
  sortedData: T[];
}

/**
 * Generic hook for managing entity table data, state, and operations.
 * 
 * @param config - Entity configuration object
 * @returns Object containing data, state, and action functions
 */
export function useEntityTableManager<T extends Record<string, any>>(
  config: EntityConfig<T>
): UseEntityTableManagerReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Table states
  const [sortConfig, setSortConfig] = useState<{ key: keyof T; direction: 'asc' | 'desc' }>({
    key: config.primaryKey,
    direction: 'desc'
  });
  const [filterText, setFilterText] = useState('');

  // Fetch data function
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await config.fetchList();
      
      // Debug logging
      console.log(`=== ${config.title.toUpperCase()} FETCH DEBUG ===`);
      console.log('Raw result:', result);
      console.log('Result type:', typeof result);
      console.log('Is array:', Array.isArray(result));
      console.log('Result length:', Array.isArray(result) ? result.length : 'N/A');
      console.log('=====================================');
      
      const dataArray = Array.isArray(result) ? result : [];
      setData(dataArray);
    } catch (err) {
      console.error(`Error fetching ${config.title.toLowerCase()}:`, err);
      setError(err instanceof Error ? err.message : `Failed to fetch ${config.title.toLowerCase()}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [config]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter data based on search text
  const filteredData = data.filter(item => {
    if (!filterText) return true;
    
    if (config.searchFields) {
      return config.searchFields.some(field => {
        const value = item[field];
        return String(value).toLowerCase().includes(filterText.toLowerCase());
      });
    }
    
    // Fallback: search all string values
    return Object.values(item).some(value => 
      String(value).toLowerCase().includes(filterText.toLowerCase())
    );
  });

  // Sort filtered data
  const sortedData = [...filteredData].sort((a, b) => {
    // Always sort by the configured key (primary key by default)
    const sortKey = sortConfig.key || config.primaryKey;
    
    const aValue = a[sortKey];
    const bValue = b[sortKey];
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Action handlers
  const handleViewItem = useCallback((item: T) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  }, []);

  const handleDeleteItem = useCallback((item: T) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  }, []);

  const handleSort = useCallback((key: keyof T) => {
    if (sortConfig.key === key) {
      setSortConfig({
        key,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      setSortConfig({ key, direction: 'asc' });
    }
  }, [sortConfig]);

  const handleFilterChange = useCallback((text: string) => {
    setFilterText(text);
  }, []);

  const closeModals = useCallback(() => {
    setIsDetailModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedItem(null);
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    
    selectedItem,
    isDetailModalOpen,
    isDeleteModalOpen,
    
    sortConfig,
    filterText,
    
    handleViewItem,
    handleDeleteItem,
    handleSort,
    handleFilterChange,
    closeModals,
    
    filteredData,
    sortedData,
  };
}
