import fs from "node:fs";
import path from "node:path";

export interface DetectedAgent {
  name: string;
  id: "claude" | "cursor" | "copilot" | "windsurf";
  configFile: string;
  detected: boolean;
  reason: string;
}

function fileExists(filepath: string): boolean {
  return fs.existsSync(filepath);
}

function dirExists(dirpath: string): boolean {
  return fs.existsSync(dirpath) && fs.statSync(dirpath).isDirectory();
}

export function detectAgents(projectDir: string): DetectedAgent[] {
  const agents: DetectedAgent[] = [];

  // Claude Code
  const claudeDir = path.join(projectDir, ".claude");
  const claudeMd = path.join(projectDir, "CLAUDE.md");
  const hasClaude =
    dirExists(claudeDir) ||
    fileExists(claudeMd) ||
    fileExists(path.join(projectDir, ".claude/settings.local.json"));

  agents.push({
    name: "Claude Code",
    id: "claude",
    configFile: claudeMd,
    detected: hasClaude,
    reason: hasClaude
      ? `Found ${dirExists(claudeDir) ? ".claude/" : "CLAUDE.md"}`
      : "No .claude/ directory or CLAUDE.md found",
  });

  // Cursor
  const cursorRules = path.join(projectDir, ".cursorrules");
  const cursorDir = path.join(projectDir, ".cursor");
  const hasCursor = fileExists(cursorRules) || dirExists(cursorDir);

  agents.push({
    name: "Cursor",
    id: "cursor",
    configFile: cursorRules,
    detected: hasCursor,
    reason: hasCursor
      ? `Found ${fileExists(cursorRules) ? ".cursorrules" : ".cursor/"}`
      : "No .cursorrules or .cursor/ directory found",
  });

  // GitHub Copilot
  const copilotInstructions = path.join(
    projectDir,
    ".github",
    "copilot-instructions.md"
  );
  const githubDir = path.join(projectDir, ".github");
  const hasCopilot = fileExists(copilotInstructions) || dirExists(githubDir);

  agents.push({
    name: "GitHub Copilot",
    id: "copilot",
    configFile: copilotInstructions,
    detected: hasCopilot,
    reason: hasCopilot
      ? `Found ${
          fileExists(copilotInstructions)
            ? "copilot-instructions.md"
            : ".github/"
        }`
      : "No .github/ directory found",
  });

  // Windsurf
  const windsurfRules = path.join(projectDir, ".windsurfrules");
  const hasWindsurf = fileExists(windsurfRules);

  agents.push({
    name: "Windsurf",
    id: "windsurf",
    configFile: windsurfRules,
    detected: hasWindsurf,
    reason: hasWindsurf ? "Found .windsurfrules" : "No .windsurfrules found",
  });

  return agents;
}
