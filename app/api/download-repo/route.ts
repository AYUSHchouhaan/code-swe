import { NextRequest, NextResponse } from "next/server";
import { downloadRepositoryWithApp } from "@/lib/github";
import path from "path";

/**
 * API Route to download a GitHub repository
 * POST /api/download-repo
 * 
 * Body:
 * {
 *   "owner": "owner-name",
 *   "repo": "repo-name",
 *   "branch": "main" (optional),
 *   "ref": "commit-sha-or-tag" (optional),
 *   "destinationPath": "/path/to/save" (optional, defaults to temp)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, repo, branch, ref, destinationPath } = body;

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Missing required fields: owner and repo" },
        { status: 400 }
      );
    }

    // Use provided destination or create temp directory
    const destination =
      destinationPath ||
      path.join(process.cwd(), "temp", "repos", `${owner}-${repo}-${Date.now()}`);

    console.log(`Downloading ${owner}/${repo} to ${destination}...`);

    const result = await downloadRepositoryWithApp(owner, repo, destination, {
      branch,
      ref,
      format: "zip", // or "tar"
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        path: result.path,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error downloading repository:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
