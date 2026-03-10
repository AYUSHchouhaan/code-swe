import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { ProgrammerState, PlanStep } from '../types';

/**
 * Node: complete-task
 *
 * Marks the current task as completed and summarises what was done (20-30 words).
 * Appends a HumanMessage with the summary so the LLM has context for the next task.
 */
export async function completeTaskNode(
  state: ProgrammerState
): Promise<Partial<ProgrammerState>> {
  console.log('\n=== PROGRAMMER NODE: complete-task ===');

  // Find the first incomplete task
  const currentTask = state.plan.find((t) => !t.completed);
  if (!currentTask) {
    console.log('No task to complete.');
    return {};
  }

  // Summarise what we did for this task (20-30 words)
  const llm = new ChatOllama({
    model: 'qwen2.5-coder:7b',
    temperature: 0.1,
    baseUrl: 'http://localhost:11434',
  });

  const recentMessages = state.messages.slice(-6);
  const recentContext = recentMessages
    .map((m) => {
      const type = m.getType();
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      return `[${type.toUpperCase()}]: ${content}`;
    })
    .join('\n');

  const response = await llm.invoke([
    new SystemMessage(
      'Summarise what was just accomplished for this task in exactly 20-30 words. Be factual and concise.'
    ),
    new HumanMessage(
      `Task: "${currentTask.plan}"\n\nRecent conversation:\n${recentContext}\n\nWrite the summary now.`
    ),
  ]);

  const taskSummary =
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

  console.log(`  Task ${currentTask.index} completed: ${taskSummary}`);

  // Mark complete in the plan
  const updatedPlan: PlanStep[] = state.plan.map((t) =>
    t.index === currentTask.index ? { ...t, completed: true } : t
  );

  // Add context message so the LLM knows this task is done
  const contextMsg = new HumanMessage(
    `✅ Task ${currentTask.index} completed: ${taskSummary}\n\nMove on to the next incomplete task.`
  );

  return {
    plan: updatedPlan,
    messages: [contextMsg],
  };
}
