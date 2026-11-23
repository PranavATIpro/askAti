import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Cpu, ArrowRight, Trash2 } from 'lucide-react';
import { ChatMessage, ChatSourceItem } from '../../types';
import { MessageItem } from './MessageItem';

interface ChatWorkspaceProps {
  messages: ChatMessage[];
  loading: boolean;
  onSendMessage: (query: string) => void;
  onViewRunbook: (source: ChatSourceItem) => void;
  onNewChat: () => void;
}

const SAMPLE_PROMPTS = [
  {
    title: 'Map Generation',
    query: 'How do I generate a map?',
    desc: 'Retrieve exact docker command & parameters for mapping and stitching.',
  },
  {
    title: 'Obstacle Investigation',
    query: 'How can I investigate an obstacle detection issue?',
    desc: 'Step-by-step instructions to inspect detected frames on Streamlit.',
  },
  {
    title: 'Lidar Frame Inspection',
    query: 'How do I inspect the Lidar frame for a detected obstacle?',
    desc: 'Streamlit visualizer steps for Lidar frame ID and drivable space.',
  },
  {
    title: 'Streamlit Visualizer',
    query: 'Which runbook covers the Streamlit visualizer?',
    desc: 'Find Streamlit plots, heatmap telemetry, and error tools.',
  },
  {
    title: 'Map Generation Command',
    query: 'What command is documented for map generation?',
    desc: 'Exact verified terminal command with GPU and posegraph flags.',
  },
];

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  messages,
  loading,
  onSendMessage,
  onViewRunbook,
  onNewChat,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const query = input.trim();
    setInput('');
    onSendMessage(query);
  };

  const handleSelectQuery = (query: string) => {
    onSendMessage(query);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-4">
        {messages.length === 0 ? (
          <div className="max-w-3xl mx-auto my-8 space-y-8">
            {/* Hero / Greeting */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 mb-1">
                <Cpu className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                ATI Motors Robotics Runbook Assistant
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
                Internal troubleshooting intelligence for ATI robotics operations interns and support engineers.
              </p>
            </div>

            {/* Quick Prompt Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                <span>Frequently Asked Runbook Procedures</span>
                <span className="text-[11px] font-normal text-slate-400">Click to run immediately</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SAMPLE_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectQuery(prompt.query)}
                    className="flex flex-col text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                        {prompt.title}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1">
                      "{prompt.query}"
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {prompt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {messages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                onSelectQuery={handleSelectQuery}
                onViewRunbook={onViewRunbook}
              />
            ))}

            {loading && (
              <div className="flex items-center gap-2.5 my-4 text-xs text-slate-500 dark:text-slate-400 pl-11">
                <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                <span>Searching indexed runbooks and validating procedure steps...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 md:p-4 shadow-sm">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a troubleshooting question (e.g. 'How do I generate a map?', 'Lidar frame error')..."
            className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline ml-1.5">Ask</span>
          </button>
        </form>

        {/* Subtle Right-Aligned Clear Chat Option when messages exist */}
        {messages.length > 0 && (
          <div className="max-w-3xl mx-auto flex items-center justify-end text-[11px] text-slate-400 mt-2 px-1">
            <button
              onClick={onNewChat}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear session</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
