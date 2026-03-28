import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/next-auth";
import { downloadRepository } from "@/lib/github/download";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    
    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in with GitHub." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { owner, repo, branch, ref } = body;

    // Trim whitespace from inputs
    const trimmedOwner = owner?.trim();
    const trimmedRepo = repo?.trim();
    const trimmedBranch = branch?.trim();
    const trimmedRef = ref?.trim();

    if (!trimmedOwner || !trimmedRepo) {
      return NextResponse.json(
        { error: "Missing required fields: owner and repo" },
        { status: 400 }
      );
    }

    // Download to public folder so it's accessible
    const destination = path.join(
      process.cwd(),
      "public",
      "downloads",
      trimmedRepo
    );

    console.log(`Downloading ${trimmedOwner}/${trimmedRepo} to ${destination}...`);

    // Verify repository exists and is accessible
    try {
      const repoCheckResponse = await fetch(
        `https://api.github.com/repos/${trimmedOwner}/${trimmedRepo}`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "GitHub-Repo-Downloader",
          },  
        }
      );

      if (!repoCheckResponse.ok) {
        const errorData = await repoCheckResponse.json().catch(() => ({}));
        let errorMessage = `Repository ${trimmedOwner}/${trimmedRepo} not found or not accessible`;
        
        if (repoCheckResponse.status === 404) {
          errorMessage = `Repository ${trimmedOwner}/${trimmedRepo} does not exist or you don't have access to it. Please check the owner and repository name.`;
        } else if (repoCheckResponse.status === 401) {
          errorMessage = "Authentication failed. Please sign out and sign in again.";
        }
        
        return NextResponse.json(
          { success: false, error: errorMessage },
          { status: repoCheckResponse.status }
        );
      }

      const repoData = await repoCheckResponse.json();
      console.log(`Repository verified: ${repoData.full_name}, default branch: ${repoData.default_branch}`);
    } catch (error) {
      console.error("Error verifying repository:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to verify repository access",
        },
        { status: 500 }
      );
    }

    const result = await downloadRepository({
      owner: trimmedOwner,
      repo: trimmedRepo,
      branch: trimmedBranch,
      ref: trimmedRef,
      token: session.accessToken,
      destinationPath: destination,
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
