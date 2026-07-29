import React from 'react';
import { Pencil, MousePointer2, Hand, Trash2, Undo } from 'lucide-react';

export type MobileToolType = 'select' | 'draw' | 'pan';

interface MobileToolbarProps {
  activeTool: MobileToolType;
  onToolChange: (tool: MobileToolType) => void;
  onUndo: () => void;
  onClear: () => void;
  canUndo: boolean;
}

export const MobileToolbar: React.FC<MobileToolbarProps> = ({
  activeTool,
  onToolChange,
  onUndo,
  onClear,
  canUndo
}) => {
  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'pan', icon: Hand, label: 'Pan' },
    { id: 'draw', icon: Pencil, label: 'Draw' },
  ] as const;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-[calc(env(safe-area-inset-bottom)+1rem)] pointer-events-none"
      role="toolbar"
      aria-label="Mobile Canvas Tools"
    >
      <div className="flex items-center gap-1.5 p-2 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl pointer-events-auto">
        
        {/* Ensures minimum 48x48px hit area for accessibility */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="flex items-center justify-center w-12 h-12 rounded-xl text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 active:bg-white/10 active:scale-95 transition-all touch-manipulation"
          aria-label="Undo"
        >
          <Undo size={22} />
        </button>

        <div className="w-px h-8 bg-white/10 mx-1" aria-hidden="true" />

        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={`relative flex items-center justify-center w-12 h-12 rounded-xl transition-all touch-manipulation active:scale-95 ${
                isActive
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5 border border-transparent'
              }`}
              aria-pressed={isActive}
              aria-label={tool.label}
            >
              <Icon size={22} />
            </button>
          );
        })}

        <div className="w-px h-8 bg-white/10 mx-1" aria-hidden="true" />

        <button
          onClick={onClear}
          className="flex items-center justify-center w-12 h-12 rounded-xl text-red-400 hover:bg-red-500/10 active:bg-red-500/20 active:scale-95 transition-all touch-manipulation"
          aria-label="Clear Canvas"
        >
          <Trash2 size={22} />
        </button>
      </div>
    </div>
  );
};
