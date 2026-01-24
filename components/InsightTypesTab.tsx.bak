'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DataTable } from '@/components/DataTable';
import EditInsightTypeModal from './EditInsightTypeModal';
import Toast from './Toast';
import { ApiService } from '@/lib/api';
import { InsightType } from '@/lib/config';

export default function InsightTypesTab() {
  const [insightTypes, setInsightTypes] = useState<InsightType[]>([]);
  const [insightCategories, setInsightCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof InsightType | string; direction: 'asc' | 'desc' }>({
    key: 'id',
    direction: 'asc'
  });
  const [filterText, setFilterText] = useState('');
  const [selectedItem, setSelectedItem] = useState<InsightType | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const apiService = new ApiService();

  const fetchInsightTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const [typesResult, categoriesResult] = await Promise.all([
        apiService.getInsightTypes(),
        apiService.getInsightCategories(),
      ]);
      setInsightTypes(typesResult.insight_types || []);
      setInsightCategories(categoriesResult.categories || []);
    } catch (err) {
      console.error('Error fetching insight types:', err);
      setError(err instanceof Error ? err.message : 'Failed to load insight types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsightTypes();
  }, []);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = (text: string) => {
    setFilterText(text);
  };

  const handleEditItem = (item: InsightType) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  const handleCreateItem = () => {
    setSelectedItem(null);
    setIsEditModalOpen(true);
  };


  const handleSaveItem = async (itemData: {
    insight_type?: string;
    insight_description: string;
    insight_categories: string[];
    active: boolean;
    cron_config?: {
      day_of_week?: string;
      hour?: number;
      minute?: number;
    } | null;
  }) => {
    try {
      if (selectedItem) {
        // Update existing
        await apiService.updateInsightType(selectedItem.id, itemData);
        setToastType('success');
        setToastMessage(`Insight type "${itemData.insight_type || selectedItem.insight_type}" updated successfully`);
      } else {
        // Create new
        if (!itemData.insight_type) {
          throw new Error('Insight type name is required');
        }
        await apiService.createInsightType({
          insight_type: itemData.insight_type,
          insight_description: itemData.insight_description,
          insight_categories: itemData.insight_categories,
          active: itemData.active,
          cron_config: itemData.cron_config,
        });
        setToastType('success');
        setToastMessage(`Insight type "${itemData.insight_type}" created successfully`);
      }
      
      await fetchInsightTypes();
      setIsEditModalOpen(false);
      setSelectedItem(null);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Error saving insight type:', err);
      setToastType('error');
      setToastMessage(`Failed to save insight type: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTimeout(() => setToastMessage(null), 3000);
      throw err;
    }
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedItem(null);
  };

  // Filter and sort data
  const filteredData = insightTypes.filter(item =>
    Object.values(item).some(value => {
      if (Array.isArray(value)) {
        return value.some(v => String(v).toLowerCase().includes(filterText.toLowerCase()));
      }
      return String(value).toLowerCase().includes(filterText.toLowerCase());
    })
  );

  const sortedData = [...filteredData].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    if (sortConfig.key === 'last_modification_date') {
      const getLastModificationDate = (row: InsightType) => {
        const createdDate = new Date(row.created_at);
        const updatedDate = new Date(row.updated_at);
        return updatedDate > createdDate ? updatedDate : createdDate;
      };
      aValue = getLastModificationDate(a).getTime();
      bValue = getLastModificationDate(b).getTime();
    } else if (sortConfig.key === 'categories') {
      const getCategories = (row: InsightType) => {
        const categories = row.insight_categories || row.categories || [];
        return categories.join(', ');
      };
      aValue = getCategories(a);
      bValue = getCategories(b);
    } else {
      aValue = a[sortConfig.key as keyof InsightType];
      bValue = b[sortConfig.key as keyof InsightType];
    }

    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const columns = useMemo(() => [
    { key: 'id', label: 'ID', sortable: true, width: '50px', align: 'center' as const },
    { key: 'insight_type', label: 'Insight Type', sortable: true, width: '150px', align: 'left' as const },
    { key: 'insight_description', label: 'Description', sortable: true, width: '220px', align: 'left' as const },
    { key: 'categories', label: 'Categories', sortable: true, width: '260px' },
    { key: 'pi_insight', label: 'PI Insight', sortable: true, width: '100px', align: 'center' as const },
    { key: 'sprint_insight', label: 'Sprint Insight', sortable: true, width: '120px', align: 'center' as const },
    { key: 'team_insight', label: 'Team Insight', sortable: true, width: '110px', align: 'center' as const },
    { key: 'group_insight', label: 'Group Insight', sortable: true, width: '120px', align: 'center' as const },
    { key: 'active', label: 'Active', sortable: true, width: '80px', align: 'center' as const },
    { key: 'last_modification_date', label: 'Last Modification Date', sortable: true, width: '160px', align: 'center' as const },
  ], []);

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`${toastType === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]`}>
            {toastType === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="flex-1 text-sm font-medium">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="h-full flex flex-col min-h-0">
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0">
          <input
            type="text"
            value={filterText}
            onChange={(event) => handleFilterChange(event.target.value)}
            placeholder="Search insight types..."
            className="w-full sm:w-72 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateItem}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <DataTable
            columns={columns.map(col => ({
              key: col.key,
              label: col.label,
              sortable: col.sortable,
              width: col.width,
              align: col.align,
              render: (value: any, row: InsightType) => {
                if (col.key === 'categories') {
                  const includedCategories = row.insight_categories || row.categories || [];
                  return (
                    <span className="text-sm text-gray-700">
                      {includedCategories.length > 0 ? includedCategories.join(', ') : '-'}
                    </span>
                  );
                }
                if (col.key === 'active') {
                  return (
                    <input
                      type="checkbox"
                      checked={row.active}
                      readOnly
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-default"
                    />
                  );
                }
                if (col.key === 'pi_insight') {
                  const piInsight = Boolean(row.pi_insight ?? row.requirePI ?? row.require_pi ?? row.requires_pi ?? false);
                  return (
                    <input
                      type="checkbox"
                      checked={piInsight}
                      readOnly
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-default"
                    />
                  );
                }
                if (col.key === 'sprint_insight') {
                  const sprintInsight = Boolean(row.sprint_insight ?? row.requireSprint ?? false);
                  return (
                    <input
                      type="checkbox"
                      checked={sprintInsight}
                      readOnly
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-default"
                    />
                  );
                }
                if (col.key === 'team_insight') {
                  const teamInsight = Boolean(row.team_insight ?? row.requireTeam ?? row.require_team ?? row.requires_team ?? false);
                  return (
                    <input
                      type="checkbox"
                      checked={teamInsight}
                      readOnly
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-default"
                    />
                  );
                }
                if (col.key === 'group_insight') {
                  const groupInsight = Boolean(row.group_insight ?? row.requireGroup ?? row.require_group ?? row.requires_group ?? false);
                  return (
                    <input
                      type="checkbox"
                      checked={groupInsight}
                      readOnly
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-default"
                    />
                  );
                }
                if (col.key === 'last_modification_date') {
                  const createdDate = new Date(row.created_at);
                  const updatedDate = new Date(row.updated_at);
                  const lastModificationDate = updatedDate > createdDate ? updatedDate : createdDate;
                  const dateOptions: Intl.DateTimeFormatOptions = { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  };
                  const formattedDate = lastModificationDate.toLocaleDateString('en-US', dateOptions);
                  const hours = lastModificationDate.getHours().toString().padStart(2, '0');
                  const minutes = lastModificationDate.getMinutes().toString().padStart(2, '0');
                  const formattedTime = `${hours}:${minutes}`;
                  return (
                    <span className="text-sm text-gray-600">
                      {formattedDate} {formattedTime}
                    </span>
                  );
                }
                if (col.key === 'insight_type') {
                  return <span className="font-medium">{row.insight_type}</span>;
                }
                if (col.key === 'insight_description') {
                  return (
                    <div className="whitespace-nowrap" title={row.insight_description}>
                      {row.insight_description}
                    </div>
                  );
                }
                return value !== null && value !== undefined ? String(value) : '-';
              },
            }))}
            data={sortedData}
            loading={loading}
            error={error}
            sortConfig={sortConfig}
            onSort={handleSort}
            onEditItem={handleEditItem}
            allowEdit={true}
          />
        </div>
      </div>

      {/* Edit/Create Modal */}
      <EditInsightTypeModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        insightType={selectedItem}
        insightCategories={insightCategories}
        onSave={handleSaveItem}
      />
    </>
  );
}

