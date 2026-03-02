import { z } from "zod";

export const configSchema = z.object({
  search: z
    .object({
      backend: z
        .enum(["duckduckgo", "brave", "google", "searxng"])
        .default("duckduckgo"),
      api_key_env: z.string().optional(),
      base_url: z.string().optional(), // for searxng
      max_results: z.number().min(1).max(20).default(5),
      timeout: z.number().min(1000).max(30000).default(10000),
    })
    .default({}),

  domains: z
    .object({
      preferred: z
        .array(z.string())
        .default(["stackoverflow.com", "github.com"]),
      blocked: z.array(z.string()).default([]),
    })
    .default({}),

  errors: z
    .object({
      lookback: z.number().min(1).max(10).default(3),
      auto_trigger: z.boolean().default(false),
      auto_trigger_threshold: z.number().min(1).max(10).default(2),
    })
    .default({}),

  output: z
    .object({
      include_code_snippets: z.boolean().default(true),
      include_urls: z.boolean().default(true),
      max_summary_length: z.number().min(100).max(2000).default(500),
    })
    .default({}),
});

export type Config = z.infer<typeof configSchema>;
