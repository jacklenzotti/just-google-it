import fs from "node:fs";
import path from "node:path";
import { logger } from "../../utils/logger.js";

const MARKER_START = "<!-- just-google-it:start -->";
const MARKER_END = "<!-- just-google-it:end -->";

const CLAUDE_MD_INSTRUCTIONS = `${MARKER_START}
## Web Search (just-google-it)

You have access to web search tools via the \`just-google-it\` MCP server. Use them when:

1. **You encounter an error you can't resolve** — Use \`search_errors\` with the error message(s)
2. **You need to look something up** — Use \`search_query\` for general programming questions
3. **You need documentation** — Use \`search_docs\` for library/framework docs

### When to search:
- After 2+ failed attempts at the same error
- For version-specific issues or breaking changes
- For obscure library errors or cryptic messages
- When you're unsure about correct API usage

### When NOT to search:
- For basic syntax you already know
- For errors with obvious fixes (typos, missing imports)
- When the error message itself tells you exactly what to do
${MARKER_END}`;

export function generateClaudeConfig(
  projectDir: string
): {
  files: string[];
} {
  const files: string[] = [];

  // 1. Update/create CLAUDE.md
  const claudeMdPath = path.join(projectDir, "CLAUDE.md");
  if (fs.existsSync(claudeMdPath)) {
    let content = fs.readFileSync(claudeMdPath, "utf-8");

    // Remove existing markers if present
    const startIdx = content.indexOf(MARKER_START);
    const endIdx = content.indexOf(MARKER_END);
    if (startIdx !== -1 && endIdx !== -1) {
      content =
        content.substring(0, startIdx) +
        content.substring(endIdx + MARKER_END.length);
    }

    // Append instructions
    content = content.trimEnd() + "\n\n" + CLAUDE_MD_INSTRUCTIONS + "\n";
    fs.writeFileSync(claudeMdPath, content);
    logger.info("Updated CLAUDE.md with search instructions");
  } else {
    fs.writeFileSync(
      claudeMdPath,
      "# Project Instructions\n\n" + CLAUDE_MD_INSTRUCTIONS + "\n"
    );
    logger.info("Created CLAUDE.md with search instructions");
  }
  files.push(claudeMdPath);

  // 2. Configure MCP server in .claude/settings.local.json
  const claudeDir = path.join(projectDir, ".claude");
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  const settingsPath = path.join(claudeDir, "settings.local.json");
  let settings: Record<string, unknown> = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    } catch {
      // Start fresh if invalid
    }
  }

  // Add MCP server config
  const mcpServers = (settings.mcpServers as Record<string, unknown>) || {};
  mcpServers["just-google-it"] = {
    command: "npx",
    args: ["-y", "just-google-it"],
    type: "stdio",
  };
  settings.mcpServers = mcpServers;

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  logger.info("Configured MCP server in .claude/settings.local.json");
  files.push(settingsPath);

  return { files };
}

export function generateClaudeHooks(
  projectDir: string,
  threshold: number
): { files: string[] } {
  const files: string[] = [];

  const claudeDir = path.join(projectDir, ".claude");
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  const settingsPath = path.join(claudeDir, "settings.local.json");
  let settings: Record<string, unknown> = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    } catch {
      // Start fresh
    }
  }

  // Add hooks config
  const hooks = (settings.hooks as Record<string, unknown>) || {};
  hooks["PostToolUseFailure"] = [
    {
      matcher: "Bash",
      hooks: [
        {
          type: "command",
          command: `npx just-google-it hook --threshold ${threshold}`,
        },
      ],
    },
  ];
  settings.hooks = hooks;

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  logger.info("Configured PostToolUseFailure hook");
  files.push(settingsPath);

  return { files };
}
