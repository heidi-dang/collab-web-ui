import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Pencil, MousePointer2, Hand, Trash2, Download, Sun, Moon, Hash } from 'lucide-react';
import { useSessionManager } from '../../hooks/useSessionManager';

interface CommandPaletteProps {
  onToolChange?: (tool: 'draw' | 'select' | 'pan') => void;
  onClearCanvas?: () => void;
  onExportPng?: () => void;

  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  onToolChange,
  onClearCanvas,
  onExportPng,

  theme = 'dark',
  onToggleTheme,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { sessions, switchSession } = useSessionManager();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const actions = [
    {
      id: 'tool-draw',
      label: 'Switch to Draw Tool',
      shortcut: 'V',
      icon: Pencil,
      perform: () => onToolChange?.('draw'),
    },
    {
      id: 'tool-select',
      label: 'Switch to Select Tool',
      shortcut: 'S',
      icon: MousePointer2,
      perform: () => onToolChange?.('select'),
    },
    {
      id: 'tool-pan',
      label: 'Switch to Pan Tool',
      shortcut: 'H',
      icon: Hand,
      perform: () => onToolChange?.('pan'),
    },
    {
      id: 'export-png',
      label: 'Export Canvas as Image',
      shortcut: 'Cmd + E',
      icon: Download,
      perform: () => onExportPng?.(),
    },
    {
      id: 'clear-canvas',
      label: 'Clear Canvas Content',
      shortcut: 'Cmd + Shift + C',
      icon: Trash2,
      perform: () => onClearCanvas?.(),
    },
    {
      id: 'toggle-theme',
      label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`,
      shortcut: 'Cmd + T',
      icon: theme === 'dark' ? Sun : Moon,
      perform: () => onToggleTheme?.(),
    },
  ];

  const filteredActions = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  const filteredSessions = sessions.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase()) || s.hash.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center px-4 py-3 border-b border-white/10 gap-3">
              <Search size={18} className="text-zinc-500" />
              <input
                type="text"
                autoFocus
                placeholder="Type a command or search workspace..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              />
              <kbd className="px-2 py-0.5 text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-white/10 rounded">
                ESC
              </kbd>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-3">
              {/* Workspaces Section */}
              {filteredSessions.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Workspaces
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {filteredSessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => {
                          switchSession(session.hash);
                          setIsOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Hash size={14} className="text-indigo-400" />
                          <span>{session.name}</span>
                        </div>
                        <span className="font-mono text-[10px] text-zinc-600">{session.hash}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Commands Section */}
              <div>
                <div className="px-3 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Commands
                </div>
                <div className="space-y-0.5 mt-1">
                  {filteredActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={() => {
                          action.perform();
                          setIsOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-indigo-500/10 transition-colors group"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon size={16} className="text-zinc-400 group-hover:text-indigo-400" />
                          <span>{action.label}</span>
                        </div>
                        <kbd className="px-2 py-0.5 text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-white/10 rounded">
                          {action.shortcut}
                        </kbd>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
