import React, { useRef, useEffect, useCallback, useState } from 'react';
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
  onLoadMoreHistory?: () => Promise<void>;
  hasMoreHistory?: boolean;
  isLoadingHistory?: boolean;
}

export const VirtualizedTranscript: React.FC<VirtualizedTranscriptProps> = ({
  messages,
  onLoadMoreHistory,
  hasMoreHistory = false,
  isLoadingHistory = false,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const prevScrollHeightRef = useRef<number>(0);

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  // 1. Dynamic Streaming Height Invalidation (50ms Throttled Measurement Invalidation)
  const activeStreamingMsg = messages.find((m) => m.isStreaming);
  const activeStreamingContent = activeStreamingMsg?.content;

  useEffect(() => {
    if (!activeStreamingMsg) return;

    // Throttle virtualizer measure calls during stream to adjust viewport dynamically
    const interval = setInterval(() => {
      rowVirtualizer.measure();
    }, 50);

    return () => clearInterval(interval);
  }, [activeStreamingMsg, activeStreamingContent, rowVirtualizer]);

  // Auto-scroll to bottom on new incoming assistant message or user submission
  useEffect(() => {
    if (messages.length > 0 && !isBackfilling) {
      rowVirtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: 'smooth' });
    }
  }, [messages.length, isBackfilling, rowVirtualizer]);

  // 2. Infinite Scroll Backfill at Top (Index 0) without Layout Jumps
  const handleScroll = useCallback(async () => {
    const container = parentRef.current;
    if (!container || !onLoadMoreHistory || !hasMoreHistory || isLoadingHistory || isBackfilling) return;

    if (container.scrollTop < 120) {
      setIsBackfilling(true);
      prevScrollHeightRef.current = container.scrollHeight;

      try {
        await onLoadMoreHistory();
      } finally {
        // Adjust scroll position after backfill to prevent layout jump
        requestAnimationFrame(() => {
          if (container) {
            const heightDiff = container.scrollHeight - prevScrollHeightRef.current;
            container.scrollTop += heightDiff;
          }
          setIsBackfilling(false);
        });
      }
    }
  }, [onLoadMoreHistory, hasMoreHistory, isLoadingHistory, isBackfilling]);

  return (
    <div
      ref={parentRef}
      onScroll={handleScroll}
      className="h-full w-full overflow-y-auto overscroll-contain bg-zinc-950"
      style={{
        transform: 'translate3d(0, 0, 0)',
      }}
    >
      {/* Loading header for history backfill */}
      {isLoadingHistory && (
        <div className="py-3 text-center text-xs text-zinc-500 font-mono animate-pulse">
          Loading historic conversation turns...
        </div>
      )}

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

