# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Create GitHub OAuth App
Visit: https://github.com/settings/developers
- Click "New OAuth App"
- Homepage: `http://localhost:3000`
- Callback: `http://localhost:3000/api/auth/callback/github`

### 2. Configure Environment
```bash
# Copy example file
cp .env.local.example .env.local

# Generate secret (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Edit .env.local with your values
```

### 3. Run the App
```bash
npm install
npm run dev
```

Visit http://localhost:3000 and sign in with GitHub!

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth handler
│   │   └── download-repo/route.ts        # Download endpoint
│   ├── download/page.tsx                 # Protected download page
│   └── page.tsx                          # Public landing page
├── lib/
│   ├── auth/next-auth.ts                 # Auth configuration
│   └── github/download.ts                # Download logic
├── components/
│   └── auth-provider.tsx                 # Session provider
├── public/
│   └── downloads/                        # Downloaded repos
└── types/
    └── next-auth.d.ts                    # TypeScript definitions
```

## 🔑 Key Features

- **GitHub OAuth**: Secure authentication with NextAuth
- **Session Management**: Server-side session handling
- **Token Storage**: Access tokens stored securely in session
- **Repository Downloads**: Save to `public/downloads/` folder
- **Repo Scope**: Full access for future PR functionality
- **Dark Mode**: Automatic theme support
- **Protected Routes**: Download page requires authentication

## 🛠️ Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXTAUTH_URL` | Your app URL (http://localhost:3000) |
| `NEXTAUTH_SECRET` | Random secret for JWT encryption |
| `GITHUB_CLIENT_ID` | OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | OAuth app client secret |

## 📝 Usage Flow

1. User lands on home page → [app/page.tsx](app/page.tsx)
2. Click "Sign in with GitHub" → NextAuth OAuth flow
3. GitHub redirects to callback → Session created
4. User redirected to download page → [app/download/page.tsx](app/download/page.tsx)
5. Enter repo details and download → API route uses user's token
6. Repository saved to `public/downloads/{owner}-{repo}-{timestamp}/`

## 🔐 OAuth Scopes Explained

- `read:user` → Read profile information
- `user:email` → Access email addresses  
- `repo` → Full repository access (download + future PRs)

## ⚠️ Important Notes

- Never commit `.env.local` to git
- Downloaded repos are git-ignored automatically
- Access tokens are server-side only (secure)
- Users can only download repos they have access to
- Public folder allows direct file access

## 🐛 Common Issues

**"Unauthorized" error**
→ Sign out and sign in again, check OAuth app settings

**Callback URL mismatch**
→ Verify callback URL in GitHub matches exactly

**Can't see downloads**
→ Check `public/downloads/` folder, verify write permissions

**Session not persisting**
→ Regenerate `NEXTAUTH_SECRET`, restart dev server

For detailed setup instructions, see [SETUP.md](SETUP.md)
