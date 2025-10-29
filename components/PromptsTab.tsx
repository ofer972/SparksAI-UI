'use client';

import React, { useState, useEffect } from 'react';
import { DataTable } from '@/components/DataTable';
import { ViewRecordModal } from '@/components/ViewRecordModal';
import { EditRecordModal } from '@/components/EditRecordModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import { ApiService } from '@/lib/api';
import { promptsConfig } from '@/lib/promptsConfig';

interface Prompt {
  email_address: string;
  prompt_name: string;
  prompt_description: string;
  prompt_type: string;
  prompt_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PromptsResponse {
  success: boolean;
  data: {
    prompts: Prompt[];
    count: number;
  };
  message: string;
}

export default function PromptsTab() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Prompt; direction: 'asc' | 'desc' }>({
    key: 'email_address',
    direction: 'asc'
  });
  const [filterText, setFilterText] = useState('');
  const [selectedItem, setSelectedItem] = useState<Prompt | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('edit');
  const [editLoading, setEditLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const apiService = new ApiService();

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      setError(null);
      // Use centralized ApiService which builds the full backend URL
      const items = await apiService.getPrompts();
      setPrompts(items as Prompt[]);
    } catch (err) {
      console.error('Error fetching prompts:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const handleSort = (key: keyof Prompt) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = (text: string) => {
    setFilterText(text);
  };

  const handleViewItem = (item: Prompt) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedItem(null);
  };

  const handleDeleteItem = (item: Prompt) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedItem) return;
    
    try {
      const compositeId = `${selectedItem.email_address}/${selectedItem.prompt_name}`;
      await promptsConfig.deleteItem!(compositeId);
      
      // Show success toast
      setToastType('success');
      setToastMessage(`Prompt "${selectedItem.prompt_name}" (${selectedItem.email_address}) deleted successfully`);
      setTimeout(() => setToastMessage(null), 3000);
      
      // Refresh the list
      await fetchPrompts();
      setIsDeleteModalOpen(false);
      setSelectedItem(null);
    } catch (err) {
      console.error('Error deleting prompt:', err);
      // Show error toast
      setToastType('error');
      setToastMessage(`Failed to delete prompt: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedItem(null);
  };

  const handleEditItem = async (item: Prompt) => {
    try {
      setEditLoading(true);
      setEditMode('edit');
      
      // Fetch full data from API before showing edit modal
      const compositeId = `${item.email_address}/${item.prompt_name}`;
      console.log('Fetching prompt detail for edit:', compositeId);
      const fullItem = await promptsConfig.fetchDetail!(compositeId);
      console.log('Fetched prompt detail:', fullItem);
      console.log('Fetched prompt detail type:', typeof fullItem);
      console.log('Fetched prompt detail keys:', fullItem ? Object.keys(fullItem) : 'null');
      console.log('Fetched prompt detail values:', fullItem ? Object.values(fullItem) : 'null');
      
      // Ensure we have the data before opening modal
      if (fullItem) {
        setSelectedItem(fullItem as Prompt);
        setIsEditModalOpen(true);
      } else {
        console.warn('API returned empty data, using item data');
        setSelectedItem(item);
        setIsEditModalOpen(true);
      }
    } catch (err) {
      console.error('Error fetching prompt detail for edit:', err);
      // Fallback to using item data if API fetch fails
      console.log('Using fallback item data:', item);
      setSelectedItem(item);
      setIsEditModalOpen(true);
    } finally {
      setEditLoading(false);
    }
  };

  const handleCreateItem = () => {
    setSelectedItem(null);
    setEditMode('create');
    setIsEditModalOpen(true);
  };

  const handleSaveItem = async (itemData: Partial<Prompt>) => {
    try {
      if (editMode === 'edit' && selectedItem) {
        // Construct composite ID: email_address/prompt_name
        const id = `${selectedItem.email_address}/${selectedItem.prompt_name}`;
        
        // API requires ALL fields (including email_address and prompt_name) even though they're in URL
        // Ensure we have all required fields with proper values
        const updateData = {
          email_address: itemData.email_address || selectedItem.email_address,
          prompt_name: itemData.prompt_name || selectedItem.prompt_name,
          prompt_description: itemData.prompt_description || selectedItem.prompt_description || '',
          prompt_type: itemData.prompt_type || selectedItem.prompt_type || '',
          prompt_active: itemData.prompt_active !== undefined ? itemData.prompt_active : selectedItem.prompt_active,
        };
        
        console.log('Update data being sent:', JSON.stringify(updateData, null, 2));
        
        await promptsConfig.updateItem!(id, updateData);
      } else if (editMode === 'create') {
        await promptsConfig.createItem!(itemData);
      }
      
      // Refresh the list after save
      await fetchPrompts();
      setIsEditModalOpen(false);
      
      // Show success toast message
      setToastType('success');
      if (editMode === 'edit' && selectedItem) {
        setToastMessage(`Prompt "${selectedItem.prompt_name}" (${selectedItem.email_address}) updated successfully`);
      } else if (editMode === 'create' && itemData.email_address && itemData.prompt_name) {
        setToastMessage(`Prompt "${itemData.prompt_name}" (${itemData.email_address}) created successfully`);
      }
      
      // Auto-hide toast after 3 seconds
      setTimeout(() => setToastMessage(null), 3000);
      
      setSelectedItem(null);
    } catch (err) {
      console.error('Error saving prompt:', err);
      throw err; // Re-throw so EditRecordModal can handle it
    }
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedItem(null);
  };

  const handleRefresh = () => {
    fetchPrompts();
  };

  // Filter and sort data
  const filteredData = prompts.filter(item =>
    Object.values(item).some(value =>
      String(value).toLowerCase().includes(filterText.toLowerCase())
    )
  );

  const sortedData = [...filteredData].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`${toastType === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]`}>
            {toastType === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="flex-1 text-sm font-medium">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Prompts Management</h2>
        <p className="text-sm text-gray-600">Manage and view all prompts.</p>
      </div>

      <DataTable
        config={{
          ...promptsConfig,
          columns: [
            { key: 'email_address', label: 'Email', sortable: true, width: '150px' },
            { key: 'prompt_name', label: 'Prompt Name', sortable: true, width: '150px' },
            { key: 'prompt_type', label: 'Type', sortable: true, width: '120px' },
            { key: 'prompt_active', label: 'Active', sortable: true, width: '80px' },
            { key: 'prompt_description', label: 'Description', sortable: true, width: '200px' },
            { key: 'updated_at', label: 'Updated', sortable: true, width: '120px' },
            { key: 'created_at', label: 'Created', sortable: true, width: '120px' },
          ],
          primaryKey: 'prompt_name',
          hiddenFields: [],
          formatCellValue: (value, key) => {
            if (key === 'prompt_active') {
              return value ? 'Yes' : 'No';
            }
            if (key === 'created_at' || key === 'updated_at') {
              return new Date(value).toLocaleDateString();
            }
            return value;
          },
          fieldColors: {
            'prompt_active': (value) => value ? 'text-green-600' : 'text-red-600'
          }
        }}
        data={sortedData}
        loading={loading}
        error={error}
        sortConfig={sortConfig}
        filterText={filterText}
        onSort={handleSort}
        onFilterChange={handleFilterChange}
        onViewItem={handleViewItem}
        onDeleteItem={handleDeleteItem}
        onEditItem={handleEditItem}
        onCreateItem={handleCreateItem}
        onRefresh={handleRefresh}
        allowEdit={true}
        allowCreate={true}
      />

      {/* View Detail Modal */}
      <ViewRecordModal
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        item={selectedItem}
        config={promptsConfig}
      />

      {/* Edit/Create Modal */}
      <EditRecordModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        item={selectedItem}
        config={promptsConfig}
        mode={editMode}
        onSave={handleSaveItem}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        itemName={selectedItem ? `prompt "${selectedItem.prompt_name}" (${selectedItem.email_address})` : 'prompt'}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}