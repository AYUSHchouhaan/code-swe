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
    <div className="mb-1 text-xs text-gray-500 flex items-center gap-1.5">
      <span>🔍</span>
      <span className="font-medium text-gray-600">grep</span>
      <span className="font-mono text-gray-500 truncate max-w-xs">"{query}"</span>
      <span className="text-gray-400">
        {count > 0 ? `→ ${count} file${count !== 1 ? 's' : ''}` : '→ no match'}
      </span>
    </div>
  );
}
