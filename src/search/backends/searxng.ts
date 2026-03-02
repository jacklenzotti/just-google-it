import type { SearchBackend, SearchResult } from "../types.js";
import { logger } from "../../utils/logger.js";

interface SearXNGResult {
  url: string;
  title: string;
  content: string;
}

interface SearXNGResponse {
  results: SearXNGResult[];
}

export class SearXNGBackend implements SearchBackend {
  name = "searxng";
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string | undefined, timeout: number) {
    this.baseUrl = baseUrl || "http://localhost:8080";
    this.timeout = timeout;
  }

  async search(query: string, maxResults: number): Promise<SearchResult[]> {
    const url = new URL("/search", this.baseUrl);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("categories", "general,it");

    logger.debug(`SearXNG search: "${query}"`);

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(
        `SearXNG error: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as SearXNGResponse;
    return data.results.slice(0, maxResults).map((r) => ({
      url: r.url,
      title: r.title,
      snippet: r.content,
    }));
  }

  async fetchPage(url: string): Promise<string> {
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
