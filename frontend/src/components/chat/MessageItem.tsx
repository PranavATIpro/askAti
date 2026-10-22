import React from 'react';
import { Bot, User, BookOpen, ExternalLink, HelpCircle, ShieldCheck } from 'lucide-react';
import { ChatMessage, ChatSourceItem } from '../../types';
import { StepCard } from './StepCard';

interface MessageItemProps {
  message: ChatMessage;
  onSelectQuery?: (query: string) => void;
  onViewRunbook?: (source: ChatSourceItem) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onSelectQuery,
  onViewRunbook,
}) => {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-2.5 my-3">
        <div className="max-w-2xl bg-sky-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-sm text-sm">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300">
          <User className="w-4 h-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 my-4">
      <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-950 border border-sky-300 dark:border-sky-800 flex items-center justify-center shrink-0 text-sky-600 dark:text-sky-400 mt-1 shadow-xs">
        <Bot className="w-4 h-4" />
      </div>

      <div className="flex-1 max-w-3xl space-y-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 shadow-xs">
        {/* Assistant Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>ATI Operations Runbook Assistant</span>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
              Grounded
            </span>
          </div>
          {message.confidence !== undefined && (
            <span className="text-[11px] font-mono text-slate-400">
              Match Confidence: {Math.round(message.confidence * 100)}%
            </span>
          )}
        </div>

        {/* Structured Steps if returned */}
        {message.steps && message.steps.length > 0 ? (
          <div className="space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Verified Troubleshooting Procedure:
            </div>
            {message.steps.map((step) => (
              <StepCard key={`${step.runbook_title}-${step.step_number}`} step={step} />
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
            {message.content}
          </div>
        )}

        {/* Source References */}
        {message.sources && message.sources.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1.5">
              <BookOpen className="w-3.5 h-3.5 text-sky-500" /> Grounded Source Documentation:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {message.sources.map((src) => (
                <button
                  key={src.runbook_id}
                  onClick={() => onViewRunbook && onViewRunbook(src)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  title="Click to view runbook details"
                >
                  <span>{src.runbook_title}</span>
                  {src.components && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">({src.components})</span>
                  )}
                  <ExternalLink className="w-3 h-3 text-slate-400 ml-0.5" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Follow-up Questions */}
        {message.suggested_followups && message.suggested_followups.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-500" /> Recommended Follow-ups:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {message.suggested_followups.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectQuery && onSelectQuery(q)}
                  className="text-xs px-2.5 py-1 rounded-full bg-slate-50 hover:bg-sky-50 dark:bg-slate-800/80 dark:hover:bg-sky-950/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-700 transition-all cursor-pointer text-left"
                >
                  {q} →
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
