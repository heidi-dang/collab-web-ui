import { useEffect, useRef } from 'react';

export const useWorkerHeartbeat = (
  worker: Worker | null,
  onDeadlock: () => void,
  interval: number = 2000, // Ping every 2s
  timeout: number = 5000   // Wait 5s before declaring deadlock
) => {
  const lastPongRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!worker) return;

    lastPongRef.current = Date.now();

    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'PONG') {
        lastPongRef.current = Date.now();
      }
    };

    worker.addEventListener('message', handleMessage);

    const timer = setInterval(() => {
      const now = Date.now();

      if (now - lastPongRef.current > timeout) {
        console.error('Worker Deadlock detected: No heartbeat received.');
        onDeadlock();
      } else {
        worker.postMessage({ type: 'PING' });
      }
    }, interval);

    return () => {
      worker.removeEventListener('message', handleMessage);
      clearInterval(timer);
    };
  }, [worker, onDeadlock, interval, timeout]);
};
