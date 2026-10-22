import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { ChatWorkspace } from './components/chat/ChatWorkspace';
import { RunbookBrowser } from './components/browser/RunbookBrowser';
import { IngestionAdmin } from './components/admin/IngestionAdmin';
import { ZendeskSidebarWidget } from './components/zendesk/ZendeskSidebarWidget';
import { RunbookDetailModal } from './components/browser/RunbookDetailModal';
import { api } from './services/api';
import { ChatMessage, Conversation, ChatSourceItem } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'browser' | 'admin' | 'zendesk'>('chat');
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('ati_theme') === 'dark';
  });

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [totalRunbooks, setTotalRunbooks] = useState(0);
  const [modalRunbookId, setModalRunbookId] = useState<string | null>(null);

  // Sync theme to document
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ati_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ati_theme', 'light');
    }
  }, [isDark]);

  // Load conversations and total runbooks count on mount
  const refreshMetadata = () => {
    api
      .getConversations()
      .then((convs) => setConversations(convs))
      .catch((err) => console.error('Failed to load conversations:', err));

    api
      .getRunbooks({ limit: 1 })
      .then((res) => setTotalRunbooks(res.total))
      .catch((err) => console.error('Failed to load runbooks count:', err));
  };

  useEffect(() => {
    refreshMetadata();
  }, []);

  // When switching conversations, load historical messages
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    api
      .getConversationDetails(activeConversationId)
      .then((detail) => {
        const formatted: ChatMessage[] = detail.messages.map((m) => {
          let sources = [];
          let commands = [];
          let warnings = [];
          let followups = [];
          try {
            if (m.sources) sources = JSON.parse(m.sources);
            if (m.commands) commands = JSON.parse(m.commands);
            if (m.warnings) warnings = JSON.parse(m.warnings);
            if (m.suggested_followups) followups = JSON.parse(m.suggested_followups);
          } catch (e) {
            console.error('Failed to parse message metadata:', e);
          }

          return {
            id: m.id,
            role: m.role,
            content: m.content,
            sources,
            commands,
            warnings,
            suggested_followups: followups,
            created_at: m.created_at,
          };
        });
        setMessages(formatted);
      })
      .catch((err) => console.error(err));
  }, [activeConversationId]);

  const handleSendMessage = async (query: string) => {
    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: query,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const response = await api.sendChatMessage({
        query,
        conversation_id: activeConversationId || undefined,
      });

      if (!activeConversationId) {
        setActiveConversationId(response.id);
        refreshMetadata();
      }

      setMessages((prev) => [...prev, response]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error retrieving operational procedure: ${err.message || 'Server communication error'}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setActiveTab('chat');
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await api.deleteConversation(id);
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
      refreshMetadata();
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewRunbookFromSource = (source: ChatSourceItem) => {
    setModalRunbookId(source.runbook_id);
  };

  const handleAskAboutRunbook = (title: string) => {
    setActiveTab('chat');
    handleSendMessage(`Tell me the procedure and commands for ${title}`);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={setActiveConversationId}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        totalRunbooks={totalRunbooks}
      />

      {/* Main Workspace Pane */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {activeTab === 'chat' && (
          <ChatWorkspace
            messages={messages}
            loading={chatLoading}
            onSendMessage={handleSendMessage}
            onViewRunbook={handleViewRunbookFromSource}
            onNewChat={handleNewConversation}
          />
        )}

        {activeTab === 'browser' && (
          <RunbookBrowser onAskAboutRunbook={handleAskAboutRunbook} />
        )}

        {activeTab === 'admin' && <IngestionAdmin />}

        {activeTab === 'zendesk' && (
          <ZendeskSidebarWidget onViewRunbook={handleViewRunbookFromSource} />
        )}
      </main>

      {/* Global Runbook Detail Drawer */}
      <RunbookDetailModal
        runbookId={modalRunbookId}
        onClose={() => setModalRunbookId(null)}
        onAskAboutRunbook={handleAskAboutRunbook}
      />
    </div>
  );
};
