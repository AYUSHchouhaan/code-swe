'use client';

import type { Message } from '../ChatMessage';

interface Props {
  message: Message;
}

export default function PlanMessage({ message }: Props) {
  const plan: any[] = message.data?.plan ?? [];

  return (
    <div className="mb-2 border border-gray-200 rounded p-3 bg-white text-xs text-gray-700">
      <div className="flex items-center gap-1.5 mb-2 font-medium text-gray-800">
        <span>📋</span>
        <span>Plan</span>
        <span className="text-gray-400 font-normal">({plan.length} step{plan.length !== 1 ? 's' : ''})</span>
      </div>
      <ol className="space-y-1.5 pl-1">
        {plan.map((step: any, idx: number) => {
          const text: string = step.plan ?? step.description ?? JSON.stringify(step);
          const completed: boolean = step.completed ?? false;
          return (
            <li key={idx} className={`flex items-start gap-2 ${completed ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
              <span className="shrink-0 font-mono text-gray-400">{idx + 1}.</span>
              <span className="leading-relaxed">{text}</span>
            </li>
          );
        })}
        {plan.length === 0 && <li className="text-gray-400 italic">No steps.</li>}
      </ol>
    </div>
  );
}
