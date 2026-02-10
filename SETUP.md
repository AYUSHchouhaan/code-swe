# GitHub OAuth Setup Guide

This guide will walk you through setting up GitHub OAuth authentication for the repository downloader.

## Step 1: Create a GitHub OAuth Application

1. **Navigate to GitHub Settings**
   - Go to https://github.com/settings/developers
   - Click on "OAuth Apps" in the left sidebar
   - Click "New OAuth App" button

2. **Fill in Application Details**
   
   | Field | Value |
   |-------|-------|
   | Application name | GitHub Repo Downloader |
   | Homepage URL | http://localhost:3000 |
   | Application description | Download GitHub repositories with OAuth |
   | Authorization callback URL | http://localhost:3000/api/auth/callback/github |

3. **Register the Application**
   - Click "Register application"
   - You'll see your **Client ID** on the next page
   - Click "Generate a new client secret"
   - **Important**: Copy the client secret immediately - you won't be able to see it again!

## Step 2: Set Up Environment Variables

1. **Copy the example file**
   ```powershell
   # Windows PowerShell
   Copy-Item .env.local.example .env.local
   ```
   
   ```bash
   # Mac/Linux
   cp .env.local.example .env.local
   ```

2. **Generate NextAuth Secret**
   
   Run one of these commands to generate a secure random secret:
   
   ```powershell
   # Windows PowerShell
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
   ```
   
   ```bash
   # Mac/Linux
   openssl rand -base64 32
   ```

3. **Edit .env.local**
   
   Open the `.env.local` file and fill in these values:
   
   ```env
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=<paste-the-generated-secret-here>
   GITHUB_CLIENT_ID=<your-client-id-from-step-1>
   GITHUB_CLIENT_SECRET=<your-client-secret-from-step-1>
   ```

## Step 3: Install Dependencies and Run

1. **Install packages**
   ```bash
   npm install
   ```

2. **Start the development server**
   ```bash
   npm run dev
   ```

3. **Open the application**
   - Navigate to http://localhost:3000
   - Click "Sign in with GitHub"
   - Authorize the application
   - Start downloading repositories!

## Understanding OAuth Scopes

The application requests these permissions:
- **read:user** - To read your basic profile information
- **user:email** - To access your email address
- **repo** - Full access to repositories (for downloading and future PR creation)

## For Production Deployment

When deploying to production (e.g., Vercel, Netlify):

1. **Create a new GitHub OAuth App** with production URLs:
   - Homepage URL: `https://your-domain.com`
   - Callback URL: `https://your-domain.com/api/auth/callback/github`

2. **Update environment variables** in your hosting platform:
   - Set `NEXTAUTH_URL` to your production URL
   - Use a different `NEXTAUTH_SECRET` for production
   - Add your production OAuth credentials

3. **Security considerations**:
   - Never expose your client secret
   - Use HTTPS in production
   - Rotate secrets regularly
   - Monitor OAuth app activity in GitHub settings

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Check that the callback URL in your OAuth app matches exactly
- Make sure `NEXTAUTH_URL` is set correctly
- Verify there are no trailing slashes

### Error: "Unauthorized" when downloading
- Ensure you've signed in successfully
- Check if the OAuth app has the correct scopes
- Try signing out and back in

### Session issues
- Clear browser cookies
- Regenerate `NEXTAUTH_SECRET`
- Restart the development server after changing `.env.local`

### Can't see environment variables
- Make sure `.env.local` exists in the project root
- Restart the Next.js dev server after creating/editing `.env.local`
- Check that variable names match exactly (case-sensitive)

## Additional Resources

- [NextAuth.js Documentation](https://next-auth.js.org/getting-started/introduction)
- [GitHub OAuth Apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
- [OAuth 2.0 Scopes for GitHub](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)
