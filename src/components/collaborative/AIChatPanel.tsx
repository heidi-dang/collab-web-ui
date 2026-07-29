import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Square, Bot, User, AlertCircle, Loader2 } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { useAIStream } from '../../hooks/useAIStream';

interface AIChatPanelProps {
  endpoint: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({ endpoint, isOpen, onClose }) => {
  const { messages, isStreaming, error, sendMessage, stopGeneration } = useAIStream(endpoint);
  const [input, setInput] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrolledUp = useRef(false);

  // Smart Auto-scroll: Only scroll if the user hasn't manually scrolled up to read history
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    isScrolledUp.current = distanceToBottom > 50; 
  };

  useEffect(() => {
    if (!scrollRef.current || isScrolledUp.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStreaming || !input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[600px] max-h-[70vh] flex flex-col bg-zinc-950/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
          role="dialog"
          aria-label="AI Assistant"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400">
                <Bot size={18} />
              </div>
              <h2 className="text-sm font-semibold text-zinc-100">Canvas AI</h2>
            </div>
            <button 
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors p-1"
              aria-label="Close chat"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4L12 12M12 4L4 12" />
              </svg>
            </button>
          </div>

          {/* Message List */}
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 space-y-6 overscroll-contain"
          >
            {messages.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-3">
                <Bot size={32} className="opacity-50" />
                <p className="text-sm text-center">How can I help you with this canvas?</p>
              </div>
            )}

            {messages.map((msg) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full ${
                  msg.role === 'user' ? 'bg-zinc-800 text-zinc-300' : 'bg-indigo-500/20 text-indigo-400'
                }`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                
                <div className={`flex flex-col max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-zinc-100 text-zinc-900 rounded-tr-sm' 
                      : 'bg-zinc-900 text-zinc-100 border border-white/5 rounded-tl-sm'
                  }`}>
                    {msg.content || (
                      <span className="flex items-center gap-1.5 text-zinc-500">
                        <Loader2 size={14} className="animate-spin" /> Thinking...
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={16} />
                <p>{error}</p>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-white/10 bg-zinc-900/50">
            <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
              <div className="relative flex-1 bg-zinc-950 border border-white/10 rounded-xl focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                <TextareaAutosize
                  minRows={1}
                  maxRows={4}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask AI..."
                  className="w-full bg-transparent text-zinc-100 text-sm px-4 py-3 resize-none focus:outline-none placeholder:text-zinc-600"
                  disabled={isStreaming}
                />
              </div>
              
              {isStreaming ? (
                <button
                  type="button"
                  onClick={stopGeneration}
                  className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  aria-label="Stop generation"
                >
                  <Square size={18} fill="currentColor" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Send message"
                >
                  <Send size={18} />
                </button>
              )}
            </form>
            <div className="mt-2 text-center">
              <span className="text-[10px] font-medium text-zinc-600">Press Enter to send, Shift + Enter for new line</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
