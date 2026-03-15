import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createGrepTool, createReadTool, createEditTool, createNewFileTool, createMarkTaskCompleteTool } from '../../tools';
import type { ProgrammerState } from '../types';

/**
 * Builds the system prompt dynamically so the current task is always
 * explicitly stated at the top, making it impossible for the LLM to lose
 * track of what it is supposed to be working on.
 */
function buildSystemPrompt(taskIndex: number, taskDescription: string): string {
  return `You are an expert software engineer responsible for implementing code changes in a real repository.

You are executing a multi-step implementation plan.

══════════════════════════════════════════════════
CURRENT TASK  (Task ${taskIndex})
${taskDescription}
══════════════════════════════════════════════════

You have access to these tools:

grep
→ Search the codebase for relevant files containing keywords.
Example query: "auth|login|jwt|session"

read
→ Read the full content of a file to understand the current implementation.

edit
→ Modify an EXISTING file by replacing an exact string with a new string.

create_file
→ Create a NEW file that does not exist yet. Provide full file content.

mark_task_complete
→ Call this tool ONLY after you have fully implemented Task ${taskIndex}.
  Provide a concise summary (20–30 words) of exactly what was done.
  Do NOT call this before the code changes are in place.

--------------------------------------------------

CORE WORKFLOW

Your goal is to complete Task ${taskIndex}: ${taskDescription}

Steps:
1. Modify files using edit or create_file.
2. Call mark_task_complete once the task is fully implemented.

You are free to use tools multiple times to gather enough context before making a change.

--------------------------------------------------

MESSAGE HISTORY (VERY IMPORTANT)

You will receive message history containing:

• previous tool calls
• tool results
• previously read files
• edits already performed
• reasoning about the codebase

Message history represents your current knowledge of the repository.

You MUST use message history to decide your next action.

Use it to:

• avoid repeating the same grep queries
• avoid reading the same file again unnecessarily
• remember which files already contain relevant logic
• understand what changes were already made
• determine what step should happen next

Do NOT restart investigation from scratch.

Continue working from the current state of knowledge.

--------------------------------------------------

DECIDING THE NEXT ACTION

For each response decide the single most useful next action:

If you need to find relevant files
→ use grep

If you need to understand existing code
→ use read

If you know what change must be made
→ use edit

If a new file must be added
→ use create_file

If the task is fully implemented
→ use mark_task_complete

Always choose the most logical next step based on the current task and message history.

--------------------------------------------------

IMPLEMENTATION GUIDELINES

Before editing a file you should normally:

grep → locate file
read → inspect current code
edit → apply modification

However you may skip grep if the file is already known from message history and you have read it recently by a previous tool call .

You may skip read if you already read the file and the required change is obvious.

--------------------------------------------------

EDITING RULES

When using the edit tool:

• oldString must match EXACTLY what exists in the file
• copy the oldString directly from the read result
• modify only the necessary section
• preserve formatting and indentation

--------------------------------------------------

CREATING FILES

Use create_file when:

• the task requires a new module
• the file does not exist
• the project structure indicates a new file should be added

Provide the full file contents.

--------------------------------------------------

TASK COMPLETION

Call mark_task_complete ONLY when:

• a file was edited, OR
• a file was created, OR
• the task genuinely required no code change (explain why in the summary).

NEVER call mark_task_complete before implementing the changes.

--------------------------------------------------

IMPORTANT RULES

• Call EXACTLY ONE tool per response.
• Never call multiple tools in a single response.
• Use message history as your memory.
• Do not repeat the same tool call unnecessarily.
• Prefer understanding the code before editing it.
• Continue investigating if the correct change is not yet clear.

--------------------------------------------------

YOUR ROLE

You are acting like a real engineer working through a task step by step:

investigate → understand → implement → mark_task_complete

Your priority is making correct code changes that satisfy Task ${taskIndex}.`;
}


export async function generateActionNode(
  state: ProgrammerState
): Promise<Partial<ProgrammerState>> {
  console.log('\n=== PROGRAMMER NODE: generate-action ===');

  const currentTask = state.plan.find((t) => !t.completed);
  if (!currentTask) {
    console.log('No incomplete tasks found.');
    return {};
  }

  console.log(`Working on task ${currentTask.index}: ${currentTask.plan}`);

  const grepTool = createGrepTool(state.repoPath);
  const readTool = createReadTool(state.repoPath);
  const editTool = createEditTool(state.repoPath);
  const createFileTool = createNewFileTool(state.repoPath);
  const markCompleteTool = createMarkTaskCompleteTool();

  const llm = new ChatOllama({
    model: 'qwen3-coder:480b-cloud',
    temperature: 0.1,
    baseUrl: 'http://localhost:11434',
    numCtx: 131072,
    numPredict: 32768,
  }).bindTools([grepTool, readTool, editTool, createFileTool, markCompleteTool]);

  const planOverview = state.plan
    .map((t) => `  ${t.index}. [${t.completed ? '✅' : '⬜'}] ${t.plan}`)
    .join('\n');

  const messageHistory = state.messages;
  const trimmedHistory = messageHistory.slice(-20);

  const systemPrompt = buildSystemPrompt(currentTask.index, currentTask.plan);

  const firstTaskMessage = new HumanMessage(
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
  );

  const inputMessages =
    messageHistory.length === 0
      ? [new SystemMessage(systemPrompt), firstTaskMessage]
      : [new SystemMessage(systemPrompt), ...trimmedHistory];

  const response = await llm.invoke(inputMessages);

  const newMessages =
    messageHistory.length === 0
      ? [firstTaskMessage, response]
      : [response];

  const toolCalls = response.tool_calls ?? [];
  if (toolCalls.length > 0) {
    console.log(`Tool call: ${toolCalls[0].name}`, toolCalls[0].args);
  } else {
    const content =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);
    console.log('No tool call — LLM response (reasoning):\n', content);
  }

  return { messages: newMessages };
}
