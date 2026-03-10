import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

/**
 * Creates a read tool that reads and returns the content of a file.
 */
export function createReadTool(repoPath: string) {
  return tool(
    async ({ filePath }: { filePath: string }) => {
      try {
        const fullPath = path.join(repoPath, filePath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        return `=== ${filePath} ===\n${content}`;
      } catch (error) {
        return `Error reading "${filePath}": ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    {
      name: 'read',
      description: 'Read the full content of a file. Provide the path relative to the repo root.',
      schema: z.object({
        filePath: z.string().describe('File path relative to the repo root (e.g. "src/index.ts")'),
      }),
    }
  );
}
