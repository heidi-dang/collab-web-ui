import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { TerminalStreamManager } from '../../lib/TerminalStreamManager';
import 'xterm/css/xterm.css';

interface InteractiveTerminalProps {
  socket: any; // Type strictly according to your src/lib/socket.ts implementation
  roomId: string;
}

export const InteractiveTerminal: React.FC<InteractiveTerminalProps> = ({ socket, roomId }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const managerRef = useRef<TerminalStreamManager | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // 1. Initialize XTerm with strict IDE-grade aesthetics
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: '"Geist Mono", "Fira Code", monospace',
      fontSize: 13,
      theme: {
        background: '#09090b', // zinc-950
        foreground: '#e4e4e7', // zinc-200
        cursor: '#6366f1', // indigo-500
        selectionBackground: 'rgba(99, 102, 241, 0.3)',
      },
      allowProposedApi: true,
    });

    xtermRef.current = term;
    managerRef.current = new TerminalStreamManager(term);

    // 2. Load Addons
    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    
    // Attempt WebGL rendering for 60fps terminal updates (falls back to Canvas if unsupported)
    try {
      const webglAddon = new WebglAddon();
      term.loadAddon(webglAddon);
    } catch (e) {
      console.warn('WebGL addon failed to load, falling back to canvas rendering', e);
    }

    fitAddon.fit();

    // 3. Socket I/O Binding
    if (socket) {
      term.onData((data) => {
        if (typeof socket.emit === 'function') {
          socket.emit('pty-input', { roomId, input: data });
        }
      });

      const handleSocketData = (data: string) => {
        managerRef.current?.push(data);
      };

      if (typeof socket.on === 'function') {
        socket.on('pty-output', handleSocketData);
      }

      // 4. Handle resizing via ResizeObserver to bypass React render cycle lag
      const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          fitAddon.fit();
          if (typeof socket.emit === 'function') {
            socket.emit('pty-resize', {
              roomId,
              cols: term.cols,
              rows: term.rows,
            });
          }
        });
      });

      resizeObserver.observe(terminalRef.current);

      return () => {
        resizeObserver.disconnect();
        if (typeof socket.off === 'function') {
          socket.off('pty-output', handleSocketData);
        }
        managerRef.current?.dispose();
        managerRef.current = null;
        term.dispose();
        xtermRef.current = null;
      };
    }

    return () => {
      managerRef.current?.dispose();
      managerRef.current = null;
      term.dispose();
      xtermRef.current = null;
    };
  }, [socket, roomId]);

  return (
    <div className="absolute inset-0 w-full h-full p-2 overflow-hidden bg-zinc-950">
      <div ref={terminalRef} className="w-full h-full" />
    </div>
  );
};

