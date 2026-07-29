import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { offlineSync, CanvasStroke } from '../lib/offlineSync';

export const useCanvasSocket = (activeHash: string) => {
  const socketRef = useRef<Socket | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Strip the '#' to get the raw room/VPS identifier
    const roomId = activeHash.replace('#', '');
    
    if (!roomId) {
      setConnectionError('No workspace selected.');
      return;
    }

    setConnectionError(null);
    setIsOnline(false);

    // 2. Initialize the socket connection mapped to the specific VPS hash
    const wsUrl = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_WS_URL || '';
    const socket = io(wsUrl, {
      query: { roomId },
      reconnectionAttempts: 5,
      timeout: 10000,
      transports: ['websocket'], // Force WebSocket bypass polling overhead
    });
    
    socketRef.current = socket;

    socket.on('connect', async () => {
      setIsOnline(true);
      setConnectionError(null);
      
      await offlineSync.syncQueuedStrokes(async (strokes) => {
        return new Promise((resolve, reject) => {
          socket.emit('batch-strokes', strokes, (ack: { success: boolean }) => {
            if (ack?.success) resolve();
            else reject(new Error('Server rejected batch sync'));
          });
        });
      });
    });

    socket.on('connect_error', (err) => {
      setIsOnline(false);
      setConnectionError(`Connection failed: ${err.message}`);
    });

    socket.on('disconnect', (reason) => {
      setIsOnline(false);
      if (reason === 'io server disconnect') {
        setConnectionError('Server forcefully disconnected.');
      }
    });

    // 3. Strict Cleanup: Destroy the connection when the hash changes or component unmounts
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeHash]); // Re-run lifecycle strictly on hash change

  const emitStroke = useCallback(async (stroke: CanvasStroke) => {
    if (isOnline && socketRef.current?.connected) {
      socketRef.current.emit('draw-stroke', stroke);
    } else {
      await offlineSync.queueStroke(stroke);
    }
  }, [isOnline]);

  return { isOnline, connectionError, emitStroke };
};
