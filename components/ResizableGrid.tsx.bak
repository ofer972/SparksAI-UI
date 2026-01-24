'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import ResizablePanels from './ResizablePanels';

interface ResizableGridProps {
  rows: Array<{
    id: string;
    children: React.ReactNode[];
  }>;
  defaultRowHeight?: number;
  minRowHeight?: number;
  className?: string;
}

export default function ResizableGrid({
  rows,
  defaultRowHeight = 500,
  minRowHeight = 500,
  className = '',
}: ResizableGridProps) {
  const [rowHeights, setRowHeights] = useState<number[]>(() =>
    rows.map(() => defaultRowHeight)
  );
  const [isDraggingVertical, setIsDraggingVertical] = useState(false);
  const [activeVerticalResizer, setActiveVerticalResizer] = useState<number | null>(null);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);

  const handleVerticalMouseDown = useCallback((index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
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

  return (
    <div className={className}>
      {rows.map((row, index) => (
        <React.Fragment key={row.id}>
          <div
            style={{
              height: `${rowHeights[index]}px`,
            }}
            className="overflow-hidden"
          >
            {row.children.length > 1 ? (
              <ResizablePanels className="h-full">
                {row.children}
              </ResizablePanels>
            ) : (
              <div className="h-full">{row.children[0]}</div>
            )}
          </div>
          {index < rows.length - 1 && (
            <div
              className={`h-1 cursor-row-resize transition-all relative group ${
                isDraggingVertical && activeVerticalResizer === index
                  ? 'bg-blue-500'
                  : 'bg-transparent hover:bg-blue-500'
              }`}
              onMouseDown={handleVerticalMouseDown(index)}
              style={{ cursor: 'row-resize' }}
            >
              <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 h-1 flex items-center justify-center">
                <div
                  className={`h-0.5 w-full transition-colors ${
                    isDraggingVertical && activeVerticalResizer === index
                      ? 'bg-blue-500'
                      : 'bg-transparent group-hover:bg-blue-400'
                  }`}
                ></div>
              </div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

