import React from 'react';
import { useEntityTableManager } from '@/hooks/useEntityTableManager';
import { agentJobsConfig, AgentJob } from '@/lib/entityConfig';
import { DataTable } from '@/components/DataTable';
import { ViewRecordModal } from '@/components/ViewRecordModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import Toast from '@/components/Toast';

export default function AgentJobsTab() {
  const {
    sortedData,
    loading,
    error,
    refetch,
    selectedItem,
    isDetailModalOpen,
    isDeleteModalOpen,
    sortConfig,
    filterText,
    toastMessage,
    toastType,
    clearToast,
    handleViewItem,
    handleDeleteItem,
    handleConfirmDelete,
    handleSort,
    handleFilterChange,
    closeModals,
  } = useEntityTableManager<AgentJob>(agentJobsConfig);

  return (
    <>
      <Toast message={toastMessage} type={toastType} onClose={clearToast} />
      <div className="h-full flex flex-col min-h-0">
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={filterText}
            onChange={(event) => handleFilterChange(event.target.value)}
            placeholder="Search agent jobs..."
              className="flex-1 sm:w-72 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
            <button
              onClick={refetch}
              disabled={loading}
              className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              title="Refresh data"
            >
              <svg 
                className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <DataTable
            config={agentJobsConfig}
            data={sortedData}
            loading={loading}
            error={error}
            sortConfig={sortConfig}
            onSort={handleSort}
            onViewItem={handleViewItem}
            onDeleteItem={handleDeleteItem}
          />
        </div>
      </div>

      {/* Modals */}
      <ViewRecordModal
        isOpen={isDetailModalOpen}
        onClose={closeModals}
        item={selectedItem}
        config={agentJobsConfig}
      />
      
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeModals}
        onConfirm={handleConfirmDelete}
        itemName="agent job"
        itemId={selectedItem ? String(selectedItem[agentJobsConfig.primaryKey]) : undefined}
      />
    </>
  );
}
