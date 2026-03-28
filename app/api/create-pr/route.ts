import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/next-auth';
import fs from 'fs';
import path from 'path';

/** Recursively collect all file paths under a directory */
function collectFiles(dir: string, base: string): { relativePath: string; absolutePath: string }[] {
  const results: { relativePath: string; absolutePath: string }[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.join(base, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      results.push(...collectFiles(abs, rel));
    } else {
      results.push({ relativePath: rel, absolutePath: abs });
    }
  }
  return results;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { owner, repoName, branchName, prTitle, prBody } = await request.json();

  if (!owner || !repoName) {
    return NextResponse.json({ error: 'owner and repoName are required' }, { status: 400 });
  }

  const token = session.accessToken as string;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'SWE-Agent',
    'Content-Type': 'application/json',
  };

  try {
    //  Get the default branch and its latest commit SHA
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, { headers });
    if (!repoRes.ok) throw new Error(`Repo not found: ${repoRes.status}`);
    const repoData = await repoRes.json();
    const defaultBranch: string = repoData.default_branch;

    const refRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/refs/heads/${defaultBranch}`,
      { headers }
    );
    if (!refRes.ok) throw new Error(`Could not get ref: ${refRes.status}`);
    const refData = await refRes.json();
    const baseSha: string = refData.object.sha;

    //  Get the base tree SHA from the commit
    const commitRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/commits/${baseSha}`,
      { headers }
    );
    if (!commitRes.ok) throw new Error(`Could not get commit: ${commitRes.status}`);
    const commitData = await commitRes.json();
    const baseTreeSha: string = commitData.tree.sha;

    // 3. Read all local files and create blobs
    const localRepoPath = path.join(process.cwd(), 'public', 'downloads', repoName);
    if (!fs.existsSync(localRepoPath)) {
      return NextResponse.json({ error: `Local repo not found at public/downloads/${repoName}` }, { status: 400 });
    }

    const files = collectFiles(localRepoPath, '');

    const treeItems: { path: string; mode: string; type: string; sha: string }[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file.absolutePath);
      const base64Content = content.toString('base64');

      const blobRes = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/git/blobs`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ content: base64Content, encoding: 'base64' }),
        }
      );
      if (!blobRes.ok) throw new Error(`Failed to create blob for ${file.relativePath}`);
      const blobData = await blobRes.json();

      treeItems.push({
        path: file.relativePath,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha,
      });
    }

    //  Create a new tree
    const newTreeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/trees`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
      }
    );
    if (!newTreeRes.ok) throw new Error(`Failed to create tree: ${newTreeRes.status}`);
    const newTreeData = await newTreeRes.json();

    // Create a new commit
    const newCommitRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/commits`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: prTitle || 'Apply SWE agent changes',
          tree: newTreeData.sha,
          parents: [baseSha],
        }),
      }
    );
    if (!newCommitRes.ok) throw new Error(`Failed to create commit: ${newCommitRes.status}`);
    const newCommitData = await newCommitRes.json();

    //  Create new branch pointing to the new commit
    const newBranch = branchName || `swe-agent-${Date.now()}`;
    const createBranchRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/refs`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: newCommitData.sha }),
      }
    );
    if (!createBranchRes.ok) throw new Error(`Failed to create branch: ${createBranchRes.status}`);

    // 7. Create the pull request
    const prRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/pulls`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: prTitle || 'SWE Agent: Apply changes',
          body: prBody || 'Changes applied by the SWE Agent.',
          head: newBranch,
          base: defaultBranch,
        }),
      }
    );
    if (!prRes.ok) {
      const errData = await prRes.json().catch(() => ({}));
      throw new Error(`Failed to create PR: ${prRes.status} ${JSON.stringify(errData)}`);
    }
    const prData = await prRes.json();

    return NextResponse.json({ success: true, prUrl: prData.html_url, branch: newBranch });
  } catch (error) {
    console.error('create-pr error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
