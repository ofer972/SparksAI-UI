import React from 'react';
import { useEntityTableManager } from '@/hooks/useEntityTableManager';
import { aiCardsConfig } from '@/lib/aiCardsConfig';
import { DataTable } from '@/components/DataTable';
import { ViewRecordModal } from '@/components/ViewRecordModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import Toast from '@/components/Toast';

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
    toastMessage,
    toastType,
    clearToast,
    handleViewItem,
    handleDeleteItem,
    handleConfirmDelete,
    handleSort,
    handleFilterChange,
    closeModals,
  } = useEntityTableManager(aiCardsConfig);

  return (
    <>
      <Toast message={toastMessage} type={toastType} onClose={clearToast} />
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
        onConfirm={handleConfirmDelete}
        itemName="AI card"
        itemId={selectedItem ? String(selectedItem[aiCardsConfig.primaryKey]) : undefined}
      />
    </>
  );
}
