import * as jwt from "jsonwebtoken";

/**
 * Generates a JWT for GitHub App authentication
 * Valid for 10 minutes
 */
export function generateGitHubJWT(appId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iat: now - 60, // Issued at time (60 seconds in the past to allow for clock drift)
    exp: now + 10 * 60, // Expires in 10 minutes
    iss: appId, // GitHub App ID
  };

  // Convert escaped newlines to actual newlines
  const formattedKey = privateKey.replace(/\\n/g, "\n");

  return jwt.sign(payload, formattedKey, { algorithm: "RS256" });
}
