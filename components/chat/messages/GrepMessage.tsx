'use client';

import type { Message } from '../ChatMessage';

interface Props {
  message: Message;
}

export default function GrepMessage({ message }: Props) {
  const query: string = message.data?.query ?? message.content;
  const files: string[] = message.data?.files ?? [];
  const count = files.length;

  return (
    <div className="flex justify-start mb-1">
      <div className="max-w-[88%] rounded-xl border border-sky-200 bg-sky-50 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-sky-100 border-b border-sky-200">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">🔍</span>
            <span className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">
              Grep Search
            </span>
          </div>
          <span className="text-[10px] font-mono font-semibold text-sky-500 bg-sky-200 px-2 py-0.5 rounded-full">
            {count > 0 ? `${count} file${count !== 1 ? 's' : ''}` : 'no match'}
          </span>
        </div>

        {/* Query */}
        <div className="px-3 pt-2 pb-1.5">
          <p className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider mb-1">
            Query
          </p>
          <div className="font-mono text-xs text-sky-800 bg-white px-2.5 py-1.5 rounded border border-sky-200 shadow-sm">
            <span className="text-sky-400 mr-1">"</span>
            {query}
            <span className="text-sky-400 ml-1">"</span>
          </div>
        </div>

        {/* Matched files */}
        {files.length > 0 && (
          <div className="px-3 pb-2 border-t border-sky-100 mt-1">
            <p className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider mt-1.5 mb-1">
              Matched In
            </p>
            <ul className="space-y-0.5 max-h-36 overflow-y-auto pr-1">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-1 font-mono text-[11px] text-sky-800">
                  <span className="text-sky-300 shrink-0">›</span>
                  <span className="truncate">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {files.length === 0 && (
          <div className="px-3 pb-2">
            <p className="text-[11px] text-sky-400 italic">No matches found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
