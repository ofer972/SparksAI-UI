import React from 'react';
import { useEntityTableManager } from '@/hooks/useEntityTableManager';
import { piAICardsConfig } from '@/lib/piAICardsConfig';
import { DataTable } from '@/components/DataTable';
import { ViewRecordModal } from '@/components/ViewRecordModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';

export default function PIAICardsTab() {
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
  } = useEntityTableManager(piAICardsConfig);

  return (
    <>
      <DataTable
        config={piAICardsConfig}
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
        config={piAICardsConfig}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeModals}
        itemName="PI AI card"
      />
    </>
  );
}


