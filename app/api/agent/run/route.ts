import { NextRequest } from 'next/server';
import path from 'path';
import { plannerGraph, programmerGraph } from '@/lib/agents/swe-langgraph';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

            if (nodeName === 'generate-plan-action') {
              const messages = update.messages || [];
              const lastAIMsg = messages[messages.length - 1];

              if (lastAIMsg?.tool_calls && lastAIMsg.tool_calls.length > 0) {
                const toolCall = lastAIMsg.tool_calls[0];
                const args = toolCall.args || {};
                send({
                  type: 'tool_call',
                  tool: toolCall.name,
                  node: 'planner',
                  data: args,
                });
              } else if (lastAIMsg) {
                const content =
                  typeof lastAIMsg.content === 'string'
                    ? lastAIMsg.content
                    : JSON.stringify(lastAIMsg.content);
                if (content.trim()) {
                  send({
                    type: 'reasoning',
                    node: 'planner',
                    data: { content },
                  });
                }
              }
            } else if (nodeName === 'take-plan-action') {
              const messages = update.messages || [];
              const toolMsg = messages[messages.length - 1];
              if (toolMsg?.content) {
                const content = String(toolMsg.content);
                send({
                  type: 'tool_result',
                  tool: (toolMsg as any).name ?? undefined,
                  node: 'planner',
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

          send({ type: 'result', node: 'generate-plan', data: { plan } });
          send({ type: 'result', node: 'generate-notes', data: { notes } });

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
                  data: args,
                });
              } else if (lastAIMsg) {
                const content =
                  typeof lastAIMsg.content === 'string'
                    ? lastAIMsg.content
                    : JSON.stringify(lastAIMsg.content);
                if (content.trim()) {
                  send({
                    type: 'reasoning',
                    node: 'programmer',
                    data: { content },
                  });
                }
              }
            } else if (nodeName === 'take-action') {
              const messages = update.messages || [];
              const toolMsg = messages[messages.length - 1];
              if (toolMsg?.content) {
                const content = String(toolMsg.content);
                send({
                  type: 'tool_result',
                  tool: (toolMsg as any).name ?? undefined,
                  node: 'programmer',
                  data: { content },
                });
              }
            } else if (nodeName === 'complete-task') {
              const updatedPlan = update.plan ?? plan;
              const completedCount = updatedPlan.filter((t: any) => t.completed).length;
              send({
                type: 'step',
                node: nodeName,
                data: { plan: updatedPlan, completedCount, totalCount: updatedPlan.length },
              });
            } else if (nodeName === 'end-conclusion') {
              send({
                type: 'complete',
                node: nodeName,
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