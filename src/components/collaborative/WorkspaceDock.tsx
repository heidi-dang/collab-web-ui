import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Server, Check, X, Layers, Hash } from 'lucide-react';
import { useSessionManager, WorkspaceSession } from '../../hooks/useSessionManager';

export const WorkspaceDock: React.FC = () => {
  const { activeHash, sessions, switchSession, addSession, removeSession } = useSessionManager();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionHash, setNewSessionHash] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;
    addSession(newSessionName, newSessionHash || undefined);
    setNewSessionName('');
    setNewSessionHash('');
    setIsModalOpen(false);
  };

  return (
    <>
      <div 
        className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 p-1.5 bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
        role="navigation"
        aria-label="Workspace Dock"
      >
        <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-zinc-400">
          <Layers size={14} className="text-indigo-400" />
          <span className="hidden sm:inline">Workspaces</span>
        </div>

        <div className="w-px h-4 bg-white/10 mx-0.5" />

        <div className="flex items-center gap-1 overflow-x-auto max-w-[50vw] no-scrollbar">
          {sessions.map((session: WorkspaceSession) => {
            const isActive = session.hash === activeHash;

            return (
              <button
                key={session.id}
                onClick={() => switchSession(session.hash)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Hash size={12} className={isActive ? 'text-indigo-400' : 'opacity-50'} />
                <span className="truncate max-w-[100px]">{session.name}</span>
                {isActive && (
                  <motion.span
                    layoutId="activeWorkspaceGlow"
                    className="absolute inset-0 rounded-xl bg-indigo-500/10 pointer-events-none"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center w-7 h-7 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all border border-white/10"
          title="Add Workspace Session"
          aria-label="Add Workspace"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Add Session Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server size={18} className="text-indigo-400" />
                  <h3 className="text-sm font-semibold text-zinc-100">Add Workspace Session</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Workspace Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Design Sprint #2"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Custom Hash / Room ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. #vps-us-east-1"
                    value={newSessionHash}
                    onChange={(e) => setNewSessionHash(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-medium bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                  >
                    <Check size={14} /> Create Workspace
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
