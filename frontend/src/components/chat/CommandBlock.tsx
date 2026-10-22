import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface CommandBlockProps {
  command: string;
  title?: string | null;
  instruction?: string | null;
}

export const CommandBlock: React.FC<CommandBlockProps> = ({ command, title, instruction }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy command:', err);
    }
  };

  return (
    <div className="my-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/90 border-b border-slate-700/80 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold text-slate-300">{title || 'Operational Command'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 transition-all cursor-pointer"
          title="Copy command to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-300" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3 overflow-x-auto font-mono text-xs leading-relaxed text-sky-300 select-all">
        <code>{command}</code>
      </div>
      {instruction && (
        <div className="px-3 py-1.5 text-xs text-slate-400 bg-slate-950/60 border-t border-slate-800">
          <span className="font-medium text-slate-300">Purpose: </span>{instruction}
        </div>
      )}
    </div>
  );
};
