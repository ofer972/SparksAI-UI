'use client';

import React, { ReactNode, useState, useRef, useCallback, useEffect } from 'react';

interface GitHubMetricsTabProps {
  cards: ReactNode[];
}

export default function GitHubMetricsTab({ 
  cards
}: GitHubMetricsTabProps) {
  // Organize cards into rows (2 per row)
  const rows: ReactNode[][] = [];
  for (let i = 0; i < cards.length; i += 2) {
    rows.push(cards.slice(i, i + 2));
  }

  // State for column widths per row
  const [columnWidths, setColumnWidths] = useState<Record<number, number[]>>({});
  const [isDraggingHorizontal, setIsDraggingHorizontal] = useState(false);
  const [activeHorizontalResizer, setActiveHorizontalResizer] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const containerRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // State for row heights (vertical resizing)
  const [rowHeights, setRowHeights] = useState<number[]>([]);
  const [isDraggingVertical, setIsDraggingVertical] = useState(false);
  const [activeVerticalResizer, setActiveVerticalResizer] = useState<number | null>(null);
  const mainContainerRef = useRef<HTMLDivElement | null>(null);

  // Initialize column widths (50/50 split for 2-column rows)
  useEffect(() => {
    const initialWidths: Record<number, number[]> = {};
    rows.forEach((_, rowIdx) => {
      if (rows[rowIdx].length === 2) {
        initialWidths[rowIdx] = [50, 50];
      }
    });
    setColumnWidths(initialWidths);
  }, [cards.length]);

  // Initialize row heights (equal distribution)
  useEffect(() => {
    if (rows.length > 0) {
      const equalHeight = 100 / rows.length;
      setRowHeights(rows.map(() => equalHeight));
    }
  }, [rows.length]);

  // Column (horizontal) resizing handlers
  const handleHorizontalMouseDown = useCallback((rowIdx: number, colIdx: number) => {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDraggingHorizontal(true);
      setActiveHorizontalResizer({ rowIdx, colIdx });
      document.body.style.cursor = 'col-resize';
    };
  }, []);

  const handleHorizontalMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingHorizontal || !activeHorizontalResizer) return;

    const container = containerRefs.current[activeHorizontalResizer.rowIdx];
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mousePercent = (mouseX / rect.width) * 100;

    setColumnWidths((prev) => {
      const widths = [...(prev[activeHorizontalResizer.rowIdx] || [50, 50])];
      const leftIndex = activeHorizontalResizer.colIdx;
      const rightIndex = activeHorizontalResizer.colIdx + 1;
      const totalWidth = widths[leftIndex] + widths[rightIndex];
      const newLeftPercent = mousePercent;
      const newRightPercent = totalWidth - newLeftPercent;
      const minWidthPercent = 20;

      if (newLeftPercent >= minWidthPercent && newRightPercent >= minWidthPercent) {
        widths[leftIndex] = newLeftPercent;
        widths[rightIndex] = newRightPercent;
      }

      return { ...prev, [activeHorizontalResizer.rowIdx]: widths };
    });
  }, [isDraggingHorizontal, activeHorizontalResizer]);

  const handleHorizontalMouseUp = useCallback(() => {
    setIsDraggingHorizontal(false);
    setActiveHorizontalResizer(null);
    document.body.style.cursor = '';
  }, []);

  // Row (vertical) resizing handlers
  const handleVerticalMouseDown = useCallback((rowIdx: number) => {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDraggingVertical(true);
      setActiveVerticalResizer(rowIdx);
      document.body.style.cursor = 'row-resize';
    };
  }, []);

  const handleVerticalMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingVertical || activeVerticalResizer === null) return;

    const container = mainContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const mousePercent = (mouseY / rect.height) * 100;

    setRowHeights((prev) => {
      const heights = [...prev];
      const topIndex = activeVerticalResizer;
      const bottomIndex = activeVerticalResizer + 1;
      
      if (bottomIndex >= heights.length) return prev;

      const totalHeight = heights[topIndex] + heights[bottomIndex];
      
      // Calculate the cumulative height of rows above
      let cumulativeHeight = 0;
      for (let i = 0; i < topIndex; i++) {
        cumulativeHeight += heights[i];
      }
      
      const newTopPercent = mousePercent - cumulativeHeight;
      const newBottomPercent = totalHeight - newTopPercent;
      const minHeightPercent = 20;

      if (newTopPercent >= minHeightPercent && newBottomPercent >= minHeightPercent) {
        heights[topIndex] = newTopPercent;
        heights[bottomIndex] = newBottomPercent;
      }

      return heights;
    });
  }, [isDraggingVertical, activeVerticalResizer]);

  const handleVerticalMouseUp = useCallback(() => {
    setIsDraggingVertical(false);
    setActiveVerticalResizer(null);
    document.body.style.cursor = '';
  }, []);

  // Effect for horizontal dragging
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

  // Effect for vertical dragging
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

  // Calculate total splitter height (h-2 = 0.5rem = 8px per splitter)
  const splitterCount = rows.length - 1;
  const splitterHeightPx = splitterCount * 8; // 8px per splitter

  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden p-1 min-h-0">
      <div 
        ref={mainContainerRef}
        className="flex-1 flex flex-col overflow-hidden min-h-0"
      >
        {rows.map((row, rowIdx) => (
          <React.Fragment key={rowIdx}>
            {/* Row of cards - height controlled by rowHeights state */}
            <div 
              ref={(el) => { containerRefs.current[rowIdx] = el; }}
              className="flex relative min-h-0 overflow-hidden flex-shrink-0"
              style={{
                height: rowHeights.length > 0 
                  ? `calc(${rowHeights[rowIdx] || (100 / rows.length)}% - ${splitterHeightPx / rows.length}px)` 
                  : `calc(${100 / rows.length}% - ${splitterHeightPx / rows.length}px)`
              }}
            >
              {row.map((card, colIdx) => (
                <React.Fragment key={colIdx}>
                  <div
                    className="flex-shrink-0 h-full overflow-hidden flex flex-col p-1"
                    style={{
                      width: row.length === 1
                        ? '100%'
                        : `${columnWidths[rowIdx]?.[colIdx] || 50}%`
                    }}
                  >
                    <div className="h-full overflow-hidden flex flex-col flex-1 min-h-0">
                      {card}
                    </div>
                  </div>
                  {/* Column splitter (between columns) */}
                  {row.length > 1 && colIdx < row.length - 1 && (
                    <div
                      className={`flex-shrink-0 w-1 cursor-col-resize transition-all relative group ${
                        isDraggingHorizontal && activeHorizontalResizer?.rowIdx === rowIdx && activeHorizontalResizer?.colIdx === colIdx
                          ? 'bg-blue-500'
                          : 'bg-transparent hover:bg-blue-400'
                      }`}
                      onMouseDown={handleHorizontalMouseDown(rowIdx, colIdx)}
                      style={{ cursor: 'col-resize' }}
                    >
                      <div className="absolute inset-y-0 left-0 w-1 h-full"></div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
            {/* Row splitter (between rows) */}
            {rowIdx < rows.length - 1 && (
              <div
                className={`flex-shrink-0 h-2 cursor-row-resize transition-all relative group ${
                  isDraggingVertical && activeVerticalResizer === rowIdx
                    ? 'bg-blue-500'
                    : 'bg-transparent hover:bg-blue-400'
                }`}
                onMouseDown={handleVerticalMouseDown(rowIdx)}
                style={{ cursor: 'row-resize' }}
              >
                <div className="absolute inset-x-0 top-0 h-2 w-full"></div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

