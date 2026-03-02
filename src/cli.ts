import { Command } from "commander";
import { runInit } from "./cli/init.js";
import { loadConfig } from "./config/loader.js";
import { SearchManager } from "./search/manager.js";

const program = new Command();

program
  .name("just-google-it")
  .description(
    "Give AI coding agents web search capabilities for resolving errors"
  )
  .version("0.1.0");

program
  .command("init")
  .description("Set up just-google-it for your project")
  .option(
    "--agents <agents>",
    "Comma-separated list of agents to configure (claude,cursor,copilot,windsurf)",
    (val: string) => val.split(",")
  )
  .option("--no-hooks", "Skip hook configuration for Claude Code")
  .option(
    "--threshold <n>",
    "Number of consecutive errors before auto-searching",
    "2"
  )
  .option("-y, --yes", "Skip confirmation prompts")
  .action(async (opts) => {
    await runInit({
      agents: opts.agents,
      hooks: opts.hooks,
      threshold: parseInt(opts.threshold, 10),
      yes: opts.yes,
    });
  });

program
  .command("test")
  .description("Test the search configuration")
  .option("-q, --query <query>", "Custom test query")
  .action(async (opts) => {
    console.log("\nTesting just-google-it configuration...\n");

    try {
      const config = loadConfig();
      console.log(`Backend: ${config.search.backend}`);

      const manager = new SearchManager(config);
      const query =
        opts.query || 'javascript "Cannot read properties of undefined"';

      console.log(`Test query: "${query}"\n`);

      const result = await manager.searchQuery(query);

      if (result.results.length > 0) {
        console.log(`Found ${result.results.length} results:`);
        for (const r of result.results.slice(0, 3)) {
          console.log(`  - ${r.title}`);
          console.log(`    ${r.url}\n`);
        }
        console.log("Search is working!\n");
      } else {
        console.log("No results found. Check your API key configuration.\n");
      }
    } catch (err) {
      console.error("Test failed:", err instanceof Error ? err.message : err);
      console.error("\nMake sure your API key environment variable is set.\n");
      process.exit(1);
    }
  });

program
  .command("search <query>")
  .description("Search the web from the command line")
  .option("-n, --max-results <n>", "Maximum results", "5")
  .action(async (query: string, opts) => {
    try {
      const config = loadConfig();
      const manager = new SearchManager(config);
      const result = await manager.searchQuery(
        query,
        undefined,
        parseInt(opts.maxResults, 10)
      );

      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error("Search failed:", err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("hook")
  .description("Handle hook invocations (called by Claude Code hooks)")
  .option(
    "--threshold <n>",
    "Number of consecutive errors before auto-searching",
    "2"
  )
  .action(async () => {
    // The hook logic runs as a standalone script (dist/hooks/post-tool-failure.js)
    // This command just re-exports it for npx compatibility
    await import("./hooks/post-tool-failure.js");
  });

program.parse();
