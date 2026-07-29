import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useSmoothStream } from '../../hooks/useSmoothStream';
import { AgentTaskTracker, AgentTask } from './AgentTaskTracker';
import { EditableReportBox } from './EditableReportBox';
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

  return (
    <div className="prose prose-invert prose-sm max-w-none break-words leading-relaxed">
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

              // Real-time syntax highlighting for standard code blocks
              return (
                <div 
                  className="relative group my-4 overflow-hidden rounded-xl border border-white/10 bg-zinc-950 shadow-2xl"
                  // CSS Containment strictly prevents the rapid height expansion 
                  // from triggering global DOM layout recalculations during stream
                  style={{ contain: 'layout paint' }} 
                >
                  <div className="flex items-center justify-between border-b border-white/5 bg-zinc-900/80 px-4 py-2">
                    <span className="text-xs font-mono text-zinc-400 select-none">{lang}</span>
                    <button 
                      type="button"
                      onClick={() => navigator.clipboard.writeText(rawContent)}
                      className="text-[10px] uppercase font-bold text-zinc-500 hover:text-indigo-400 transition-colors cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="overflow-x-auto overscroll-contain">
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={lang}
                      PreTag="div"
                      customStyle={{
                        margin: 0,
                        background: 'transparent',
                        padding: '1rem',
                        fontSize: '0.85rem',
                        fontFamily: '"Geist Mono", "Fira Code", monospace',
                      }}
                      {...props}
                    >
                      {rawContent}
                    </SyntaxHighlighter>
                  </div>
                </div>
              );
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
    </div>
  );
}, (prev, next) => prev.content === next.content && prev.isStreaming === next.isStreaming);

StreamingMessage.displayName = 'StreamingMessage';
