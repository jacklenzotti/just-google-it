/**
 * PostToolUseFailure hook for Claude Code.
 *
 * This script is invoked by Claude Code when a Bash tool fails.
 * It tracks consecutive similar errors and auto-searches after a threshold.
 *
 * Input: Hook event data via stdin (JSON)
 * Output: JSON with optional additionalContext to inject search results
 *
 * Error tracking uses a temp file scoped to the session.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { loadConfig } from "../config/loader.js";
import { SearchManager } from "../search/manager.js";
import { errorsToSearchQuery } from "../utils/error-parser.js";

interface HookInput {
  tool_name: string;
  tool_input: {
    command?: string;
  };
  tool_output?: string;
  error?: string;
}

interface ErrorRecord {
  query: string;
  timestamp: number;
  count: number;
}

interface SessionState {
  errors: ErrorRecord[];
  lastSearch?: string;
}

function getSessionFile(): string {
  // Use Claude's session ID from env or a fallback
  const sessionId = process.env.CLAUDE_SESSION_ID || "default";
  return path.join(os.tmpdir(), `just-google-it-${sessionId}.json`);
}

function loadSessionState(): SessionState {
  const file = getSessionFile();
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
  } catch {
    // Start fresh
  }
  return { errors: [] };
}

function saveSessionState(state: SessionState): void {
  fs.writeFileSync(getSessionFile(), JSON.stringify(state));
}

function errorSimilarity(a: string, b: string): number {
  // Simple word-level Jaccard similarity
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.size / union.size;
}

async function main() {
  // Read hook input from stdin
  let input: string;
  try {
    input = fs.readFileSync("/dev/stdin", "utf-8");
  } catch {
    process.exit(0);
    return;
  }

  let hookData: HookInput;
  try {
    hookData = JSON.parse(input);
  } catch {
    process.exit(0);
    return;
  }

  const errorOutput = hookData.error || hookData.tool_output || "";
  if (!errorOutput.trim()) {
    // No error to process
    console.log(JSON.stringify({}));
    return;
  }

  // Parse threshold from CLI args
  const args = process.argv.slice(2);
  const thresholdIdx = args.indexOf("--threshold");
  const threshold =
    thresholdIdx !== -1 ? parseInt(args[thresholdIdx + 1], 10) : 2;

  // Get the search query for this error
  const query = errorsToSearchQuery([errorOutput]);

  // Load session state and track error
  const state = loadSessionState();

  // Find similar previous error
  const similar = state.errors.find(
    (e) => errorSimilarity(e.query, query) > 0.5
  );

  if (similar) {
    similar.count++;
    similar.timestamp = Date.now();
  } else {
    state.errors.push({ query, timestamp: Date.now(), count: 1 });
  }

  // Clean old errors (older than 10 minutes)
  const cutoff = Date.now() - 10 * 60 * 1000;
  state.errors = state.errors.filter((e) => e.timestamp > cutoff);

  const errorRecord = similar || state.errors[state.errors.length - 1];

  // Check if we should auto-search
  if (errorRecord.count >= threshold && state.lastSearch !== query) {
    try {
      const config = loadConfig();
      const manager = new SearchManager(config);
      const result = await manager.searchErrors([errorOutput]);

      state.lastSearch = query;
      saveSessionState(state);

      // Format results for injection
      const lines = [
        `[just-google-it] Auto-searched after ${errorRecord.count} similar errors:`,
        `Query: "${result.query_used}"`,
        "",
      ];

      for (const sol of result.solutions.slice(0, 3)) {
        lines.push(`### ${sol.title}`);
        lines.push(`Source: ${sol.url}`);
        lines.push(`Relevance: ${sol.relevance}`);
        lines.push(sol.summary);
        if (sol.code_snippet) {
          lines.push("```");
          lines.push(sol.code_snippet);
          lines.push("```");
        }
        lines.push("");
      }

      if (result.suggested_fix) {
        lines.push(`**Suggested fix:** ${result.suggested_fix}`);
      }

      console.log(
        JSON.stringify({
          additionalContext: lines.join("\n"),
        })
      );
      return;
    } catch {
      // Search failed, don't block the hook
    }
  }

  saveSessionState(state);
  console.log(JSON.stringify({}));
}

main().catch(() => {
  console.log(JSON.stringify({}));
});
