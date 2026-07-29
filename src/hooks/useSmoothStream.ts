import { useState, useEffect, useRef } from 'react';

export const useSmoothStream = (rawStreamText: string, baseSpeedMs: number = 16) => {
  const [displayedText, setDisplayedText] = useState('');
  const queueRef = useRef<string>('');
  const rafRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    queueRef.current = rawStreamText;
    
    const processQueue = (timestamp: number) => {
      if (!lastUpdateRef.current) lastUpdateRef.current = timestamp;
      
      const delta = timestamp - lastUpdateRef.current;
      
      if (delta >= baseSpeedMs) {
        setDisplayedText((current) => {
          const target = queueRef.current;
          if (current === target) return current;
          
          // Dynamic acceleration: If the network stalls then dumps a massive chunk, 
          // accelerate the typing speed to catch up, preventing unbounded buffer growth.
          const difference = target.length - current.length;
          const charsToAdd = difference > 50 ? Math.ceil(difference / 4) : 1;
          
          return target.substring(0, current.length + charsToAdd);
        });
        lastUpdateRef.current = timestamp;
      }
      
      rafRef.current = requestAnimationFrame(processQueue);
    };

    rafRef.current = requestAnimationFrame(processQueue);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [rawStreamText, baseSpeedMs]);

  return displayedText;
};
