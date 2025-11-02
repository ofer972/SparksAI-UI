import { useState, useEffect, useCallback, useMemo } from 'react';
import { EntityConfig, EditableEntityConfig } from '@/lib/entityConfig';
import { buildBackendUrl } from '@/lib/config';

export interface UseEntityTableManagerReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  
  // Modal states
  selectedItem: T | null;
  isDetailModalOpen: boolean;
  isDeleteModalOpen: boolean;
  isEditModalOpen: boolean;
  editMode: 'create' | 'edit' | null;
  
  // Table states
  sortConfig: { key: keyof T; direction: 'asc' | 'desc' };
  filterText: string;
  
  // Toast states
  toastMessage: string | null;
  toastType: 'success' | 'error';
  clearToast: () => void;
  
  // Actions
  handleViewItem: (item: T) => void;
  handleDeleteItem: (item: T) => void;
  handleConfirmDelete: () => Promise<void>;
  handleEditItem: (item: T) => void;
  handleCreateItem: () => void;
  handleSaveItem: (itemData: Partial<T>) => Promise<void>;
  handleSort: (key: keyof T) => void;
  handleFilterChange: (text: string) => void;
  closeModals: () => void;
  
  // Computed data
  filteredData: T[];
  sortedData: T[];
}

/**
 * Creates a generic deleteItem function from endpoint configuration.
 * Uses standard REST pattern: DELETE /endpoint/{id}
 */
function createGenericDeleteItem<T>(
  config: EntityConfig<T> | EditableEntityConfig<T>
): ((id: string) => Promise<void>) | undefined {
  // If deleteItem already exists, return undefined (use the existing one)
  if (config.deleteItem) {
    return undefined;
  }

  // Determine the delete endpoint
  let deleteEndpoint: string | undefined;
  
  if (config.endpoints.delete) {
    // Explicit delete endpoint specified
    deleteEndpoint = config.endpoints.delete;
  } else if (config.endpoints.detail) {
    // Derive from detail endpoint (usually /resource/{id})
    deleteEndpoint = config.endpoints.detail;
  } else if (config.endpoints.list) {
    // Derive from list endpoint (usually /resource)
    deleteEndpoint = config.endpoints.list;
  }

  if (!deleteEndpoint) {
    return undefined;
  }

  // Create and return the generic delete function
  return async (id: string) => {
    const url = `${buildBackendUrl(deleteEndpoint!)}/${id}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'accept': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorText = await response.text();
        if (errorText) {
          console.error(`Delete ${config.title.toLowerCase()} API error:`, response.status, errorText);
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorJson.error || errorMessage;
          } catch {
            if (errorText.length < 200) {
              errorMessage = errorText;
            }
          }
        }
      } catch (e) {
        console.error('Error reading error response:', e);
      }
      throw new Error(`Failed to delete ${config.title.toLowerCase()}: ${errorMessage}`);
    }
  };
}

/**
 * Generic hook for managing entity table data, state, and operations.
 * 
 * @param config - Entity configuration object
 * @returns Object containing data, state, and action functions
 */
export function useEntityTableManager<T extends Record<string, any>>(
  config: EntityConfig<T> | EditableEntityConfig<T>
): UseEntityTableManagerReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<'create' | 'edit' | null>(null);
  
  // Table states
  const [sortConfig, setSortConfig] = useState<{ key: keyof T; direction: 'asc' | 'desc' }>({
    key: config.primaryKey,
    direction: 'desc'
  });
  const [filterText, setFilterText] = useState('');
  
  // Toast states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Fetch data function
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await config.fetchList();
      
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
      return config.searchFields.some((field: keyof T) => {
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

  // Get deleteItem function - either from config or create generic one
  const deleteItemFn = useMemo(() => {
    return config.deleteItem || createGenericDeleteItem(config);
  }, [config]);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedItem || !deleteItemFn) {
      return;
    }
    
    try {
      // Get the primary key value to construct the ID
      const id = String(selectedItem[config.primaryKey]);
      
      // Call the delete function (either custom or generic)
      await deleteItemFn(id);
      
      // Show success toast
      const itemName = config.title.toLowerCase();
      setToastType('success');
      setToastMessage(`${itemName} deleted successfully`);
      setTimeout(() => setToastMessage(null), 3000);
      
      // Refresh the data after successful delete
      await fetchData();
      
      // Close the modal
      setIsDeleteModalOpen(false);
      setSelectedItem(null);
    } catch (err) {
      console.error(`Error deleting ${config.title.toLowerCase()}:`, err);
      // Show error toast
      const itemName = config.title.toLowerCase();
      setToastType('error');
      setToastMessage(`Failed to delete ${itemName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTimeout(() => setToastMessage(null), 3000);
      // Keep modal open on error so user can retry or cancel
      setError(err instanceof Error ? err.message : `Failed to delete ${config.title.toLowerCase()}`);
    }
  }, [config, selectedItem, fetchData, deleteItemFn]);
  
  const clearToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  const handleEditItem = useCallback((item: T) => {
    setSelectedItem(item);
    setEditMode('edit');
    setIsEditModalOpen(true);
  }, []);

  const handleCreateItem = useCallback(() => {
    setSelectedItem(null);
    setEditMode('create');
    setIsEditModalOpen(true);
  }, []);

  const handleSaveItem = useCallback(async (itemData: Partial<T>) => {
    // Check if config is an EditableEntityConfig
    if ('updateItem' in config || 'createItem' in config) {
      const editableConfig = config as EditableEntityConfig<T>;
      
      if (editMode === 'edit' && selectedItem && editableConfig.updateItem) {
        // Get the primary key value
        const id = String(selectedItem[config.primaryKey]);
        await editableConfig.updateItem(id, itemData);
      } else if (editMode === 'create' && editableConfig.createItem) {
        await editableConfig.createItem(itemData);
      }
      
      // Refresh the data
      await fetchData();
    }
  }, [config, editMode, selectedItem, fetchData]);

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
    setIsEditModalOpen(false);
    setSelectedItem(null);
    setEditMode(null);
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    
    selectedItem,
    isDetailModalOpen,
    isDeleteModalOpen,
    isEditModalOpen,
    editMode,
    
    sortConfig,
    filterText,
    
    toastMessage,
    toastType,
    clearToast,
    
    handleViewItem,
    handleDeleteItem,
    handleConfirmDelete,
    handleEditItem,
    handleCreateItem,
    handleSaveItem,
    handleSort,
    handleFilterChange,
    closeModals,
    
    filteredData,
    sortedData,
  };
}
