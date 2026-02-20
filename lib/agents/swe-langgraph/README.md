# SWE LangGraph Agent

A multi-agent system for automated software engineering tasks using LangGraph and Ollama.

## Architecture

The agent consists of three specialized agents working in sequence:

### 1. 🔍 Search Agent
- **Input**: Issue description, file index, repo map
- **Process**: 
  - Breaks down the issue into multiple search queries
  - Analyzes the codebase structure
  - Identifies relevant files
- **Output**: List of relevant file paths and search queries

### 2. 📋 Planning Agent
- **Input**: Issue, relevant files with content, file index, repo map
- **Process**:
  - Analyzes the issue and relevant files
  - Creates a sequential implementation plan
  - Each step modifies EXACTLY ONE file
- **Output**: Step-by-step plan with file associations

### 3. 💻 Coding Agent
- **Input**: Plan steps, original files, working tree context
- **Process**:
  - Executes each step sequentially
  - Reads the target file
  - Generates complete new file content (not diffs)
  - Writes to disk and updates working tree
- **Output**: Modified codebase with all changes applied

## State Structure

```typescript
{
  // Task info
  repoId: string
  repoPath: string
  issue: string

  // Knowledge (file paths)
  fileIndexPath: string   // path to file-index.json
  repoMapPath: string     // path to repo-map.json

  // Produced by agents
  searchQueries: string[]
  relevantFiles: string[]
  plan: string[]
  codeSteps: CodeStep[]

  // Virtual repo snapshot (accumulates changes)
  workingTree: Record<string, string>
}
```

## Usage

```typescript
import { graph, AgentState } from './lib/agents/swe-langgraph';

// Initialize state
const initialState: AgentState = {
  repoId: "my-repo",
  repoPath: "/path/to/repo",
  issue: "Add email validation to user registration",
  fileIndexPath: "/path/to/file-index.json",
  repoMapPath: "/path/to/repo-map.json",
  searchQueries: [],
  relevantFiles: [],
  plan: [],
  codeSteps: [],
  workingTree: {},
};

// Run the agent
const result = await graph.invoke(initialState);

console.log("Modified files:", Object.keys(result.workingTree));
```

## File Structure

```
lib/agents/swe-langgraph/
├── graph.ts              # Main LangGraph definition
├── types.ts              # State and type definitions
├── index.ts              # Public exports
├── nodes/                # Agent node implementations
│   ├── search-agent.ts   # Search agent
│   ├── planning-agent.ts # Planning agent
│   ├── coding-agent.ts   # Coding agent
│   └── index.ts
├── functions/            # Utility functions
│   ├── file-utils.ts     # File operations
│   ├── llm-utils.ts      # LLM helpers
│   └── index.ts
└── prompts/              # System prompts for each agent
    ├── search.ts
    ├── planning.ts
    ├── coding.ts
    └── index.ts
```

## Requirements

- Node.js 18+
- Ollama running locally (`http://localhost:11434`)
- LangGraph dependencies:
  ```bash
  npm install @langchain/langgraph @langchain/ollama
  ```

## Model Configuration

By default, the agent uses `llama3.1` from Ollama. You can configure this in the `createLLM()` function in `functions/llm-utils.ts`.

Recommended models:
- `llama3.1` - Good balance of speed and quality
- `codellama` - Optimized for code generation
- `deepseek-coder` - Specialized for coding tasks

## Key Features

- ✅ **Modular Architecture**: Separate concerns (search, planning, coding)
- ✅ **Sequential Execution**: One file at a time for safety
- ✅ **Context Accumulation**: Working tree provides context of all changes
- ✅ **Full File Generation**: No complex diff merging
- ✅ **Type Safety**: Full TypeScript support
- ✅ **Local LLM**: Privacy-focused using Ollama
- ✅ **Structured Output**: JSON-based agent communication

## Example Flow

```
Issue: "Add email validation to user registration"

1. Search Agent:
   - Queries: ["user registration", "validation", "email field"]
   - Files: ["src/routes/auth.ts", "src/models/user.ts", "src/utils/validation.ts"]

2. Planning Agent:
   - Step 1: Create email validation function in src/utils/validation.ts
   - Step 2: Update User model in src/models/user.ts
   - Step 3: Add validation to registration handler in src/routes/auth.ts

3. Coding Agent:
   - Executes Step 1 → generates validation.ts
   - Executes Step 2 → generates user.ts (with context from Step 1)
   - Executes Step 3 → generates auth.ts (with context from Steps 1 & 2)

Result: Three files modified, all changes consistent and working together
```

## Error Handling

Each agent includes error handling and logging. If an agent fails:
- Error is logged to console
- Exception is thrown (can be caught by caller)
- State up to that point is preserved

## Customization

### Change LLM Model
Edit `functions/llm-utils.ts`:
```typescript
export function createLLM(model: string = "codellama", temperature: number = 0.7)
```

### Modify Prompts
Edit files in `prompts/` directory to customize agent behavior.

### Add New Agents
1. Create new node in `nodes/`
2. Add prompt in `prompts/`
3. Update `graph.ts` to include new node in workflow

## Limitations

- Requires local Ollama installation
- Sequential processing (can be slow for large changes)
- LLM quality dependent on model choice
- No built-in test execution or validation
- No rollback mechanism (consider using git)

## Future Enhancements

- [ ] Parallel file processing where possible
- [ ] Test generation and execution
- [ ] Code review agent
- [ ] Interactive approval for each step
- [ ] Integration with git for automatic commits
- [ ] Support for remote LLM APIs
