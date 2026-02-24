import { NextRequest } from 'next/server';
import path from 'path';
import { graph } from '@/lib/agents/swe-langgraph';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/agent/run
 * Runs the SWE agent with streaming updates using LangGraph streamMode: "updates"
 * Request body: { query: string, repoName: string }
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
    const indexFilePath = path.join(repoPath, '.codebase-index', 'index.json');
    const mapFilePath = path.join(repoPath, '.codebase-index', 'architecture.json');

    // Create a streaming response
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        // Helper function to send SSE updates
        const sendUpdate = (data: any) => {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        try {
          sendUpdate({
            type: 'start',
            message: '🚀 Starting SWE Agent...',
          });

          // Prepare initial state
          const inputs = {
            query,
            repoPath,
            indexFilePath,
            mapFilePath,
          };

          // Stream using LangGraph with streamMode: "updates"
          for await (const chunk of await graph.stream(inputs, {
            streamMode: "updates",
          })) {
            // chunk is an object with node name as key
            const nodeName = Object.keys(chunk)[0];
            const nodeUpdate = (chunk as any)[nodeName];

            // Send node-specific updates
            if (nodeName === 'query-breakdown' && nodeUpdate.subqueries) {
              sendUpdate({
                type: 'node',
                node: 'query-breakdown',
                message: `📝 Breaking down query...`,
              });
              sendUpdate({
                type: 'result',
                node: 'query-breakdown',
                message: `✓ Generated ${nodeUpdate.subqueries.length} subqueries`,
                data: { subqueries: nodeUpdate.subqueries },
              });
            } 
            
            else if (nodeName === 'search-agent' && nodeUpdate.relevantFilePaths) {
              sendUpdate({
                type: 'node',
                node: 'search-agent',
                message: `🔍 Searching for relevant files...`,
              });
              sendUpdate({
                type: 'result',
                node: 'search-agent',
                message: `✓ Found ${nodeUpdate.relevantFilePaths.length} relevant files`,
                data: { files: nodeUpdate.relevantFilePaths },
              });
            } 
            
            else if (nodeName === 'planning-agent' && nodeUpdate.planSteps) {
              sendUpdate({
                type: 'node',
                node: 'planning-agent',
                message: `📋 Creating implementation plan...`,
              });
              sendUpdate({
                type: 'result',
                node: 'planning-agent',
                message: `✓ Created plan with ${nodeUpdate.planSteps.length} steps`,
                data: { 
                  steps: nodeUpdate.planSteps.map((s: any) => ({
                    number: s.stepNumber,
                    description: s.description,
                    file: s.filePath,
                    action: s.action,
                  }))
                },
              });
            } 
            
            else if (nodeName === 'coding-agent') {
              const currentStep = nodeUpdate.currentStep;
              const planSteps = nodeUpdate.planSteps || [];
              const totalSteps = planSteps.length;
              
              if (currentStep > 0 && currentStep <= totalSteps) {
                const step = planSteps[currentStep - 1];
                sendUpdate({
                  type: 'step',
                  node: 'coding-agent',
                  message: `💻 Step ${currentStep}/${totalSteps}: ${step.description}`,
                  data: { 
                    step: currentStep, 
                    total: totalSteps,
                    file: step.filePath,
                    action: step.action,
                  },
                });
              }

              // Check if completed
              if (nodeUpdate.completed) {
                const modifiedFiles = Object.keys(nodeUpdate.workingTree || {});
                sendUpdate({
                  type: 'complete',
                  message: `✅ All ${totalSteps} steps completed!`,
                  data: {
                    modifiedFiles,
                    totalSteps,
                  },
                });
              }
            }
          }

          controller.close();
        } catch (error) {
          console.error('Error in agent execution:', error);
          sendUpdate({
            type: 'error',
            message: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
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
