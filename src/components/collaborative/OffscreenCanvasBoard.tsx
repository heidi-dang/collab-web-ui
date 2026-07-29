import React, { useEffect, useRef, useCallback, useState } from 'react';
import { WorkerMessage, StrokeData, Point } from '../../types/canvas';
import { useWorkerHeartbeat } from '../../hooks/useWorkerHeartbeat';

interface OffscreenCanvasBoardProps {
  onStrokeComplete?: (stroke: StrokeData) => void;
  activeColor?: string;
  activeWidth?: number;
}

export const OffscreenCanvasBoard: React.FC<OffscreenCanvasBoardProps> = ({
  onStrokeComplete,
  activeColor = '#ffffff',
  activeWidth = 3,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [deadlocked, setDeadlocked] = useState(false);
  
  const currentStrokeId = useRef<string | null>(null);
  const currentPoints = useRef<Point[]>([]);

  const handleDeadlock = useCallback(() => {
    setDeadlocked(true);
  }, []);

  useWorkerHeartbeat(workerRef.current, handleDeadlock);

  if (deadlocked) {
    throw new Error('Canvas WebWorker Deadlock');
  }

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || workerRef.current) return;

    // 1. Transfer control to the Web Worker
    const canvas = canvasRef.current;
    if (typeof canvas.transferControlToOffscreen !== 'function') return;
    
    const offscreen = canvas.transferControlToOffscreen();
    
    // 2. Instantiate the worker (Vite module pattern)
    workerRef.current = new Worker(new URL('../../workers/canvas.worker.ts', import.meta.url), {
      type: 'module'
    });

    const rect = containerRef.current.getBoundingClientRect();

    // 3. Initialize the offscreen context
    workerRef.current.postMessage({
      type: 'INIT',
      canvas: offscreen,
      pixelRatio: window.devicePixelRatio || 1,
      width: rect.width,
      height: rect.height,
    } as WorkerMessage, [offscreen]); // Transfer the OffscreenCanvas object

    // 4. Handle resize events dynamically
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        workerRef.current?.postMessage({
          type: 'RESIZE',
          width: entry.contentRect.width,
          height: entry.contentRect.height,
          pixelRatio: window.devicePixelRatio || 1,
        } as WorkerMessage);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    currentStrokeId.current = crypto.randomUUID();
    currentPoints.current = [{ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, pressure: e.pressure }];
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!currentStrokeId.current) return;
    
    currentPoints.current.push({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, pressure: e.pressure });
    
    // Dispatch partial stroke to Worker for real-time visual feedback
    const stroke: StrokeData = {
      id: currentStrokeId.current,
      points: [...currentPoints.current],
      color: activeColor,
      width: activeWidth,
    };

    workerRef.current?.postMessage({ type: 'DRAW_STROKE', stroke } as WorkerMessage);
  }, [activeColor, activeWidth]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!currentStrokeId.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);

    const finalStroke: StrokeData = {
      id: currentStrokeId.current,
      points: [...currentPoints.current],
      color: activeColor,
      width: activeWidth,
    };

    // Propagate up to WebSocket / IndexedDB manager
    onStrokeComplete?.(finalStroke);

    currentStrokeId.current = null;
    currentPoints.current = [];
  }, [activeColor, activeWidth, onStrokeComplete]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <canvas 
        ref={canvasRef} 
        className="w-full h-full"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
};
