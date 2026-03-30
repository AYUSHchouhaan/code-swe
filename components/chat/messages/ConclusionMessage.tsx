'use client';

import type { Message } from '../ChatMessage';

interface Props {
  message: Message;
}

export default function ConclusionMessage({ message }: Props) {
  const summary: string = message.data?.summary ?? message.content ?? '';

  return (
    <div className="mb-2 border border-gray-200 rounded p-3 bg-white text-xs text-gray-700">
      <div className="flex items-center gap-1.5 mb-1.5 font-medium text-gray-800">
        <span>🎉</span>
        <span>All done!</span>
      </div>
      <p className="whitespace-pre-wrap leading-relaxed text-gray-600">{summary}</p>
    </div>
  );
}
