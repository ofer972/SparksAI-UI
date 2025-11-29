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
          <input
            type="text"
            value={filterText}
            onChange={(event) => handleFilterChange(event.target.value)}
            placeholder="Search agent jobs..."
            className="w-full sm:w-72 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
