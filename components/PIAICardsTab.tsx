import React from 'react';
import { useEntityTableManager } from '@/hooks/useEntityTableManager';
import { piAICardsConfig } from '@/lib/piAICardsConfig';
import { DataTable } from '@/components/DataTable';
import { ViewRecordModal } from '@/components/ViewRecordModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import Toast from '@/components/Toast';

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
    toastMessage,
    toastType,
    clearToast,
    handleViewItem,
    handleDeleteItem,
    handleConfirmDelete,
    handleSort,
    handleFilterChange,
    closeModals,
  } = useEntityTableManager(piAICardsConfig);

  return (
    <>
      <Toast message={toastMessage} type={toastType} onClose={clearToast} />
      <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <input
          type="text"
          value={filterText}
          onChange={(event) => handleFilterChange(event.target.value)}
          placeholder="Search PI AI cards..."
          className="w-full sm:w-72 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <DataTable
        config={piAICardsConfig}
        data={sortedData}
        loading={loading}
        error={error}
        sortConfig={sortConfig}
        onSort={handleSort}
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
        onConfirm={handleConfirmDelete}
        itemName="PI AI card"
        itemId={selectedItem ? String(selectedItem[piAICardsConfig.primaryKey]) : undefined}
      />
    </>
  );
}


