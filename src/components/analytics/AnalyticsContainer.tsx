import React, { useState, useCallback, useRef } from 'react';
import { CanvasErrorBoundary } from '../layout/CanvasErrorBoundary';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { useWorkerHeartbeat } from '../../hooks/useWorkerHeartbeat';

export interface AnalyticsContainerProps {
  data?: Array<{ turn: number; tokens: number }>;
}

export const AnalyticsContainer: React.FC<AnalyticsContainerProps> = ({ data }) => {
  const [renderKey, setRenderKey] = useState(0);
  const [errorState, setErrorState] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  const performHardReset = useCallback(() => {
    // 1. Explicitly notify and terminate the dead worker
    if (workerRef.current) {
      try {
        workerRef.current.postMessage({ type: 'TERMINATE' });
        workerRef.current.terminate();
      } catch {
        // Safe fallback if worker is already dead
      }
      workerRef.current = null;
    }

    // 2. Reset local error state
    setErrorState(false);

    // 3. Increment key to force React to remount fresh component tree
    setRenderKey((prev) => prev + 1);
  }, []);

  const handleDeadlock = useCallback(() => {
    setErrorState(true);
  }, []);

  // Monitor heartbeat
  useWorkerHeartbeat(workerRef.current, handleDeadlock, 2000, 5000);

  if (errorState) {
    throw new Error('GraphicsWorker Deadlock');
  }

  return (
    <CanvasErrorBoundary onReset={performHardReset}>
      <div key={`analytics-session-${renderKey}`} className="w-full h-full">
        <AnalyticsDashboard data={data} />
      </div>
    </CanvasErrorBoundary>
  );
};
