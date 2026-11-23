import React, { useState, useEffect } from 'react';
import {
  Ticket,
  ExternalLink,
  Bot,
  AlertTriangle,
  Send,
  CheckCircle2,
  ShieldCheck,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Search,
  Sparkles,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { api } from '../../services/api';
import { ChatMessage, ChatSourceItem } from '../../types';
import { MessageItem } from '../chat/MessageItem';

interface ZendeskSidebarWidgetProps {
  onViewRunbook: (source: ChatSourceItem) => void;
  standalone?: boolean;
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
  {
    id: '4094',
    subject: 'Robot Sherpa-01: Wheel calibration without delfino required after motor replacement',
    requester: 'Field Robotics Engineer',
    tags: ['Wheel Calibration', 'Delfino', 'Hardware', 'Motors'],
    query: 'How do I calibrate wheels without delfino?',
  },
  {
    id: '4095',
    subject: 'Robot Mule-03: High CTE warning and control module cross track error',
    requester: 'Site Support Lead',
    tags: ['High CTE', 'Navigation', 'Mule'],
    query: 'How to troubleshoot high CTE on control module?',
  },
];

export const ZendeskSidebarWidget: React.FC<ZendeskSidebarWidgetProps> = ({
  onViewRunbook,
  standalone = false,
}) => {
  const [selectedTicket, setSelectedTicket] = useState(SAMPLE_TICKETS[0]);
  const [customQuery, setCustomQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ChatMessage | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSidebarOnlyView, setIsSidebarOnlyView] = useState(standalone);

  // Auto-run diagnosis on mount
  useEffect(() => {
    handleDiagnose(selectedTicket);
  }, [selectedTicket]);

  const handleDiagnose = async (ticket: typeof SAMPLE_TICKETS[0], customQ?: string) => {
    setLoading(true);
    setResponse(null);
    setCopied(false);

    const queryToUse = customQ || ticket.query;

    try {
      const res = await api.sendChatMessage({
        query: queryToUse,
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

  const handleCopySolution = () => {
    if (!response) return;

    let text = `### Zendesk Troubleshooting Resolution (Ticket #${selectedTicket.id})\n\n`;
    text += response.content + '\n\n';

    if (response.commands && response.commands.length > 0) {
      text += '#### Recommended Commands to Execute:\n';
      response.commands.forEach((c) => {
        text += `\`\`\`bash\n${c.command}\n\`\`\`\n`;
      });
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuery.trim() || loading) return;
    handleDiagnose(selectedTicket, customQuery.trim());
    setCustomQuery('');
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Left Pane: Ticket Context Simulator (hidden if sidebar-only view) */}
      {!isSidebarOnlyView && (
        <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-6 overflow-y-auto shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
              <Ticket className="w-4 h-4" />
              <span>Zendesk Support (ZAF v2)</span>
            </div>
            <button
              onClick={() => setIsSidebarOnlyView(true)}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Simulate 350px standalone Zendesk Sidebar"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Agent Ticket Simulation
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              When an engineer opens an ATI robotics ticket in Zendesk Support, this sidebar automatically retrieves matching runbook procedures.
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
                  onClick={() => setSelectedTicket(t)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                    selectedTicket.id === t.id
                      ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 shadow-xs ring-1 ring-sky-500'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                    <span>Ticket #{t.id}</span>
                    <span className="text-emerald-600 font-medium">Open</span>
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 mt-1 leading-snug">
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

          {/* Production note */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-500" /> Zendesk Apps Framework (ZAF) Ready
            </span>
            <p>
              In production Zendesk, the sidebar reads <code>ticket.subject</code> and custom fields via ZAF client SDK, auto-invoking the RAG engine and allowing 1-click solution pasting into ticket comments.
            </p>
          </div>
        </div>
      )}

      {/* Right Pane: Zendesk Sidebar Component (width: 340px-420px when standalone) */}
      <div className={`flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden ${isSidebarOnlyView ? 'max-w-md mx-auto border-x border-slate-200 dark:border-slate-800 shadow-xl' : ''}`}>
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 leading-none">
                <span>ATI Runbook Assistant</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Ticket #{selectedTicket.id}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 truncate max-w-[200px] block mt-0.5">
                {selectedTicket.subject}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {response && (
              <button
                onClick={handleCopySolution}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-sky-600 hover:bg-sky-500 text-white shadow-2xs'
                }`}
                title="Copy resolution formatted for Zendesk comment"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span className="hidden sm:inline">{copied ? 'Copied!' : 'Insert to Ticket'}</span>
              </button>
            )}

            {isSidebarOnlyView && (
              <button
                onClick={() => setIsSidebarOnlyView(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Expand to dual pane view"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Scroll View */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick ticket context banner */}
          <div className="p-3 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/70 dark:bg-sky-950/30 text-xs text-sky-900 dark:text-sky-200 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div className="leading-snug">
              <span className="font-semibold block">Auto-Diagnosed for Ticket #{selectedTicket.id}:</span>
              <p className="text-[11px] text-sky-800 dark:text-sky-300 mt-0.5">
                "{selectedTicket.query}"
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-sky-500 mx-auto" />
              <span>Grounded retrieval evaluating runbook steps for this ticket...</span>
            </div>
          ) : response ? (
            <div className="space-y-4">
              <MessageItem
                message={response}
                onSelectQuery={(q) => handleDiagnose(selectedTicket, q)}
                onViewRunbook={onViewRunbook}
              />
            </div>
          ) : (
            <div className="py-16 text-center space-y-2 text-slate-500 text-xs">
              <p>No diagnosis loaded. Enter a question or select a ticket.</p>
            </div>
          )}
        </div>

        {/* Bottom Quick Question Input Bar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form onSubmit={handleCustomSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder="Ask custom question for this ticket..."
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!customQuery.trim() || loading}
              className="p-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 px-1">
            <span>Zendesk Sidebar Simulation Mode</span>
            <button
              onClick={() => handleDiagnose(selectedTicket)}
              className="text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
            >
              Re-evaluate Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
