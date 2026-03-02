import fs from "node:fs";
import path from "node:path";
import { detectAgents } from "./detect.js";
import { generateForAgent } from "./generators/generic.js";
import { logger } from "../utils/logger.js";
import type { Config } from "../config/schema.js";
import { DEFAULT_CONFIG } from "../config/defaults.js";
import yaml from "js-yaml";

export interface InitOptions {
  agents?: string[];
  hooks?: boolean;
  threshold?: number;
  yes?: boolean;
}

export async function runInit(options: InitOptions) {
  const projectDir = process.cwd();

  console.log("\njust-google-it - Setup\n");

  // 1. Detect agents
  const detected = detectAgents(projectDir);
  const activeAgents = detected.filter((a) => a.detected);

  console.log("Detected AI coding agents:");
  for (const agent of detected) {
    const icon = agent.detected ? "+" : "-";
    console.log(`  ${icon} ${agent.name}: ${agent.reason}`);
  }
  console.log();

  // Filter to specified agents or all detected
  const targetAgents = options.agents
    ? detected.filter((a) => options.agents!.includes(a.id))
    : activeAgents;

  if (targetAgents.length === 0) {
    console.log("No agents detected. Use --agents to specify agents manually:");
    console.log("  npx just-google-it init --agents claude,cursor\n");
    return;
  }

  console.log(
    `Configuring for: ${targetAgents.map((a) => a.name).join(", ")}\n`
  );

  // 2. Generate configs
  const allFiles: string[] = [];
  for (const agent of targetAgents) {
    const result = generateForAgent(agent, projectDir, {
      hooks: options.hooks ?? agent.id === "claude",
      threshold: options.threshold,
    });
    allFiles.push(...result.files);
  }

  // 3. Create default config if not exists
  const configPath = path.join(projectDir, ".just-google-it.yml");
  if (!fs.existsSync(configPath)) {
    const yamlContent =
      "# just-google-it configuration\n" +
      "# See: https://github.com/just-google-it/just-google-it\n\n" +
      yaml.dump(DEFAULT_CONFIG, { lineWidth: 80 });
    fs.writeFileSync(configPath, yamlContent);
    allFiles.push(configPath);
    logger.info("Created .just-google-it.yml");
  }

  // 4. Summary
  console.log("Files created/updated:");
  for (const file of allFiles) {
    const relative = path.relative(projectDir, file);
    console.log(`  ${relative}`);
  }

  console.log("\nNext steps:");
  console.log(
    "  1. Test the setup (uses DuckDuckGo by default, no API key needed):"
  );
  console.log("     npx just-google-it test\n");
  console.log(
    "  Optional: for higher quality results, configure a search API:"
  );
  console.log("     See .just-google-it.yml for backend options\n");
}
