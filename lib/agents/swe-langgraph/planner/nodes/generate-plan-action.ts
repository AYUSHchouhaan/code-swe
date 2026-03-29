import { ChatOllama } from '@langchain/ollama';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { createGrepTool, createReadTool, createGlobTool, createCompletePlanningTool } from '../../tools';
import type { PlannerState } from '../types';

const SYSTEM_PROMPT = `You are a senior software engineer investigating a codebase to plan an implementation.

You have four tools:
- glob              → find files by path pattern (e.g. "src/**/*.ts", "*.js") — use this FIRST
- grep              → search the codebase for files containing a keyword/pattern
- read              → read up to 4 files at once by passing an array of paths
- complete_planning → CALL THIS as soon as you have enough context to write the plan

════════════════════════════════════════════
STRICT RULES — READ CAREFULLY
════════════════════════════════════════════

1. EVERY response MUST call exactly one tool (glob, grep, read, or complete_planning).
   Never respond with pure text or reasoning. If you are thinking, still pick the
   best next tool call and make it immediately.

2. USE GLOB FIRST TO DISCOVER FILES.
   Start by calling glob with up to 4 patterns that match the file types relevant
   to the query. For example: ["src/**/*.ts", "**/*.tsx", "app/**/*.ts"].
   This gives you the project structure without reading file contents.
   never do - *.css / *.scss files

3. ONLY READ FILES THAT ARE DIRECTLY RELEVANT TO THE USER QUERY.
   Pass up to 4 relevant file paths in a single read call. Max 1 read call total.

4. NEVER READ THESE — they are always irrelevant:
   - package.json / package-lock.json / yarn.lock
   - *.css / *.scss files (unless the task is purely about styling)
   - test / spec files
   - lock files or config files unrelated to the feature

5. NEVER READ THE SAME FILE TWICE.
   Check the message history before every read. If a file was already read, skip it.

6. NEVER RUN THE SAME GLOB OR GREP TWICE.
   Check the message history before every tool call.

7. CALL complete_planning AS SOON AS POSSIBLE.
   Once you know:
   • which files contain the relevant logic
   • what data/APIs are available
   • where the change needs to happen
   …call complete_planning immediately. Do not keep exploring.

════════════════════════════════════════════
EFFICIENT WORKFLOW
════════════════════════════════════════════

Step 1 — Call glob with patterns that match the relevant file types.
          E.g. ["src/**/*.ts", "app/**/*.tsx"] to see all source files.
          Pick up to 4 files that look most relevant from the results.

Step 2 — Call read ONCE with all relevant file paths in one array (max 4).
          e.g. read({ filePaths: ["src/a.ts", "src/b.ts", "app/c.tsx"] })
          Stop reading after this — you now have enough context.

Step 3 — If something is still unclear, do ONE targeted grep.
          use the result to pick which file to read next if relevent .

Step 4 — Call complete_planning as soon as the picture is clear.

════════════════════════════════════════════
WHAT "ENOUGH CONTEXT" MEANS
════════════════════════════════════════════

You have enough context when you can answer:
• Which files need to be created or modified?
• What data exists (API endpoints, props, state)?
• What is the current structure the new code must integrate with?

Once you can answer those three questions — call complete_planning immediately.

════════════════════════════════════════════
complete_planning FORMAT
════════════════════════════════════════════

  complete_planning({ reason: "1–2 sentence summary of what you found" })

Do NOT keep exploring after calling complete_planning.`;

export async function generatePlanActionNode(
  state: PlannerState
): Promise<Partial<PlannerState>> {
  console.log('\n=== PLANNER NODE: generate-plan-action ===');

  const grepTool = createGrepTool(state.repoPath);
  const readTool = createReadTool(state.repoPath);
  const globTool = createGlobTool(state.repoPath);
  const completePlanningTool = createCompletePlanningTool();

  const llm = new ChatOllama({
    model: 'qwen3-coder:480b-cloud',
    temperature: 0,
    baseUrl: 'http://localhost:11434',
    numCtx: 131072,
    numPredict: 32768,
  }).bindTools([globTool, grepTool, readTool, completePlanningTool]);

  // Google Gemini alternative — comment out Ollama above and uncomment below
  // const llm = new ChatGoogleGenerativeAI({
  //   model: 'gemini-2.5-pro-exp-03-25',
  //   apiKey: process.env.GOOGLE_API_KEY,
  //   temperature: 0,
  // }).bindTools([globTool, grepTool, readTool, completePlanningTool]);

  const messageHistory = state.messages;

  // Count consecutive no-tool-call responses to detect empty reasoning loops
  let emptyReasoningStreak = 0;
  for (let i = messageHistory.length - 1; i >= 0; i--) {
    const msg = messageHistory[i];
    if (msg.getType() === 'ai') {
      const ai = msg as AIMessage;
      if (!ai.tool_calls || ai.tool_calls.length === 0) {
        emptyReasoningStreak++;
      } else {
        break;
      }
    }
  }

  // Hard-break: if the model has produced 2+ empty reasoning responses in a row,
  // inject a strong reminder so it makes a tool call on the next turn.
  const loopWarning =
    emptyReasoningStreak >= 2
      ? '\n\n⚠️  IMPORTANT: You have produced multiple responses with no tool call. ' +
        'You MUST call a tool right now — either read a relevant file, run a grep, ' +
        'or call complete_planning. Do NOT respond with text only.'
      : '';

  const firstMessage = new HumanMessage(
    `User query: "${state.query}"\n\n` +
    `Start by calling glob with patterns that match the relevant file types for this query. ` +
    `Then read the most relevant files (max 5), then call complete_planning.${loopWarning}`
  );

  // Keep history lean — only last 30 messages to avoid context bloat
  const trimmedHistory = messageHistory.slice(-30);

  const inputMessages =
    messageHistory.length === 0
      ? [new SystemMessage(SYSTEM_PROMPT), firstMessage]
      : [new SystemMessage(SYSTEM_PROMPT), ...trimmedHistory, ...(loopWarning ? [new HumanMessage(loopWarning.trim())] : [])];

  const response = await llm.invoke(inputMessages);

  const newMessages =
    messageHistory.length === 0
      ? [firstMessage, response]
      : [response];

  const toolCalls = response.tool_calls ?? [];
  if (toolCalls.length > 0) {
    const toolName = toolCalls[0].name;
    console.log(`LLM wants to call tool: ${toolName}`, toolCalls[0].args);
  } else {
    const content =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);
    console.log('No tool call — LLM response (reasoning):\n', content);
  }

  return { messages: newMessages };
}
