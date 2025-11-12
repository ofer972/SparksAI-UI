'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ReportDefinition } from '@/lib/config';

// Report type icons - uniform styling for all
const REPORT_TYPE_ICONS: Record<string, string> = {
  burn_down: '📉',
  line: '📈',
  bar: '📊',
  stacked_bar: '📚',
  composite: '🔀',
  summary: '📋',
  table: '📑',
  tree: '🌳',
};

const getReportIcon = (chartType: string) => {
  return REPORT_TYPE_ICONS[chartType] || '📊';
};

interface LayoutRow {
  id: string;
  reportIds: string[];
}

export interface DashboardLayout {
  rows: LayoutRow[];
}

interface DashboardLayoutArrangerProps {
  view: string;
  availableReports: ReportDefinition[];
  initialLayout?: DashboardLayout;
  onLayoutChange: (layout: DashboardLayout) => void;
  onCancel: () => void;
}

interface SortableReportCardProps {
  report: ReportDefinition;
  rowId: string;
}

function SortableReportCard({ report, rowId }: SortableReportCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${rowId}-${report.report_id}`,
    data: { report, rowId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const icon = getReportIcon(report.chart_type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`h-full w-full bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 text-blue-900 rounded-lg px-3 py-3 shadow-sm hover:shadow-lg hover:border-blue-300 flex items-center justify-center ${
        isDragging ? 'opacity-20 scale-95' : 'opacity-100'
      }`}
    >
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="text-lg flex-shrink-0">{icon}</span>
        <div className="font-semibold text-xs">{report.report_name}</div>
      </div>
    </div>
  );
}

interface ReportCardProps {
  report: ReportDefinition;
}

function ReportCard({ report }: ReportCardProps) {
  const icon = getReportIcon(report.chart_type);

  return (
    <div 
      className="bg-gradient-to-br from-blue-200 to-indigo-200 border-4 border-blue-600 text-blue-900 rounded-lg px-4 py-3 shadow-2xl"
      style={{ 
        cursor: 'grabbing',
        transform: 'scale(1.1) rotate(2deg)',
        opacity: 1,
        zIndex: 9999,
      }}
    >
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="text-2xl flex-shrink-0">{icon}</span>
        <div className="font-bold text-sm">{report.report_name}</div>
      </div>
    </div>
  );
}

// Droppable row component for empty rows
interface DroppableRowProps {
  rowId: string;
  children: React.ReactNode;
  isEmpty: boolean;
}

function DroppableRow({ rowId, children, isEmpty }: DroppableRowProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-${rowId}`,
    data: { rowId, type: 'row' },
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] transition-all ${
        isOver ? 'bg-blue-100 ring-2 ring-blue-400 ring-inset' : ''
      }`}
    >
      {children}
    </div>
  );
}

export default function DashboardLayoutArranger({
  view,
  availableReports,
  initialLayout,
  onLayoutChange,
  onCancel,
}: DashboardLayoutArrangerProps) {
  const reportMap = useMemo(() => {
    const map = new Map<string, ReportDefinition>();
    availableReports.forEach((r) => map.set(r.report_id, r));
    return map;
  }, [availableReports]);

  const [layout, setLayout] = useState<DashboardLayout>(() => {
    if (initialLayout && initialLayout.rows.length > 0) {
      return initialLayout;
    }
    // Create initial layout with 2 reports per row
    const rows: LayoutRow[] = [];
    const reportIds = availableReports.map((r) => r.report_id);
    
    for (let i = 0; i < reportIds.length; i += 2) {
      rows.push({
        id: `row-${i / 2 + 1}`,
        reportIds: reportIds.slice(i, i + 2),
      });
    }
    
    return { rows: rows.length > 0 ? rows : [{ id: 'row-1', reportIds: [] }] };
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<ReportDefinition | null>(null);
  const [availableReportsPool, setAvailableReportsPool] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Add grabbing cursor to body when dragging
  useEffect(() => {
    if (activeId) {
      document.body.style.cursor = 'grabbing';
    } else {
      document.body.style.cursor = '';
    }
    return () => {
      document.body.style.cursor = '';
    };
  }, [activeId]);

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    setActiveId(id);
    
    // Extract report from active data
    const activeData = event.active.data.current as { report: ReportDefinition; rowId: string };
    if (activeData?.report) {
      setActiveReport(activeData.report);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Don't move items during drag over, just for visual feedback
    // Actual movement happens in handleDragEnd
    const { over } = event;
    if (!over) return;
    
    // Provide visual feedback by highlighting drop zones
    // The actual logic is in handleDragEnd
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveReport(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeData = active.data.current as { report: ReportDefinition; rowId: string };
    const overData = over.data.current as { report?: ReportDefinition; rowId?: string; type?: string } | undefined;

    if (!activeData) return;

    const activeRowId = activeData.rowId;
    
    // Determine the target row ID
    let overRowId: string | null = null;
    
    if (overData?.type === 'row') {
      // Dropping directly onto a row droppable zone
      overRowId = overData.rowId!;
    } else if (overData?.rowId) {
      // Dropping onto another report
      overRowId = overData.rowId;
    } else if (typeof overId === 'string') {
      // Check if it's a droppable zone ID (format: droppable-row-X)
      if (overId.startsWith('droppable-row-')) {
        overRowId = overId.replace('droppable-', '');
      } else if (overId.startsWith('row-')) {
        overRowId = overId;
      } else {
        // Check if it's a report card ID (format: row-X-reportId)
        const parts = overId.split('-');
        if (parts.length >= 2 && parts[0] === 'row') {
          overRowId = `${parts[0]}-${parts[1]}`;
        }
      }
    }

    if (!overRowId) return;

    // If same row, reorder within row
    if (activeRowId === overRowId && overData?.report) {
      const overReportId = overData.report.report_id; // Extract before callback
      
      setLayout((prev) => {
        const newRows = [...prev.rows];
        const rowIndex = newRows.findIndex((r) => r.id === activeData.rowId);
        if (rowIndex === -1) return prev;

        const reportIds = newRows[rowIndex].reportIds;
        const oldIndex = reportIds.indexOf(activeData.report.report_id);
        const newIndex = reportIds.indexOf(overReportId);

        if (oldIndex !== -1 && newIndex !== -1) {
          newRows[rowIndex] = {
            ...newRows[rowIndex],
            reportIds: arrayMove(reportIds, oldIndex, newIndex),
          };
        }

        return { rows: newRows };
      });
    } else if (activeRowId !== overRowId) {
      // Move to different row
      setLayout((prev) => {
        const newRows = [...prev.rows];
        const activeRowIndex = newRows.findIndex((r) => r.id === activeRowId);
        const overRowIndex = newRows.findIndex((r) => r.id === overRowId);

        if (activeRowIndex === -1 || overRowIndex === -1) return prev;

        const reportId = activeData.report.report_id;
        
        // Check if report is already in the target row
        if (newRows[overRowIndex].reportIds.includes(reportId)) return prev;

        // Remove from active row
        newRows[activeRowIndex] = {
          ...newRows[activeRowIndex],
          reportIds: newRows[activeRowIndex].reportIds.filter((id) => id !== reportId),
        };

        // Add to over row
        newRows[overRowIndex] = {
          ...newRows[overRowIndex],
          reportIds: [...newRows[overRowIndex].reportIds, reportId],
        };

        // Clean up empty rows (except if it's the last row)
        const filteredRows = newRows.filter((r, idx) => 
          r.reportIds.length > 0 || newRows.length === 1
        );

        // If we removed the last report from a row and there are other rows, 
        // create a new empty row at the end
        return { rows: filteredRows.length > 0 ? filteredRows : [{ id: `row-${Date.now()}`, reportIds: [] }] };
      });
    }
  };

  const addRow = () => {
    setLayout((prev) => ({
      rows: [
        ...prev.rows,
        {
          id: `row-${Date.now()}`,
          reportIds: [],
        },
      ],
    }));
  };

  const removeRow = (rowId: string) => {
    setLayout((prev) => {
      const rowToRemove = prev.rows.find((r) => r.id === rowId);
      if (!rowToRemove) return prev;

      // Add removed reports back to the pool or to the first row
      const remainingRows = prev.rows.filter((r) => r.id !== rowId);
      if (remainingRows.length === 0) {
        // Create a new row with the reports
        return {
          rows: [
            {
              id: `row-${Date.now()}`,
              reportIds: rowToRemove.reportIds,
            },
          ],
        };
      }

      // Add reports to the first row
      remainingRows[0] = {
        ...remainingRows[0],
        reportIds: [...remainingRows[0].reportIds, ...rowToRemove.reportIds],
      };

      return { rows: remainingRows };
    });
  };

  const removeReportFromRow = (rowId: string, reportId: string) => {
    setLayout((prev) => ({
      rows: prev.rows.map((r) =>
        r.id === rowId
          ? { ...r, reportIds: r.reportIds.filter((id) => id !== reportId) }
          : r
      ),
    }));
  };

  const handleSave = () => {
    onLayoutChange(layout);
  };

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 shadow-sm">
        <h3 className="text-sm font-semibold text-blue-900 mb-1 flex items-center gap-2">
          📐 Dashboard Layout Arranger
        </h3>
        <p className="text-xs text-blue-700">
          Drag reports between rows to organize your dashboard. Each row displays its reports side by side.
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="bg-white rounded-lg border-2 border-gray-300 shadow-sm overflow-hidden mx-6">
          <div className="text-xs text-gray-600 p-3 text-center bg-gray-50 border-b-2 border-gray-300">
            Drag reports to any row to organize. Each row can have any number of reports.
          </div>
          
           <div className="divide-y-2 divide-gray-300">
             {layout.rows.map((row, rowIndex) => (
               <div key={row.id} className="relative hover:bg-blue-50 transition-colors">
                 <button
                   onClick={() => removeRow(row.id)}
                   disabled={layout.rows.length === 1}
                   className="absolute right-2 top-2 z-10 text-red-600 hover:text-white hover:bg-red-600 text-xs px-2 py-1 rounded transition-colors font-medium disabled:opacity-30 disabled:cursor-not-allowed bg-white shadow-sm border border-gray-300"
                   title="Remove this row"
                 >
                   🗑️
                 </button>
                
                <SortableContext
                  items={row.reportIds.map((id) => `${row.id}-${id}`)}
                  strategy={rectSortingStrategy}
                >
                  <DroppableRow rowId={row.id} isEmpty={row.reportIds.length === 0}>
                    {row.reportIds.length === 0 ? (
                       <div className="flex items-center justify-center text-center text-gray-400 text-xs py-12 bg-gray-50">
                         <div>
                           <div className="text-3xl mb-2">⬇️</div>
                           <div className="font-semibold">Drop reports here</div>
                         </div>
                       </div>
                    ) : (
                      <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${row.reportIds.length}, 1fr)` }}>
                        {row.reportIds.map((reportId, colIndex) => {
                          const report = reportMap.get(reportId);
                          if (!report) return null;

                           return (
                             <div 
                               key={`${row.id}-${reportId}`} 
                               className={`relative group p-3 min-h-[80px] ${
                                 colIndex < row.reportIds.length - 1 ? 'border-r-2 border-gray-300' : ''
                               }`}
                             >
                               <div className="h-full">
                                 <SortableReportCard report={report} rowId={row.id} />
                               </div>
                               <button
                                 onClick={() => removeReportFromRow(row.id, reportId)}
                                 className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-xs shadow-md z-10"
                                 title="Remove from this row"
                               >
                                 ×
                               </button>
                             </div>
                           );
                        })}
                      </div>
                    )}
                  </DroppableRow>
                </SortableContext>
              </div>
            ))}
          </div>
        </div>

        <DragOverlay
          dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
          style={{ 
            cursor: 'grabbing',
            zIndex: 9999,
          }}
        >
          {activeReport ? <ReportCard report={activeReport} /> : null}
        </DragOverlay>
      </DndContext>

      <div className="flex items-center justify-between pt-3 mx-6">
        <button
          onClick={addRow}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm hover:shadow-md transition-all flex items-center gap-2"
        >
          <span>➕</span>
          <span>Add Row</span>
        </button>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-md text-sm font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm hover:shadow-md transition-all"
          >
            ✓ Apply Layout
          </button>
        </div>
      </div>

    </div>
  );
}

