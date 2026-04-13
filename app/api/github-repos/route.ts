import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/next-auth';

/**
 * GET /api/github-repos
 * Returns all repos accessible to the authenticated GitHub user.
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allRepos: any[] = [];
    let page = 1;

    while (true) {
      const response = await fetch(
        `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const repos = await response.json();
      if (!Array.isArray(repos) || repos.length === 0) break;

      allRepos.push(
        ...repos.map((r: any) => ({
          id: r.id,
          name: r.name,
          full_name: r.full_name,
          owner: r.owner.login,
          description: r.description,
          private: r.private,
          default_branch: r.default_branch,
          language: r.language,
          stargazers_count: r.stargazers_count,
          updated_at: r.updated_at,
          html_url: r.html_url,
        }))
      );

      if (repos.length < 100) break;
      page++;
    }

    return NextResponse.json({ success: true, repos: allRepos });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch repositories', details: String(error) },
      { status: 500 }
    );
  }
}
