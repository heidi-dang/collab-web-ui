import { RefObject, useEffect, useRef } from 'react';

export interface GestureHandlers {
  onPan: (dx: number, dy: number) => void;
  onPinchZoom: (scaleDelta: number, centerX: number, centerY: number) => void;
  onDrawStart: (x: number, y: number, pressure: number) => void;
  onDrawMove: (x: number, y: number, pressure: number) => void;
  onDrawEnd: () => void;
}

export const useCanvasGestures = (
  containerRef: RefObject<HTMLElement | null>,
  handlers: GestureHandlers,
  activeTool: 'draw' | 'select' | 'pan'
) => {
  const pointers = useRef<Map<number, PointerEvent>>(new Map());
  const prevPinchDist = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onPointerDown = (e: PointerEvent) => {
      // Capture the pointer to ensure events fire even if the finger slides off the canvas element
      el.setPointerCapture(e.pointerId);
      pointers.current.set(e.pointerId, e);
      
      if (pointers.current.size === 1 && activeTool === 'draw') {
        const rect = el.getBoundingClientRect();
        handlers.onDrawStart(e.clientX - rect.left, e.clientY - rect.top, e.pressure || 0.5);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      
      const prevEvent = pointers.current.get(e.pointerId)!;
      pointers.current.set(e.pointerId, e);

      // Two-finger pinch & pan logic
      if (pointers.current.size === 2) {
        const [p1, p2] = Array.from(pointers.current.values());
        
        const cx = (p1.clientX + p2.clientX) / 2;
        const cy = (p1.clientY + p2.clientY) / 2;
        const dist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
        
        if (prevPinchDist.current !== null) {
          const delta = dist / prevPinchDist.current;
          handlers.onPinchZoom(delta, cx, cy);
        }
        prevPinchDist.current = dist;

        const dx = e.clientX - prevEvent.clientX;
        const dy = e.clientY - prevEvent.clientY;
        handlers.onPan(dx, dy);
        return;
      }

      // Single-finger action
      if (pointers.current.size === 1) {
        if (activeTool === 'pan') {
          handlers.onPan(e.clientX - prevEvent.clientX, e.clientY - prevEvent.clientY);
        } else if (activeTool === 'draw') {
          const rect = el.getBoundingClientRect();
          handlers.onDrawMove(e.clientX - rect.left, e.clientY - rect.top, e.pressure || 0.5);
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) prevPinchDist.current = null;
      if (pointers.current.size === 0 && activeTool === 'draw') handlers.onDrawEnd();
    };

    el.addEventListener('pointerdown', onPointerDown, { passive: false });
    el.addEventListener('pointermove', onPointerMove, { passive: false });
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
    };
  }, [containerRef, handlers, activeTool]);
};
