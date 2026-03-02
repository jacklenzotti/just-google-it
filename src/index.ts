import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server/server.js";
import { loadConfig } from "./config/loader.js";
import { logger } from "./utils/logger.js";

async function main() {
  const config = loadConfig();
  const server = createServer(config);
  const transport = new StdioServerTransport();

  await server.connect(transport);
  logger.info("just-google-it MCP server running on stdio");
}

main().catch((err) => {
  logger.error("Fatal error:", err);
  process.exit(1);
});
