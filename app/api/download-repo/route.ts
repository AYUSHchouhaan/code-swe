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

    if (!owner || !repo) {
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
      `${owner}-${repo}-${Date.now()}`
    );

    console.log(`Downloading ${owner}/${repo} to ${destination}...`);

    const result = await downloadRepository({
      owner,
      repo,
      branch,
      ref,
      token: session.accessToken,
      destinationPath: destination,
      format: "zip",
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
