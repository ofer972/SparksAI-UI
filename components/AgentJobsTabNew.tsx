import React from 'react';
import { useEntityTableManager } from '@/hooks/useEntityTableManager';
import { agentJobsConfig } from '@/lib/entityConfig';
import { DataTable } from '@/components/DataTable';
import { ViewRecordModal } from '@/components/ViewRecordModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';

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
    handleViewItem,
    handleDeleteItem,
    handleSort,
    handleFilterChange,
    closeModals,
  } = useEntityTableManager(agentJobsConfig);

  return (
    <>
      <DataTable<AgentJob>
        config={agentJobsConfig}
        data={sortedData}
        loading={loading}
        error={error}
        sortConfig={sortConfig}
        filterText={filterText}
        onSort={handleSort}
        onFilterChange={handleFilterChange}
        onViewItem={handleViewItem}
        onDeleteItem={handleDeleteItem}
        onRefresh={refetch}
      />

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
        itemName="agent job"
      />
    </>
  );
}
