import { NextRequest } from 'next/server';
import path from 'path';
import { plannerGraph, programmerGraph, generateCodebaseTree } from '@/lib/agents/swe-langgraph';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/agent/run
 *
 * Runs Planner → Programmer agents in sequence with SSE streaming.
 * Request body: { query: string, repoName: string }
 *
 * SSE event format: data: { type, node?, message, data? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, repoName } = body;

    if (!query || !repoName) {
      return new Response(
        JSON.stringify({ error: 'query and repoName are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const repoPath = path.join(process.cwd(), 'public', 'downloads', repoName);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          send({ type: 'start', message: '🚀 Starting SWE Agent...' });

          // ─────────────────────────────────────────────────
          // PHASE 1 — Planner Agent
          // ─────────────────────────────────────────────────
          send({ type: 'phase', message: '🗺️  Phase 1: Planning...' });

          // Compute initial codebase tree before running agents
          const codebaseTree = await generateCodebaseTree(repoPath);

          const plannerInputs = { query, repoPath, codebaseTree };
          
          let finalPlanner: any = {};
          
          // Stream planner execution
          for await (const chunk of await plannerGraph.stream(plannerInputs, {
            streamMode: 'updates',
          })) {
            const nodeName = Object.keys(chunk)[0];
            const update = (chunk as any)[nodeName];
            
            // Store the latest state
            finalPlanner = { ...finalPlanner, ...update };

            if (nodeName === 'generate-plan-context-action') {
              // Extract tool call details from the last AI message
              const messages = update.messages || [];
              const lastAIMsg = messages[messages.length - 1];
              
              if (lastAIMsg?.tool_calls && lastAIMsg.tool_calls.length > 0) {
                const toolCall = lastAIMsg.tool_calls[0];
                const toolName = toolCall.name;
                const args = toolCall.args || {};
                
                if (toolName === 'grep') {
                  send({
                    type: 'node',
                    node: nodeName,
                    message: `🔍 Searching for: "${args.query}"`,
                  });
                } else if (toolName === 'read') {
                  send({
                    type: 'node',
                    node: nodeName,
                    message: `📖 Reading: ${args.filePath}`,
                  });
                } else if (toolName === 'complete_planning') {
                  send({
                    type: 'node',
                    node: nodeName,
                    message: `✅ Context gathering complete — moving to planning`,
                  });
                }
              } else if (lastAIMsg) {
                // Plain-text response — reasoning step; stream content to frontend
                const reasoningContent =
                  typeof lastAIMsg.content === 'string'
                    ? lastAIMsg.content
                    : JSON.stringify(lastAIMsg.content);
                send({
                  type: 'reasoning',
                  node: 'reasoning-thinking',
                  message: '💭 Thinking...',
                  data: { content: reasoningContent },
                });
              } else {
                send({
                  type: 'node',
                  node: nodeName,
                  message: '🔍 Gathering codebase context...',
                });
              }
            } else if (nodeName === 'reasoning-thinking') {
              // Node itself returns {} — the content was already sent above.
              // Emit a lightweight indicator so the frontend knows the thinking step ran.
              send({
                type: 'reasoning',
                node: nodeName,
                message: '💭 Processing reasoning...',
              });
            } else if (nodeName === 'take-action-context') {
              // Extract tool result from the ToolMessage
              const messages = update.messages || [];
              const toolMsg = messages[messages.length - 1];
              
              if (toolMsg?.content) {
                const content = String(toolMsg.content);
                const preview = content.length > 100 ? content.slice(0, 100) + '...' : content;
                send({
                  type: 'node',
                  node: nodeName,
                  message: `✅ Result: ${preview}`,
                });
              } else {
                send({
                  type: 'node',
                  node: nodeName,
                  message: '📖 Tool executed',
                });
              }
            } else if (nodeName === 'generate-plan') {
              send({
                type: 'node',
                node: nodeName,
                message: '📋 Creating implementation plan...',
              });
            } else if (nodeName === 'generate-notes') {
              send({
                type: 'node',
                node: nodeName,
                message: '📝 Summarizing context...',
              });
            }
          }

          const plan: any[] = finalPlanner.plan ?? [];
          const notes: string = finalPlanner.notes ?? '';
          const finalCodebaseTree: string = finalPlanner.codebaseTree ?? codebaseTree;

          if (!plan.length) {
            send({ type: 'error', message: '❌ Planner produced no steps. Aborting.' });
            controller.close();
            return;
          }

          send({
            type: 'result',
            node: 'generate-plan',
            message: `📋 Plan ready — ${plan.length} step(s)`,
            data: { plan },
          });

          send({
            type: 'result',
            node: 'generate-notes',
            message: '📝 Context notes captured',
            data: { notes },
          });

          // ─────────────────────────────────────────────────
          // PHASE 2 — Programmer Agent
          // ─────────────────────────────────────────────────
          send({ type: 'phase', message: '💻 Phase 2: Implementing changes...' });

          const programmerInputs = { query, repoPath, plan, notes, codebaseTree: finalCodebaseTree };

          for await (const chunk of await programmerGraph.stream(programmerInputs, {
            streamMode: 'updates',
          })) {
            const nodeName = Object.keys(chunk)[0];
            const update = (chunk as any)[nodeName];

            if (nodeName === 'generate-action') {
              // Extract tool call details from the last AI message
              const messages = update.messages || [];
              const lastAIMsg = messages[messages.length - 1];
              
              if (lastAIMsg?.tool_calls && lastAIMsg.tool_calls.length > 0) {
                const toolCall = lastAIMsg.tool_calls[0];
                const toolName = toolCall.name;
                const args = toolCall.args || {};
                
                if (toolName === 'grep') {
                  send({
                    type: 'node',
                    node: nodeName,
                    message: `🔍 Searching for: "${args.query}"`,
                  });
                } else if (toolName === 'read') {
                  send({
                    type: 'node',
                    node: nodeName,
                    message: `📖 Reading: ${args.filePath}`,
                  });
                } else if (toolName === 'edit') {
                  send({
                    type: 'node',
                    node: nodeName,
                    message: `✏️ Editing: ${args.filePath}`,
                  });
                }
              } else {
                send({
                  type: 'node',
                  node: nodeName,
                  message: '🔍 Analyzing task...',
                });
              }
            } else if (nodeName === 'take-action') {
              // Extract tool result from the ToolMessage
              const messages = update.messages || [];
              const toolMsg = messages[messages.length - 1];
              
              if (toolMsg?.content) {
                const content = String(toolMsg.content);
                const preview = content.length > 150 ? content.slice(0, 150) + '...' : content;
                send({
                  type: 'node',
                  node: nodeName,
                  message: `✅ ${preview}`,
                });
              } else {
                send({
                  type: 'node',
                  node: nodeName,
                  message: '⚙️ Tool executed',
                });
              }
            } else if (nodeName === 'complete-task') {
              const completedCount = (update.plan ?? plan).filter((t: any) => t.completed).length;
              
              // Extract AI summary from messages
              const messages = update.messages || [];
              const summaryMsg = messages[messages.length - 1];
              const summary = summaryMsg?.content ? String(summaryMsg.content) : '';
              
              send({
                type: 'step',
                node: nodeName,
                message: `✅ Task ${completedCount}/${plan.length} complete: ${summary}`,
                data: { plan: update.plan },
              });
            } else if (nodeName === 'end-conclusion') {
              send({
                type: 'complete',
                node: nodeName,
                message: '🎉 All tasks complete!',
                data: { summary: update.summary },
              });
            }
          }

          send({ type: 'done', message: '🎉 Agent finished successfully.' });
        } catch (error) {
          console.error('Agent error:', error);
          send({
            type: 'error',
            message: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in agent API:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to run agent', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
