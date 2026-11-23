import React, { useState } from 'react';
import { X, UploadCloud, CheckCircle2, AlertTriangle, Loader2, FileText, Database } from 'lucide-react';
import { api } from '../../services/api';

interface SyncNotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncCompleted: () => void;
}

export const SyncNotionModal: React.FC<SyncNotionModalProps> = ({
  isOpen,
  onClose,
  onSyncCompleted,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    records_created: number;
    records_updated: number;
    records_skipped: number;
    total_runbooks: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleSync = async () => {
    if (!file) {
      setError('Please select an exported Notion CSV file.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.syncNotionCSV(file);
      setResult(res);
      onSyncCompleted();
    } catch (err: any) {
      setError(err.message || 'Sync failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Sync Notion Knowledge Base
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload updated Notion CSV export to synchronize the database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Knowledge Base Synchronized Successfully!</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                  <span className="block font-bold text-emerald-600">{result.records_created}</span>
                  <span className="text-[10px] text-slate-500">Created</span>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                  <span className="block font-bold text-sky-600">{result.records_updated}</span>
                  <span className="text-[10px] text-slate-500">Updated</span>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                  <span className="block font-bold text-slate-600 dark:text-slate-400">{result.records_skipped}</span>
                  <span className="text-[10px] text-slate-500">Unchanged</span>
                </div>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                Total runbooks now active in PostgreSQL: <strong>{result.total_runbooks}</strong>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 dark:hover:border-sky-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/50 dark:bg-slate-950/30 transition-colors">
                <UploadCloud className="w-8 h-8 text-slate-400" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {file ? file.name : 'Click to select exported Notion CSV'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports Notion database export (.csv)'}
                </span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <div className="p-3 rounded-lg bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 text-xs text-sky-900 dark:text-sky-300 leading-relaxed">
                <span className="font-semibold block mb-0.5">Automated Idempotent Sync:</span>
                Whenever Notion is updated, export the CSV and drop it here. Matching runbooks are automatically updated with new steps, new runbooks are created, and existing identical ones are preserved without duplicates.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
          >
            {result ? 'Done' : 'Cancel'}
          </button>
          {!result && (
            <button
              onClick={handleSync}
              disabled={!file || loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              <span>Sync Now</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
