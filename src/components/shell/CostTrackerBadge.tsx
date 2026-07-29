import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Activity } from 'lucide-react';
import { AnimatedCounter } from '../ui/AnimatedCounter';

interface CostTrackerBadgeProps {
  totalCost: number;
  isGenerating: boolean;
}

export const CostTrackerBadge: React.FC<CostTrackerBadgeProps> = ({ 
  totalCost, 
  isGenerating 
}) => {
  const [hasCost, setHasCost] = useState(false);

  useEffect(() => {
    if (totalCost > 0) setHasCost(true);
  }, [totalCost]);

  return (
    <AnimatePresence>
      {hasCost && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-lg shadow-lg relative overflow-hidden group"
        >
          {/* Active Generation Glow Effect */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-indigo-500/10 pointer-events-none"
              />
            )}
          </AnimatePresence>

          <div className="relative flex items-center justify-center w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400">
            {isGenerating ? (
              <Activity size={14} className="animate-pulse" />
            ) : (
              <Sparkles size={14} />
            )}
          </div>
          
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider leading-none mb-0.5">
              Est. Cost
            </span>
            <AnimatedCounter 
              value={totalCost} 
              className={`text-sm font-medium transition-colors duration-300 ${
                isGenerating ? 'text-indigo-300' : 'text-zinc-200'
              }`}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
