# GitHub Repository Download Implementation

This implementation allows you to download GitHub repositories on your server using the GitHub API (no git required).

## Setup

### 1. Install Dependencies

```bash
npm install jsonwebtoken extract-zip tar
npm install --save-dev @types/jsonwebtoken @types/tar
```

### 2. Create a GitHub App

1. Go to https://github.com/settings/apps
2. Click "New GitHub App"
3. Fill in the required fields:
   - **Name**: Your app name
   - **Homepage URL**: Your website
   - **Webhook**: Can disable if not needed
4. **Permissions** (Repository):
   - Contents: Read-only (to download code)
   - Metadata: Read-only
5. Click "Create GitHub App"
6. Note your **App ID**
7. Generate and download a **private key** (scroll down to "Private keys" section)

### 3. Install the GitHub App

1. Go to your app's settings
2. Click "Install App" in the left sidebar
3. Choose which repositories to give access to
4. After installation, note the **Installation ID** from the URL:
   - URL format: `https://github.com/settings/installations/{INSTALLATION_ID}`

### 4. Configure Environment Variables

Create a `.env.local` file:

```bash
GITHUB_APP_ID=123456
GITHUB_APP_INSTALLATION_ID=12345678
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
...your private key content...
-----END RSA PRIVATE KEY-----"
```

**Note**: You can keep newlines in the private key or use `\n` to escape them.

## Usage

### Option 1: API Route (Recommended)

```bash
# Call the API endpoint
curl -X POST http://localhost:3000/api/download-repo \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "facebook",
    "repo": "react",
    "branch": "main"
  }'
```

### Option 2: Direct Function Call

```typescript
import { downloadRepositoryWithApp } from "@/lib/github";
import path from "path";

// Download a repository
const result = await downloadRepositoryWithApp(
  "facebook",
  "react",
  path.join(process.cwd(), "downloaded-repos", "react"),
  {
    branch: "main", // optional
    format: "zip", // or "tar"
  }
);

if (result.success) {
  console.log("Downloaded to:", result.path);
} else {
  console.error("Download failed:", result.message);
}
```

### Option 3: With Custom Token

```typescript
import { downloadRepository, getInstallationTokenString } from "@/lib/github";

// Get token first
const token = await getInstallationTokenString(
  process.env.GITHUB_APP_INSTALLATION_ID!,
  process.env.GITHUB_APP_ID!,
  process.env.GITHUB_PRIVATE_KEY!
);

// Download repository
const result = await downloadRepository({
  owner: "microsoft",
  repo: "vscode",
  ref: "1.85.0", // specific tag or commit SHA
  token: token,
  destinationPath: "/path/to/destination",
  format: "zip",
});
```

## API Reference

### `downloadRepositoryWithApp()`

Downloads a repository using GitHub App authentication.

```typescript
downloadRepositoryWithApp(
  owner: string,
  repo: string,
  destinationPath: string,
  options?: {
    branch?: string;      // Branch name (e.g., "main")
    ref?: string;         // Commit SHA or tag (takes priority over branch)
    format?: "zip" | "tar"; // Archive format (default: "zip")
    installationId?: string;
    appId?: string;
    privateKey?: string;
  }
): Promise<DownloadResult>
```

### `downloadRepository()`

Downloads a repository with a provided token.

```typescript
downloadRepository({
  owner: string;
  repo: string;
  branch?: string;
  ref?: string;
  token: string;
  destinationPath: string;
  format?: "zip" | "tar";
}): Promise<DownloadResult>
```

### `getInstallationTokenString()`

Gets a GitHub App installation access token.

```typescript
getInstallationTokenString(
  installationId: string,
  appId: string,
  privateKey: string
): Promise<string>
```

## Features

✅ **No Git Required** - Works on any server, even without git installed  
✅ **Secure Authentication** - Uses GitHub App installation tokens  
✅ **API-Based** - Downloads via GitHub's REST API  
✅ **Multiple Formats** - Supports both ZIP and TAR archives  
✅ **Flexible** - Download by branch, tag, or commit SHA  
✅ **Auto-Extract** - Automatically extracts archives  
✅ **Clean Structure** - Removes GitHub's wrapper directory  

## Advantages Over Git Clone

1. **No Git Installation Required** - Works in any Node.js environment
2. **Faster** - Direct archive download is faster than git clone for large repos
3. **Simpler** - No need to manage git credentials or SSH keys
4. **Lightweight** - Downloaded repo doesn't include .git directory
5. **Server-Friendly** - Perfect for serverless and containerized environments

## Security Notes

- ✅ Tokens are generated on-demand and expire in 10 minutes
- ✅ Private key never leaves the server
- ✅ Tokens are never exposed to the client
- ✅ Supports repository-level access control via GitHub App permissions

## Troubleshooting

### "Failed to get installation token"
- Verify your `GITHUB_APP_ID` is correct
- Check that your private key is properly formatted (with `\n` or actual newlines)
- Ensure your GitHub App has the necessary permissions

### "Failed to download repository"
- Verify the repository exists and is accessible
- Check that your GitHub App is installed on the repository
- Ensure the branch/ref name is correct

### "Permission denied"
- Your GitHub App needs "Contents: Read" permission
- Make sure the app is installed on the target repository/organization

## Example: Download Multiple Repositories

```typescript
const repos = [
  { owner: "facebook", repo: "react" },
  { owner: "vercel", repo: "next.js" },
  { owner: "microsoft", repo: "typescript" },
];

for (const { owner, repo } of repos) {
  const result = await downloadRepositoryWithApp(
    owner,
    repo,
    path.join(process.cwd(), "repos", repo)
  );
  
  console.log(`${repo}: ${result.success ? "✓" : "✗"}`);
}
```
