import React, { useState, useEffect } from 'react';
import { X, Sparkles, Zap, ShieldCheck, Cpu, ExternalLink, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

interface LLMModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModelUpdated: (label: string) => void;
}

export const LLMModelModal: React.FC<LLMModelModalProps> = ({ isOpen, onClose, onModelUpdated }) => {
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'groq' | 'local_grounded' | 'ollama'>('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-1.5-flash');
  const [groqKey, setGroqKey] = useState('');
  const [groqModel, setGroqModel] = useState('llama-3.3-70b-versatile');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3.2');
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getLLMProviders().then((res) => {
        const prov = res.active.provider;
        if (prov === 'gemini' || prov === 'groq' || prov === 'ollama') {
          setSelectedProvider(prov);
        } else {
          setSelectedProvider('local_grounded');
        }
      }).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setLoading(true);
    setSavedSuccess(false);
    try {
      const res = await api.updateLLMSettings({
        provider: selectedProvider,
        gemini_api_key: geminiKey,
        gemini_model: geminiModel,
        groq_api_key: groqKey,
        groq_model: groqModel,
        ollama_base_url: ollamaUrl,
        ollama_model: ollamaModel,
      });
      setSavedSuccess(true);
      onModelUpdated(res.active_provider.label);
      setTimeout(() => {
        onClose();
        setSavedSuccess(false);
      }, 1000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                RAG LLM Engine Settings
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure the free AI model powering the Robotics Runbook Assistant
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Model settings updated successfully! Active for all new queries.</span>
            </div>
          )}

          {/* Option 1: Google Gemini (Recommended Free) */}
          <div
            onClick={() => setSelectedProvider('gemini')}
            className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
              selectedProvider === 'gemini'
                ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 ring-1 ring-sky-500'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/60 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Google Gemini 1.5 / 2.0 Flash
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Recommended • Free Tier
                </span>
              </div>
              <input
                type="radio"
                name="llm_provider"
                checked={selectedProvider === 'gemini'}
                onChange={() => setSelectedProvider('gemini')}
                className="text-sky-600"
              />
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              Google's fastest multimodal model. 1M token context, rapid JSON reasoning, 100% free via Google AI Studio (15 RPM free).
            </p>

            {selectedProvider === 'gemini' && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5" onClick={(e) => e.stopPropagation()}>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Google AI Studio API Key (Free):
                    </label>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-sky-600 hover:underline inline-flex items-center gap-1"
                    >
                      Get free key in 30 seconds <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy... (leave blank to keep current server key)"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Model:</span>
                  <select
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="gemini-1.5-flash">gemini-1.5-flash (Fastest & Free)</option>
                    <option value="gemini-2.0-flash">gemini-2.0-flash (Newest Experimental)</option>
                    <option value="gemini-1.5-pro">gemini-1.5-pro (Deep reasoning)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Option 2: Local Grounded Engine (Free / Built-in / Zero-Config) */}
          <div
            onClick={() => setSelectedProvider('local_grounded')}
            className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
              selectedProvider === 'local_grounded'
                ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 ring-1 ring-sky-500'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/60 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Local Grounded Engine
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                  No Keys Needed • Always Works
                </span>
              </div>
              <input
                type="radio"
                name="llm_provider"
                checked={selectedProvider === 'local_grounded'}
                onChange={() => setSelectedProvider('local_grounded')}
                className="text-sky-600"
              />
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              Deterministic grounded RAG engine built directly into the application. Uses PostgreSQL BM25 + dense token ranking. Zero latency, 100% private, works offline with zero configuration.
            </p>
          </div>

          {/* Option 3: Groq Cloud (Free Tier) */}
          <div
            onClick={() => setSelectedProvider('groq')}
            className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
              selectedProvider === 'groq'
                ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 ring-1 ring-sky-500'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/60 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Groq Cloud (Llama 3.3 70B)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Ultra-Fast • Free Tier
                </span>
              </div>
              <input
                type="radio"
                name="llm_provider"
                checked={selectedProvider === 'groq'}
                onChange={() => setSelectedProvider('groq')}
                className="text-sky-600"
              />
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              Sub-second inference speed powered by LPU silicon. Uses Meta's flagship Llama 3.3 70B open model.
            </p>

            {selectedProvider === 'groq' && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Groq API Key (Free):
                  </label>
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-sky-600 hover:underline inline-flex items-center gap-1"
                  >
                    Get free Groq key <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input
                  type="password"
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  placeholder="gsk_... (leave blank to keep current server key)"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>
            )}
          </div>

          {/* Option 4: Ollama (Offline / Private) */}
          <div
            onClick={() => setSelectedProvider('ollama')}
            className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
              selectedProvider === 'ollama'
                ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 ring-1 ring-sky-500'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/60 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-500" />
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Ollama (Offline / Private)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  Self-Hosted
                </span>
              </div>
              <input
                type="radio"
                name="llm_provider"
                checked={selectedProvider === 'ollama'}
                onChange={() => setSelectedProvider('ollama')}
                className="text-sky-600"
              />
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              Run models locally (e.g. `llama3.2`, `qwen2.5`, `mistral`) for air-gapped robotics sites with no outbound internet traffic.
            </p>

            {selectedProvider === 'ollama' && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5" onClick={(e) => e.stopPropagation()}>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Ollama Base URL:
                    </label>
                    <input
                      type="text"
                      value={ollamaUrl}
                      onChange={(e) => setOllamaUrl(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Model Name:
                    </label>
                    <input
                      type="text"
                      value={ollamaModel}
                      onChange={(e) => setOllamaModel(e.target.value)}
                      placeholder="llama3.2"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Save & Apply RAG Model</span>
          </button>
        </div>
      </div>
    </div>
  );
};
