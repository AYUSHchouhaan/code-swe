import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Generates a directory tree for the given repo path.
 * Skips common noisy directories (node_modules, .git, dist, etc.).
 */
export async function generateCodebaseTree(repoPath: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      'tree',
      ['-I', 'node_modules|.git|dist|build|.next|out|.turbo|.vercel|.cache|__pycache__', '--charset', 'ascii'],
      { cwd: repoPath, maxBuffer: 1024 * 512 }
    );
    return stdout.trim();
  } catch {
    try {
      const { stdout } = await execFileAsync(
        'cmd',
        ['/c', 'tree', '/F', '/A'],
        { cwd: repoPath, maxBuffer: 1024 * 512 }
      );
      const filtered = stdout
        .split('\n')
        .filter((line) => !/node_modules|\.git|dist[/\\]|build[/\\]|\.next/.test(line))
        .join('\n');
      return filtered.trim();
    } catch {
      return '(tree command unavailable)';
    }
  }
}
