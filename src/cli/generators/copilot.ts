import fs from "node:fs";
import path from "node:path";
import { logger } from "../../utils/logger.js";

const MARKER_START = "<!-- just-google-it:start -->";
const MARKER_END = "<!-- just-google-it:end -->";

const COPILOT_INSTRUCTIONS = `${MARKER_START}
## Web Search (just-google-it)

You have access to web search tools via the just-google-it MCP server:

- \`search_errors\`: Search for solutions to programming errors
- \`search_query\`: General web search for programming questions
- \`search_docs\`: Search documentation for a specific library

Use these tools when you encounter errors you can't resolve after 2+ attempts,
for version-specific issues, obscure library errors, or when unsure about API usage.
${MARKER_END}`;

export function generateCopilotConfig(
  projectDir: string
): {
  files: string[];
} {
  const files: string[] = [];

  const githubDir = path.join(projectDir, ".github");
  if (!fs.existsSync(githubDir)) {
    fs.mkdirSync(githubDir, { recursive: true });
  }

  const instructionsPath = path.join(githubDir, "copilot-instructions.md");
  if (fs.existsSync(instructionsPath)) {
    let content = fs.readFileSync(instructionsPath, "utf-8");

    const startIdx = content.indexOf(MARKER_START);
    const endIdx = content.indexOf(MARKER_END);
    if (startIdx !== -1 && endIdx !== -1) {
      content =
        content.substring(0, startIdx) +
        content.substring(endIdx + MARKER_END.length);
    }

    content = content.trimEnd() + "\n\n" + COPILOT_INSTRUCTIONS + "\n";
    fs.writeFileSync(instructionsPath, content);
    logger.info("Updated copilot-instructions.md");
  } else {
    fs.writeFileSync(
      instructionsPath,
      "# Copilot Instructions\n\n" + COPILOT_INSTRUCTIONS + "\n"
    );
    logger.info("Created copilot-instructions.md");
  }
  files.push(instructionsPath);

  return { files };
}
