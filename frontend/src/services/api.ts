import {
  Runbook,
  RunbookListResponse,
  ChatMessage,
  Conversation,
  IngestionPreviewResponse,
  IngestionJob,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = {
  async checkHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async getRunbooks(params?: {
    q?: string;
    ticket_type?: string;
    category?: string;
    product_area?: string;
    component?: string;
    skip?: number;
    limit?: number;
  }): Promise<RunbookListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.set('q', params.q);
    if (params?.ticket_type && params.ticket_type !== 'All') searchParams.set('ticket_type', params.ticket_type);
    if (params?.category && params.category !== 'All') searchParams.set('category', params.category);
    if (params?.product_area && params.product_area !== 'All') searchParams.set('product_area', params.product_area);
    if (params?.component && params.component !== 'All') searchParams.set('component', params.component);
    if (params?.skip) searchParams.set('skip', params.skip.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/runbooks?${searchParams.toString()}`);
    if (!res.ok) throw new Error('Failed to load runbooks');
    return res.json();
  },

  async getRunbookById(id: string): Promise<Runbook> {
    const res = await fetch(`${API_BASE}/runbooks/${id}`);
    if (!res.ok) throw new Error('Failed to load runbook detail');
    return res.json();
  },

  async sendChatMessage(payload: {
    query: string;
    conversation_id?: string;
    ticket_context?: Record<string, any>;
  }): Promise<ChatMessage> {
    const res = await fetch(`${API_BASE}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(err.detail || 'Assistant request failed');
    }
    const data = await res.json();
    return {
      id: data.message_id,
      role: 'assistant',
      content: data.content,
      retrieval_mode: data.retrieval_mode,
      confidence: data.confidence,
      sources: data.sources,
      steps: data.steps,
      commands: data.commands,
      warnings: data.warnings,
      suggested_followups: data.suggested_followups,
      created_at: data.created_at,
    };
  },

  async getConversations(): Promise<Conversation[]> {
    const res = await fetch(`${API_BASE}/conversations`);
    if (!res.ok) throw new Error('Failed to load conversations');
    return res.json();
  },

  async getConversationDetails(id: string): Promise<{ id: string; title: string; messages: any[] }> {
    const res = await fetch(`${API_BASE}/conversations/${id}`);
    if (!res.ok) throw new Error('Failed to load conversation details');
    return res.json();
  },

  async deleteConversation(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete conversation');
  },

  async previewIngestion(formData: FormData): Promise<IngestionPreviewResponse> {
    const res = await fetch(`${API_BASE}/ingestion/preview`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Preview failed' }));
      throw new Error(err.detail || 'Preview failed');
    }
    return res.json();
  },

  async commitIngestion(formData: FormData, adminKey?: string): Promise<any> {
    const headers: Record<string, string> = {};
    if (adminKey) {
      headers['x-admin-key'] = adminKey;
    }
    const res = await fetch(`${API_BASE}/ingestion/import`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Import failed' }));
      throw new Error(err.detail || 'Import failed');
    }
    return res.json();
  },

  async getIngestionJobs(): Promise<{ total: number; jobs: IngestionJob[] }> {
    const res = await fetch(`${API_BASE}/ingestion/jobs`);
    if (!res.ok) throw new Error('Failed to load ingestion history');
    return res.json();
  },
};
