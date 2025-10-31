import React from 'react';
import { useEntityTableManager } from '@/hooks/useEntityTableManager';
import { transcriptsConfig, TranscriptRecord } from '@/lib/transcriptsConfig';
import { DataTable } from '@/components/DataTable';
import { ViewRecordModal } from '@/components/ViewRecordModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import Toast from '@/components/Toast';

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
    toastMessage,
    toastType,
    clearToast,
    handleViewItem,
    handleDeleteItem,
    handleConfirmDelete,
    handleSort,
    handleFilterChange,
    closeModals,
  } = useEntityTableManager<TranscriptRecord>(transcriptsConfig);

  return (
    <>
      <Toast message={toastMessage} type={toastType} onClose={clearToast} />
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

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeModals}
        onConfirm={handleConfirmDelete}
        itemName="transcript"
        itemId={selectedItem ? String(selectedItem[transcriptsConfig.primaryKey]) : undefined}
      />
    </>
  );
}


