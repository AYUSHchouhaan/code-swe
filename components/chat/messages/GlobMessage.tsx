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
    <div className="mb-1 text-xs text-gray-500 flex items-center gap-1.5">
      <span>🔎</span>
      <span className="font-medium text-gray-600">glob</span>
      <span className="font-mono text-gray-500 truncate max-w-xs">{patterns.join(', ')}</span>
      <span className="text-gray-400">
        {count > 0 ? `→ ${count} file${count !== 1 ? 's' : ''}` : '→ no match'}
      </span>
    </div>
  );
}
