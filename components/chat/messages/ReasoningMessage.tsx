'use client';

import { useState } from 'react';
import type { Message } from '../ChatMessage';

interface Props {
  message: Message;
}

export default function ReasoningMessage({ message }: Props) {
  const [expanded, setExpanded] = useState(false);
  const content: string = message.data?.content ?? message.content ?? '';
  const preview = content.length > 120 ? content.slice(0, 120).replace(/\n/g, ' ') + '…' : content;

  return (
    <div className="mb-1 text-xs text-gray-500">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 hover:text-gray-700 transition-colors"
      >
        <span>💭</span>
        <span className="font-medium">Reasoning</span>
        <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
      </button>
      {!expanded && (
        <p className="mt-0.5 pl-5 text-gray-400 italic truncate max-w-prose">{preview}</p>
      )}
      {expanded && (
        <p className="mt-1 pl-5 text-gray-500 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{content}</p>
      )}
    </div>
  );
}
