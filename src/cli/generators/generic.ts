import type { DetectedAgent } from "../detect.js";
import { generateClaudeConfig, generateClaudeHooks } from "./claude.js";
import { generateCursorConfig } from "./cursor.js";
import { generateCopilotConfig } from "./copilot.js";
import { generateWindsurfConfig } from "./windsurf.js";

export function generateForAgent(
  agent: DetectedAgent,
  projectDir: string,
  options: { hooks?: boolean; threshold?: number } = {}
): { files: string[] } {
  switch (agent.id) {
    case "claude": {
      const result = generateClaudeConfig(projectDir);
      if (options.hooks) {
        const hookResult = generateClaudeHooks(
          projectDir,
          options.threshold || 2
        );
        result.files.push(...hookResult.files);
      }
      return result;
    }
    case "cursor":
      return generateCursorConfig(projectDir);
    case "copilot":
      return generateCopilotConfig(projectDir);
    case "windsurf":
      return generateWindsurfConfig(projectDir);
    default:
      return { files: [] };
  }
}
