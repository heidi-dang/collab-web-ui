import React, { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { StreamingMessage } from './StreamingMessage';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export interface VirtualizedTranscriptProps {
  messages: Message[];
}

export const VirtualizedTranscript: React.FC<VirtualizedTranscriptProps> = ({ messages }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  useEffect(() => {
    if (messages.length > 0) {
      rowVirtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: 'smooth' });
    }
  }, [messages.length, rowVirtualizer]);

  return (
    <div
      ref={parentRef}
      className="h-full w-full overflow-y-auto overscroll-contain bg-zinc-950"
      style={{
        transform: 'translate3d(0, 0, 0)',
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const msg = messages[virtualRow.index];

          return (
            <div
              key={msg.id}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="px-4 py-6 border-b border-white/5"
            >
              <div className="max-w-4xl mx-auto flex gap-4">
                <div
                  className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 font-semibold text-xs ${
                    msg.role === 'assistant'
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}
                >
                  {msg.role === 'assistant' ? 'AI' : 'U'}
                </div>

                <div className="flex-1 min-w-0">
                  <StreamingMessage
                    content={msg.content}
                    isStreaming={msg.isStreaming ?? false}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
