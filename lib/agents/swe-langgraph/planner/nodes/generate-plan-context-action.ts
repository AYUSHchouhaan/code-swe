import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createGrepTool, createReadTool } from '../../tools';
import type { PlannerState } from '../types';

const SYSTEM_PROMPT = `You are a senior software engineer analyzing a codebase to gather context.

Your task:
1. Use the "grep" tool to search for relevant code. Use 3-4 concise search words.
2. Use the "read" tool to read the content of interesting files.
3. Gather enough context about the existing code to later create a precise implementation plan.
4. When you have enough context to create the plan, respond WITHOUT calling any tools.

Rules:
- Call EXACTLY ONE tool per response — never more than one.
- For grep: provide exactly 3-4 words that are likely to appear in relevant files.
- Do not repeat the same search twice.
- Be efficient — gather context about the right files, not all files.`;

/**
 * Node: generate-plan-context-action
 *
 * Uses an LLM bound with grep + read tools to gather codebase context.
 * - If the LLM returns a tool call  → "take-action-context" (conditional edge)
 * - If the LLM returns plain text   → "generate-plan"       (conditional edge)
 */
export async function generatePlanContextActionNode(
  state: PlannerState
): Promise<Partial<PlannerState>> {
  console.log('\n=== PLANNER NODE: generate-plan-context-action ===');

  const grepTool = createGrepTool(state.repoPath);
  const readTool = createReadTool(state.repoPath);

  const llm = new ChatOllama({
    model: 'qwen2.5-coder:7b',
    temperature: 0.2,
    baseUrl: 'http://localhost:11434',
  }).bindTools([grepTool, readTool]);

  // Build the message list: system prompt + user query (first call) + accumulated messages
  const messageHistory = state.messages;

  const inputMessages =
    messageHistory.length === 0
      ? [
          new SystemMessage(SYSTEM_PROMPT),
          new HumanMessage(
            `User query: "${state.query}"\n\nCodebase structure:\n${state.codebaseTree}\n\nPlease start gathering context about the codebase to understand what needs to be changed.`
          ),
        ]
      : [new SystemMessage(SYSTEM_PROMPT), ...messageHistory];

  const response = await llm.invoke(inputMessages);

  const newMessages =
    messageHistory.length === 0
      ? [
          new HumanMessage(
            `User query: "${state.query}"\n\nCodebase structure:\n${state.codebaseTree}\n\nPlease start gathering context about the codebase to understand what needs to be changed.`
          ),
          response,
        ]
      : [response];

  const toolCalls = response.tool_calls ?? [];
  if (toolCalls.length > 0) {
    // Only log the first — we enforce one tool at a time
    console.log(`LLM wants to call tool: ${toolCalls[0].name}`, toolCalls[0].args);
  } else {
    console.log('LLM has enough context — ready to generate plan.');
  }

  return { messages: newMessages };
}
