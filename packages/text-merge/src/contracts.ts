import type { AnalysisHandle, ParserAdapter, ParserRequest } from "@structuredmerge/tree-haver";
import type { MergeResult } from "@structuredmerge/ast-merge";

export interface TextSpan {
  readonly start: number;
  readonly end: number;
}

export interface TextBlock {
  readonly index: number;
  readonly normalized: string;
  readonly span: TextSpan;
}

export interface TextAnalysis extends AnalysisHandle {
  readonly kind: "text";
  readonly normalizedSource: string;
  readonly blocks: readonly TextBlock[];
}

export interface TextMerger {
  merge(template: TextAnalysis, destination: TextAnalysis): MergeResult<string>;
}

export interface TextParserAdapter extends ParserAdapter<TextAnalysis> {}

export function textParseRequest(source: string): ParserRequest {
  return {
    source,
    language: "text"
  };
}

export interface TextAnalyzer {
  analyze(source: string): TextAnalysis;
}

export interface TextSimilarity {
  readonly score: number;
  readonly threshold: number;
  readonly matched: boolean;
}

export interface TextMergeResolution {
  readonly output: string;
}

export function normalizeText(source: string): string {
  return source
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n\s*\n+/)
    .map((block) => block.trim().replace(/\s+/g, " "))
    .filter((block) => block.length > 0)
    .join("\n\n");
}

export function analyzeText(source: string): TextAnalysis {
  const normalizedSource = normalizeText(source);
  const parts = normalizedSource.length === 0 ? [] : normalizedSource.split("\n\n");
  let cursor = 0;

  const blocks = parts.map((normalized, index) => {
    const start = cursor;
    const end = start + normalized.length;
    cursor = end + 2;

    return {
      index,
      normalized,
      span: { start, end }
    };
  });

  return {
    kind: "text",
    normalizedSource,
    blocks
  };
}

function tokenSet(normalized: string): Set<string> {
  return new Set(normalized.split(/\s+/).filter((token) => token.length > 0));
}

function jaccard(left: string, right: string): number {
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);

  if (leftTokens.size === 0 && rightTokens.size === 0) return 1;

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }

  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 1 : intersection / union;
}

export function similarityScore(leftSource: string, rightSource: string): number {
  const left = analyzeText(leftSource);
  const right = analyzeText(rightSource);
  const total = Math.max(left.blocks.length, right.blocks.length);

  if (total === 0) return 1;

  let sum = 0;
  for (let index = 0; index < total; index += 1) {
    const leftBlock = left.blocks[index];
    const rightBlock = right.blocks[index];
    if (!leftBlock || !rightBlock) continue;
    sum += jaccard(leftBlock.normalized, rightBlock.normalized);
  }

  return sum / total;
}

export function isSimilar(
  leftSource: string,
  rightSource: string,
  threshold: number
): TextSimilarity {
  const score = similarityScore(leftSource, rightSource);
  return {
    score,
    threshold,
    matched: score >= threshold
  };
}

export function mergeText(templateSource: string, destinationSource: string): MergeResult<string> {
  const template = analyzeText(templateSource);
  const destination = analyzeText(destinationSource);
  const total = Math.max(template.blocks.length, destination.blocks.length);
  const mergedBlocks: string[] = [];

  for (let index = 0; index < total; index += 1) {
    const templateBlock = template.blocks[index];
    const destinationBlock = destination.blocks[index];

    if (destinationBlock) {
      mergedBlocks.push(destinationBlock.normalized);
    } else if (templateBlock) {
      mergedBlocks.push(templateBlock.normalized);
    }
  }

  return {
    ok: true,
    diagnostics: [],
    output: mergedBlocks.join("\n\n")
  };
}
