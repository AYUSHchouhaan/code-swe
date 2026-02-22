import { Annotation } from "@langchain/langgraph";

export interface PlanStep {
  stepNumber: number;
  description: string;
  action: 'edit' | 'create' | 'delete';
  filePath: string;
  completed: boolean;
}

export const AgentStateAnnotation = Annotation.Root({
  // User input
  query: Annotation<string>,
  repoPath: Annotation<string>,

  // Paths to index and map files
  indexFilePath: Annotation<string>,
  mapFilePath: Annotation<string>,

  // Query breakdown (Node 1)
  subqueries: Annotation<string[]>({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),

  // Search results (Node 2)
  relevantFilePaths: Annotation<string[]>({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),

  // File contents for planning (Node 3)
  fileContents: Annotation<Record<string, string>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({}),
  }),

  // Plan steps (Node 3)
  planSteps: Annotation<PlanStep[]>({
    reducer: (current, update) => update ?? current,
    default: () => [],
  }),

  // Current step being executed (Node 4)
  currentStep: Annotation<number>({
    reducer: (current, update) => update ?? current,
    default: () => 0,
  }),

  // Modified files (working tree)
  workingTree: Annotation<Record<string, string>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({}),
  }),

  // Completion flag
  completed: Annotation<boolean>({
    reducer: (current, update) => update ?? current,
    default: () => false,
  }),
});

export type AgentState = typeof AgentStateAnnotation.State;
