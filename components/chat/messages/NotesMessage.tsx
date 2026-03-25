'use client';

import { useState } from 'react';
import type { Message } from '../ChatMessage';

interface Props {
  message: Message;
}

export default function NotesMessage({ message }: Props) {
  const [expanded, setExpanded] = useState(false);
  const notes: string = message.data?.notes ?? message.content ?? '';

  return (
    <div className="flex justify-start mb-1">
      <div className="max-w-[88%] rounded-xl border border-teal-200 bg-teal-50 overflow-hidden shadow-sm">
        {/* Clickable header */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-1.5 bg-teal-100 border-b border-teal-200 hover:bg-teal-200 transition-colors text-left"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs">📝</span>
            <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">
              Context Notes
            </span>
          </div>
          <span className="text-[10px] text-teal-400 shrink-0 ml-2">
            {expanded ? '▲ collapse' : '▼ expand'}
          </span>
        </button>

        {/* Collapsed — show first two lines */}
        {!expanded && (
          <div className="px-3 py-2">
            <p className="text-[11px] text-teal-600 italic line-clamp-2 leading-relaxed">
              {notes}
            </p>
          </div>
        )}

        {/* Expanded full notes */}
        {expanded && (
          <div className="px-3 py-3 max-h-52 overflow-y-auto">
            <p className="text-[11px] text-teal-800 whitespace-pre-wrap leading-relaxed">{notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
