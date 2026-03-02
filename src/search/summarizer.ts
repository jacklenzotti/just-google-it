import * as cheerio from "cheerio";
import type { ExtractedSolution } from "./types.js";
import { logger } from "../utils/logger.js";

/**
 * Heuristic-based solution extraction from HTML pages.
 * No LLM needed — the calling agent IS the LLM.
 * Focuses on extracting accepted answers, code blocks, and resolution comments.
 */

interface ExtractionResult {
  summary: string;
  code_snippets: string[];
  relevance: "high" | "medium" | "low";
}

function extractFromStackOverflow(html: string): ExtractionResult {
  const $ = cheerio.load(html);

  // Look for accepted answer first
  const acceptedAnswer = $(".accepted-answer .answercell .s-prose");
  const topAnswer = $(".answer .answercell .s-prose").first();

  const answerEl = acceptedAnswer.length ? acceptedAnswer : topAnswer;

  if (!answerEl.length) {
    return { summary: "", code_snippets: [], relevance: "low" };
  }

  // Extract code blocks from the answer
  const code_snippets: string[] = [];
  answerEl.find("pre code").each((_, el) => {
    const code = $(el).text().trim();
    if (code.length > 10 && code.length < 2000) {
      code_snippets.push(code);
    }
  });

  // Get text summary (strip code blocks for the summary)
  const answerClone = answerEl.clone();
  answerClone.find("pre").remove();
  const summary = answerClone
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 1000);

  return {
    summary,
    code_snippets,
    relevance: acceptedAnswer.length ? "high" : "medium",
  };
}

function extractFromGitHubIssue(html: string): ExtractionResult {
  const $ = cheerio.load(html);

  // Look for comments with resolution indicators
  const comments: Array<{
    text: string;
    codes: string[];
    isResolution: boolean;
  }> = [];

  $(".timeline-comment .comment-body").each((_, el) => {
    const text = $(el).text().trim();
    const codes: string[] = [];

    $(el)
      .find("pre code")
      .each((_, codeEl) => {
        const code = $(codeEl).text().trim();
        if (code.length > 10 && code.length < 2000) {
          codes.push(code);
        }
      });

    const isResolution =
      /fix|solved|resolved|workaround|solution/i.test(text) ||
      $(el).closest(".timeline-comment").find(".Label--success").length > 0;

    comments.push({ text, codes, isResolution });
  });

  // Prefer resolution comments
  const resolution = comments.find((c) => c.isResolution);
  const best = resolution || comments[0];

  if (!best) {
    return { summary: "", code_snippets: [], relevance: "low" };
  }

  return {
    summary: best.text.replace(/\s+/g, " ").substring(0, 1000),
    code_snippets: best.codes,
    relevance: resolution ? "high" : "medium",
  };
}

function extractGeneric(html: string): ExtractionResult {
  const $ = cheerio.load(html);

  // Remove nav, header, footer, sidebar, ads
  $(
    "nav, header, footer, aside, .sidebar, .ad, .advertisement, script, style, .cookie-banner"
  ).remove();

  // Extract code blocks
  const code_snippets: string[] = [];
  $("pre code, pre, .highlight code").each((_, el) => {
    const code = $(el).text().trim();
    if (code.length > 10 && code.length < 2000) {
      code_snippets.push(code);
    }
  });

  // Get main content
  const main =
    $("main, article, .content, .post-content, [role='main']").first() ||
    $("body");
  const mainClone = main.clone();
  mainClone.find("pre").remove();
  const summary = mainClone
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 1000);

  return {
    summary,
    code_snippets: code_snippets.slice(0, 5),
    relevance: code_snippets.length > 0 ? "medium" : "low",
  };
}

export function extractSolutions(
  html: string,
  url: string,
  title: string,
  maxSummaryLength: number
): ExtractedSolution {
  let extraction: ExtractionResult;

  try {
    if (
      url.includes("stackoverflow.com") ||
      url.includes("stackexchange.com")
    ) {
      extraction = extractFromStackOverflow(html);
    } else if (url.includes("github.com") && url.includes("/issues/")) {
      extraction = extractFromGitHubIssue(html);
    } else {
      extraction = extractGeneric(html);
    }
  } catch (err) {
    logger.debug(`Extraction failed for ${url}:`, err);
    extraction = { summary: "", code_snippets: [], relevance: "low" };
  }

  const domain = new URL(url).hostname;

  return {
    source: domain,
    url,
    title,
    relevance: extraction.relevance,
    summary: extraction.summary.substring(0, maxSummaryLength) || title,
    code_snippet: extraction.code_snippets[0],
  };
}
