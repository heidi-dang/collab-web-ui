import React, { useEffect, useRef } from 'react';
import { useSpring, useMotionValue } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  decimals?: number;
  prefix?: string;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  decimals = 4, // LLM API costs require high precision
  prefix = '$',
  className = '',
}) => {
  const nodeRef = useRef<HTMLSpanElement>(null);
  
  // Initialize motion values strictly bypassing React state to avoid render loops
  const motionValue = useMotionValue(value);
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 150,
    mass: 0.8,
  });

  // Sync incoming prop changes to the motion value
  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  // Subscribe to the spring's physics loop and mutate the DOM node directly
  useEffect(() => {
    return springValue.on('change', (latest) => {
      if (nodeRef.current) {
        // Format with strict decimal precision to prevent layout shift jumping
        nodeRef.current.textContent = `${prefix}${latest.toFixed(decimals)}`;
      }
    });
  }, [springValue, decimals, prefix]);

  return (
    <span 
      ref={nodeRef} 
      // tabular-nums is absolutely critical here. It forces all digits to take up the 
      // exact same horizontal width, preventing the UI from vibrating left/right as numbers change.
      className={`font-mono tabular-nums tracking-tight ${className}`}
    >
      {prefix}{value.toFixed(decimals)}
    </span>
  );
};
