'use client';

import type { Message } from '../ChatMessage';

interface Props {
  message: Message;
}

export default function ConclusionMessage({ message }: Props) {
  const summary: string = message.data?.summary ?? message.content ?? '';

  return (
    <div className="flex justify-start mb-2">
        <div className="max-w-[92%] rounded-xl border border-amber-300 bg-linear-to-br from-amber-50 to-yellow-50 overflow-hidden shadow-md">
        {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-linear-to-r from-amber-200 to-yellow-200 border-b border-amber-300">
          <div className="flex items-center gap-2">
            <span className="text-base">🎉</span>
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-widest">
              All Done!
            </span>
          </div>
          <span className="text-[10px] font-mono font-semibold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
            Complete
          </span>
        </div>

        {/* Summary */}
        <div className="px-4 py-3">
          <p className="text-xs text-amber-900 leading-relaxed whitespace-pre-wrap">{summary}</p>
        </div>
      </div>
    </div>
  );
}
