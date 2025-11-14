'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LayoutConfig } from '@/lib/config';

interface DraggableResizableGridProps {
  layout: LayoutConfig;
  onLayoutChange: (layout: LayoutConfig) => void;
  renderReport: (reportId: string) => React.ReactNode;
  onRemoveReport?: (reportId: string) => void;
  defaultRowHeight?: number;
  minRowHeight?: number;
}

interface DraggableReportCardProps {
  reportId: string;
  rowId: string;
  children: React.ReactNode;
  onRemove?: () => void;
}

function DraggableReportCard({ reportId, rowId, children, onRemove }: DraggableReportCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef,
  } = useSortable({
    id: `${rowId}-${reportId}`,
    data: { reportId, rowId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
  };

  // Clone children and inject onClose through componentProps
  const enhancedChildren = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<any>, {
        componentProps: {
          ...(children.props.componentProps || {}),
          onClose: onRemove,
        },
      })
    : children;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`h-full relative ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      {/* Draggable handle - positioned over title area (avoiding buttons on both sides) */}
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="absolute top-3 left-14 h-8 z-30 cursor-grab active:cursor-grabbing hover:bg-blue-50 hover:bg-opacity-30 rounded transition-colors"
        style={{ 
          touchAction: 'none',
          width: 'calc(100% - 210px)', // Leave space for collapse button on left and more buttons on right
        }}
        title="Drag from title to move this report"
      />
      {enhancedChildren}
    </div>
  );
}

function DroppableRow({ rowId, children }: { rowId: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-${rowId}`,
    data: { rowId, type: 'row' },
  });

  return (
    <div
      ref={setNodeRef}
      className={`h-full transition-all ${isOver ? 'ring-2 ring-blue-400 ring-inset' : ''}`}
    >
      {children}
    </div>
  );
}

export default function DraggableResizableGrid({
  layout,
  onLayoutChange,
  renderReport,
  onRemoveReport,
  defaultRowHeight = 500,
  minRowHeight = 500,
}: DraggableResizableGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [collapsedReports, setCollapsedReports] = useState<Set<string>>(new Set());
  const [rowHeights, setRowHeights] = useState<number[]>(() =>
    layout.rows.map(() => defaultRowHeight)
  );

  // Update row heights when layout changes (rows added or removed)
  useEffect(() => {
    setRowHeights((prevHeights) => {
      // Always ensure heights array matches rows length
      const newHeights = layout.rows.map((_, index) => 
        prevHeights[index] !== undefined ? prevHeights[index] : defaultRowHeight
      );
      return newHeights;
    });
  }, [layout.rows.length, defaultRowHeight]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number[]>>(() => {
    const widths: Record<string, number[]> = {};
    layout.rows.forEach((row) => {
      widths[row.id] = Array(row.reportIds.length).fill(100 / row.reportIds.length);
    });
    return widths;
  });
  const prevLayoutRef = useRef<LayoutConfig>(layout);

  // Listen for collapse events from report cards
  useEffect(() => {
    const handleReportCollapse = (event: CustomEvent) => {
      const { reportId, collapsed } = event.detail;
      setCollapsedReports((prev) => {
        const next = new Set(prev);
        if (collapsed) {
          next.add(reportId);
        } else {
          next.delete(reportId);
        }
        return next;
      });
    };

    window.addEventListener('report-collapse' as any, handleReportCollapse);
    return () => window.removeEventListener('report-collapse' as any, handleReportCollapse);
  }, []);

  // Check if all reports in a row are collapsed
  const isRowCollapsed = useCallback((row: { id: string; reportIds: string[] }) => {
    return row.reportIds.length > 0 && row.reportIds.every((id) => collapsedReports.has(id));
  }, [collapsedReports]);

  // Vertical resizing state
  const [isDraggingVertical, setIsDraggingVertical] = useState(false);
  const [activeVerticalResizer, setActiveVerticalResizer] = useState<number | null>(null);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);

  // Horizontal resizing state
  const [isDraggingHorizontal, setIsDraggingHorizontal] = useState(false);
  const [activeHorizontalResizer, setActiveHorizontalResizer] = useState<{ rowId: string; index: number } | null>(null);
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    setActiveId(id);
    
    const activeData = event.active.data.current as { reportId: string; rowId: string };
    if (activeData?.reportId) {
      setActiveReportId(activeData.reportId);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveReportId(null);

    if (!over) return;

    const activeData = active.data.current as { reportId: string; rowId: string };
    const overData = over.data.current as { reportId?: string; rowId?: string; type?: string } | undefined;

    if (!activeData) return;

    const activeRowId = activeData.rowId;
    const activeReportId = activeData.reportId;

    // Determine target row
    let overRowId: string | null = null;
    if (overData?.type === 'row') {
      overRowId = overData.rowId!;
    } else if (overData?.rowId) {
      overRowId = overData.rowId;
    } else if (typeof over.id === 'string' && over.id.startsWith('droppable-row-')) {
      overRowId = over.id.replace('droppable-', '');
    }

    if (!overRowId) return;

    const newLayout: LayoutConfig = { rows: [...layout.rows] };

    // Same row - reorder
    if (activeRowId === overRowId && overData?.reportId && overData.reportId !== activeReportId) {
      const overReportId = overData.reportId;
      const rowIndex = newLayout.rows.findIndex((r) => r.id === activeRowId);
      if (rowIndex === -1) return;

      const reportIds = newLayout.rows[rowIndex].reportIds;
      const oldIndex = reportIds.indexOf(activeReportId);
      const newIndex = reportIds.indexOf(overReportId);

      if (oldIndex !== -1 && newIndex !== -1) {
        newLayout.rows[rowIndex] = {
          ...newLayout.rows[rowIndex],
          reportIds: arrayMove(reportIds, oldIndex, newIndex),
        };
        
        // Redistribute column widths equally in the row
        const newWidths = { ...columnWidths };
        const rowReports = newLayout.rows[rowIndex].reportIds;
        newWidths[activeRowId] = Array(rowReports.length).fill(100 / rowReports.length);
        setColumnWidths(newWidths);
        
        onLayoutChange(newLayout);
      }
    }
    // Different row - move
    else if (activeRowId !== overRowId) {
      const activeRowIndex = newLayout.rows.findIndex((r) => r.id === activeRowId);
      const overRowIndex = newLayout.rows.findIndex((r) => r.id === overRowId);

      if (activeRowIndex === -1 || overRowIndex === -1) return;
      if (newLayout.rows[overRowIndex].reportIds.includes(activeReportId)) return;

      // Remove from active row
      newLayout.rows[activeRowIndex] = {
        ...newLayout.rows[activeRowIndex],
        reportIds: newLayout.rows[activeRowIndex].reportIds.filter((id) => id !== activeReportId),
      };

      // Add to over row
      newLayout.rows[overRowIndex] = {
        ...newLayout.rows[overRowIndex],
        reportIds: [...newLayout.rows[overRowIndex].reportIds, activeReportId],
      };

      // Remove empty rows
      newLayout.rows = newLayout.rows.filter((r) => r.reportIds.length > 0);

      onLayoutChange(newLayout);
      
      // Redistribute column widths equally in all rows after layout change
      setTimeout(() => {
        const newWidths = { ...columnWidths };
        newLayout.rows.forEach((row) => {
          newWidths[row.id] = Array(row.reportIds.length).fill(100 / row.reportIds.length);
        });
        setColumnWidths(newWidths);
      }, 0);
    }
  };

  // Handle report removal and redistribute widths
  const handleReportRemove = useCallback((reportId: string) => {
    if (!onRemoveReport) return;
    
    onRemoveReport(reportId);
  }, [onRemoveReport]);

  // Watch for layout changes and adjust column widths
  useEffect(() => {
    const prevLayout = prevLayoutRef.current;
    
    setColumnWidths((prevWidths) => {
      const newWidths: Record<string, number[]> = {};
      
      layout.rows.forEach((row) => {
        const oldRow = prevLayout.rows.find(r => r.id === row.id);
        const oldWidths = prevWidths[row.id] || [];
        const oldReportIds = oldRow?.reportIds || [];
        
        // If same number of reports and same reports, keep widths
        if (oldWidths.length === row.reportIds.length && 
            row.reportIds.every((id, idx) => id === oldReportIds[idx])) {
          newWidths[row.id] = oldWidths;
        }
        // Reports were removed - preserve proportions
        else if (oldWidths.length > row.reportIds.length) {
          const remainingWidths: number[] = [];
          let totalRemainingWidth = 0;
          
          row.reportIds.forEach((reportId) => {
            const oldIndex = oldReportIds.indexOf(reportId);
            if (oldIndex !== -1 && oldWidths[oldIndex]) {
              remainingWidths.push(oldWidths[oldIndex]);
              totalRemainingWidth += oldWidths[oldIndex];
            }
          });
          
          // Normalize to 100% while preserving proportions
          if (totalRemainingWidth > 0 && remainingWidths.length === row.reportIds.length) {
            newWidths[row.id] = remainingWidths.map(w => (w / totalRemainingWidth) * 100);
          } else {
            newWidths[row.id] = Array(row.reportIds.length).fill(100 / row.reportIds.length);
          }
        }
        // Reports were added or reordered - distribute equally
        else {
          newWidths[row.id] = Array(row.reportIds.length).fill(100 / row.reportIds.length);
        }
      });
      
      return newWidths;
    });
    
    // Update previous layout reference
    prevLayoutRef.current = layout;
  }, [layout]);

  // Vertical resize handlers
  const handleVerticalMouseDown = useCallback((index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingVertical(true);
    setActiveVerticalResizer(index);
    startYRef.current = e.clientY;
    startHeightRef.current = rowHeights[index];
    document.body.style.cursor = 'row-resize';
  }, [rowHeights]);

  const handleVerticalMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingVertical || activeVerticalResizer === null) return;

      const deltaY = e.clientY - startYRef.current;
      const newHeight = Math.max(minRowHeight, startHeightRef.current + deltaY);

      setRowHeights((prev) => {
        const newHeights = [...prev];
        newHeights[activeVerticalResizer] = newHeight;
        return newHeights;
      });
    },
    [isDraggingVertical, activeVerticalResizer, minRowHeight]
  );

  const handleVerticalMouseUp = useCallback(() => {
    setIsDraggingVertical(false);
    setActiveVerticalResizer(null);
    document.body.style.cursor = '';
  }, []);

  // Horizontal resize handlers
  const handleHorizontalMouseDown = useCallback((rowId: string, index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingHorizontal(true);
    setActiveHorizontalResizer({ rowId, index });
    document.body.style.cursor = 'col-resize';
  }, []);

  const handleHorizontalMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingHorizontal || !activeHorizontalResizer) return;

      const { rowId, index } = activeHorizontalResizer;
      const container = containerRefs.current[rowId];
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width - (layout.rows.find(r => r.id === rowId)!.reportIds.length - 1) * 4; // Subtract splitter widths
      const mouseX = e.clientX - containerRect.left;
      const mousePercent = (mouseX / containerWidth) * 100;

      setColumnWidths((prev) => {
        const widths = [...(prev[rowId] || [])];
        if (widths.length === 0) return prev;

        const leftIndex = index;
        const rightIndex = index + 1;
        
        const totalWidth = widths[leftIndex] + widths[rightIndex];
        
        let cumulativeWidth = 0;
        for (let i = 0; i < leftIndex; i++) {
          cumulativeWidth += widths[i];
        }
        
        const newLeftPercent = mousePercent - cumulativeWidth;
        const newRightPercent = totalWidth - newLeftPercent;
        
        const minWidthPercent = (200 / containerWidth) * 100;
        
        if (newLeftPercent >= minWidthPercent && newRightPercent >= minWidthPercent) {
          widths[leftIndex] = newLeftPercent;
          widths[rightIndex] = newRightPercent;
        }
        
        return { ...prev, [rowId]: widths };
      });
    },
    [isDraggingHorizontal, activeHorizontalResizer, layout.rows]
  );

  const handleHorizontalMouseUp = useCallback(() => {
    setIsDraggingHorizontal(false);
    setActiveHorizontalResizer(null);
    document.body.style.cursor = '';
  }, []);

  useEffect(() => {
    if (isDraggingVertical) {
      document.addEventListener('mousemove', handleVerticalMouseMove);
      document.addEventListener('mouseup', handleVerticalMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleVerticalMouseMove);
        document.removeEventListener('mouseup', handleVerticalMouseUp);
      };
    }
  }, [isDraggingVertical, handleVerticalMouseMove, handleVerticalMouseUp]);

  useEffect(() => {
    if (isDraggingHorizontal) {
      document.addEventListener('mousemove', handleHorizontalMouseMove);
      document.addEventListener('mouseup', handleHorizontalMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleHorizontalMouseMove);
        document.removeEventListener('mouseup', handleHorizontalMouseUp);
      };
    }
  }, [isDraggingHorizontal, handleHorizontalMouseMove, handleHorizontalMouseUp]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div>
        {layout.rows.map((row, rowIndex) => (
          <React.Fragment key={row.id}>
            <SortableContext
              items={row.reportIds.map((id) => `${row.id}-${id}`)}
              strategy={rectSortingStrategy}
            >
              <DroppableRow rowId={row.id}>
                <div
                  ref={(el) => { containerRefs.current[row.id] = el; }}
                  className="flex"
                  style={{
                    height: isRowCollapsed(row) ? '60px' : `${rowHeights[rowIndex]}px`,
                    transition: 'height 0.3s ease-in-out',
                  }}
                >
                  {row.reportIds.map((reportId, colIndex) => (
                    <React.Fragment key={`${row.id}-${reportId}`}>
                      <div
                        style={{ width: `${columnWidths[row.id]?.[colIndex] || 100 / row.reportIds.length}%` }}
                        className="flex-shrink-0 h-full"
                      >
                        <DraggableReportCard 
                          reportId={reportId} 
                          rowId={row.id}
                          onRemove={onRemoveReport ? () => handleReportRemove(reportId) : undefined}
                        >
                          {renderReport(reportId)}
                        </DraggableReportCard>
                      </div>
                      {colIndex < row.reportIds.length - 1 && !isDraggingHorizontal && (
                        <div
                          className={`flex-shrink-0 w-1 cursor-col-resize transition-all relative group bg-transparent hover:bg-blue-400`}
                          onMouseDown={handleHorizontalMouseDown(row.id, colIndex)}
                          style={{ cursor: 'col-resize' }}
                        >
                          <div className="absolute inset-y-0 left-0 w-1 h-full"></div>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </DroppableRow>
            </SortableContext>
            
            {rowIndex < layout.rows.length - 1 && (
              <div
                className={`h-1 cursor-row-resize transition-all relative group ${
                  isDraggingVertical && activeVerticalResizer === rowIndex
                    ? 'bg-blue-500'
                    : 'bg-transparent hover:bg-blue-400'
                }`}
                onMouseDown={handleVerticalMouseDown(rowIndex)}
                style={{ cursor: 'row-resize' }}
              >
                <div className="absolute inset-x-0 top-0 h-1 w-full"></div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      
      <DragOverlay>
        {activeReportId ? (
          <div className="bg-gradient-to-br from-blue-100 to-indigo-100 border-2 border-blue-500 rounded-lg shadow-2xl p-4 min-w-[200px]">
            <div className="text-sm font-semibold text-blue-900">📊 {activeReportId}</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

