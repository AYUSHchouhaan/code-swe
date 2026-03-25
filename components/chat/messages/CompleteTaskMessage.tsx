'use client';

import type { Message } from '../ChatMessage';

interface Props {
  message: Message;
}

export default function CompleteTaskMessage({ message }: Props) {
  const plan: any[] = message.data?.plan ?? [];
  const completedCount: number = message.data?.completedCount ?? plan.filter((t: any) => t.completed).length;
  const totalCount: number = message.data?.totalCount ?? plan.length;
  const summary: string = message.data?.summary ?? '';
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="flex justify-start mb-1">
      <div className="max-w-[88%] rounded-xl border border-green-200 bg-green-50 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-green-100 border-b border-green-200">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">✅</span>
            <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">
              Task Complete
            </span>
          </div>
          <span className="text-[10px] font-mono font-semibold text-green-600 bg-green-200 px-2 py-0.5 rounded-full">
            {completedCount}/{totalCount}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-green-100">
          <div
            className="h-1 bg-green-400 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="px-3 py-2 space-y-2">
          {/* Summary text */}
          {summary && (
            <p className="text-[11px] text-green-700 leading-relaxed">{summary}</p>
          )}

          {/* Task list with completion status */}
          {plan.length > 0 && (
            <div className="space-y-1">
              {plan.map((task: any, i: number) => {
                const text: string = task.plan ?? task.description ?? '';
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <span
                      className={`text-[11px] shrink-0 ${task.completed ? 'text-green-500' : 'text-green-200'}`}
                    >
                      {task.completed ? '●' : '○'}
                    </span>
                    <span
                      className={`text-[11px] leading-snug
                        ${task.completed
                          ? 'text-green-500 line-through'
                          : 'text-green-700'
                        }`}
                    >
                      {text}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
