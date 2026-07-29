import React from 'react';
import { motion } from 'framer-motion';

export const StreamingIndicator: React.FC = () => (
  <div className="flex items-center gap-1.5 px-3 py-1">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
        className="w-1.5 h-1.5 rounded-full bg-indigo-500"
      />
    ))}
    <span className="text-[10px] text-zinc-500 font-medium ml-1 select-none">AI is thinking...</span>
  </div>
);
