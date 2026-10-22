import React, { useState } from 'react';
import { Ticket, ExternalLink, Bot, AlertTriangle, Send, CheckCircle2, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';
import { ChatMessage, ChatSourceItem } from '../../types';
import { MessageItem } from '../chat/MessageItem';

interface ZendeskSidebarWidgetProps {
  onViewRunbook: (source: ChatSourceItem) => void;
}

const SAMPLE_TICKETS = [
  {
    id: '4091',
    subject: 'Robot XT-04: Obstacle detection trigger during warehouse crossway navigation',
    requester: 'Ground Operations Lead (Bangalore Warehouse)',
    tags: ['Streamlit', 'Lidar', 'Obstacle', 'Hardware'],
    query: 'How do I inspect the Lidar frame for a detected obstacle?',
  },
  {
    id: '4092',
    subject: 'Robot XT-02: Map Generation process stuck on GPU node',
    requester: 'Mapping & Localization Intern',
    tags: ['Map', 'Software', 'Docker', 'GPU'],
    query: 'What command is documented for map generation?',
  },
  {
    id: '4093',
    subject: 'Robot XT-06: Tricolor LED blinking and emergency stop check',
    requester: 'Hardware Maintenance Technician',
    tags: ['Battery', 'Sensor', 'Hardware'],
    query: 'What procedure should be followed if Battery tricolor LED is blinking?',
  },
];

export const ZendeskSidebarWidget: React.FC<ZendeskSidebarWidgetProps> = ({ onViewRunbook }) => {
  const [selectedTicket, setSelectedTicket] = useState(SAMPLE_TICKETS[0]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ChatMessage | null>(null);

  const handleDiagnose = async (ticket: typeof SAMPLE_TICKETS[0]) => {
    setSelectedTicket(ticket);
    setLoading(true);
    setResponse(null);

    try {
      const res = await api.sendChatMessage({
        query: ticket.query,
        ticket_context: {
          ticket_id: ticket.id,
          subject: ticket.subject,
          tags: ticket.tags,
        },
      });
      setResponse(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Left Pane: Simulated Zendesk Ticket Context */}
      <div className="w-full md:w-96 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-6 overflow-y-auto shrink-0">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
            <Ticket className="w-4 h-4" />
            <span>Zendesk Support Apps Framework (ZAF v2)</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
            Agent Ticket Simulation
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Test how the Runbook Assistant auto-contextualizes support tickets within the Zendesk agent sidebar.
          </p>
        </div>

        {/* Ticket Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Select Active Support Ticket:
          </label>
          <div className="space-y-2">
            {SAMPLE_TICKETS.map((t) => (
              <button
                key={t.id}
                onClick={() => handleDiagnose(t)}
                className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                  selectedTicket.id === t.id
                    ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                  <span>Ticket #{t.id}</span>
                  <span className="text-emerald-600 font-medium">Open</span>
                </div>
                <div className="font-medium text-slate-900 dark:text-slate-100 mt-1 leading-snug">
                  {t.subject}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {t.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400 font-mono"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Architectural note */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
          <span className="font-semibold text-slate-700 dark:text-slate-300 block flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-500" /> Production ZAF v2 Readiness
          </span>
          <p>
            In production Zendesk, the app communicates with the backend via signed JWT tokens passed via ZAF client headers.
            Ticket subject, product area, and error codes are auto-ingested to prompt runbook recommendations.
          </p>
        </div>
      </div>

      {/* Right Pane: Embedded Sidebar Result View */}
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Runbook Diagnostics for Ticket #{selectedTicket.id}
            </span>
          </div>
          <button
            onClick={() => handleDiagnose(selectedTicket)}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Evaluating...' : 'Re-Run Grounded Diagnosis'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {loading ? (
            <div className="py-20 text-center text-xs text-slate-500 space-y-2">
              <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <span>Analyzing ticket parameters against indexed runbooks...</span>
            </div>
          ) : response ? (
            <div className="max-w-2xl mx-auto">
              <MessageItem message={response} onViewRunbook={onViewRunbook} />
            </div>
          ) : (
            <div className="py-20 text-center space-y-2 text-slate-500 text-xs">
              <p>Click "Re-Run Grounded Diagnosis" to evaluate this ticket.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
