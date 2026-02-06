'use client';

import { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/DataTable';
import { etlApiService } from '@/lib/etl';
import { PIDefinition } from '@/lib/etl';
import { getPITerminology, getPITerminologyPlural, piLabel } from '@/lib/piTerminology';

interface PIManagementProps {
  onSaved: () => void;
}

interface PIRow {
  pi_name: string;
  start_date: string;
  end_date: string;
  planning_grace_days: number;
  prep_grace_days: number;
}

export default function PIManagement({ onSaved }: PIManagementProps) {
  const [pis, setPIs] = useState<{ [pi_name: string]: PIDefinition }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPI, setEditingPI] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    planning_grace_days: 5,
    prep_grace_days: 5,
  });

  useEffect(() => {
    loadPIs();
  }, []);

  const loadPIs = async () => {
    try {
      setLoading(true);
      const pisData = await etlApiService.getPIs();
      setPIs(pisData);
    } catch (err: any) {
      setError(err.message || 'Failed to load PIs');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);
    setFormData({
      name: '',
      start_date: today,
      end_date: futureDate.toISOString().split('T')[0],
      planning_grace_days: 5,
      prep_grace_days: 5,
    });
    setEditingPI(null);
    setShowModal(true);
  };

  const handleEdit = (piRow: PIRow) => {
    const pi = pis[piRow.pi_name];
    setFormData({
      name: piRow.pi_name,
      start_date: pi.start_date,
      end_date: pi.end_date,
      planning_grace_days: pi.planning_grace_days,
      prep_grace_days: pi.prep_grace_days,
    });
    setEditingPI(piRow.pi_name);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setError(null);
      if (editingPI) {
        await etlApiService.updatePI(
          formData.name,
          formData.start_date,
          formData.end_date,
          formData.planning_grace_days,
          formData.prep_grace_days
        );
      } else {
        await etlApiService.createPI(
          formData.name,
          formData.start_date,
          formData.end_date,
          formData.planning_grace_days,
          formData.prep_grace_days
        );
      }
      setShowModal(false);
      loadPIs();
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save PI');
    }
  };

  const handleDelete = async (piRow: PIRow) => {
    try {
      await etlApiService.deletePI(piRow.pi_name);
      setDeleteConfirm(null);
      loadPIs();
      onSaved();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Transform data for DataTable
  const tableData: PIRow[] = Object.entries(pis).map(([piName, pi]) => ({
    pi_name: piName,
    start_date: pi.start_date,
    end_date: pi.end_date,
    planning_grace_days: pi.planning_grace_days,
    prep_grace_days: pi.prep_grace_days,
  }));

  const columns: Column<PIRow>[] = [
    { key: 'pi_name', label: piLabel('Name'), sortable: true },
    { 
      key: 'start_date', 
      label: 'Start Date', 
      sortable: true,
      render: (value) => formatDate(value)
    },
    { 
      key: 'end_date', 
      label: 'End Date', 
      sortable: true,
      render: (value) => formatDate(value)
    },
    { 
      key: 'planning_grace_days', 
      label: 'Planning Grace', 
      sortable: true,
      render: (value) => `${value} days`
    },
    { 
      key: 'prep_grace_days', 
      label: 'Prep Grace', 
      sortable: true,
      render: (value) => `${value} days`
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-content-primary">Program Increments</h3>
          <p className="text-sm text-content-tertiary">Manage PI dates and grace periods</p>
        </div>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium shadow-sm"
        >
          + {`Add ${getPITerminology()}`}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* DataTable */}
      <DataTable
        data={tableData}
        columns={columns}
        loading={loading}
        error={error}
        emptyMessage={`No ${getPITerminologyPlural()} configured. Click 'Add ${getPITerminology()}' to create one.`}
        onEditItem={handleEdit}
        onDeleteItem={(row) => setDeleteConfirm(row.pi_name)}
        allowEdit={true}
        striped={true}
        hoverable={true}
      />

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-xl max-w-lg w-full border border-outline">
            <div className="px-6 py-4 border-b border-outline">
              <h3 className="text-lg font-semibold text-content-primary">
                {editingPI ? `Edit ${getPITerminology()}` : `Add New ${getPITerminology()}`}
              </h3>
            </div>
            
            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                {error}
              </div>
            )}

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1">{piLabel('Name')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!!editingPI}
                  className="w-full px-3 py-2 border border-outline rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 disabled:bg-surface-secondary"
                  placeholder="e.g., Q12025"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-content-secondary mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-outline rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-content-secondary mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-outline rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-content-secondary mb-1">Planning Grace (days)</label>
                  <input
                    type="number"
                    value={formData.planning_grace_days}
                    onChange={(e) => setFormData({ ...formData, planning_grace_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-outline rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-content-secondary mb-1">Prep Grace (days)</label>
                  <input
                    type="number"
                    value={formData.prep_grace_days}
                    onChange={(e) => setFormData({ ...formData, prep_grace_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-outline rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-outline flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 text-content-secondary rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium"
              >
                {editingPI ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-xl p-6 max-w-md w-full border border-outline">
            <h3 className="font-semibold text-lg mb-3 text-content-primary">{`Delete ${getPITerminology()}`}</h3>
            <p className="text-sm text-content-secondary mb-6">
              Are you sure you want to delete <strong>{deleteConfirm}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete({ pi_name: deleteConfirm } as PIRow)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-content-secondary rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
