import React from 'react';
import { motion } from 'framer-motion';

export const Caret: React.FC = () => (
  <motion.span
    initial={{ opacity: 0 }}
    animate={{ opacity: [0, 1, 0] }}
    transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
    className="inline-block w-[8px] h-[16px] bg-indigo-500 align-middle ml-1 rounded-sm"
  />
);
