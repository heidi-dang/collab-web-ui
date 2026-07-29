import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useSmoothStream } from '../../hooks/useSmoothStream';
import { AgentTaskTracker, AgentTask } from './AgentTaskTracker';
import { EditableReportBox } from './EditableReportBox';
import { VirtualizedCodeBlock } from './VirtualizedCodeBlock';
import { GrowingContainer } from './GrowingContainer';
import { StreamingIndicator } from './StreamingIndicator';
import { Caret } from './Caret';
import { fixUnclosedFences } from '../../lib/markdown-utils';

interface StreamingMessageProps {
  content: string;
  isStreaming: boolean;
}

export const StreamingMessage: React.FC<StreamingMessageProps> = memo(({ content, isStreaming }) => {
  const smoothedContent = useSmoothStream(content);
  const displayContent = isStreaming ? smoothedContent : content;
  
  // Patch the AST on the fly before ReactMarkdown attempts compilation
  const safeMarkdown = isStreaming ? fixUnclosedFences(displayContent) : displayContent;
  const hasContent = safeMarkdown.trim().length > 0;

  return (
    <div className="relative group w-full" style={{ contain: 'content' }}>
      {/* 1. Pre-stream Thinking Pulse State */}
      {!hasContent && isStreaming && <StreamingIndicator />}

      {/* 2. Stream Surface & Markdown Content */}
      <GrowingContainer>
        <div className="relative prose prose-invert prose-sm max-w-none break-words leading-relaxed">
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const rawContent = String(children).replace(/\n$/, '');

                if (!inline && match) {
                  const lang = match[1];

                  if (lang === 'tasks') {
                    try {
                      const taskData = JSON.parse(rawContent) as { title: string; tasks: AgentTask[] };
                      return <AgentTaskTracker planTitle={taskData.title} tasks={taskData.tasks} />;
                    } catch {
                      return <div className="text-zinc-500 text-xs animate-pulse">Planning tasks...</div>;
                    }
                  }

                  if (lang === 'report' || lang === 'editable') {
                    return <EditableReportBox initialContent={rawContent} />;
                  }

                  // Real-time WASM syntax highlighting + Virtualized Code Viewport
                  return <VirtualizedCodeBlock code={rawContent} language={lang} />;
                }

                // Inline code styling
                return (
                  <code className="bg-zinc-800/80 px-1.5 py-0.5 rounded-md text-indigo-300 font-mono text-[0.85em]" {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {safeMarkdown}
          </ReactMarkdown>

          {/* 3. Terminal Caret */}
          {isStreaming && hasContent && <Caret />}
        </div>
      </GrowingContainer>

      {/* 4. Ambient Glow Effect on Container */}
      {isStreaming && (
        <div className="absolute -inset-1 bg-indigo-500/5 blur-2xl -z-10 rounded-xl pointer-events-none" />
      )}
    </div>
  );
}, (prev, next) => prev.content === next.content && prev.isStreaming === next.isStreaming);

StreamingMessage.displayName = 'StreamingMessage';

