import React, { useState, useEffect } from 'react';
import { Copy, Check, Download, FileText } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';

interface EditableReportBoxProps {
  initialContent: string;
  title?: string;
}

export const EditableReportBox: React.FC<EditableReportBoxProps> = ({
  initialContent,
  title = 'Generated Report',
}) => {
  const [content, setContent] = useState(initialContent);
  const [copied, setCopied] = useState(false);

  // Sync internal state if stream updates from AI
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy report text:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '-')}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/90 shadow-2xl backdrop-blur-xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-zinc-950/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-indigo-400"/>
          <span className="text-xs font-semibold text-zinc-200">{title}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-zinc-500">
            {wordCount} words | {charCount} chars
          </span>
          
          <div className="h-3 w-px bg-white/10" aria-hidden="true" />

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100 active:scale-95"
            title="Download as Markdown file"
          >
            <Download className="h-3.5 w-3.5"/>
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-300 transition-all hover:bg-indigo-500/30 hover:text-white active:scale-95 border border-indigo-500/30"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400"/>
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5"/>
                <span>Copy All</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Editable Surface */}
      <div className="relative p-3 bg-zinc-950/40 group">
        <button
          type="button"
          onClick={handleCopy}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-zinc-800/90 hover:bg-indigo-600/80 text-zinc-300 hover:text-white transition-all shadow-md backdrop-blur-sm border border-white/10 opacity-80 group-hover:opacity-100 z-10 flex items-center gap-1 text-xs cursor-pointer"
          title="Copy text in box"
          aria-label="Copy text in box"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-medium pr-0.5">Copied!</span>
            </>
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
        <TextareaAutosize
          value={content}
          onChange={(e) => setContent(e.target.value)}
          minRows={6}
          maxRows={24}
          className="w-full bg-transparent font-mono text-xs leading-relaxed text-zinc-200 focus:outline-none placeholder:text-zinc-600 border-none select-text resize-none pr-10"
          placeholder="Report content streaming..."
          spellCheck={false}
        />
      </div>
    </div>
  );
};
