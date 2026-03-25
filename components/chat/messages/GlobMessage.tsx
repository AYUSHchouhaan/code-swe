'use client';

import type { Message } from '../ChatMessage';

interface Props {
  message: Message;
}

export default function GlobMessage({ message }: Props) {
  const patterns: string[] = message.data?.patterns ?? [];
  const files: string[] = message.data?.files ?? [];
  const count = files.length;

  return (
    <div className="flex justify-start mb-1">
      <div className="max-w-[88%] rounded-xl border border-violet-200 bg-violet-50 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-violet-100 border-b border-violet-200">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">🔎</span>
            <span className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">
              Glob Search
            </span>
          </div>
          <span className="text-[10px] font-mono font-semibold text-violet-500 bg-violet-200 px-2 py-0.5 rounded-full">
            {count > 0 ? `${count} file${count !== 1 ? 's' : ''}` : 'no match'}
          </span>
        </div>

        {/* Patterns */}
        <div className="px-3 pt-2 pb-1.5">
          <p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wider mb-1">
            Patterns
          </p>
          <div className="flex flex-wrap gap-1">
            {patterns.map((p, i) => (
              <span
                key={i}
                className="font-mono text-[11px] bg-white text-violet-700 px-2 py-0.5 rounded border border-violet-200 shadow-sm"
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* Matched files */}
        {files.length > 0 && (
          <div className="px-3 pb-2 border-t border-violet-100 mt-1">
            <p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wider mt-1.5 mb-1">
              Matched Files
            </p>
            <ul className="space-y-0.5 max-h-36 overflow-y-auto pr-1">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-1 font-mono text-[11px] text-violet-800">
                  <span className="text-violet-300 shrink-0">›</span>
                  <span className="truncate">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {files.length === 0 && (
          <div className="px-3 pb-2">
            <p className="text-[11px] text-violet-400 italic">No files matched.</p>
          </div>
        )}
      </div>
    </div>
  );
}
