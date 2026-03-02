import fs from "node:fs";
import path from "node:path";
import { logger } from "../../utils/logger.js";

const MARKER_START = "<!-- just-google-it:start -->";
const MARKER_END = "<!-- just-google-it:end -->";

const CURSOR_RULES = `${MARKER_START}
## Web Search (just-google-it)

You have access to web search tools via the just-google-it MCP server:

- \`search_errors\`: Search for solutions to programming errors
- \`search_query\`: General web search for programming questions
- \`search_docs\`: Search documentation for a specific library

Use these tools when you encounter errors you can't resolve after 2+ attempts,
for version-specific issues, obscure library errors, or when unsure about API usage.
${MARKER_END}`;

export function generateCursorConfig(
  projectDir: string
): {
  files: string[];
} {
  const files: string[] = [];

  // Update .cursorrules
  const rulesPath = path.join(projectDir, ".cursorrules");
  if (fs.existsSync(rulesPath)) {
    let content = fs.readFileSync(rulesPath, "utf-8");

    const startIdx = content.indexOf(MARKER_START);
    const endIdx = content.indexOf(MARKER_END);
    if (startIdx !== -1 && endIdx !== -1) {
      content =
        content.substring(0, startIdx) +
        content.substring(endIdx + MARKER_END.length);
    }

    content = content.trimEnd() + "\n\n" + CURSOR_RULES + "\n";
    fs.writeFileSync(rulesPath, content);
    logger.info("Updated .cursorrules");
  } else {
    fs.writeFileSync(rulesPath, CURSOR_RULES + "\n");
    logger.info("Created .cursorrules");
  }
  files.push(rulesPath);

  // Configure MCP in .cursor/mcp.json
  const cursorDir = path.join(projectDir, ".cursor");
  if (!fs.existsSync(cursorDir)) {
    fs.mkdirSync(cursorDir, { recursive: true });
  }

  const mcpPath = path.join(cursorDir, "mcp.json");
  let mcpConfig: Record<string, unknown> = {};
  if (fs.existsSync(mcpPath)) {
    try {
      mcpConfig = JSON.parse(fs.readFileSync(mcpPath, "utf-8"));
    } catch {
      // Start fresh
    }
  }

  const mcpServers = (mcpConfig.mcpServers as Record<string, unknown>) || {};
  mcpServers["just-google-it"] = {
    command: "npx",
    args: ["-y", "just-google-it"],
  };
  mcpConfig.mcpServers = mcpServers;

  fs.writeFileSync(mcpPath, JSON.stringify(mcpConfig, null, 2) + "\n");
  logger.info("Configured MCP server in .cursor/mcp.json");
  files.push(mcpPath);

  return { files };
}
