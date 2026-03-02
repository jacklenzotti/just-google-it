/**
 * Converts raw error output into effective search queries.
 * Strips noise (file paths, timestamps, line numbers) and extracts
 * the meaningful error message.
 */

interface ParsedError {
  original: string;
  query: string;
  language?: string;
  errorType?: string;
}

// Patterns to strip from errors before searching
const NOISE_PATTERNS = [
  // File paths
  /(?:\/[\w.-]+)+(?::\d+(?::\d+)?)?/g,
  // Windows paths
  /(?:[A-Z]:\\[\w\\.-]+)+(?::\d+(?::\d+)?)?/g,
  // Timestamps
  /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/g,
  // ANSI escape codes
  // eslint-disable-next-line no-control-regex
  /\x1b\[[0-9;]*m/g,
  // Stack trace line prefixes
  /^\s+at\s+/gm,
  // Common noise prefixes
  /^(?:Error|Warning|Fatal|Critical):\s*/i,
];

// Known error type patterns
const ERROR_TYPE_PATTERNS: Array<{
  pattern: RegExp;
  type: string;
  language: string;
}> = [
  { pattern: /TypeError:/i, type: "TypeError", language: "javascript" },
  {
    pattern: /ReferenceError:/i,
    type: "ReferenceError",
    language: "javascript",
  },
  { pattern: /SyntaxError:/i, type: "SyntaxError", language: "javascript" },
  {
    pattern: /ModuleNotFoundError:/i,
    type: "ModuleNotFoundError",
    language: "python",
  },
  { pattern: /ImportError:/i, type: "ImportError", language: "python" },
  { pattern: /AttributeError:/i, type: "AttributeError", language: "python" },
  { pattern: /KeyError:/i, type: "KeyError", language: "python" },
  { pattern: /rust|cargo/i, type: "CompileError", language: "rust" },
  { pattern: /go build|go run/i, type: "CompileError", language: "go" },
  { pattern: /error\[E\d+\]/i, type: "CompileError", language: "rust" },
  {
    pattern: /cannot find module/i,
    type: "ModuleNotFound",
    language: "javascript",
  },
  { pattern: /npm ERR!/i, type: "NpmError", language: "javascript" },
  {
    pattern: /pip install|pip3 install/i,
    type: "PipError",
    language: "python",
  },
];

function detectErrorType(
  error: string
): { errorType?: string; language?: string } {
  for (const { pattern, type, language } of ERROR_TYPE_PATTERNS) {
    if (pattern.test(error)) {
      return { errorType: type, language };
    }
  }
  return {};
}

function cleanError(error: string): string {
  let cleaned = error;

  for (const pattern of NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Take only the first meaningful line if multi-line
  const lines = error.split("\n").filter((l) => l.trim().length > 0);
  const firstMeaningful = lines.find(
    (l) =>
      !l.trim().startsWith("at ") &&
      !l.trim().startsWith("---") &&
      l.trim().length > 10
  );

  if (firstMeaningful && firstMeaningful.length < cleaned.length) {
    // Re-clean just the first meaningful line
    let line = firstMeaningful;
    for (const pattern of NOISE_PATTERNS) {
      line = line.replace(pattern, "");
    }
    cleaned = line.replace(/\s+/g, " ").trim();
  }

  // Truncate to reasonable search length
  if (cleaned.length > 200) {
    cleaned = cleaned.substring(0, 200);
  }

  return cleaned;
}

export function parseErrors(
  errors: string[],
  context?: string,
  language?: string
): ParsedError[] {
  return errors.map((error) => {
    const detected = detectErrorType(error);
    const query = cleanError(error);

    const parts: string[] = [];
    const lang = language || detected.language;
    if (lang) parts.push(lang);
    parts.push(query);
    if (context) parts.push(context);

    return {
      original: error,
      query: parts.join(" "),
      language: lang,
      errorType: detected.errorType,
    };
  });
}

export function errorsToSearchQuery(
  errors: string[],
  context?: string,
  language?: string
): string {
  const parsed = parseErrors(errors, context, language);
  // Use the first error as the primary query
  return parsed[0]?.query || errors.join(" ");
}
