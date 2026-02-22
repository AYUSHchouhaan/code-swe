import { ChatOllama } from '@langchain/ollama';
import { z } from 'zod';
import fs from 'fs';
import type { AgentState } from '../types';

/**
 * Node 2: Search Agent
 * Takes subqueries + index file + map file, finds relevant file paths
 */
export async function searchAgentNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log('\n=== NODE 2: Search Agent ===');
  console.log('Searching for relevant files...');

  // Load index and map data
  const indexData = JSON.parse(fs.readFileSync(state.indexFilePath, 'utf-8'));
  const mapData = JSON.parse(fs.readFileSync(state.mapFilePath, 'utf-8'));

  // Create Ollama LLM instance
  const llm = new ChatOllama({
    model: 'llama3.2',
    temperature: 0.2,
    baseUrl: 'http://localhost:11434',
    format: 'json',
  });

  // Define Zod schema for search results
  const searchResultSchema = z.object({
    relevantFiles: z.array(z.string()).describe('List of file paths that are relevant to the queries'),
    reasoning: z.string().describe('Brief explanation of why these files were selected'),
  });

  // Create structured LLM
  const structuredLlm = llm.withStructuredOutput(searchResultSchema);

  const systemPrompt = `You are an expert code navigator. Given search queries and a codebase index, identify the most relevant files.

Analyze:
- File types and purposes
- Function names and descriptions
- Imports and exports
- Routes and models
- Keywords

Return a focused list of file paths (5-15 files) that are most relevant to the search queries.`;

  const userMessage = `Search Queries:
${state.subqueries.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Codebase Index:
${JSON.stringify(indexData, null, 2)}

Architecture Map:
${JSON.stringify(mapData, null, 2)}

Find the most relevant files for addressing these queries.`;

  // Invoke LLM
  const result = await structuredLlm.invoke([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ]);

  console.log('Found', result.relevantFiles.length, 'relevant files');
  console.log('Reasoning:', result.reasoning);
  result.relevantFiles.forEach((f) => console.log(`  - ${f}`));

  return {
    relevantFilePaths: result.relevantFiles,
  };
}
