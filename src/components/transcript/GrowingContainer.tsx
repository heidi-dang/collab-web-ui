import React from 'react';
import { motion } from 'framer-motion';

interface GrowingContainerProps {
  children: React.ReactNode;
}

export const GrowingContainer: React.FC<GrowingContainerProps> = ({ children }) => {
  return (
    <motion.div
      layout
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 40,
        mass: 1,
      }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
};
