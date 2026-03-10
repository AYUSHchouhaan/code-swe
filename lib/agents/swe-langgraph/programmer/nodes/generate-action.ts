import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createGrepTool, createReadTool, createEditTool } from '../../tools';
import type { ProgrammerState } from '../types';

const SYSTEM_PROMPT = `You are an expert software engineer implementing code changes step by step.

You have access to three tools:
- "grep": search for files containing keywords (supports pipe syntax like "createUser|updateUser")
- "read": read the full content of a file
- "edit": replace an exact string in a file with a new string. If the file doesn't exist, it will be created automatically (pass empty oldString for new files).

Workflow:
1. Look at the current task from the plan.
2. Use grep to find relevant files, read to inspect them.
3. Use edit to apply changes. For new files, use edit with empty oldString and full content as newString.
4. When the current task is COMPLETE, respond WITHOUT calling any tools and say what you did.

Rules:
- Call EXACTLY ONE tool per response — never more than one.
- For edit: always read the file first so you know the exact oldString.
- For new files: use edit with oldString="" and newString=full file content.
- Be precise with the edit tool — oldString must match exactly.`;

/**
 * Node: generate-action
 *
 * LLM bound with grep, read, edit, createNewFile tools.
 * Decides what to do for the current incomplete task.
 * - If tool call → take-action
 * - If no tool call → complete-task
 */
export async function generateActionNode(
  state: ProgrammerState
): Promise<Partial<ProgrammerState>> {
  console.log('\n=== PROGRAMMER NODE: generate-action ===');

  // Find the current incomplete task
  const currentTask = state.plan.find((t) => !t.completed);
  if (!currentTask) {
    console.log('No incomplete tasks found.');
    return {};
  }

  console.log(`Working on task ${currentTask.index}: ${currentTask.plan}`);

  const grepTool = createGrepTool(state.repoPath);
  const readTool = createReadTool(state.repoPath);
  const editTool = createEditTool(state.repoPath);

  const llm = new ChatOllama({
    model: 'qwen2.5-coder:7b',
    temperature: 0.1,
    baseUrl: 'http://localhost:11434',
  }).bindTools([grepTool, readTool, editTool]);

  const planOverview = state.plan
    .map((t) => `  ${t.index}. [${t.completed ? '✅' : '⬜'}] ${t.plan}`)
    .join('\n');

  const messageHistory = state.messages;

  // First call: set up context
  const inputMessages =
    messageHistory.length === 0
      ? [
          new SystemMessage(SYSTEM_PROMPT),
          new HumanMessage(
            `Query: "${state.query}"

Context Notes from Planner:
${state.notes}

Codebase Tree:
${state.codebaseTree}

Task Plan:
${planOverview}

--- CURRENT TASK ---
Task ${currentTask.index}: ${currentTask.plan}

Start working on this task now.`
          ),
        ]
      : [new SystemMessage(SYSTEM_PROMPT), ...messageHistory];

  const response = await llm.invoke(inputMessages);

  const newMessages =
    messageHistory.length === 0
      ? [
          new HumanMessage(
            `Query: "${state.query}"

Context Notes from Planner:
${state.notes}

Codebase Tree:
${state.codebaseTree}

Task Plan:
${planOverview}

--- CURRENT TASK ---
Task ${currentTask.index}: ${currentTask.plan}

Start working on this task now.`
          ),
          response,
        ]
      : [response];

  const toolCalls = response.tool_calls ?? [];
  if (toolCalls.length > 0) {
    console.log(`Tool call: ${toolCalls[0].name}`, toolCalls[0].args);
  } else {
    console.log('Task appears complete — no tool call.');
  }

  return { messages: newMessages };
}
