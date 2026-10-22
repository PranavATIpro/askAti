import React, { useState, useEffect } from 'react';
import { Search, Filter, Loader2, BookOpen, Layers, RefreshCw } from 'lucide-react';
import { Runbook, RunbookListResponse } from '../../types';
import { api } from '../../services/api';
import { RunbookCard } from './RunbookCard';
import { RunbookDetailModal } from './RunbookDetailModal';

interface RunbookBrowserProps {
  onAskAboutRunbook: (title: string) => void;
}

export const RunbookBrowser: React.FC<RunbookBrowserProps> = ({ onAskAboutRunbook }) => {
  const [data, setData] = useState<RunbookListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProductArea, setSelectedProductArea] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTicketType, setSelectedTicketType] = useState('All');
  const [activeRunbookId, setActiveRunbookId] = useState<string | null>(null);

  const fetchRunbooks = () => {
    setLoading(true);
    api
      .getRunbooks({
        q: search || undefined,
        product_area: selectedProductArea !== 'All' ? selectedProductArea : undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        ticket_type: selectedTicketType !== 'All' ? selectedTicketType : undefined,
      })
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRunbooks();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, selectedProductArea, selectedCategory, selectedTicketType]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Top Filter and Search Bar */}
      <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-sky-600" />
              <span>Operational Runbook Knowledge Base</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Structured procedures imported from Notion database ({data?.total || 0} runbooks available)
            </p>
          </div>
          <button
            onClick={fetchRunbooks}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh runbooks"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Search & Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search runbooks, commands, components..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <select
              value={selectedProductArea}
              onChange={(e) => setSelectedProductArea(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            >
              <option value="All">Product Area: All</option>
              {data?.product_areas?.map((pa) => (
                <option key={pa} value={pa}>
                  {pa}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            >
              <option value="All">Category: All</option>
              {data?.categories?.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedTicketType}
              onChange={(e) => setSelectedTicketType(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            >
              <option value="All">Ticket Type: All</option>
              {data?.ticket_types?.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Runbook Grid Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
            <span>Loading runbook database...</span>
          </div>
        ) : data && data.items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.items.map((rb) => (
              <RunbookCard
                key={rb.id}
                runbook={rb}
                onSelect={(selected) => setActiveRunbookId(selected.id)}
                onAskRunbook={onAskAboutRunbook}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No matching runbooks found</p>
            <p className="text-xs text-slate-500">
              Try adjusting your search keywords or resetting product area and category filters.
            </p>
          </div>
        )}
      </div>

      {/* Runbook Detail Drawer */}
      <RunbookDetailModal
        runbookId={activeRunbookId}
        onClose={() => setActiveRunbookId(null)}
        onAskAboutRunbook={onAskAboutRunbook}
      />
    </div>
  );
};
