import fs from "node:fs";
import path from "node:path";
import { logger } from "../../utils/logger.js";

const MARKER_START = "<!-- just-google-it:start -->";
const MARKER_END = "<!-- just-google-it:end -->";

const WINDSURF_RULES = `${MARKER_START}
## Web Search (just-google-it)

You have access to web search tools via the just-google-it MCP server:

- \`search_errors\`: Search for solutions to programming errors
- \`search_query\`: General web search for programming questions
- \`search_docs\`: Search documentation for a specific library

Use these tools when you encounter errors you can't resolve after 2+ attempts,
for version-specific issues, obscure library errors, or when unsure about API usage.
${MARKER_END}`;

export function generateWindsurfConfig(
  projectDir: string
): {
  files: string[];
} {
  const files: string[] = [];

  const rulesPath = path.join(projectDir, ".windsurfrules");
  if (fs.existsSync(rulesPath)) {
    let content = fs.readFileSync(rulesPath, "utf-8");

    const startIdx = content.indexOf(MARKER_START);
    const endIdx = content.indexOf(MARKER_END);
    if (startIdx !== -1 && endIdx !== -1) {
      content =
        content.substring(0, startIdx) +
        content.substring(endIdx + MARKER_END.length);
    }

    content = content.trimEnd() + "\n\n" + WINDSURF_RULES + "\n";
    fs.writeFileSync(rulesPath, content);
    logger.info("Updated .windsurfrules");
  } else {
    fs.writeFileSync(rulesPath, WINDSURF_RULES + "\n");
    logger.info("Created .windsurfrules");
  }
  files.push(rulesPath);

  return { files };
}
