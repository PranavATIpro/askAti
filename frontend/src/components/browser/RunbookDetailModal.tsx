import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Bot,
  AlertTriangle,
  Info,
  Terminal,
  Edit3,
  Trash2,
  Save,
  Plus,
  ArrowUp,
  ArrowDown,
  Loader2,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { Runbook, RunbookStep } from '../../types';
import { api } from '../../services/api';
import { CommandBlock } from '../chat/CommandBlock';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';

interface RunbookDetailModalProps {
  runbookId: string | null;
  onClose: () => void;
  onAskAboutRunbook?: (title: string) => void;
  onRunbookUpdated?: () => void;
}

export const RunbookDetailModal: React.FC<RunbookDetailModalProps> = ({
  runbookId,
  onClose,
  onAskAboutRunbook,
  onRunbookUpdated,
}) => {
  const [runbook, setRunbook] = useState<Runbook | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Runbook | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchDetail = () => {
    if (!runbookId) return;
    setLoading(true);
    setError(null);
    api
      .getRunbookById(runbookId)
      .then((data) => {
        setRunbook(data);
        setDraft(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveSuccess(false);
    fetchDetail();
  }, [runbookId]);

  if (!runbookId) return null;

  const handleStartEdit = () => {
    if (runbook) {
      // Deep clone to isolate local draft edits
      setDraft(JSON.parse(JSON.stringify(runbook)));
      setIsEditing(true);
      setError(null);
    }
  };

  const handleCancelEdit = () => {
    // Discard draft edits completely
    if (runbook) {
      setDraft(JSON.parse(JSON.stringify(runbook)));
    }
    setIsEditing(false);
    setError(null);
  };

  const handleDraftChange = (field: keyof Runbook, value: any) => {
    if (!draft) return;
    setDraft({ ...draft, [field]: value });
  };

  const handleStepChange = (index: number, field: keyof RunbookStep, value: any) => {
    if (!draft || !draft.steps) return;
    const updatedSteps = [...draft.steps];
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    setDraft({ ...draft, steps: updatedSteps });
  };

  const handleAddStep = () => {
    if (!draft) return;
    const currentSteps = draft.steps || [];
    const newStep: RunbookStep = {
      id: `new-${Date.now()}`,
      runbook_id: draft.id,
      step_number: currentSteps.length + 1,
      step_title: `Step ${currentSteps.length + 1}`,
      command: '',
      instruction: '',
      warning: '',
      notes: '',
      created_at: new Date().toISOString(),
    };
    setDraft({ ...draft, steps: [...currentSteps, newStep] });
  };

  const handleRemoveStep = (index: number) => {
    if (!draft || !draft.steps) return;
    const filtered = draft.steps.filter((_, i) => i !== index);
    const renumbered = filtered.map((s, idx) => ({ ...s, step_number: idx + 1 }));
    setDraft({ ...draft, steps: renumbered });
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (!draft || !draft.steps) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= draft.steps.length) return;

    const copy = [...draft.steps];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    const renumbered = copy.map((s, idx) => ({ ...s, step_number: idx + 1 }));
    setDraft({ ...draft, steps: renumbered });
  };

  const handleSaveChanges = async () => {
    if (!draft || !runbookId) return;
    if (!draft.title.trim()) {
      setError('Runbook Title cannot be empty.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = await api.updateRunbook(runbookId, {
        title: draft.title.trim(),
        description: draft.description || undefined,
        category: draft.category || undefined,
        product_area: draft.product_area || undefined,
        components: draft.components || undefined,
        form_type: draft.form_type || undefined,
        ticket_type: draft.ticket_type || undefined,
        source_url: draft.source_url || undefined,
        steps: (draft.steps || []).map((s, idx) => ({
          step_number: idx + 1,
          step_title: s.step_title || undefined,
          command: s.command || undefined,
          instruction: s.instruction || undefined,
          warning: s.warning || undefined,
          notes: s.notes || undefined,
        })),
      });

      setRunbook(updated);
      setDraft(updated);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);

      if (onRunbookUpdated) {
        onRunbookUpdated();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRunbook = async () => {
    if (!runbookId) return;
    setDeleting(true);
    try {
      await api.deleteRunbook(runbookId);
      if (onRunbookUpdated) {
        onRunbookUpdated();
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete runbook');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-sky-600 dark:text-sky-400 font-semibold block">
                {isEditing ? 'Editing Runbook' : 'Official ATI Operations Runbook'}
              </span>
              {isEditing && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Unsaved Draft
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {isEditing ? draft?.title || 'Edit Runbook' : runbook?.title || 'Loading runbook...'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && runbook && (
              <button
                onClick={handleStartEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                title="Edit runbook and steps manually"
              >
                <Edit3 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Edit Procedure</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {saveSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Runbook procedure and steps updated successfully in database!</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
              <span>Loading procedure steps from database...</span>
            </div>
          )}

          {/* EDIT MODE */}
          {isEditing && draft && (
            <div className="space-y-6 animate-in fade-in duration-100">
              {/* Draft Notice */}
              <div className="p-3 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/60 dark:bg-sky-950/30 text-xs text-sky-900 dark:text-sky-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-sky-600 shrink-0" />
                <span>
                  <strong>Manual Edit Mode:</strong> Modify instructions, commands, warnings, or add/delete steps. Changes will NOT take effect until you click <strong>Save Changes</strong> below.
                </span>
              </div>

              {/* Metadata Form */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Runbook Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="md:col-span-3">
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Runbook Title *
                    </label>
                    <input
                      type="text"
                      value={draft.title}
                      onChange={(e) => handleDraftChange('title', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={draft.category || ''}
                      onChange={(e) => handleDraftChange('category', e.target.value)}
                      placeholder="e.g. Software, Hardware"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Product Area
                    </label>
                    <input
                      type="text"
                      value={draft.product_area || ''}
                      onChange={(e) => handleDraftChange('product_area', e.target.value)}
                      placeholder="e.g. Map, Streamlit, Sensor"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Components
                    </label>
                    <input
                      type="text"
                      value={draft.components || ''}
                      onChange={(e) => handleDraftChange('components', e.target.value)}
                      placeholder="e.g. Lidar, Battery, Delfino"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Overview / Description
                    </label>
                    <textarea
                      rows={2}
                      value={draft.description || ''}
                      onChange={(e) => handleDraftChange('description', e.target.value)}
                      placeholder="Overview of when and why to execute this procedure..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Steps Manager */}
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Troubleshooting Steps ({draft.steps?.length || 0})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 text-xs font-medium hover:bg-sky-100 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Step</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {draft.steps && draft.steps.length > 0 ? (
                    draft.steps.map((step, idx) => (
                      <div
                        key={step.id || idx}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {step.step_number}
                            </span>
                            <input
                              type="text"
                              value={step.step_title || ''}
                              onChange={(e) => handleStepChange(idx, 'step_title', e.target.value)}
                              placeholder={`Step ${step.step_number} Title`}
                              className="px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold w-64 md:w-80"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveStep(idx, 'up')}
                              className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === draft.steps!.length - 1}
                              onClick={() => handleMoveStep(idx, 'down')}
                              className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 cursor-pointer"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveStep(idx)}
                              className="p-1 text-red-400 hover:text-red-600 cursor-pointer ml-1"
                              title="Delete Step"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                              Instruction / Procedure Checklist
                            </label>
                            <textarea
                              rows={2}
                              value={step.instruction || ''}
                              onChange={(e) => handleStepChange(idx, 'instruction', e.target.value)}
                              placeholder="Step instructions for the intern/technician..."
                              className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5 font-mono">
                              Terminal Command (optional)
                            </label>
                            <input
                              type="text"
                              value={step.command || ''}
                              onChange={(e) => handleStepChange(idx, 'command', e.target.value)}
                              placeholder="$ command --flag"
                              className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-900 text-sky-300 font-mono text-xs"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-medium text-amber-700 dark:text-amber-400 mb-0.5">
                                ⚠️ Safety Warning (optional)
                              </label>
                              <input
                                type="text"
                                value={step.warning || ''}
                                onChange={(e) => handleStepChange(idx, 'warning', e.target.value)}
                                placeholder="e.g. Warning text"
                                className="w-full px-2.5 py-1.5 rounded border border-amber-300 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 text-slate-900 dark:text-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                                ℹ️ Operational Notes (optional)
                              </label>
                              <input
                                type="text"
                                value={step.notes || ''}
                                onChange={(e) => handleStepChange(idx, 'notes', e.target.value)}
                                placeholder="Documentation notes"
                                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic">No steps added yet. Click "+ Add Step" to add one.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW MODE */}
          {!isEditing && runbook && (
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

              {runbook.description && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {runbook.description}
                </div>
              )}

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
                                Safety Warning
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
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
              >
                Cancel (Discard Changes)
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveChanges}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Changes</span>
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                >
                  Close
                </button>
                {!showDeleteConfirm && runbook && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                    title="Delete Runbook"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
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
            </>
          )}
        </div>
      </div>

      {/* Double-Check Permanent Deletion Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        itemName={runbook?.title || 'Runbook'}
        itemType="runbook and all associated steps"
        loading={deleting}
        onConfirm={handleDeleteRunbook}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};
