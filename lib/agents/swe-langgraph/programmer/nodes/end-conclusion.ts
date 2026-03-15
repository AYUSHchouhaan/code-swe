import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { ProgrammerState } from '../types';

/**
 * Node: end-conclusion
 *
 * All tasks are complete. Produces a final summary of everything that was done.
 */
export async function endConclusionNode(
  state: ProgrammerState
): Promise<Partial<ProgrammerState>> {
  console.log('\n=== PROGRAMMER NODE: end-conclusion ===');

  const llm = new ChatOllama({
    model: 'qwen3-coder:480b-cloud',
    temperature: 0.1,
    baseUrl: 'http://localhost:11434',
    numCtx: 131072,
    numPredict: 8192,
  });

  const planOverview = state.plan
    .map((t) => `${t.index}. [✅] ${t.plan}`)
    .join('\n');

  const conversationSummary = state.messages
    .filter((m) => m.getType() === 'human')
    .map((m) => (typeof m.content === 'string' ? m.content : ''))
    .filter(Boolean)
    .slice(-10)
    .join('\n');

  const response = await llm.invoke([
    new SystemMessage(
      'You are summarising a completed coding session. Write a clear, concise summary (3-5 sentences) of all changes made.'
    ),
    new HumanMessage(
      `Original Query: "${state.query}"

Completed Plan:
${planOverview}

Key Events:
${conversationSummary}

Write the final summary now.`
    ),
  ]);

  const summary =
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

  console.log('Final summary:', summary);

  return { summary };
}
