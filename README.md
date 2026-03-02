# just-google-it

MCP server + CLI that gives AI coding agents web search capabilities for resolving errors.

AI coding agents (Claude Code, Cursor, Copilot, etc.) get stuck on errors they can't resolve — version mismatches, obscure library bugs, cryptic messages. The fix is what any developer would do: google it. **just-google-it** gives agents that ability.

## Quick Start

```bash
# Set up in your project
npx just-google-it init

# Set your search API key
export BRAVE_API_KEY=your-key-here

# Test it works
npx just-google-it test
```

Get a free Brave Search API key at [brave.com/search/api](https://brave.com/search/api/) (\$5/month free credits, ~1000 queries).

## What It Does

### MCP Tools

Three tools are exposed to your AI agent via MCP:

| Tool            | Purpose                                | Example                                              |
| --------------- | -------------------------------------- | ---------------------------------------------------- |
| `search_errors` | Search for solutions to error messages | Agent hits `ModuleNotFoundError`, searches for fixes |
| `search_query`  | General web search                     | "how to configure webpack 5 with TypeScript"         |
| `search_docs`   | Search library documentation           | React useEffect cleanup docs                         |

### Auto-Trigger (Claude Code)

With hooks enabled, **just-google-it** automatically searches after consecutive similar errors:

1. Agent runs a command → fails
2. Agent tries again → fails with similar error
3. Hook fires → searches the web → injects solutions into context

No manual intervention needed.

## Setup

### Automatic (recommended)

```bash
npx just-google-it init
```

This will:

- Detect which AI agents you use (Claude Code, Cursor, Copilot, Windsurf)
- Configure MCP server connections
- Add search instructions to agent config files (CLAUDE.md, .cursorrules, etc.)
- Set up auto-trigger hooks (Claude Code only)

### Manual

Add to your MCP configuration:

**Claude Code** (`.claude/settings.local.json`):

```json
{
  "mcpServers": {
    "just-google-it": {
      "command": "npx",
      "args": ["-y", "just-google-it"],
      "type": "stdio"
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "just-google-it": {
      "command": "npx",
      "args": ["-y", "just-google-it"]
    }
  }
}
```

## Configuration

Create a `.just-google-it.yml` in your project root:

```yaml
search:
  backend: brave # brave | google | searxng
  api_key_env: BRAVE_API_KEY
  max_results: 5
  timeout: 10000

domains:
  preferred:
    - stackoverflow.com
    - github.com
  blocked: []

errors:
  auto_trigger: false
  auto_trigger_threshold: 2

output:
  include_code_snippets: true
  include_urls: true
  max_summary_length: 500
```

### Search Backends

| Backend                    | Setup                                  | Cost                           |
| -------------------------- | -------------------------------------- | ------------------------------ |
| **Brave Search** (default) | Set `BRAVE_API_KEY`                    | Free tier: ~1000 queries/month |
| Google Custom Search       | Set `GOOGLE_API_KEY` + `GOOGLE_CSE_ID` | Free tier: 100 queries/day     |
| SearXNG                    | Self-hosted instance                   | Free (self-hosted)             |

## CLI Commands

```bash
# Set up for your project
npx just-google-it init

# Test configuration
npx just-google-it test

# Search from command line
npx just-google-it search "webpack module federation error"
```

## How It Works

1. **Error parsing**: Strips noise (file paths, timestamps, ANSI codes) from error messages to create effective search queries
2. **Web search**: Queries your configured search backend (Brave, Google, SearXNG)
3. **Solution extraction**: Fetches top result pages and extracts solutions using heuristics:
   - Stack Overflow: accepted answers + code blocks
   - GitHub Issues: resolution comments
   - General pages: main content + code blocks
4. **No extra LLM**: The calling agent IS an LLM. Adding another would be slow, expensive, and redundant. Solutions are extracted with HTML parsing.

## License

MIT
