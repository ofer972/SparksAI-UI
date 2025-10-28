import React from 'react';
import { useEntityTableManager } from '@/hooks/useEntityTableManager';
import { teamAICardsConfig } from '@/lib/teamAICardsConfig';
import { DataTable } from '@/components/DataTable';
import { ViewRecordModal } from '@/components/ViewRecordModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';

export default function TeamAICardsTab() {
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
  } = useEntityTableManager(teamAICardsConfig);

  return (
    <>
      <DataTable
        config={teamAICardsConfig}
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
        config={teamAICardsConfig}
      />
      
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeModals}
        itemName="team AI card"
      />
    </>
  );
}
