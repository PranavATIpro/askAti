import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { TroubleshootingStep } from '../../types';
import { CommandBlock } from './CommandBlock';

interface StepCardProps {
  step: TroubleshootingStep;
}

export const StepCard: React.FC<StepCardProps> = ({ step }) => {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 bg-white dark:bg-slate-900/60 shadow-sm space-y-2.5 transition-colors">
      <div className="flex items-start gap-2.5">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-bold text-xs shrink-0 mt-0.5">
          {step.step_number}
        </span>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
            {step.step_title || `Step ${step.step_number}`}
          </h4>
          {step.instruction && (
            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line mt-1 leading-relaxed">
              {step.instruction}
            </p>
          )}
        </div>
      </div>

      {step.command && (
        <div className="pl-8">
          <CommandBlock
            command={step.command}
            title={step.step_title ? `Command for ${step.step_title}` : undefined}
          />
        </div>
      )}

      {step.warning && (
        <div className="pl-8">
          <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold uppercase tracking-wider text-[10px] block text-amber-800 dark:text-amber-300">
                Operational Warning
              </span>
              <p className="mt-0.5 leading-relaxed">{step.warning}</p>
            </div>
          </div>
        </div>
      )}

      {step.notes && (
        <div className="pl-8">
          <div className="flex items-start gap-2 p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs">
            <Info className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold uppercase tracking-wider text-[10px] block text-slate-600 dark:text-slate-400">
                Documentation Notes
              </span>
              <p className="mt-0.5 leading-relaxed">{step.notes}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
