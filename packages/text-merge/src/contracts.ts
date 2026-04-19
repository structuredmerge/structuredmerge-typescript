import type { AnalysisHandle, ParserAdapter } from "@structuredmerge/tree-haver";
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

export interface TextAnalyzer {
  analyze(source: string): TextAnalysis;
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
