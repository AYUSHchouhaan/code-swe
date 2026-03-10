import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';
import type { PlannerState, PlanStep } from '../types';

const planStepSchema = z.object({
  index: z.number().int().min(1),
  plan: z.string().describe('Concise description of what needs to be done in this step'),
  completed: z.boolean().default(false),
});

const planSchema = z.object({
  steps: z
    .array(planStepSchema)
    .max(6)
    .describe('Ordered implementation steps — maximum 6'),
  summary: z.string().describe('One-sentence summary of the overall approach'),
});

/**
 * Node: generate-plan
 *
 * Converts accumulated context messages into a minimal, actionable plan
 * (at most 6 steps) for the programmer agent to execute.
 */
export async function generatePlanNode(
  state: PlannerState
): Promise<Partial<PlannerState>> {
  console.log('\n=== PLANNER NODE: generate-plan ===');

  const llm = new ChatOllama({
    model: 'qwen2.5-coder:7b',
    temperature: 0.2,
    baseUrl: 'http://localhost:11434',
    format: 'json',
  }).withStructuredOutput(planSchema);

  // Stringify the gathered context for the planner
  const contextSummary = state.messages
    .map((m) => {
      const type = m.getType();
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      return `[${type.toUpperCase()}]: ${content}`;
    })
    .join('\n\n');

  const result = await llm.invoke([
    new SystemMessage(
      `You are a senior software engineer creating a minimalist implementation plan.

Rules:
1. Maximum 6 steps — keep it focused.
2. Steps must be in logical execution order.
3. Be concise but precise about what needs to be done.
4. Set completed = false for all steps.
5. index starts at 1.`
    ),
    new HumanMessage(
      `User Query: "${state.query}"

Gathered Context:
${contextSummary}

Create a minimalist step-by-step plan to implement the requested changes.`
    ),
  ]);

  const steps: PlanStep[] = result.steps.map((s) => ({ ...s, completed: false }));
  console.log(`Plan summary: ${result.summary}`);
  steps.forEach((s) => console.log(`  ${s.index}. ${s.plan}`));

  return { plan: steps };
}
