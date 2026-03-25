'use client';

import type { Message } from '../ChatMessage';

interface Props {
  message: Message;
}

export default function PlanMessage({ message }: Props) {
  const plan: any[] = message.data?.plan ?? [];

  return (
    <div className="flex justify-start mb-1">
      <div className="max-w-[92%] rounded-xl border border-indigo-200 bg-indigo-50 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-indigo-100 border-b border-indigo-200">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">📋</span>
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
              Implementation Plan
            </span>
          </div>
          <span className="text-[10px] font-mono font-semibold text-indigo-500 bg-indigo-200 px-2 py-0.5 rounded-full">
            {plan.length} task{plan.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Steps */}
        <div className="px-3 py-2 space-y-2">
          {plan.map((step: any, idx: number) => {
            const text: string = step.plan ?? step.description ?? JSON.stringify(step);
            const completed: boolean = step.completed ?? false;
            return (
              <div key={idx} className="flex items-start gap-2.5">
                {/* Step number bubble */}
                <div
                  className={`shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                    ${completed
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white border-2 border-indigo-300 text-indigo-400'
                    }`}
                >
                  {completed ? '✓' : idx + 1}
                </div>
                <p
                  className={`text-[11px] leading-relaxed
                    ${completed ? 'line-through text-indigo-300' : 'text-indigo-800'}`}
                >
                  {text}
                </p>
              </div>
            );
          })}

          {plan.length === 0 && (
            <p className="text-[11px] text-indigo-400 italic">No plan steps found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
