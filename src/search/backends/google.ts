import type { SearchBackend, SearchResult } from "../types.js";
import { logger } from "../../utils/logger.js";

interface GoogleSearchItem {
  link: string;
  title: string;
  snippet: string;
}

interface GoogleSearchResponse {
  items?: GoogleSearchItem[];
}

export class GoogleSearchBackend implements SearchBackend {
  name = "google";
  private apiKey: string;
  private cseId: string;
  private timeout: number;

  constructor(apiKeyEnv: string, timeout: number) {
    const key = process.env[apiKeyEnv];
    if (!key) {
      throw new Error(
        `Missing API key: set the ${apiKeyEnv} environment variable`
      );
    }
    const cseId = process.env.GOOGLE_CSE_ID;
    if (!cseId) {
      throw new Error(
        `Missing GOOGLE_CSE_ID environment variable for Google Custom Search`
      );
    }
    this.apiKey = key;
    this.cseId = cseId;
    this.timeout = timeout;
  }

  async search(query: string, maxResults: number): Promise<SearchResult[]> {
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", this.apiKey);
    url.searchParams.set("cx", this.cseId);
    url.searchParams.set("q", query);
    url.searchParams.set("num", String(Math.min(maxResults, 10)));

    logger.debug(`Google search: "${query}"`);

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(
        `Google Search API error: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as GoogleSearchResponse;
    return (data.items || []).map((item) => ({
      url: item.link,
      title: item.title,
      snippet: item.snippet,
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
