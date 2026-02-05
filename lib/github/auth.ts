import { generateGitHubJWT } from "./jwt";

export interface GitHubInstallationToken {
  token: string;
  expires_at: string;
  permissions: Record<string, string>;
  repository_selection: string;
}

/**
 * Gets an installation access token for a GitHub App installation
 * This token can be used to access repositories the app is installed on
 */
export async function getInstallationToken(
  installationId: string,
  appId: string,
  privateKey: string
): Promise<GitHubInstallationToken> {
  const jwtToken = generateGitHubJWT(appId, privateKey);

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "GitHub-Repo-Downloader",
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to get installation token: ${response.status} ${JSON.stringify(errorData)}`
    );
  }

  const data = await response.json();
  return data;
}

/**
 * Simple function to get just the token string
 */
export async function getInstallationTokenString(
  installationId: string,
  appId: string,
  privateKey: string
): Promise<string> {
  const data = await getInstallationToken(installationId, appId, privateKey);
  return data.token;
}
