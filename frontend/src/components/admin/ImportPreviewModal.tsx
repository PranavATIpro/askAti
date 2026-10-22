import React from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, FileText, ArrowRight, Loader2 } from 'lucide-react';
import { IngestionPreviewResponse } from '../../types';

interface ImportPreviewModalProps {
  preview: IngestionPreviewResponse | null;
  loading: boolean;
  onClose: () => void;
  onCommit: () => void;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  preview,
  loading,
  onClose,
  onCommit,
}) => {
  if (!preview) return null;

  const { summary, sample_rows, runbook_titles } = preview;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-sky-600 dark:text-sky-400 font-semibold block">
              Validation & Ingestion Preview
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Runbook Import Pre-Flight Report
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
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
              <span className="text-xs text-slate-500 block">Total Rows</span>
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                {summary.total_rows_parsed}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30">
              <span className="text-xs text-emerald-700 dark:text-emerald-300 block">Valid Steps</span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                {summary.valid_rows}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30">
              <span className="text-xs text-amber-700 dark:text-amber-300 block">Skipped / Template Rows</span>
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
                {summary.skipped_rows}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/30">
              <span className="text-xs text-sky-700 dark:text-sky-300 block">Runbooks Grouped</span>
              <span className="text-xl font-bold text-sky-600 dark:text-sky-400 mt-1 block">
                {summary.runbooks_identified}
              </span>
            </div>
          </div>

          {/* Validation warnings if any */}
          {summary.validation_issues.length > 0 && (
            <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Validation Warnings Detected</span>
              </div>
              <ul className="list-disc pl-5 space-y-1">
                {summary.validation_issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Runbook Titles identified */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Recognized Runbooks ({runbook_titles.length})
            </h4>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
              {runbook_titles.map((title, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  {title}
                </span>
              ))}
            </div>
          </div>

          {/* Sample Rows Preview Table */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Parsed Row Sample ({sample_rows.length} rows previewed)
            </h4>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-medium">
                  <tr>
                    <th className="p-2.5">Row</th>
                    <th className="p-2.5">Runbook</th>
                    <th className="p-2.5">Step</th>
                    <th className="p-2.5">Command Preview</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sample_rows.map((row) => (
                    <tr
                      key={row.row_index}
                      className={
                        row.status === 'skipped'
                          ? 'bg-slate-50/50 dark:bg-slate-950/40 text-slate-400'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }
                    >
                      <td className="p-2.5 font-mono">{row.row_index}</td>
                      <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">
                        {row.runbook_title || '<Blank Title>'}
                      </td>
                      <td className="p-2.5 font-mono">{row.step_number || '-'}</td>
                      <td className="p-2.5 font-mono text-[11px] max-w-xs truncate text-sky-600 dark:text-sky-400">
                        {row.command_preview || row.instruction_preview || '-'}
                      </td>
                      <td className="p-2.5">
                        {row.status === 'valid' && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" /> Valid
                          </span>
                        )}
                        {row.status === 'skipped' && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            <AlertCircle className="w-3.5 h-3.5" /> Skipped
                          </span>
                        )}
                        {row.status === 'warning' && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" /> Warning
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onCommit}
            disabled={loading || summary.valid_rows === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            <span>Commit Idempotent Import</span>
          </button>
        </div>
      </div>
    </div>
  );
};
