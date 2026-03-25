'use client';

import type { Message } from '../ChatMessage';

const TOOL_CONFIG = {
  read: {
    icon: '📖',
    label: 'Read File',
    badge: 'READ',
    colors: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      header: 'bg-amber-100',
      headerText: 'text-amber-600',
      badgeBg: 'bg-amber-200',
      badgeText: 'text-amber-600',
      pathBg: 'bg-white',
      pathBorder: 'border-amber-200',
      pathDir: 'text-amber-400',
      pathFile: 'text-amber-800',
      sectionText: 'text-amber-400',
      previewText: 'text-amber-700',
    },
  },
  edit: {
    icon: '✏️',
    label: 'Edit File',
    badge: 'EDIT',
    colors: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      header: 'bg-emerald-100',
      headerText: 'text-emerald-600',
      badgeBg: 'bg-emerald-200',
      badgeText: 'text-emerald-600',
      pathBg: 'bg-white',
      pathBorder: 'border-emerald-200',
      pathDir: 'text-emerald-400',
      pathFile: 'text-emerald-800',
      sectionText: 'text-emerald-400',
      previewText: 'text-emerald-700',
    },
  },
  create: {
    icon: '📄',
    label: 'Create File',
    badge: 'CREATE',
    colors: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      header: 'bg-rose-100',
      headerText: 'text-rose-600',
      badgeBg: 'bg-rose-200',
      badgeText: 'text-rose-600',
      pathBg: 'bg-white',
      pathBorder: 'border-rose-200',
      pathDir: 'text-rose-400',
      pathFile: 'text-rose-800',
      sectionText: 'text-rose-400',
      previewText: 'text-rose-700',
    },
  },
} as const;

interface Props {
  message: Message;
}

export default function FileOpMessage({ message }: Props) {
  const tool = (message.tool ?? 'read') as keyof typeof TOOL_CONFIG;
  const cfg = TOOL_CONFIG[tool] ?? TOOL_CONFIG.read;
  const { colors: c } = cfg;

  const filePath: string = message.data?.filePath ?? message.content ?? '';
  const segments = filePath.replace(/\\/g, '/').split('/');
  const fileName = segments[segments.length - 1] ?? filePath;
  const dirPath = segments.length > 1 ? segments.slice(0, -1).join('/') : '';

  // For edit/create: show success/error indicator
  const hasResult = message.data?.resultMessage != null;
  const isSuccess: boolean = message.data?.success ?? true;

  // For read: show content preview
  const preview: string | undefined = message.data?.preview;

  return (
    <div className="flex justify-start mb-1">
      <div className={`max-w-[88%] rounded-xl border ${c.border} ${c.bg} overflow-hidden shadow-sm`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-3 py-1.5 ${c.header} border-b ${c.border}`}>
          <div className="flex items-center gap-1.5">
            <span className="text-xs">{cfg.icon}</span>
            <span className={`text-[10px] font-bold ${c.headerText} uppercase tracking-widest`}>
              {cfg.label}
            </span>
          </div>
          <span className={`text-[10px] font-mono font-semibold ${c.badgeText} ${c.badgeBg} px-2 py-0.5 rounded-full`}>
            {cfg.badge}
          </span>
        </div>

        {/* File path */}
        <div className="px-3 pt-2 pb-2">
          <div className={`font-mono text-xs ${c.pathBg} rounded border ${c.pathBorder} px-2.5 py-1.5 shadow-sm`}>
            {dirPath && (
              <span className={`${c.pathDir}`}>{dirPath}/</span>
            )}
            <span className={`font-semibold ${c.pathFile}`}>{fileName}</span>
          </div>

          {/* Result indicator for edit/create */}
          {hasResult && (
            <div className={`mt-1.5 flex items-center gap-1 text-[11px] ${isSuccess ? 'text-green-600' : 'text-red-500'}`}>
              <span>{isSuccess ? '✓' : '✗'}</span>
              <span>{message.data.resultMessage}</span>
            </div>
          )}

          {/* Preview for read */}
          {preview && (
            <div className={`mt-1.5`}>
              <p className={`text-[10px] ${c.sectionText} font-semibold uppercase tracking-wider mb-1`}>
                Preview
              </p>
              <pre className={`text-[10px] ${c.previewText} bg-white rounded border ${c.pathBorder} px-2 py-1.5 max-h-24 overflow-y-auto leading-relaxed font-mono whitespace-pre-wrap`}>
                {preview}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
