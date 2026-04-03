'use client';

import { useState } from 'react';
import type { Message } from '../ChatMessage';

interface Props {
  message: Message;
}

const TOOL_ICONS: Record<string, string> = {
  glob: '🔎',
  grep: '🔍',
  read: '📖',
  edit: '✏️',
  create: '📄',
};

export default function ToolResultMessage({ message }: Props) {
  const [expanded, setExpanded] = useState(false);
  const content: string = message.data?.content ?? '';
  const tool = message.tool ?? '';
  const icon = TOOL_ICONS[tool] ?? '📤';

  const preview = content.length > 120
    ? content.slice(0, 120).replace(/\n/g, ' ') + '…'
    : content;

  return (
    <div className="mb-1 text-xs text-gray-500 pl-5">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 hover:text-gray-700 transition-colors"
      >
        <span>{icon}</span>
        <span className="font-medium text-gray-500">result</span>
        <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
      </button>
      {!expanded && (
        <p className="mt-0.5 text-gray-400 italic truncate max-w-prose">{preview}</p>
      )}
      {expanded && (
        <pre className="mt-1 text-gray-500 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-mono text-[11px]">
          {content}
        </pre>
      )}
    </div>
  );
}
