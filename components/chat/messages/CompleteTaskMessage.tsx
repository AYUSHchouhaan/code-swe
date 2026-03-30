'use client';

import type { Message } from '../ChatMessage';

interface Props {
  message: Message;
}

export default function CompleteTaskMessage({ message }: Props) {
  const plan: any[] = message.data?.plan ?? [];
  const completedCount: number = message.data?.completedCount ?? plan.filter((t: any) => t.completed).length;
  const totalCount: number = message.data?.totalCount ?? plan.length;

  return (
    <div className="mb-2 border border-gray-200 rounded p-3 bg-white text-xs text-gray-700">
      <div className="flex items-center gap-1.5 mb-2 font-medium text-gray-800">
        <span>✅</span>
        <span>Task complete</span>
        <span className="text-gray-400 font-normal">({completedCount}/{totalCount})</span>
      </div>
      {plan.length > 0 && (
        <ol className="space-y-1 pl-1">
          {plan.map((task: any, i: number) => {
            const text: string = task.plan ?? task.description ?? '';
            return (
              <li key={i} className={`flex items-start gap-2 ${task.completed ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                <span className="shrink-0 font-mono text-gray-400">{i + 1}.</span>
                <span className="leading-relaxed">{text}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
