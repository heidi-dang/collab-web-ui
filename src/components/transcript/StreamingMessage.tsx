import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useSmoothStream } from '../../hooks/useSmoothStream';
import { AgentTaskTracker, AgentTask } from './AgentTaskTracker';
import { EditableReportBox } from './EditableReportBox';

interface StreamingMessageProps {
  content: string;
  isStreaming: boolean;
}

// React.memo prevents parent re-renders from thrashing the markdown parser
export const StreamingMessage: React.FC<StreamingMessageProps> = memo(({ content, isStreaming }) => {
  // Apply smoothing only while the stream is active. 
  // If static, render immediately to bypass the queue.
  const smoothedContent = useSmoothStream(content);
  const displayContent = isStreaming ? smoothedContent : content;

  return (
    <div className="prose prose-invert prose-sm max-w-none break-words leading-relaxed">
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const rawContent = String(children).replace(/\n$/, '');

            if (!inline && match && match[1] === 'tasks') {
              try {
                const taskData = JSON.parse(rawContent) as { title: string; tasks: AgentTask[] };
                return <AgentTaskTracker planTitle={taskData.title} tasks={taskData.tasks} />;
              } catch {
                return <div className="text-zinc-500 text-xs animate-pulse">Planning tasks...</div>;
              }
            }

            if (!inline && match && (match[1] === 'report' || match[1] === 'editable')) {
              return <EditableReportBox initialContent={rawContent} />;
            }

            return (
              <code className={`${className || ''} bg-zinc-800/50 px-1.5 py-0.5 rounded-md text-indigo-200`} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {displayContent}
      </ReactMarkdown>
    </div>
  );
}, (prev, next) => prev.content === next.content && prev.isStreaming === next.isStreaming);

StreamingMessage.displayName = 'StreamingMessage';
