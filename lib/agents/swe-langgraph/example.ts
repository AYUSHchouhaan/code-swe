import path from "path";
import { graph, AgentState } from "./index";

/**
 * Example usage of the SWE LangGraph Agent
 * 
 * This demonstrates how to use the agent to solve a coding issue.
 */

async function main() {
  // Define the initial state
  const initialState: AgentState = {
    // Task information
    repoId: "example-repo",
    repoPath: path.join(process.cwd(), "public", "downloads", "example-repo"),
    issue: `
Add email validation to user registration:
- Create a utility function to validate email format
- Update the User model to include email validation
- Modify the registration handler to validate emails before creating users
- Return appropriate error messages for invalid emails
    `.trim(),

    // Paths to knowledge files
    fileIndexPath: path.join(
      process.cwd(),
      "public",
      "downloads",
      "example-repo",
      "file-index.json"
    ),
    repoMapPath: path.join(
      process.cwd(),
      "public",
      "downloads",
      "example-repo",
      "repo-map.json"
    ),

    // Initialize empty arrays/objects
    searchQueries: [],
    relevantFiles: [],
    plan: [],
    codeSteps: [],
    workingTree: {},
  };

  console.log("🚀 Starting SWE Agent...\n");
  console.log("Issue:", initialState.issue);
  console.log("Repository:", initialState.repoPath);
  console.log("\n" + "=".repeat(80) + "\n");

  try {
    // Run the agent
    const result = await graph.invoke(initialState);

    console.log("\n" + "=".repeat(80) + "\n");
    console.log("🎉 Agent completed successfully!\n");

    // Display results
    console.log("📊 Results:");
    console.log("------------");
    console.log(`Search Queries: ${result.searchQueries?.length || 0}`);
    result.searchQueries?.forEach((query, i) => {
      console.log(`  ${i + 1}. ${query}`);
    });

    console.log(`\nRelevant Files: ${result.relevantFiles?.length || 0}`);
    result.relevantFiles?.forEach((file) => {
      console.log(`  - ${file}`);
    });

    console.log(`\nPlan Steps: ${result.codeSteps?.length || 0}`);
    result.codeSteps?.forEach((step) => {
      console.log(`  ${step.step}. ${step.description}`);
      console.log(`     File: ${step.filePath}`);
      console.log(`     Status: ${step.completed ? "✅ Completed" : "⏳ Pending"}`);
    });

    console.log(`\nModified Files: ${Object.keys(result.workingTree).length}`);
    Object.keys(result.workingTree).forEach((file) => {
      const lines = result.workingTree[file].split("\n").length;
      console.log(`  - ${file} (${lines} lines)`);
    });

    console.log("\n✅ All changes have been written to disk!");
  } catch (error) {
    console.error("\n❌ Error running agent:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main };
