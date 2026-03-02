import type { SearchBackend, SearchResult } from "../types.js";
import { logger } from "../../utils/logger.js";
import * as cheerio from "cheerio";

/**
 * DuckDuckGo search backend using the HTML lite endpoint.
 * No API key required — completely free and zero-config.
 */
export class DuckDuckGoBackend implements SearchBackend {
  name = "duckduckgo";
  private timeout: number;

  constructor(timeout: number) {
    this.timeout = timeout;
  }

  async search(query: string, maxResults: number): Promise<SearchResult[]> {
    logger.debug(`DuckDuckGo search: "${query}"`);

    const url = new URL("https://lite.duckduckgo.com/lite/");
    const body = new URLSearchParams({ q: query });

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(
        `DuckDuckGo search error: ${response.status} ${response.statusText}`
      );
    }

    const html = await response.text();
    return this.parseResults(html, maxResults);
  }

  private parseResults(html: string, maxResults: number): SearchResult[] {
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    // DuckDuckGo lite returns results in a table structure
    // Each result has: a link row, a snippet row, and a URL row
    const links = $("a.result-link");

    links.each((i, el) => {
      if (results.length >= maxResults) return false;

      const $link = $(el);
      const title = $link.text().trim();
      const href = $link.attr("href");

      if (!href || !title) return;

      // The snippet is in the next table row's .result-snippet
      const snippet =
        $link
          .closest("tr")
          .nextAll("tr")
          .find(".result-snippet")
          .first()
          .text()
          .trim() || "";

      results.push({
        url: href,
        title,
        snippet,
      });
    });

    // Fallback: try parsing zero-click results or different structure
    if (results.length === 0) {
      $("table")
        .find("a[href^='http']")
        .each((i, el) => {
          if (results.length >= maxResults) return false;

          const $a = $(el);
          const href = $a.attr("href");
          const title = $a.text().trim();

          if (
            !href ||
            !title ||
            href.includes("duckduckgo.com") ||
            title.length < 5
          )
            return;

          // Look for nearby text as snippet
          const row = $a.closest("tr");
          const nextRow = row.next("tr");
          const snippet = nextRow.text().trim().substring(0, 300);

          results.push({
            url: href,
            title,
            snippet: snippet || "",
          });
        });
    }

    return results;
  }

  async fetchPage(url: string): Promise<string> {
    logger.debug(`Fetching page: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)",
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
