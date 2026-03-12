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
  
  const touchHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchCurrentIndexRef = useRef<number | null>(null);
  const initialTouchYRef = useRef<number | null>(null);
  const initialTouchXRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (touchHoldTimerRef.current) {
      clearTimeout(touchHoldTimerRef.current);
      touchHoldTimerRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    e.preventDefault(); // Block iOS long-press text selection/callout
    
    initialTouchYRef.current = e.touches[0].clientY;
    initialTouchXRef.current = e.touches[0].clientX;
    touchCurrentIndexRef.current = index;
    
    // Start hold timer - only enable drag after delay
    touchHoldTimerRef.current = setTimeout(() => {
      setIsDragEnabled(true);
      setDraggedIndex(index);
      touchStartYRef.current = initialTouchYRef.current;
      document.documentElement.classList.add("dragging-active");
      
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
        const currentX = e.touches[0].clientX;
        const diffY = Math.abs(currentY - initialTouchYRef.current);
        const diffX = Math.abs(currentX - (initialTouchXRef.current ?? currentX));
        
        // If user moved more than 10px in any direction, they're scrolling - cancel the hold timer
        if (diffY > 10 || diffX > 10) {
          clearTimer();
          initialTouchYRef.current = null;
        }
      }
      return; // Let the page scroll normally
    }

    // Prevent scrolling when dragging
    e.preventDefault();

    if (draggedIndex === null) return;

    const touch = e.touches[0];
    const draggedEl = e.currentTarget as HTMLElement;
    
    // Temporarily hide dragged element so elementFromPoint sees what's underneath
    draggedEl.style.pointerEvents = 'none';
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    draggedEl.style.pointerEvents = '';

    if (!target) return;

    const dropTarget = target.closest('[data-drag-index]');
    if (!dropTarget) return;

    const newIndex = Number(dropTarget.getAttribute('data-drag-index'));
    if (isNaN(newIndex) || newIndex === draggedIndex) return;

    const newItems = [...items];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(newIndex, 0, removed);
    onReorder(newItems);
    setDraggedIndex(newIndex);
  }, [isDragEnabled, draggedIndex, items, onReorder, clearTimer]);

  const handleTouchEnd = useCallback(() => {
    clearTimer();
    document.documentElement.classList.remove("dragging-active");
    initialTouchYRef.current = null;
    initialTouchXRef.current = null;
    touchStartYRef.current = null;
    
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

