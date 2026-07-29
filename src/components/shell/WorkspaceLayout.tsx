import React, { ReactNode } from 'react';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { GripVertical, GripHorizontal } from 'lucide-react';

interface WorkspaceLayoutProps {
  sidebar: ReactNode;
  main: ReactNode;
  terminal: ReactNode;
  transcript: ReactNode;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  sidebar,
  main,
  terminal,
  transcript,
}) => {
  return (
    <PanelGroup orientation="horizontal" className="h-full w-full bg-zinc-950 overflow-hidden">
      {/* Sidebar (e.g., File Tree, Agent List) */}
      <Panel defaultSize={15} minSize={10} maxSize={25} className="bg-zinc-900 border-r border-white/10">
        {sidebar}
      </Panel>
      
      <CustomResizeHandle direction="horizontal" />

      {/* Main Working Area */}
      <Panel defaultSize={60} minSize={30}>
        <PanelGroup orientation="vertical">
          {/* Top: Editor / Canvas */}
          <Panel defaultSize={70} minSize={20} className="bg-zinc-950 relative">
            {main}
          </Panel>
          
          <CustomResizeHandle direction="vertical" />
          
          {/* Bottom: Terminal / Logs */}
          <Panel defaultSize={30} minSize={10} className="bg-zinc-950 border-t border-white/10 relative">
            {terminal}
          </Panel>
        </PanelGroup>
      </Panel>

      <CustomResizeHandle direction="horizontal" />

      {/* Right Sidebar: AI Transcript & Tools */}
      <Panel defaultSize={25} minSize={15} maxSize={40} className="bg-zinc-900 border-l border-white/10 relative">
        {transcript}
      </Panel>
    </PanelGroup>
  );
};

const CustomResizeHandle = ({ direction }: { direction: 'horizontal' | 'vertical' }) => {
  const isHorizontal = direction === 'horizontal';
  return (
    <PanelResizeHandle
      className={`relative flex items-center justify-center bg-transparent transition-colors hover:bg-indigo-500/50 data-[resize-handle-active]:bg-indigo-500 ${
        isHorizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'
      }`}
    >
      <div className="absolute z-10 flex items-center justify-center w-4 h-4 rounded-sm bg-zinc-800 border border-white/10 shadow-sm">
        {isHorizontal ? (
          <GripVertical size={10} className="text-zinc-400" />
        ) : (
          <GripHorizontal size={10} className="text-zinc-400" />
        )}
      </div>
    </PanelResizeHandle>
  );
};
