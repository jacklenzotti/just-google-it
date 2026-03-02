import type { Config } from "../config/schema.js";
import type {
  SearchBackend,
  SearchResult,
  ExtractedSolution,
  SearchToolResult,
  QueryToolResult,
} from "./types.js";
import { DuckDuckGoBackend } from "./backends/duckduckgo.js";
import { BraveSearchBackend } from "./backends/brave.js";
import { GoogleSearchBackend } from "./backends/google.js";
import { SearXNGBackend } from "./backends/searxng.js";
import { extractSolutions } from "./summarizer.js";
import { errorsToSearchQuery } from "../utils/error-parser.js";
import { logger } from "../utils/logger.js";

function createBackend(config: Config): SearchBackend {
  const { backend, api_key_env, base_url, timeout } = config.search;

  switch (backend) {
    case "duckduckgo":
      return new DuckDuckGoBackend(timeout);
    case "brave":
      return new BraveSearchBackend(api_key_env || "BRAVE_API_KEY", timeout);
    case "google":
      return new GoogleSearchBackend(api_key_env || "GOOGLE_API_KEY", timeout);
    case "searxng":
      return new SearXNGBackend(base_url, timeout);
    default:
      throw new Error(`Unknown search backend: ${backend}`);
  }
}

export class SearchManager {
  private _backend: SearchBackend | null = null;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  private get backend(): SearchBackend {
    if (!this._backend) {
      this._backend = createBackend(this.config);
    }
    return this._backend;
  }

  async searchErrors(
    errors: string[],
    context?: string,
    language?: string,
    maxResults?: number
  ): Promise<SearchToolResult> {
    const query = errorsToSearchQuery(errors, context, language);
    const max = maxResults || this.config.search.max_results;

    logger.info(`Searching for error: "${query}"`);

    const results = await this.backend.search(query, max);
    const solutions = await this.fetchAndExtract(results);

    // Generate a suggested fix from the highest-relevance solution
    const bestSolution = solutions.find((s) => s.relevance === "high");
    const suggestedFix = bestSolution
      ? `Based on ${bestSolution.source}: ${bestSolution.summary.substring(
          0,
          200
        )}`
      : undefined;

    return {
      query_used: query,
      solutions,
      suggested_fix: suggestedFix,
    };
  }

  async searchQuery(
    query: string,
    domains?: string[],
    maxResults?: number
  ): Promise<QueryToolResult> {
    let effectiveQuery = query;

    // Add domain restrictions if specified
    if (domains && domains.length > 0) {
      const siteFilter = domains.map((d) => `site:${d}`).join(" OR ");
      effectiveQuery = `${query} (${siteFilter})`;
    }

    const max = maxResults || this.config.search.max_results;

    logger.info(`Searching: "${effectiveQuery}"`);

    const results = await this.backend.search(effectiveQuery, max);

    // Fetch pages and extract summaries
    const enriched = await Promise.all(
      results.map(async (r) => {
        try {
          const html = await this.backend.fetchPage(r.url);
          const solution = extractSolutions(
            html,
            r.url,
            r.title,
            this.config.output.max_summary_length
          );
          return {
            url: r.url,
            title: r.title,
            snippet: r.snippet,
            content_summary: solution.summary,
          };
        } catch {
          return {
            url: r.url,
            title: r.title,
            snippet: r.snippet,
          };
        }
      })
    );

    return { query: effectiveQuery, results: enriched };
  }

  async searchDocs(
    library: string,
    topic: string,
    version?: string
  ): Promise<QueryToolResult> {
    const parts = [library, topic];
    if (version) parts.push(`v${version}`);
    parts.push("documentation");

    // Check if there's a known docs site for the library
    const docsSites: Record<string, string> = {
      react: "react.dev",
      nextjs: "nextjs.org",
      vue: "vuejs.org",
      angular: "angular.dev",
      svelte: "svelte.dev",
      python: "docs.python.org",
      django: "docs.djangoproject.com",
      flask: "flask.palletsprojects.com",
      rust: "doc.rust-lang.org",
      go: "pkg.go.dev",
      typescript: "typescriptlang.org",
      node: "nodejs.org",
      deno: "deno.land",
      bun: "bun.sh",
    };

    const docSite = docsSites[library.toLowerCase()];
    const domains = docSite ? [docSite] : undefined;

    return this.searchQuery(parts.join(" "), domains);
  }

  private async fetchAndExtract(
    results: SearchResult[]
  ): Promise<ExtractedSolution[]> {
    // Prioritize preferred domains
    const preferred = new Set(this.config.domains.preferred);
    const blocked = new Set(this.config.domains.blocked);

    const filtered = results.filter((r) => {
      try {
        const host = new URL(r.url).hostname;
        return !blocked.has(host);
      } catch {
        return true;
      }
    });

    // Sort preferred domains first
    filtered.sort((a, b) => {
      const aHost = new URL(a.url).hostname;
      const bHost = new URL(b.url).hostname;
      const aPreferred = preferred.has(aHost) ? 0 : 1;
      const bPreferred = preferred.has(bHost) ? 0 : 1;
      return aPreferred - bPreferred;
    });

    const solutions = await Promise.all(
      filtered.map(async (result) => {
        try {
          const html = await this.backend.fetchPage(result.url);
          return extractSolutions(
            html,
            result.url,
            result.title,
            this.config.output.max_summary_length
          );
        } catch (err) {
          logger.debug(`Failed to fetch ${result.url}:`, err);
          // Return a minimal solution based on the search snippet
          return {
            source: new URL(result.url).hostname,
            url: result.url,
            title: result.title,
            relevance: "low" as const,
            summary: result.snippet,
          };
        }
      })
    );

    return solutions;
  }
}
