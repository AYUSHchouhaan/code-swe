import { NextRequest } from 'next/server';
import path from 'path';
import { plannerGraph, programmerGraph } from '@/lib/agents/swe-langgraph';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Returns a human-readable label for a tool call based on its args */
function toolCallMessage(toolName: string, args: Record<string, any>): string {
  if (args.filePaths) return (args.filePaths as string[]).join(', ');
  if (args.filePath) return args.filePath;
  if (args.patterns) return (args.patterns as string[]).join(', ');
  if (args.query) return args.query;
  return toolName;
}

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
          send({ type: 'start', message: 'Starting SWE Agent...' });

          // Phase 1 - Planner Agent
          send({ type: 'phase', message: 'Phase 1: Planning...' });

          const plannerInputs = { query, repoPath };
          let finalPlanner: any = {};

          for await (const chunk of await plannerGraph.stream(plannerInputs, {
            streamMode: 'updates',
            recursionLimit: 100,
          })) {
            const nodeName = Object.keys(chunk)[0];
            const update = (chunk as any)[nodeName];
            finalPlanner = { ...finalPlanner, ...update };

            if (nodeName === 'generate-plan-context-action') {
              const messages = update.messages || [];
              const lastAIMsg = messages[messages.length - 1];

              if (lastAIMsg?.tool_calls && lastAIMsg.tool_calls.length > 0) {
                const toolCall = lastAIMsg.tool_calls[0];
                const args = toolCall.args || {};
                send({
                  type: 'tool_call',
                  tool: toolCall.name,
                  node: 'planner',
                  message: toolCallMessage(toolCall.name, args),
                  data: args,
                });
              } else if (lastAIMsg) {
                const content =
                  typeof lastAIMsg.content === 'string'
                    ? lastAIMsg.content
                    : JSON.stringify(lastAIMsg.content);
                send({
                  type: 'reasoning',
                  node: 'planner',
                  message: content,
                  data: { content },
                });
              }
            } else if (nodeName === 'take-action-context') {
              const messages = update.messages || [];
              const toolMsg = messages[messages.length - 1];
              if (toolMsg?.content) {
                const content = String(toolMsg.content);
                 send({
                  type: 'tool_result',
                  node: 'planner',
                  message: content,
                  data: { content },
                });
              }
            }
          }

          const plan: any[] = finalPlanner.plan ?? [];
          const notes: string = finalPlanner.notes ?? '';

          if (!plan.length) {
            send({ type: 'error', message: 'Planner produced no steps. Aborting.' });
            controller.close();
            return;
          }

          send({ type: 'result', node: 'generate-plan', message: `Plan ready - ${plan.length} step(s)`, data: { plan } });
          send({ type: 'result', node: 'generate-notes', message: 'Context notes captured', data: { notes } });

          // Phase 2 - Programmer Agent
          send({ type: 'phase', message: 'Phase 2: Implementing changes...' });

          const programmerInputs = { query, repoPath, plan, notes };

          for await (const chunk of await programmerGraph.stream(programmerInputs, {
            streamMode: 'updates',
            recursionLimit: 100,
          })) {
            const nodeName = Object.keys(chunk)[0];
            const update = (chunk as any)[nodeName];

            if (nodeName === 'generate-action') {
              const messages = update.messages || [];
              const lastAIMsg = messages[messages.length - 1];

              if (lastAIMsg?.tool_calls && lastAIMsg.tool_calls.length > 0) {
                const toolCall = lastAIMsg.tool_calls[0];
                const args = toolCall.args || {};
                send({
                  type: 'tool_call',
                  tool: toolCall.name,
                  node: 'programmer',
                  message: toolCallMessage(toolCall.name, args),
                  data: args,
                });
              } else if (lastAIMsg) {
                const content =
                  typeof lastAIMsg.content === 'string'
                    ? lastAIMsg.content
                    : JSON.stringify(lastAIMsg.content);
                send({
                  type: 'reasoning',
                  node: 'programmer',
                  message: content,
                  data: { content },
                });
              }
            } else if (nodeName === 'take-action') {
              const messages = update.messages || [];
              const toolMsg = messages[messages.length - 1];
              if (toolMsg?.content) {
                const content = String(toolMsg.content);
                send({
                  type: 'tool_result',
                  node: 'programmer',
                  message: content,
                  data: { content },
                });
              }
            } else if (nodeName === 'complete-task') {
              const updatedPlan = update.plan ?? plan;
              const completedCount = updatedPlan.filter((t: any) => t.completed).length;
              send({
                type: 'step',
                node: nodeName,
                message: `Task ${completedCount}/${updatedPlan.length} complete`,
                data: { plan: updatedPlan, completedCount, totalCount: updatedPlan.length },
              });
            } else if (nodeName === 'end-conclusion') {
              send({
                type: 'complete',
                node: nodeName,
                message: 'All tasks complete!',
                data: { summary: update.summary },
              });
            }
          }

          send({ type: 'done', message: 'Agent finished successfully.' });
        } catch (error) {
          console.error('Agent error:', error);
          send({
            type: 'error',
            message: error instanceof Error ? error.message : String(error),
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