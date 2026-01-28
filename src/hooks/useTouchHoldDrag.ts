import { useState, useCallback, useRef } from "react";

const HOLD_DELAY_MS = 200;

interface UseTouchHoldDragOptions<T> {
  items: T[];
  onReorder: (newItems: T[]) => void;
  onDragEnd?: () => void;
  itemHeight?: number;
}

export function useTouchHoldDrag<T>({
  items,
  onReorder,
  onDragEnd,
  itemHeight = 64,
}: UseTouchHoldDragOptions<T>) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDragEnabled, setIsDragEnabled] = useState(false);
  
  const touchHoldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchCurrentIndexRef = useRef<number | null>(null);
  const initialTouchYRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (touchHoldTimerRef.current) {
      clearTimeout(touchHoldTimerRef.current);
      touchHoldTimerRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    // Store initial touch position
    initialTouchYRef.current = e.touches[0].clientY;
    touchCurrentIndexRef.current = index;
    
    // Start hold timer - only enable drag after delay
    touchHoldTimerRef.current = setTimeout(() => {
      setIsDragEnabled(true);
      setDraggedIndex(index);
      touchStartYRef.current = initialTouchYRef.current;
      
      // Haptic feedback on supported devices
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, HOLD_DELAY_MS);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // If drag not enabled yet, check if user is scrolling
    if (!isDragEnabled) {
      if (initialTouchYRef.current !== null) {
        const currentY = e.touches[0].clientY;
        const diff = Math.abs(currentY - initialTouchYRef.current);
        
        // If user moved more than 10px, they're scrolling - cancel the hold timer
        if (diff > 10) {
          clearTimer();
          initialTouchYRef.current = null;
        }
      }
      return; // Let the page scroll normally
    }

    // Prevent scrolling when dragging
    e.preventDefault();

    if (touchStartYRef.current === null || touchCurrentIndexRef.current === null || draggedIndex === null) {
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartYRef.current;
    const indexDiff = Math.round(diff / itemHeight);
    const newIndex = Math.max(0, Math.min(items.length - 1, touchCurrentIndexRef.current + indexDiff));

    if (newIndex !== draggedIndex) {
      const newItems = [...items];
      const [removed] = newItems.splice(draggedIndex, 1);
      newItems.splice(newIndex, 0, removed);
      onReorder(newItems);
      setDraggedIndex(newIndex);
    }
  }, [isDragEnabled, draggedIndex, items, onReorder, itemHeight, clearTimer]);

  const handleTouchEnd = useCallback(() => {
    clearTimer();
    initialTouchYRef.current = null;
    touchStartYRef.current = null;
    touchCurrentIndexRef.current = null;
    
    if (isDragEnabled && draggedIndex !== null) {
      onDragEnd?.();
    }
    
    setIsDragEnabled(false);
    setDraggedIndex(null);
  }, [clearTimer, isDragEnabled, draggedIndex, onDragEnd]);

  // Desktop drag handlers (unchanged behavior)
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);
    onReorder(newItems);
    setDraggedIndex(index);
  }, [draggedIndex, items, onReorder]);

  const handleDragEnd = useCallback(() => {
    if (draggedIndex !== null) {
      onDragEnd?.();
    }
    setDraggedIndex(null);
  }, [draggedIndex, onDragEnd]);

  return {
    draggedIndex,
    isDragEnabled,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}

