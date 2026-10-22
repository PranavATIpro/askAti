import React, { useState, useEffect } from 'react';
import { Upload, FileText, Database, CheckCircle, AlertTriangle, RefreshCw, Loader2, ShieldCheck, Clock } from 'lucide-react';
import { api } from '../../services/api';
import { IngestionJob, IngestionPreviewResponse } from '../../types';
import { ImportPreviewModal } from './ImportPreviewModal';

export const IngestionAdmin: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [fileType, setFileType] = useState<'csv' | 'markdown'>('csv');
  const [preview, setPreview] = useState<IngestionPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchJobs = () => {
    setJobsLoading(true);
    api
      .getIngestionJobs()
      .then((res) => setJobs(res.jobs))
      .catch((err) => console.error(err))
      .finally(() => setJobsLoading(false));
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      if (f.name.endsWith('.md')) {
        setFileType('markdown');
      } else if (f.name.endsWith('.csv')) {
        setFileType('csv');
      }
    }
  };

  const handlePreview = async () => {
    if (!file && !rawText.trim()) return;
    setPreviewLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    } else {
      formData.append('raw_content', rawText);
    }
    formData.append('file_type', fileType);

    try {
      const res = await api.previewIngestion(formData);
      setPreview(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse export file');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!file && !rawText.trim()) return;
    setCommitLoading(true);
    setErrorMessage(null);

    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    } else {
      formData.append('raw_content', rawText);
    }
    formData.append('file_type', fileType);

    try {
      const res = await api.commitIngestion(formData);
      setSuccessMessage(
        `Import completed: ${res.records_created} runbooks created, ${res.records_updated} updated, ${res.records_skipped} skipped/duplicate.`
      );
      setPreview(null);
      setFile(null);
      setRawText('');
      fetchJobs();
    } catch (err: any) {
      setErrorMessage(err.message || 'Import commit failed');
    } finally {
      setCommitLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto p-4 md:p-8 space-y-8">
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-sky-600 dark:text-sky-400 font-semibold block">
            System Administration
          </span>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-2">
            <Database className="w-5 h-5 text-sky-600" />
            <span>Notion Runbook Ingestion Pipeline</span>
          </h2>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Admin Access Verified</span>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Upload & Ingestion Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Import Notion Database Export
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Upload approved CSV exports or Markdown files directly exported from the ATI Notion runbook database.
            The pipeline sanitizes multi-select properties, normalizes step numbers, and ensures duplicate-safe upserts.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <label className="font-semibold text-slate-700 dark:text-slate-300">Format:</label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="fileType"
              value="csv"
              checked={fileType === 'csv'}
              onChange={() => setFileType('csv')}
              className="text-sky-600"
            />
            <span>Notion CSV Export</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="fileType"
              value="markdown"
              checked={fileType === 'markdown'}
              onChange={() => setFileType('markdown')}
              className="text-sky-600"
            />
            <span>Notion Markdown (.md)</span>
          </label>
        </div>

        {/* File Drop Area */}
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-400 dark:hover:border-sky-600 rounded-xl p-8 text-center transition-colors">
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {file ? file.name : 'Select or drag & drop Notion export file'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Accepts .csv and .md files</p>
          <input
            type="file"
            accept=".csv,.md"
            onChange={handleFileChange}
            className="hidden"
            id="notion-file-upload"
          />
          <label
            htmlFor="notion-file-upload"
            className="mt-3 inline-block px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
          >
            Browse Files
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {file && (
            <button
              onClick={() => setFile(null)}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Clear
            </button>
          )}
          <button
            onClick={handlePreview}
            disabled={(!file && !rawText.trim()) || previewLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            <span>Preview & Validate Import</span>
          </button>
        </div>
      </div>

      {/* Ingestion Jobs Audit Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Ingestion Job Audit History
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Audit log of previous Notion imports and synchronization operations
            </p>
          </div>
          <button
            onClick={fetchJobs}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
            title="Refresh job list"
          >
            <RefreshCw className={`w-4 h-4 ${jobsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-medium">
              <tr>
                <th className="p-3">Job ID</th>
                <th className="p-3">Source Type</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created</th>
                <th className="p-3">Updated</th>
                <th className="p-3">Skipped</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {jobs.length > 0 ? (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-mono text-[11px] text-slate-500">{job.id.slice(0, 8)}...</td>
                    <td className="p-3 uppercase font-semibold text-[10px] text-slate-600 dark:text-slate-300">
                      {job.source_type}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          job.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-emerald-600 font-medium">{job.records_created}</td>
                    <td className="p-3 font-mono text-sky-600 font-medium">{job.records_updated}</td>
                    <td className="p-3 font-mono text-slate-400">{job.records_skipped}</td>
                    <td className="p-3 text-slate-500 text-[11px]">
                      {new Date(job.started_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400 text-xs italic">
                    No ingestion jobs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Validation Preview Modal */}
      <ImportPreviewModal
        preview={preview}
        loading={commitLoading}
        onClose={() => setPreview(null)}
        onCommit={handleCommit}
      />
    </div>
  );
};
