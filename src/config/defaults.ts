import type { Config } from "./schema.js";

export const DEFAULT_CONFIG: Config = {
  search: {
    backend: "duckduckgo",
    max_results: 5,
    timeout: 10000,
  },
  domains: {
    preferred: ["stackoverflow.com", "github.com"],
    blocked: [],
  },
  errors: {
    lookback: 3,
    auto_trigger: false,
    auto_trigger_threshold: 2,
  },
  output: {
    include_code_snippets: true,
    include_urls: true,
    max_summary_length: 500,
  },
};
