import React, { useState, useEffect } from 'react';

export interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({ children }) => {
  const [activeHash, setActiveHash] = useState(
    typeof window !== 'undefined' ? window.location.hash || '#default' : '#default'
  );

  useEffect(() => {
    const handler = () => setActiveHash(window.location.hash || '#default');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 antialiased">
      <main className="flex-1 relative h-full w-full overflow-hidden">
        {/* KEY PROP IS MANDATORY: This destroys/remounts the whole session tree on hash changes */}
        <div key={activeHash} className="w-full h-full overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
};
