import React from 'react';
import {
  MessageSquare,
  BookOpen,
  Database,
  Ticket,
  Plus,
  Trash2,
  Moon,
  Sun,
  Bot,
  Activity,
  Layers
} from 'lucide-react';
import { Conversation } from '../../types';

interface SidebarProps {
  activeTab: 'chat' | 'browser' | 'admin' | 'zendesk';
  onTabChange: (tab: 'chat' | 'browser' | 'admin' | 'zendesk') => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  totalRunbooks: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isDark,
  onToggleTheme,
  totalRunbooks,
}) => {
  return (
    <aside className="w-64 md:w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-none">
              ATI MOTORS
            </h1>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
              Runbook Assistant
            </span>
          </div>
        </div>

        {/* New Session Button */}
        <button
          onClick={onNewConversation}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-medium text-xs shadow-2xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Troubleshooting Chat</span>
        </button>
      </div>

      {/* Main Navigation Links */}
      <div className="p-3 space-y-1 border-b border-slate-100 dark:border-slate-800/80 text-xs">
        <button
          onClick={() => onTabChange('chat')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
            activeTab === 'chat'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-4 h-4" />
            <span>Assistant Chat</span>
          </div>
        </button>

        <button
          onClick={() => onTabChange('browser')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
            activeTab === 'browser'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4" />
            <span>Runbook Knowledge Base</span>
          </div>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
              activeTab === 'browser'
                ? 'bg-sky-700 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {totalRunbooks}
          </span>
        </button>

        <button
          onClick={() => onTabChange('admin')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
            activeTab === 'admin'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4" />
            <span>Ingestion Pipeline</span>
          </div>
        </button>

        <button
          onClick={() => onTabChange('zendesk')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
            activeTab === 'zendesk'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Ticket className="w-4 h-4" />
            <span>Zendesk Support Mode</span>
          </div>
        </button>
      </div>

      {/* Recent Troubleshooting History */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
          Recent Troubleshooting Sessions
        </span>

        {conversations.length > 0 ? (
          conversations.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                activeConversationId === c.id
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
              onClick={() => {
                onSelectConversation(c.id);
                onTabChange('chat');
              }}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{c.title || 'Untitled Session'}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(c.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity cursor-pointer"
                title="Delete session"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        ) : (
          <p className="px-3 py-4 text-center text-xs text-slate-400 italic">No recent sessions</p>
        )}
      </div>

      {/* Footer System Status & Theme Toggle */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 space-y-2 text-xs">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono">PostgreSQL Live</span>
          </div>
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Toggle Dark/Light Mode"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
};
