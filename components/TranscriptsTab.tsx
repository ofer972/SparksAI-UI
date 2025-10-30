import React from 'react';
import { useEntityTableManager } from '@/hooks/useEntityTableManager';
import { transcriptsConfig, TranscriptRecord } from '@/lib/transcriptsConfig';
import { DataTable } from '@/components/DataTable';
import { ViewRecordModal } from '@/components/ViewRecordModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';

export default function TranscriptsTab() {
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
  } = useEntityTableManager<TranscriptRecord>(transcriptsConfig);

  return (
    <>
      <DataTable<TranscriptRecord>
        config={transcriptsConfig}
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
        config={transcriptsConfig}
      />

      {/* No delete endpoint for now; modal will show only Cancel */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeModals}
        itemName="transcript"
      />
    </>
  );
}


