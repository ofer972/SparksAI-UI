'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ResizablePanelsProps {
  children: React.ReactNode[];
  minPanelWidth?: number;
  className?: string;
}

export default function ResizablePanels({
  children,
  minPanelWidth = 200,
  className = '',
}: ResizablePanelsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeResizer, setActiveResizer] = useState<number | null>(null);
  
  // Initialize with equal widths
  const [widths, setWidths] = useState<number[]>(() => {
    const count = React.Children.count(children);
    return Array(count).fill(100 / count);
  });

  const handleMouseDown = useCallback((index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setActiveResizer(index);
    document.body.style.cursor = 'col-resize';
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || activeResizer === null || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      
      // Calculate mouse position relative to container
      const mouseX = e.clientX - containerRect.left;
      const mousePercent = (mouseX / containerWidth) * 100;

      setWidths((prevWidths) => {
        const newWidths = [...prevWidths];
        
        // Calculate the sum of widths before and after the resizer
        const leftIndex = activeResizer;
        const rightIndex = activeResizer + 1;
        
        // Get current widths
        const leftWidth = prevWidths[leftIndex];
        const rightWidth = prevWidths[rightIndex];
        const totalWidth = leftWidth + rightWidth;
        
        // Calculate cumulative width up to this point
        let cumulativeWidth = 0;
        for (let i = 0; i < leftIndex; i++) {
          cumulativeWidth += prevWidths[i];
        }
        
        // Calculate new left panel width
        const newLeftPercent = mousePercent - cumulativeWidth;
        const newRightPercent = totalWidth - newLeftPercent;
        
        // Apply minimum width constraints (convert to percentage)
        const minWidthPercent = (minPanelWidth / containerWidth) * 100;
        
        if (newLeftPercent >= minWidthPercent && newRightPercent >= minWidthPercent) {
          newWidths[leftIndex] = newLeftPercent;
          newWidths[rightIndex] = newRightPercent;
        }
        
        return newWidths;
      });
    },
    [isDragging, activeResizer, minPanelWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setActiveResizer(null);
    document.body.style.cursor = '';
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const childArray = React.Children.toArray(children);

  return (
    <div ref={containerRef} className={`flex ${className}`} style={{ width: '100%' }}>
      {childArray.map((child, index) => (
        <React.Fragment key={index}>
          <div
            style={{ width: `${widths[index]}%` }}
            className="flex-shrink-0 overflow-hidden"
          >
            {child}
          </div>
          {index < childArray.length - 1 && (
            <div
              className={`flex-shrink-0 w-1 hover:bg-blue-500 cursor-col-resize transition-all relative group ${
                isDragging && activeResizer === index ? 'bg-blue-500' : 'bg-transparent'
              }`}
              onMouseDown={handleMouseDown(index)}
              style={{ cursor: 'col-resize' }}
            >
              <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 flex items-center justify-center">
                <div className={`w-0.5 h-full transition-colors ${
                  isDragging && activeResizer === index ? 'bg-blue-500' : 'bg-transparent group-hover:bg-blue-400'
                }`}></div>
              </div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

