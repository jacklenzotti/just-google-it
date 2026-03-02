import { z } from "zod";
import type { SearchManager } from "../../search/manager.js";

export const searchErrorsParams = {
  errors: z
    .array(z.string())
    .min(1)
    .describe("Array of error messages to search for"),
  context: z
    .string()
    .optional()
    .describe(
      "Additional context about what you were trying to do (e.g., 'installing dependencies', 'running tests')"
    ),
  language: z
    .string()
    .optional()
    .describe(
      "Programming language context (e.g., 'python', 'javascript', 'rust')"
    ),
  max_results: z
    .number()
    .optional()
    .describe("Maximum number of results to return (default: 5)"),
};

export async function handleSearchErrors(
  args: {
    errors: string[];
    context?: string;
    language?: string;
    max_results?: number;
  },
  searchManager: SearchManager
) {
  const result = await searchManager.searchErrors(
    args.errors,
    args.context,
    args.language,
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
