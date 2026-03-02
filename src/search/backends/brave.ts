import type { SearchBackend, SearchResult } from "../types.js";
import { logger } from "../../utils/logger.js";

interface BraveWebResult {
  url: string;
  title: string;
  description: string;
}

interface BraveSearchResponse {
  web?: {
    results: BraveWebResult[];
  };
}

export class BraveSearchBackend implements SearchBackend {
  name = "brave";
  private apiKey: string;
  private timeout: number;

  constructor(apiKeyEnv: string, timeout: number) {
    const key = process.env[apiKeyEnv];
    if (!key) {
      throw new Error(
        `Missing API key: set the ${apiKeyEnv} environment variable. ` +
          `Get a free key at https://brave.com/search/api/`
      );
    }
    this.apiKey = key;
    this.timeout = timeout;
  }

  async search(query: string, maxResults: number): Promise<SearchResult[]> {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(maxResults));

    logger.debug(`Brave search: "${query}"`);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": this.apiKey,
      },
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(
        `Brave Search API error: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as BraveSearchResponse;
    const results = data.web?.results || [];

    return results.map((r) => ({
      url: r.url,
      title: r.title,
      snippet: r.description,
    }));
  }

  async fetchPage(url: string): Promise<string> {
    logger.debug(`Fetching page: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; just-google-it/0.1; +https://github.com/just-google-it)",
      },
      signal: AbortSignal.timeout(this.timeout),
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    return response.text();
  }
}
