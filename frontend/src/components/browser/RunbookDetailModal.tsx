import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Bot, AlertTriangle, Info, Terminal, Calendar, Hash, Check } from 'lucide-react';
import { Runbook } from '../../types';
import { api } from '../../services/api';
import { CommandBlock } from '../chat/CommandBlock';

interface RunbookDetailModalProps {
  runbookId: string | null;
  onClose: () => void;
  onAskAboutRunbook?: (title: string) => void;
}

export const RunbookDetailModal: React.FC<RunbookDetailModalProps> = ({
  runbookId,
  onClose,
  onAskAboutRunbook,
}) => {
  const [runbook, setRunbook] = useState<Runbook | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runbookId) return;
    setLoading(true);
    setError(null);
    api
      .getRunbookById(runbookId)
      .then((data) => setRunbook(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [runbookId]);

  if (!runbookId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-sky-600 dark:text-sky-400 font-semibold block">
              Official ATI Operations Runbook
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {runbook?.title || 'Loading runbook...'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="py-12 text-center text-sm text-slate-500">
              Loading procedure steps from database...
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {runbook && (
            <>
              {/* Metadata Badges */}
              <div className="flex flex-wrap gap-2 text-xs">
                {runbook.product_area && (
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    Area: {runbook.product_area}
                  </span>
                )}
                {runbook.category && (
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    Category: {runbook.category}
                  </span>
                )}
                {runbook.ticket_type && (
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    Type: {runbook.ticket_type}
                  </span>
                )}
                {runbook.components && (
                  <span className="px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 font-medium border border-sky-200 dark:border-sky-800">
                    Component: {runbook.components}
                  </span>
                )}
                {runbook.source_url && (
                  <a
                    href={runbook.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                  >
                    <span>Notion Source</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Steps List */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Ordered Troubleshooting Steps ({runbook.steps?.length || 0})
                </h4>

                {runbook.steps && runbook.steps.length > 0 ? (
                  runbook.steps.map((step) => (
                    <div
                      key={step.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-bold text-xs shrink-0 mt-0.5">
                          {step.step_number}
                        </span>
                        <div className="flex-1">
                          <h5 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {step.step_title || `Step ${step.step_number}`}
                          </h5>
                          {step.instruction && (
                            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line mt-1 leading-relaxed">
                              {step.instruction}
                            </p>
                          )}
                        </div>
                      </div>

                      {step.command && (
                        <div className="pl-10">
                          <CommandBlock command={step.command} />
                        </div>
                      )}

                      {step.warning && (
                        <div className="pl-10">
                          <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold uppercase tracking-wider text-[10px] block">
                                Warning
                              </span>
                              <p className="mt-0.5 leading-relaxed">{step.warning}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {step.notes && (
                        <div className="pl-10">
                          <div className="flex items-start gap-2 p-2.5 rounded-md bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs">
                            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold uppercase tracking-wider text-[10px] block">
                                Operational Notes
                              </span>
                              <p className="mt-0.5 leading-relaxed">{step.notes}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">No detailed steps documented for this runbook.</p>
                )}
              </div>

              {/* Audit info */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Source Hash: {runbook.content_hash?.slice(0, 16)}...</span>
                <span>Last Updated: {new Date(runbook.updated_at).toLocaleDateString()}</span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
          >
            Close
          </button>
          {runbook && onAskAboutRunbook && (
            <button
              onClick={() => {
                onAskAboutRunbook(runbook.title);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Ask Assistant About This</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
