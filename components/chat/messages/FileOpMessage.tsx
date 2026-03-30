'use client';

import type { Message } from '../ChatMessage';

const TOOL_ICONS: Record<string, string> = {
  read: '📖',
  edit: '✏️',
  create: '📄',
};

const TOOL_LABELS: Record<string, string> = {
  read: 'read',
  edit: 'edit',
  create: 'create',
};

interface Props {
  message: Message;
}

export default function FileOpMessage({ message }: Props) {
  const tool = message.tool ?? 'read';
  const icon = TOOL_ICONS[tool] ?? '📄';
  const label = TOOL_LABELS[tool] ?? tool;

  const filePath: string = message.data?.filePath ?? message.content ?? '';
  const segments = filePath.replace(/\\/g, '/').split('/');
  const fileName = segments[segments.length - 1] ?? filePath;

  return (
    <div className="mb-1 text-xs text-gray-500 flex items-center gap-1.5">
      <span>{icon}</span>
      <span className="font-medium text-gray-600">{label}</span>
      <span className="font-mono text-gray-500 truncate max-w-xs">{fileName}</span>
    </div>
  );
}
