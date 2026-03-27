# SWE Agent

A Next.js app that runs a two-phase AI software engineering agent on a GitHub repository. You log in with GitHub, pick a repo, describe what you want, and the agent reads the code, makes a plan, then edits the files — all streamed live to the browser.

---

## GitHub Login

Auth is handled by NextAuth with the GitHub provider (`lib/auth/next-auth.ts`). The scope requested is `read:user user:email repo` so the app can read private repos.

After sign-in the GitHub access token is stored in the JWT and forwarded into the session:

```ts
// lib/auth/next-auth.ts
callbacks: {
  async jwt({ token, account }) {
    if (account) token.accessToken = account.access_token;
    return token;
  },
  async session({ session, token }) {
    session.accessToken = token.accessToken;
    return session;
  },
},
```

The token is then used in `lib/github/` to call the GitHub API and download the chosen repo into `public/downloads/<repo-name>/`.

---

## How the Graph Works

The agent is built with **LangGraph** and runs in two sequential phases, both triggered from a single POST to `/api/agent/run`.

```
User query + repo path
        ¦
        ?
+------------------+
¦   Planner Graph  ¦  ? Phase 1
+------------------+
        ¦  produces: plan[] + notes
        ?
+------------------+
¦ Programmer Graph ¦  ? Phase 2
+------------------+
        ¦  produces: edited files + summary
        ?
     Done
```

### Planner Graph

`lib/agents/swe-langgraph/planner/graph.ts`

Explores the repo and produces a step-by-step plan.

```
START
  ¦
  ?
generate-plan-context-action   ? LLM decides what to look at next
  ¦
  +- tool call (glob/grep/read) --? take-action-context --+
  ¦                                                        ¦ (loop back)
  +- no tool call --? reasoning-thinking -----------------+
  ¦
  +- complete_planning tool --? generate-plan --? generate-notes --? END
```

State: `{ query, repoPath, messages[], plan[], notes }`

The LLM loops through `generate-plan-context-action ? take-action-context` until it calls `complete_planning`, at which point the plan is written and notes are captured.

### Programmer Graph

`lib/agents/swe-langgraph/programmer/graph.ts`

Takes the plan from the planner and executes each task one by one.

```
START
  ¦
  ?
generate-action               ? LLM picks the next action for the current task
  ¦
  +- tool call (read/edit/create/glob/grep) --? take-action --+
  ¦                                                            ¦ (loop back)
  +- no tool call --? reasoning-thinking ---------------------+
  ¦
  +- mark_task_complete --? complete-task
                                ¦
                                +- tasks remaining --? generate-action (next task)
                                ¦
                                +- all done --? end-conclusion --? END
```

State: `{ query, repoPath, plan[], notes, messages[], summary, taskActionsCount }`

---

## Tools

Both graphs share the same toolset (`lib/agents/swe-langgraph/tools/`).

| Tool | Args | What it does |
|------|------|--------------|
| `glob` | `patterns: string[]` | Find files by glob pattern |
| `grep` | `query: string` | Search file contents with regex |
| `read` | `filePaths: string[]` (up to 4) | Read multiple files in parallel |
| `edit` | `filePath, oldString, newString` | Replace a string in a file |
| `create` | `filePath, content` | Create a new file |
| `complete_planning` | `plan[]` | Planner-only: finalise the plan and exit the loop |
| `mark_task_complete` | `summary` | Programmer-only: mark current task done and move to next |

`read` uses `Promise.all` internally so up to 4 files are fetched in parallel.

---

## SSE Events

The backend streams Server-Sent Events to the frontend while the agent runs:

| `type` | When | Key fields |
|--------|------|------------|
| `start` | Agent begins | `message` |
| `phase` | Phase 1 / Phase 2 boundary | `message` |
| `tool_call` | LLM calls a tool | `tool`, `node`, `message`, `data` |
| `tool_result` | Tool returns output | `node`, `message`, `data` |
| `reasoning` | LLM thinks without a tool | `node`, `message`, `data.content` |
| `result` | Plan or notes ready | `node`, `data.plan` / `data.notes` |
| `step` | A task was completed | `node`, `data.completedCount`, `data.plan` |
| `complete` | All tasks done | `node`, `data.summary` |
| `done` | Stream closing | `message` |
| `error` | Something failed | `message` |

---

## Small Example

**Query**: *"Add input validation to the Express routes in backend/server.js"*

1. **Login** ? GitHub OAuth ? access token stored in session
2. **Download repo** ? `public/downloads/my-repo/`
3. **POST `/api/agent/run`** with `{ query, repoName }`

**Planner runs:**
- `glob(["**/*.js"])` ? finds `backend/server.js`, `frontend/src/App.js`
- `read(["backend/server.js"])` ? reads the file
- `grep("app.post|app.put")` ? finds route handlers
- `complete_planning([{ plan: "Add express-validator to POST /login", ... }, ...])` ? done

**Programmer runs (task 1: "Add express-validator to POST /login"):**
- `read(["backend/server.js"])` ? reads current content
- `edit({ filePath: "backend/server.js", oldString: "app.post('/login'...", newString: "app.post('/login', [body('email').isEmail(), ...], ..." })` ? patches file
- `mark_task_complete("Added validation to /login")` ? moves to task 2
- ... repeats for remaining tasks
- `end-conclusion` ? summary streamed to client

---

## Setup

```bash
npm install
```

`.env.local`:
```env
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

```bash
npm run dev
```
