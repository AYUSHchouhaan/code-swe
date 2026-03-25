import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

function listFilesRecursive(dir: string, base: string): FileNode[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const result: FileNode[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(base, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      result.push({
        name: entry.name,
        path: relativePath,
        type: 'directory',
        children: listFilesRecursive(fullPath, base),
      });
    } else {
      result.push({
        name: entry.name,
        path: relativePath,
        type: 'file',
      });
    }
  }
  return result;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const repoName = searchParams.get('repoName');
  const filePath = searchParams.get('filePath');

  if (!repoName) {
    return NextResponse.json({ error: 'repoName is required' }, { status: 400 });
  }

  const downloadsDir = path.join(process.cwd(), 'public', 'downloads');
  const repoDir = path.resolve(downloadsDir, repoName);

  // Security: ensure repoDir is within downloads directory (prevent path traversal)
  if (!repoDir.startsWith(downloadsDir + path.sep) && repoDir !== downloadsDir) {
    return NextResponse.json({ error: 'Invalid repository name' }, { status: 400 });
  }

  if (!fs.existsSync(repoDir)) {
    return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
  }

  if (filePath) {
    const resolvedFile = path.resolve(repoDir, filePath);

    // Security: ensure the resolved path is within the repo directory
    if (!resolvedFile.startsWith(repoDir + path.sep) && resolvedFile !== repoDir) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    try {
      const content = fs.readFileSync(resolvedFile, 'utf-8');
      return NextResponse.json({ content });
    } catch {
      return NextResponse.json({ error: 'File could not be read' }, { status: 500 });
    }
  }

  const tree = listFilesRecursive(repoDir, repoDir);
  return NextResponse.json({ tree });
}
