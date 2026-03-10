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
          const finalPlanner = await plannerGraph.invoke(plannerInputs);

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
              send({
                type: 'node',
                node: nodeName,
                message: '🔍 Analyzing and deciding next action...',
              });
            } else if (nodeName === 'take-action') {
              send({
                type: 'node',
                node: nodeName,
                message: '⚙️ Executing tool...',
              });
            } else if (nodeName === 'complete-task') {
              const completedCount = (update.plan ?? plan).filter((t: any) => t.completed).length;
              send({
                type: 'step',
                node: nodeName,
                message: `✅ Task completed (${completedCount}/${plan.length})`,
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
