import React, { useState } from 'react';
import { X, Plus, Trash2, ArrowUp, ArrowDown, Save, Loader2, BookOpen, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';

interface CreateRunbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunbookCreated: () => void;
}

interface StepDraft {
  step_number: number;
  step_title: string;
  command: string;
  instruction: string;
  warning: string;
  notes: string;
}

export const CreateRunbookModal: React.FC<CreateRunbookModalProps> = ({
  isOpen,
  onClose,
  onRunbookCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Software');
  const [productArea, setProductArea] = useState('Map');
  const [components, setComponents] = useState('');
  const [ticketType, setTicketType] = useState('Incident');
  const [formType, setFormType] = useState('Default Ticket Form');
  const [sourceUrl, setSourceUrl] = useState('');

  const [steps, setSteps] = useState<StepDraft[]>([
    {
      step_number: 1,
      step_title: '',
      command: '',
      instruction: '',
      warning: '',
      notes: '',
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        step_number: prev.length + 1,
        step_title: '',
        command: '',
        instruction: '',
        warning: '',
        notes: '',
      },
    ]);
  };

  const handleRemoveStep = (index: number) => {
    setSteps((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((s, idx) => ({ ...s, step_number: idx + 1 }));
    });
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    setSteps((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy.map((s, idx) => ({ ...s, step_number: idx + 1 }));
    });
  };

  const handleStepChange = (index: number, field: keyof StepDraft, value: string) => {
    setSteps((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Runbook Title is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await api.createRunbook({
        title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        product_area: productArea.trim() || undefined,
        components: components.trim() || undefined,
        ticket_type: ticketType.trim() || undefined,
        form_type: formType.trim() || undefined,
        source_url: sourceUrl.trim() || undefined,
        steps: steps.map((s, idx) => ({
          step_number: idx + 1,
          step_title: s.step_title.trim() || undefined,
          command: s.command.trim() || undefined,
          instruction: s.instruction.trim() || undefined,
          warning: s.warning.trim() || undefined,
          notes: s.notes.trim() || undefined,
        })),
      });

      onRunbookCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create runbook');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Create New Operational Runbook
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add an operational troubleshooting procedure with ordered steps and verified commands
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Metadata */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Runbook Metadata
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="md:col-span-2">
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Runbook Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Map Generation, Lidar Frame Recovery, Motor CAN Debug"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="Software">Software</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Network">Network</option>
                  <option value="Diagnostics">Diagnostics</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Product Area
                </label>
                <input
                  type="text"
                  value={productArea}
                  onChange={(e) => setProductArea(e.target.value)}
                  placeholder="e.g. Map, Streamlit, Sensor, Motors, Navigation"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Components
                </label>
                <input
                  type="text"
                  value={components}
                  onChange={(e) => setComponents(e.target.value)}
                  placeholder="e.g. Lidar, Battery, Wheel Calibration, Delfino Board"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Ticket Type
                </label>
                <input
                  type="text"
                  value={ticketType}
                  onChange={(e) => setTicketType(e.target.value)}
                  placeholder="e.g. Incident, Knowlege, Problem"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description / Overview
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summary of what this runbook diagnoses and when engineers should execute it..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Ordered Steps Manager */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Ordered Troubleshooting Steps ({steps.length})
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
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center">
                        {step.step_number}
                      </span>
                      <input
                        type="text"
                        value={step.step_title}
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
                        disabled={idx === steps.length - 1}
                        onClick={() => handleMoveStep(idx, 'down')}
                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={steps.length <= 1}
                        onClick={() => handleRemoveStep(idx)}
                        className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30 cursor-pointer ml-1"
                        title="Delete Step"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                        Instructions / Procedure
                      </label>
                      <textarea
                        rows={2}
                        value={step.instruction}
                        onChange={(e) => handleStepChange(idx, 'instruction', e.target.value)}
                        placeholder="Detailed instructions for the intern/technician..."
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5 font-mono">
                        Terminal Command (optional)
                      </label>
                      <input
                        type="text"
                        value={step.command}
                        onChange={(e) => handleStepChange(idx, 'command', e.target.value)}
                        placeholder="$ docker restart mule"
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
                          value={step.warning}
                          onChange={(e) => handleStepChange(idx, 'warning', e.target.value)}
                          placeholder="e.g. Ensure emergency stop is pressed before proceeding"
                          className="w-full px-2.5 py-1.5 rounded border border-amber-300 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                          ℹ️ Operational Notes (optional)
                        </label>
                        <input
                          type="text"
                          value={step.notes}
                          onChange={(e) => handleStepChange(idx, 'notes', e.target.value)}
                          placeholder="Tips, log file locations, or parameter values"
                          className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Save & Cancel Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save & Commit Runbook</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
