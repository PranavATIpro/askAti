import React, { useState } from 'react';
import {
  MessageSquare,
  BookOpen,
  Plus,
  Trash2,
  Moon,
  Sun,
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Conversation } from '../../types';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';

interface SidebarProps {
  activeTab: 'chat' | 'browser';
  onTabChange: (tab: 'chat' | 'browser') => void;
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
  const [collapsed, setCollapsed] = useState(false);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);

  const deletingConversation = conversations.find(c => c.id === deletingConversationId);

  const handleConfirmDelete = () => {
    if (deletingConversationId) {
      onDeleteConversation(deletingConversationId);
      setDeletingConversationId(null);
    }
  };

  return (
    <>
      <aside
        className={`${
          collapsed ? 'w-14' : 'w-64 md:w-72'
        } border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full shrink-0 select-none transition-all duration-200 overflow-hidden`}
      >
        {/* Brand Header */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between gap-2">
            {/* Logo always visible */}
            <div className={`flex items-center gap-2.5 overflow-hidden ${collapsed ? 'w-full justify-center' : ''}`}>
              <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-xs shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              {!collapsed && (
                <div className="overflow-hidden">
                  <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-none whitespace-nowrap">
                    ATI MOTORS
                  </h1>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mt-0.5 whitespace-nowrap">
                    Runbook Assistant
                  </span>
                </div>
              )}
            </div>
            {/* Collapse toggle */}
            {!collapsed && (
              <button
                onClick={() => setCollapsed(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Expand toggle when collapsed */}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="mt-2 w-full flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}

          {/* New Session Button */}
          {!collapsed && (
            <button
              onClick={onNewConversation}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-medium text-xs shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Troubleshooting Chat</span>
            </button>
          )}
          {collapsed && (
            <button
              onClick={onNewConversation}
              className="mt-2 w-full flex items-center justify-center p-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition-all cursor-pointer"
              title="New Troubleshooting Chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Main Navigation Links */}
        <div className="p-2 space-y-1 border-b border-slate-100 dark:border-slate-800/80 text-xs">
          <button
            onClick={() => onTabChange('chat')}
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-2.5 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={collapsed ? 'Assistant Chat' : undefined}
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Assistant Chat</span>}
            </div>
          </button>

          <button
            onClick={() => onTabChange('browser')}
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-2.5 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'browser'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={collapsed ? `Knowledge Base (${totalRunbooks})` : undefined}
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Knowledge Base</span>}
            </div>
            {!collapsed && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                  activeTab === 'browser'
                    ? 'bg-sky-700 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {totalRunbooks}
              </span>
            )}
          </button>
        </div>

        {/* Recent Troubleshooting History */}
        {!collapsed && (
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            <span className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
              Recent Sessions
            </span>

            {conversations.length > 0 ? (
              conversations.map((c) => (
                <div
                  key={c.id}
                  className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
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
                      setDeletingConversationId(c.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity cursor-pointer shrink-0"
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <p className="px-2.5 py-4 text-center text-xs text-slate-400 italic">No recent sessions</p>
            )}
          </div>
        )}

        {/* Spacer when collapsed */}
        {collapsed && <div className="flex-1" />}

        {/* Footer: Status & Theme Toggle */}
        <div className={`p-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 ${collapsed ? 'flex flex-col items-center gap-2' : 'space-y-2 text-xs'}`}>
          {!collapsed && (
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-mono">PostgreSQL Live</span>
              </div>
              <button
                type="button"
                onClick={onToggleTheme}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>
            </div>
          )}
          {collapsed && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          )}
        </div>
      </aside>

      {/* Delete Confirmation Modal for Chat Sessions */}
      <DeleteConfirmModal
        isOpen={!!deletingConversationId}
        itemName={deletingConversation?.title || 'Untitled Session'}
        itemType="chat session"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingConversationId(null)}
      />
    </>
  );
};
