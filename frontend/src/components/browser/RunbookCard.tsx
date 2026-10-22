import React from 'react';
import { BookOpen, Layers, ArrowRight, ExternalLink } from 'lucide-react';
import { Runbook } from '../../types';

interface RunbookCardProps {
  runbook: Runbook;
  onSelect: (runbook: Runbook) => void;
  onAskRunbook?: (title: string) => void;
}

export const RunbookCard: React.FC<RunbookCardProps> = ({ runbook, onSelect, onAskRunbook }) => {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900/80 hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-xs transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900">
              <BookOpen className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {runbook.ticket_type || 'Procedure'}
            </span>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {runbook.steps_count} {runbook.steps_count === 1 ? 'step' : 'steps'}
          </span>
        </div>

        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-2.5 leading-snug">
          {runbook.title}
        </h3>

        {runbook.description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {runbook.description}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5 mt-3">
          {runbook.product_area && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
              Area: {runbook.product_area}
            </span>
          )}
          {runbook.category && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
              Category: {runbook.category}
            </span>
          )}
          {runbook.components && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 font-medium">
              {runbook.components}
            </span>
          )}
        </div>
      </div>

      <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
        <button
          onClick={() => onSelect(runbook)}
          className="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium inline-flex items-center gap-1 cursor-pointer"
        >
          <span>View Procedures</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {onAskRunbook && (
          <button
            onClick={() => onAskRunbook(runbook.title)}
            className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            Ask Assistant
          </button>
        )}
      </div>
    </div>
  );
};
