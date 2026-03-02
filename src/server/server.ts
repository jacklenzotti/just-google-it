import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SearchManager } from "../search/manager.js";
import type { Config } from "../config/schema.js";
import {
  searchErrorsParams,
  handleSearchErrors,
} from "./tools/search-errors.js";
import { searchQueryParams, handleSearchQuery } from "./tools/search-query.js";
import { searchDocsParams, handleSearchDocs } from "./tools/search-docs.js";
import { logger } from "../utils/logger.js";

export function createServer(config: Config) {
  const server = new McpServer({
    name: "just-google-it",
    version: "0.1.0",
  });

  const searchManager = new SearchManager(config);

  server.tool(
    "search_errors",
    "Search the web for solutions to programming errors. Parses error messages into effective search queries, fetches results, and extracts solutions with code snippets.",
    searchErrorsParams,
    async (args) => {
      try {
        return await handleSearchErrors(args, searchManager);
      } catch (err) {
        logger.error("search_errors failed:", err);
        return {
          content: [
            {
              type: "text" as const,
              text: `Search failed: ${
                err instanceof Error ? err.message : String(err)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "search_query",
    "Search the web with a freeform query. Use this for general programming questions, finding documentation, or researching how to implement something.",
    searchQueryParams,
    async (args) => {
      try {
        return await handleSearchQuery(args, searchManager);
      } catch (err) {
        logger.error("search_query failed:", err);
        return {
          content: [
            {
              type: "text" as const,
              text: `Search failed: ${
                err instanceof Error ? err.message : String(err)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "search_docs",
    "Search for documentation on a specific library or framework. Automatically targets official documentation sites when known.",
    searchDocsParams,
    async (args) => {
      try {
        return await handleSearchDocs(args, searchManager);
      } catch (err) {
        logger.error("search_docs failed:", err);
        return {
          content: [
            {
              type: "text" as const,
              text: `Search failed: ${
                err instanceof Error ? err.message : String(err)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  logger.info(
    "MCP server initialized with tools: search_errors, search_query, search_docs"
  );

  return server;
}
