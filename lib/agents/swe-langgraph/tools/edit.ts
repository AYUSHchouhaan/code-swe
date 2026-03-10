import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

/**
 * Creates an edit tool that does string-replace on files.
 * - If the file exists: replaces oldString with newString.
 * - If the file doesn't exist: creates it with newString as content (oldString is ignored).
 * Works like GitHub Copilot's +/- diff — even new files go through "edit".
 */
export function createEditTool(repoPath: string) {
  return tool(
    async ({
      filePath,
      oldString,
      newString,
    }: {
      filePath: string;
      oldString: string;
      newString: string;
    }) => {
      try {
        const fullPath = path.join(repoPath, filePath);

        if (fs.existsSync(fullPath)) {
          // File exists — do string replace
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (!content.includes(oldString)) {
            return `Error: The oldString was not found in "${filePath}". Make sure it matches exactly.`;
          }
          const newContent = content.replace(oldString, newString);
          fs.writeFileSync(fullPath, newContent, 'utf-8');
          return `Successfully updated "${filePath}".`;
        } else {
          // File doesn't exist — create it with newString as content
          const dir = path.dirname(fullPath);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(fullPath, newString, 'utf-8');
          return `Created new file "${filePath}".`;
        }
      } catch (error) {
        return `Error editing "${filePath}": ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    {
      name: 'edit',
      description:
        'Edit a file by replacing oldString with newString. If the file does not exist, it will be created with newString as its content (oldString can be empty for new files).',
      schema: z.object({
        filePath: z.string().describe('File path relative to the repo root'),
        oldString: z.string().describe('The exact string to replace (empty string for new files)'),
        newString: z.string().describe('The new string to insert (full file content for new files)'),
      }),
    }
  );
}
