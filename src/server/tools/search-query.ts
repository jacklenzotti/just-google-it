import { z } from "zod";
import type { SearchManager } from "../../search/manager.js";

export const searchQueryParams = {
  query: z.string().min(1).describe("The search query"),
  domains: z
    .array(z.string())
    .optional()
    .describe(
      "Optional: restrict results to specific domains (e.g., ['stackoverflow.com', 'github.com'])"
    ),
  max_results: z
    .number()
    .optional()
    .describe("Maximum number of results to return (default: 5)"),
};

export async function handleSearchQuery(
  args: { query: string; domains?: string[]; max_results?: number },
  searchManager: SearchManager
) {
  const result = await searchManager.searchQuery(
    args.query,
    args.domains,
    args.max_results
  );

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
