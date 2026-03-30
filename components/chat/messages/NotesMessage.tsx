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
    <div className="mb-1 text-xs text-gray-500">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 hover:text-gray-700 transition-colors"
      >
        <span>📝</span>
        <span className="font-medium">Context Notes</span>
        <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <p className="mt-1 pl-5 text-gray-500 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{notes}</p>
      )}
    </div>
  );
}
