import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { PlannerState } from '../types';

/**
 * Node: notes
 *
 * Summarises the entire planning conversation into a short notes string.
 * These notes are passed to the programmer agent as helpful context.
 */
export async function notesNode(state: PlannerState): Promise<Partial<PlannerState>> {
  console.log('\n=== PLANNER NODE: notes ===');

  const llm = new ChatOllama({
    model: 'qwen2.5-coder:7b',
    temperature: 0.1,
    baseUrl: 'http://localhost:11434',
  });

  const contextSummary = state.messages
    .map((m) => {
      const type = m.getType();
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      return `[${type.toUpperCase()}]: ${content}`;
    })
    .join('\n\n');

  const planSummary = state.plan
    .map((s) => `${s.index}. ${s.plan}`)
    .join('\n');

  const response = await llm.invoke([
    new SystemMessage(
      `You are a technical writer summarising a code-planning session for a programmer.
Produce a compact paragraph (3-6 sentences) noting:
- What the user wants to achieve
- Which files are relevant and why
- Key observations from the codebase analysis
- The overall implementation approach from the plan`
    ),
    new HumanMessage(
      `User Query: "${state.query}"

Planning Conversation:
${contextSummary}

Final Plan:
${planSummary}

Write the summary notes now.`
    ),
  ]);

  const notes = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  console.log('Notes:', notes.slice(0, 200));

  return { notes };
}
