import { z } from "zod";
import type { SearchManager } from "../../search/manager.js";

export const searchDocsParams = {
  library: z
    .string()
    .min(1)
    .describe(
      "The library or framework name (e.g., 'react', 'django', 'rust')"
    ),
  topic: z
    .string()
    .min(1)
    .describe(
      "The topic to search for (e.g., 'useEffect cleanup', 'middleware', 'lifetime annotations')"
    ),
  version: z
    .string()
    .optional()
    .describe("Optional: specific version to search for (e.g., '18', '4.2')"),
};

export async function handleSearchDocs(
  args: { library: string; topic: string; version?: string },
  searchManager: SearchManager
) {
  const result = await searchManager.searchDocs(
    args.library,
    args.topic,
    args.version
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
