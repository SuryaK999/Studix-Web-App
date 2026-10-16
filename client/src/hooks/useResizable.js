import { useState, useEffect, useCallback } from 'react';


export function useResizable({
  initialWidth = 260,
  minWidth = 200,
  maxWidth = 400,
  onResize
} = {}) {
  const [width, setWidth] = useState(initialWidth);
  const [isDragging, setIsDragging] = useState(false);

  // Prevent text selection while dragging
  useEffect(() => {
    if (isDragging) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
  }, [isDragging]);

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;

      // Calculate new width based on mouse X position
      // Using Math.min and Math.max to enforce constraints perfectly in real-time
      const newWidth = Math.min(Math.max(e.clientX, minWidth), maxWidth);
      
      setWidth(newWidth);
      if (onResize) onResize(newWidth);
    },
    [isDragging, minWidth, maxWidth, onResize]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const startDragging = useCallback((e) => {
    // Prevent default to avoid selection highlighting immediately on click
    e.preventDefault();
    setIsDragging(true);
  }, []);

  return {
    width,
    isDragging,
    startDragging
  };
}
