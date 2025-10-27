'use client';

import React, { useState, useMemo } from 'react';

interface SprintData {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  velocity: number;
  predictability: number;
  cycleTime: number;
  completedPoints: number;
  committedPoints: number;
}

interface ClosedSprintsProps {
  selectedTeam: string;
  isLoading?: boolean;
}

export default function ClosedSprints({ selectedTeam, isLoading = false }: ClosedSprintsProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof SprintData | null; direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'asc',
  });
  const [filterText, setFilterText] = useState('');

  // Fixed sample data
  const sampleData: SprintData[] = [
    {
      id: '1',
      name: 'Sprint 1 - API Development',
      startDate: '2025-10-01',
      endDate: '2025-10-15',
      velocity: 23,
      predictability: 85,
      cycleTime: 4.2,
      completedPoints: 23,
      committedPoints: 25,
    },
    {
      id: '2',
      name: 'Sprint 2 - Frontend Integration',
      startDate: '2025-09-15',
      endDate: '2025-09-29',
      velocity: 28,
      predictability: 92,
      cycleTime: 3.8,
      completedPoints: 28,
      committedPoints: 30,
    },
    {
      id: '3',
      name: 'Sprint 3 - Database Optimization',
      startDate: '2025-09-01',
      endDate: '2025-09-15',
      velocity: 20,
      predictability: 78,
      cycleTime: 5.1,
      completedPoints: 20,
      committedPoints: 22,
    },
    {
      id: '4',
      name: 'Sprint 4 - Testing & QA',
      startDate: '2025-08-18',
      endDate: '2025-09-01',
      velocity: 25,
      predictability: 88,
      cycleTime: 4.5,
      completedPoints: 25,
      committedPoints: 28,
    },
  ];

  const handleSort = (key: keyof SprintData) => {
    if (sortConfig.key === key) {
      setSortConfig({
        key,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      setSortConfig({ key, direction: 'asc' });
    }
  };

  const sortedAndFilteredData = useMemo(() => {
    let data = [...sampleData];

    // Apply filter
    if (filterText) {
      data = data.filter(item =>
        item.name.toLowerCase().includes(filterText.toLowerCase()) ||
        item.velocity.toString().includes(filterText) ||
        item.predictability.toString().includes(filterText)
      );
    }

    // Apply sort
    if (sortConfig.key) {
      data.sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [filterText, sortConfig]);

  const SortIcon = ({ columnKey }: { columnKey: keyof SprintData }) => {
    if (sortConfig.key !== columnKey) return <span className="text-gray-400">↕</span>;
    return sortConfig.direction === 'asc' ? <span>↑</span> : <span>↓</span>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      <span className="ml-2 text-xs text-gray-600">Loading sprints...</span>
    </div>
  );

  const SkeletonRow = () => (
    <tr className="border-b border-gray-100">
      <td className="py-1.5 px-2">
        <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
      </td>
      <td className="py-1.5 px-2 text-right">
        <div className="h-3 bg-gray-200 rounded animate-pulse w-16 ml-auto"></div>
      </td>
      <td className="py-1.5 px-2 text-right">
        <div className="h-3 bg-gray-200 rounded animate-pulse w-16 ml-auto"></div>
      </td>
      <td className="py-1.5 px-2 text-center">
        <div className="h-3 bg-gray-200 rounded animate-pulse w-8 mx-auto"></div>
      </td>
      <td className="py-1.5 px-2 text-center">
        <div className="h-3 bg-gray-200 rounded animate-pulse w-12 mx-auto"></div>
      </td>
      <td className="py-1.5 px-2 text-center">
        <div className="h-3 bg-gray-200 rounded animate-pulse w-10 mx-auto"></div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center mb-3">
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-500 hover:text-gray-700 transition-colors mr-2"
        >
          {collapsed ? '▼' : '▲'}
        </button>
        <h2 className="text-lg font-semibold">Closed Sprints</h2>
      </div>

      {!collapsed && (
        <div className="space-y-2">
          {/* Filter Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter by sprint name, velocity, or predictability..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th 
                    className="text-left py-1.5 px-2 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Sprint Name
                      <SortIcon columnKey="name" />
                    </div>
                  </th>
                  <th 
                    className="text-right py-1.5 px-2 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('startDate')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Start Date
                      <SortIcon columnKey="startDate" />
                    </div>
                  </th>
                  <th 
                    className="text-right py-1.5 px-2 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('endDate')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      End Date
                      <SortIcon columnKey="endDate" />
                    </div>
                  </th>
                  <th 
                    className="text-center py-1.5 px-2 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('velocity')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Velocity
                      <SortIcon columnKey="velocity" />
                    </div>
                  </th>
                  <th 
                    className="text-center py-1.5 px-2 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('predictability')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Predictability %
                      <SortIcon columnKey="predictability" />
                    </div>
                  </th>
                  <th 
                    className="text-center py-1.5 px-2 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('cycleTime')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Cycle Time (days)
                      <SortIcon columnKey="cycleTime" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                ) : (
                  sortedAndFilteredData.map((sprint) => (
                    <tr key={sprint.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-1.5 px-2 font-medium text-gray-900">{sprint.name}</td>
                      <td className="py-1.5 px-2 text-right text-gray-600">{formatDate(sprint.startDate)}</td>
                      <td className="py-1.5 px-2 text-right text-gray-600">{formatDate(sprint.endDate)}</td>
                      <td className="py-1.5 px-2 text-center text-gray-900 font-semibold">{sprint.velocity}</td>
                      <td className="py-1.5 px-2 text-center">
                        <span className={`font-semibold ${
                          sprint.predictability >= 80 ? 'text-green-600' : 
                          sprint.predictability >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {sprint.predictability}%
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-center text-gray-700">{sprint.cycleTime}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {sortedAndFilteredData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No sprints found matching the filter criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
