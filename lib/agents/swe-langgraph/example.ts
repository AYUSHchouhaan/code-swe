import path from 'path';
import { graph } from './graph';
import type { AgentState } from './types';

/**
 * Example usage of the SWE LangGraph Agent
 * 
 * This demonstrates the 4-node workflow:
 * 1. Query Breakdown - breaks query into subqueries
 * 2. Search - finds relevant files
 * 3. Planning - creates step-by-step plan
 * 4. Coding - executes steps one by one (loops until complete)
 */

async function main() {
  // Define the initial state
  const repoName = 'AYUSHchouhaan-simple-project-1771061431055';
  const repoPath = path.join(process.cwd(), 'public', 'downloads', repoName);

  const initialState: Partial<AgentState> = {
    query: 'Add a dark mode toggle button to the application',
    repoPath: repoPath,
    indexFilePath: path.join(repoPath, '.codebase-index', 'index.json'),
    mapFilePath: path.join(repoPath, '.codebase-index', 'architecture.json'),
  };

  console.log('🚀 Starting SWE LangGraph Agent...\n');
  console.log('Query:', initialState.query);
  console.log('Repository:', repoPath);
  console.log('\n' + '='.repeat(80) + '\n');

  try {
    // Run the graph - it will execute all 4 nodes automatically
    const result = await graph.invoke(initialState);

    console.log('\n' + '='.repeat(80) + '\n');
    console.log('🎉 Agent completed successfully!\n');

    // Display results
    console.log('📊 Final Results:');
    console.log('------------------\n');

    console.log('🔍 Subqueries Generated:', result.subqueries?.length || 0);
    result.subqueries?.forEach((q, i) => {
      console.log(`  ${i + 1}. ${q}`);
    });

    console.log(`\n📁 Relevant Files Found: ${result.relevantFilePaths?.length || 0}`);
    result.relevantFilePaths?.forEach((file) => {
      console.log(`  - ${file}`);
    });

    console.log(`\n📝 Plan Steps: ${result.planSteps?.length || 0}`);
    result.planSteps?.forEach((step) => {
      const status = step.completed ? '✅' : '⏳';
      console.log(`  ${status} ${step.stepNumber}. [${step.action}] ${step.filePath}`);
      console.log(`      ${step.description}`);
    });

    console.log(`\n💾 Modified Files: ${Object.keys(result.workingTree).length}`);
    Object.keys(result.workingTree).forEach((file) => {
      const lines = result.workingTree[file].split('\n').length;
      console.log(`  ✓ ${file} (${lines} lines)`);
    });

    console.log('\n✅ All changes have been written to disk!');
    
  } catch (error) {
    console.error('\n❌ Error running agent:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main };
