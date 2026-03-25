import { Message } from './ChatMessage';

interface AIMessageProps {
  message: Message;
}

export default function AIMessage({ message }: AIMessageProps) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[70%] rounded-lg px-4 py-2 bg-white border border-gray-200 text-gray-900">
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>

        {message.data && (
          <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-700">
            {message.data.subqueries && (
              <div>
                <p className="font-semibold mb-1">Subqueries:</p>
                <ul className="list-disc list-inside space-y-1">
                  {message.data.subqueries.map((sq: string, idx: number) => (
                    <li key={idx}>{sq}</li>
                  ))}
                </ul>
              </div>
            )}

            {message.data.files && (
              <div>
                <p className="font-semibold mb-1">Files:</p>
                <ul className="list-disc list-inside space-y-1">
                  {message.data.files.map((file: string, idx: number) => (
                    <li key={idx} className="font-mono">{file}</li>
                  ))}
                </ul>
              </div>
            )}

            {message.data.plan && (
              <div>
                <p className="font-semibold mb-1">Plan Steps:</p>
                <ul className="list-decimal list-inside space-y-1">
                  {message.data.plan.map((step: any, idx: number) => (
                    <li key={idx}>{step.plan ?? step.description ?? JSON.stringify(step)}</li>
                  ))}
                </ul>
              </div>
            )}

            {message.data.steps && (
              <div>
                <p className="font-semibold mb-1">Plan Steps:</p>
                <ul className="list-decimal list-inside space-y-1">
                  {message.data.steps.map((step: any, idx: number) => (
                    <li key={idx}>
                      <span className="font-semibold">[{step.action}]</span> {step.file}: {step.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {message.data.modifiedFiles && (
              <div>
                <p className="font-semibold mb-1">Modified Files:</p>
                <ul className="list-disc list-inside space-y-1">
                  {message.data.modifiedFiles.map((file: string, idx: number) => (
                    <li key={idx} className="font-mono">{file}</li>
                  ))}
                </ul>
              </div>
            )}

            {message.data.notes && (
              <div>
                <p className="font-semibold mb-1">Notes:</p>
                <p className="text-gray-600">{message.data.notes}</p>
              </div>
            )}
          </div>
        )}

        <div className="text-xs mt-1 text-gray-500">
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
