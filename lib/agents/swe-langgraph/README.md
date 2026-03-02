# SWE LangGraph Agent

A LangGraph-based multi-agent system for automated software engineering tasks using Ollama and structured outputs.

## Architecture

The agent uses a 4-node workflow with LangGraph:

```
START → Query Breakdown → Search → Planning → Coding → (loop) → END
                                                  ↑          |
                                                  └──────────┘
```

### Node 1: Query Breakdown
- **Input**: User query
- **Output**: 3-4 focused subqueries
- **LLM**: ChatOllama with Zod structured output
- **Purpose**: Breaks down complex queries into searchable subqueries

### Node 2: Search Agent
- **Input**: Subqueries, index file, architecture map
- **Output**: List of relevant file paths  
- **LLM**: ChatOllama with Zod structured output
- **Purpose**: Finds files relevant to the query using codebase index

### Node 3: Planning Agent
- **Input**: Relevant files, user query
- **Output**: Step-by-step implementation plan
- **LLM**: ChatOllama with Zod structured output
- **Purpose**: Creates detailed plan with file-specific steps

### Node 4: Coding Agent (Conditional Loop)
- **Input**: Current step, file contents, plan context
- **Output**: Modified file content, updated working tree
- **LLM**: ChatOllama with Zod structured output
- **Purpose**: Executes one step at a time, loops until all steps complete

## State Management

The agent uses LangGraph's state annotation system:

```typescript
{
  query: string,                           // User's request
  repoPath: string,                        // Path to repository
  indexFilePath: string,                   // Path to index.json
  mapFilePath: string,                     // Path to architecture.json
  
  subqueries: string[],                    // Node 1 output
  relevantFilePaths: string[],             // Node 2 output
  fileContents: Record<string, string>,    // Node 3 - files read
  planSteps: PlanStep[],                   // Node 3 output
  
  currentStep: number,                     // Node 4 - current step index
  workingTree: Record<string, string>,     // Node 4 - modified files
  completed: boolean,                      // Flag for completion
}
```

## Features

- ✅ **LangGraph Workflow**: Proper graph-based execution flow
- ✅ **ChatOllama Integration**: Uses @langchain/ollama for LLM calls
- ✅ **Zod Structured Outputs**: Type-safe LLM responses with `.withStructuredOutput()`
- ✅ **Conditional Looping**: Coding node loops until all steps complete
- ✅ **State Persistence**: Working tree tracks all modifications
- ✅ **Incremental Execution**: One step at a time for reliability

## Usage

```typescript
import { graph } from './lib/agents/swe-langgraph';

const initialState = {
  query: 'Add a dark mode toggle to the app',
  repoPath: '/path/to/repo',
  indexFilePath: '/path/to/repo/.codebase-index/index.json',
  mapFilePath: '/path/to/repo/.codebase-index/architecture.json',
};

const result = await graph.invoke(initialState);

// Access results
console.log('Modified files:', Object.keys(result.workingTree));
console.log('Steps completed:', result.planSteps.filter(s => s.completed).length);
```

## Requirements

1. **Ollama**: Running locally at `http://localhost:11434`
2. **Model**: `llama3.2` (or configure different model)
3. **Index Files**: Repository must be indexed first using file-indexing agent
4. **Map File**: Architecture map must be generated using repo-mapping agent

## Step-by-Step Flow

1. **User sends query** → Agent starts
2. **Query Breakdown Node**: Generates 3-4 subqueries
3. **Search Node**: Finds relevant files from index
4. **Planning Node**: 
   - Opens all relevant files
   - Creates JSON of file contents
   - LLM generates step-by-step plan
5. **Coding Node** (loops):
   - Takes current step
   - Opens target file
   - Sends file + context to LLM
   - LLM returns complete new file
   - Writes file to disk
   - Updates working tree
   - Moves to next step
   - Repeats until all steps done
6. **Complete** → Returns final state with all modifications

## Example

See `example.ts` for a complete working example.

```bash
# Run the example
npx tsx lib/agents/swe-langgraph/example.ts
```

## Technologies

- **LangGraph**: Workflow orchestration
- **@langchain/ollama**: LLM integration  
- **Zod**: Schema validation and structured outputs
- **TypeScript**: Type safety throughout
