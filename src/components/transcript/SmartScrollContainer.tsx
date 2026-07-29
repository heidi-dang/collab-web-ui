import React, { useRef, useEffect, useState, ReactNode } from 'react';
import { ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SmartScrollContainerProps {
  children: ReactNode;
  dependency: any; // Trigger scroll evaluation when this changes (e.g., messages array)
}

export const SmartScrollContainer: React.FC<SmartScrollContainerProps> = ({ children, dependency }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    
    // User is considered "scrolled up" if they are more than 60px from the bottom
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    const isUp = distanceToBottom > 60;
    
    setIsScrolledUp(isUp);
    if (!isUp) setHasUnread(false);
  };

  useEffect(() => {
    if (!scrollRef.current) return;
    
    if (isScrolledUp) {
      setHasUnread(true);
      return;
    }

    // Use scrollTo instead of scrollIntoView for exact pixel control without snapping parent containers
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }, [dependency, isScrolledUp]);

  const scrollToBottom = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth'
    });
    setIsScrolledUp(false);
    setHasUnread(false);
  };

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden">
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-contain pb-4"
      >
        {children}
      </div>

      <AnimatePresence>
        {isScrolledUp && hasUnread && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 10, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 10, x: '-50%' }}
            onClick={scrollToBottom}
            className="absolute bottom-6 left-1/2 flex items-center gap-2 px-4 py-2 bg-zinc-800/90 hover:bg-zinc-700 backdrop-blur-md border border-white/10 rounded-full text-xs font-medium text-zinc-200 shadow-xl transition-colors z-50 cursor-pointer"
            aria-label="Scroll to bottom"
          >
            <ArrowDown size={14} className="animate-bounce" />
            New tokens streaming
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
