import { Annotation } from "@langchain/langgraph";

export interface CodeStep {
  step: number;
  description: string;
  filePath: string;
  completed?: boolean;
}

export const AgentStateAnnotation = Annotation.Root({
  // task info
  repoId: Annotation<string>,
  repoPath: Annotation<string>,
  issue: Annotation<string>,

  // knowledge (references only)
  fileIndexPath: Annotation<string>,   // path to JSON file
  repoMapPath: Annotation<string>,     // path to repo_map.json

  // produced by agents
  searchQueries: Annotation<string[]>({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),
  relevantFiles: Annotation<string[]>({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),

  plan: Annotation<string[]>({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),
  codeSteps: Annotation<CodeStep[]>({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),

  // virtual repo snapshot
  workingTree: Annotation<Record<string, string>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({}),
  }),
});

export type AgentState = typeof AgentStateAnnotation.State;
