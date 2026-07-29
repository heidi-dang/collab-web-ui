import React, { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { createHighlighter, type Highlighter, type ThemedToken } from 'shiki';

export interface VirtualizedCodeBlockProps {
  code: string;
  language: string;
}

// Singleton highlighter instance promise for Shiki WASM
let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighterInstance(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['vsc-dark-plus', 'github-dark'],
      langs: ['javascript', 'typescript', 'jsx', 'tsx', 'json', 'html', 'css', 'python', 'bash', 'markdown', 'sql', 'yaml'],
    });
  }
  return highlighterPromise;
}

export const VirtualizedCodeBlock: React.FC<VirtualizedCodeBlockProps> = ({ code, language }) => {
  const [tokens, setTokens] = useState<ThemedToken[][] | null>(null);
  const [copied, setCopied] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const deferredCode = useDeferredValue(code);
  const lines = useMemo(() => code.split('\n'), [code]);

  useEffect(() => {
    let isMounted = true;
    const lang = language.toLowerCase() || 'text';

    getHighlighterInstance()
      .then((highlighter) => {
        if (!isMounted) return;
        try {
          const loadedLangs = highlighter.getLoadedLanguages();
          const validLang = (loadedLangs.includes(lang) ? lang : 'text') as any;
          const result = highlighter.codeToTokens(deferredCode, {
            lang: validLang,
            theme: 'vsc-dark-plus',
          });
          setTokens(result.tokens);
        } catch {
          setTokens(null);
        }
      })
      .catch(() => {
        if (isMounted) setTokens(null);
      });

    return () => {
      isMounted = false;
    };
  }, [deferredCode, language]);

  const rowCount = lines.length;
  const isLarge = rowCount > 30;

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 22,
    overscan: 8,
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="relative group my-4 overflow-hidden rounded-xl border border-white/10 bg-zinc-950 shadow-2xl text-zinc-100 font-mono text-xs"
      style={{ contain: 'layout paint' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 bg-zinc-900/80 px-4 py-2 select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          <span className="ml-2 text-[11px] font-mono text-zinc-400 font-medium">{language || 'text'}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 hover:text-indigo-400 transition-colors cursor-pointer px-2 py-0.5 rounded bg-zinc-800/50 hover:bg-zinc-800"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Code Area */}
      <div
        ref={parentRef}
        className={`overflow-auto overscroll-contain p-3 ${isLarge ? 'max-h-[480px]' : ''}`}
        style={{ fontFamily: '"Geist Mono", "Fira Code", monospace' }}
      >
        {isLarge ? (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const idx = virtualRow.index;
              const lineTokens = tokens?.[idx];
              const rawLine = lines[idx];

              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="flex items-baseline leading-[22px] whitespace-pre font-mono"
                >
                  <span className="w-8 shrink-0 select-none text-[10px] text-zinc-600 text-right pr-3">
                    {idx + 1}
                  </span>
                  <span className="flex-1 overflow-x-auto">
                    {lineTokens
                      ? lineTokens.map((token, tidx) => (
                          <span key={tidx} style={{ color: token.color }}>
                            {token.content}
                          </span>
                        ))
                      : rawLine || ' '}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-0 font-mono">
            {lines.map((rawLine, idx) => {
              const lineTokens = tokens?.[idx];
              return (
                <div key={idx} className="flex items-baseline leading-[22px] whitespace-pre">
                  <span className="w-8 shrink-0 select-none text-[10px] text-zinc-600 text-right pr-3">
                    {idx + 1}
                  </span>
                  <span className="flex-1 overflow-x-auto">
                    {lineTokens
                      ? lineTokens.map((token, tidx) => (
                          <span key={tidx} style={{ color: token.color }}>
                            {token.content}
                          </span>
                        ))
                      : rawLine || ' '}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
