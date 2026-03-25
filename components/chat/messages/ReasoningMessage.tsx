'use client';

import { useState } from 'react';
import type { Message } from '../ChatMessage';

interface Props {
  message: Message;
}

export default function ReasoningMessage({ message }: Props) {
  const [expanded, setExpanded] = useState(false);
  const content: string = message.data?.content ?? message.content ?? '';
  const preview = content.length > 110 ? content.slice(0, 110).replace(/\n/g, ' ') + '…' : content;

  return (
    <div className="flex justify-start mb-1">
      <div className="max-w-[88%] rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shadow-sm">
        {/* Clickable header */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-100 border-b border-slate-200 hover:bg-slate-200 transition-colors text-left"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs">💭</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Reasoning
            </span>
          </div>
          <span className="text-[10px] text-slate-400 shrink-0 ml-2">
            {expanded ? '▲ hide' : '▼ show'}
          </span>
        </button>

        {/* Collapsed preview */}
        {!expanded && (
          <div className="px-3 py-2">
            <p className="text-[11px] text-slate-500 italic leading-relaxed">{preview}</p>
          </div>
        )}

        {/* Expanded full content */}
        {expanded && (
          <div className="px-3 py-2 max-h-64 overflow-y-auto">
            <p className="text-[11px] text-slate-600 whitespace-pre-wrap leading-relaxed">{content}</p>
          </div>
        )}
      </div>
    </div>
  );
}
