import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { configSchema, type Config } from "./schema.js";
import { DEFAULT_CONFIG } from "./defaults.js";
import { logger } from "../utils/logger.js";

const CONFIG_FILENAMES = [
  ".just-google-it.yml",
  ".just-google-it.yaml",
  "just-google-it.yml",
  "just-google-it.yaml",
];

function findConfigFile(startDir: string): string | null {
  let dir = startDir;
  while (true) {
    for (const filename of CONFIG_FILENAMES) {
      const filepath = path.join(dir, filename);
      if (fs.existsSync(filepath)) {
        return filepath;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export function loadConfig(startDir?: string): Config {
  const dir = startDir || process.cwd();
  const configPath = findConfigFile(dir);

  if (!configPath) {
    logger.debug("No config file found, using defaults");
    return DEFAULT_CONFIG;
  }

  logger.debug(`Found config at ${configPath}`);

  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = yaml.load(raw);
    const validated = configSchema.parse(parsed);
    return validated;
  } catch (err) {
    logger.warn(`Invalid config at ${configPath}, using defaults:`, err);
    return DEFAULT_CONFIG;
  }
}
