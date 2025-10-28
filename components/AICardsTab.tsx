import React from 'react';
import { useEntityTableManager } from '@/hooks/useEntityTableManager';
import { aiCardsConfig } from '@/lib/aiCardsConfig';
import { DataTable } from '@/components/DataTable';
import { ViewRecordModal } from '@/components/ViewRecordModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';

export default function AICardsTab() {
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
  } = useEntityTableManager(aiCardsConfig);

  return (
    <>
      <DataTable
        config={aiCardsConfig}
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
        config={aiCardsConfig}
      />
      
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeModals}
        itemName="AI card"
      />
    </>
  );
}
