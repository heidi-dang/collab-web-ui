import React, { useEffect, useCallback } from 'react';
import { motion, useSpring } from 'framer-motion';

export interface CursorPosition {
  x: number;
  y: number;
}

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursor: CursorPosition | null;
}

interface LiveCursorsOverlayProps {
  collaborators: Collaborator[];
  canvasRef: React.RefObject<HTMLDivElement>;
  onCursorMove: (position: CursorPosition) => void;
}

export const LiveCursorsOverlay: React.FC<LiveCursorsOverlayProps> = ({ 
  collaborators, 
  canvasRef, 
  onCursorMove 
}) => {
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Throttled in production / caller
    onCursorMove({ x, y });
  }, [canvasRef, onCursorMove]);

  if (!collaborators || collaborators.length === 0) {
    return (
      <div 
        ref={canvasRef} 
        onPointerMove={handlePointerMove} 
        className="absolute inset-0 z-50 overflow-hidden pointer-events-none" 
        aria-hidden="true" 
      />
    );
  }

  return (
    <div
      ref={canvasRef}
      onPointerMove={handlePointerMove}
      className="absolute inset-0 z-50 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {collaborators.map((collaborator) => (
        collaborator.cursor ? (
          <Cursor
            key={collaborator.id}
            collaborator={collaborator}
            x={collaborator.cursor.x}
            y={collaborator.cursor.y}
          />
        ) : null
      ))}
    </div>
  );
};

interface CursorProps {
  collaborator: Collaborator;
  x: number;
  y: number;
}

const Cursor: React.FC<CursorProps> = ({ collaborator, x, y }) => {
  // Spring physics smooths out raw WebSocket coordinate jumps
  const springConfig = { damping: 25, stiffness: 250, mass: 0.5 };
  const cursorX = useSpring(x, springConfig);
  const cursorY = useSpring(y, springConfig);

  useEffect(() => {
    cursorX.set(x);
    cursorY.set(y);
  }, [x, y, cursorX, cursorY]);

  return (
    <motion.div
      style={{
        x: cursorX,
        y: cursorY,
      }}
      className="absolute top-0 left-0 flex flex-col pointer-events-none"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.15 }}
    >
      <svg
        width="24"
        height="36"
        viewBox="0 0 24 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-md"
      >
        <path
          d="M5.65376 21.1598L2.24765 2.11584C1.94432 0.419077 3.79155 -0.669866 5.16335 0.395358L22.2599 13.6703C23.5135 14.6441 23.1678 16.634 21.6521 17.1683L14.7709 19.5933L10.3644 28.0267C9.62067 29.4497 7.55836 29.2783 7.07008 27.7554L5.65376 21.1598Z"
          fill={collaborator.color}
          stroke="white"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <div
        className="px-2 py-1 mt-1 text-xs font-semibold text-white rounded-md shadow-sm whitespace-nowrap"
        style={{ backgroundColor: collaborator.color }}
      >
        {collaborator.name}
      </div>
    </motion.div>
  );
};
