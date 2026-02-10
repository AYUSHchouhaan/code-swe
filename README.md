# GitHub Repository Downloader with NextAuth

A Next.js application that allows users to download GitHub repositories using their own GitHub OAuth token. Users authenticate with GitHub, and the application uses their access token to download repositories to the public folder.

## Features

- 🔐 GitHub OAuth authentication with NextAuth
- 📦 Download any GitHub repository you have access to
- 💾 Repositories saved to `public/downloads` folder
- 🎨 Modern UI with dark mode support
- 🔮 Ready for future PR functionality (repo scope included)

## Setup Instructions

### 1. Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: GitHub Repo Downloader (or your choice)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click "Register application"
5. Note your **Client ID**
6. Generate a new **Client Secret** and save it securely

### 2. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your credentials:
   ```env
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-here-generate-with-command-below
   GITHUB_CLIENT_ID=your_github_oauth_client_id
   GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
   ```

3. Generate a secure NextAuth secret:
   ```bash
   # On Linux/Mac:
   openssl rand -base64 32
   
   # On Windows (PowerShell):
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
   ```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Sign In**: Click "Sign in with GitHub" on the home page
2. **Authorize**: Grant the application access to your GitHub account
3. **Download**: Enter a repository owner and name, then click "Download Repository"
4. **Access Files**: Downloaded repositories are saved to `public/downloads/` folder

## How It Works

1. Users authenticate with GitHub OAuth via NextAuth
2. The application receives an access token with `repo` scope
3. When downloading, the user's token is used to access GitHub API
4. Repositories are downloaded as ZIP archives and extracted to `public/downloads/`
5. Users can download any public repo or private repos they have access to

## OAuth Scopes

The application requests the following GitHub scopes:
- `read:user` - Read user profile information
- `user:email` - Access user email addresses
- `repo` - Full control of private repositories (needed for downloading and future PR functionality)

## Project Structure

```
app/
  ├── api/
  │   ├── auth/[...nextauth]/   # NextAuth API routes
  │   └── download-repo/        # Repository download endpoint
  ├── download/                 # Download page (authenticated)
  └── page.tsx                  # Landing page with sign in
lib/
  ├── auth/
  │   └── next-auth.ts         # NextAuth configuration
  └── github/
      ├── download.ts          # Repository download logic
      └── auth.ts              # GitHub App authentication (legacy)
components/
  └── auth-provider.tsx        # Session provider wrapper
```

## Security Notes

- Never commit `.env.local` to version control
- Keep your Client Secret secure
- The `repo` scope grants full access to repositories - only grant to trusted applications
- Access tokens are stored server-side in the session

## Future Enhancements

- ✅ GitHub OAuth authentication
- ✅ Repository downloads to public folder
- 🔜 Create Pull Requests on behalf of users
- 🔜 Repository browsing interface
- 🔜 Download history and management
- 🔜 Batch repository operations

## Troubleshooting

### "Unauthorized" error when downloading
- Make sure you're signed in with GitHub
- Check that your OAuth app is properly configured
- Verify the callback URL matches exactly

### Downloads not appearing
- Check the `public/downloads/` folder in your project
- Make sure the server has write permissions
- Check the browser console and server logs for errors

### OAuth callback errors
- Verify the callback URL in your GitHub OAuth app settings
- Make sure `NEXTAUTH_URL` matches your actual URL
- Check that all environment variables are set correctly

## License

MIT
