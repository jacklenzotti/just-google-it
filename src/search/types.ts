export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}

export interface SearchBackend {
  name: string;
  search(query: string, maxResults: number): Promise<SearchResult[]>;
  fetchPage(url: string): Promise<string>;
}

export interface ExtractedSolution {
  source: string;
  url: string;
  title: string;
  relevance: "high" | "medium" | "low";
  summary: string;
  code_snippet?: string;
}

export interface SearchToolResult {
  query_used: string;
  solutions: ExtractedSolution[];
  suggested_fix?: string;
}

export interface QueryToolResult {
  query: string;
  results: Array<{
    url: string;
    title: string;
    snippet: string;
    content_summary?: string;
  }>;
}
