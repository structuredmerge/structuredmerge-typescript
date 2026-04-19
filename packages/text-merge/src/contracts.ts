import type { AnalysisHandle, ParserAdapter, ParserRequest } from '@structuredmerge/tree-haver';
import type { MergeResult } from '@structuredmerge/ast-merge';

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
  readonly kind: 'text';
  readonly normalizedSource: string;
  readonly blocks: readonly TextBlock[];
}

export interface TextMerger {
  merge(template: TextAnalysis, destination: TextAnalysis): MergeResult<string>;
}

export type TextParserAdapter = ParserAdapter<TextAnalysis>;

export function textParseRequest(source: string): ParserRequest {
  return {
    source,
    language: 'text'
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

export interface TextRefinementWeights {
  readonly content: number;
  readonly length: number;
  readonly position: number;
}

export type TextMatchPhase = 'exact' | 'refined';

export interface TextBlockMatch {
  readonly templateIndex: number;
  readonly destinationIndex: number;
  readonly phase: TextMatchPhase;
  readonly score: number;
}

export interface TextBlockMatchResult {
  readonly matched: readonly TextBlockMatch[];
  readonly unmatchedTemplate: readonly number[];
  readonly unmatchedDestination: readonly number[];
}

export interface TextMergeResolution {
  readonly output: string;
}

export interface TextBlockMatcher {
  match(template: TextAnalysis, destination: TextAnalysis): TextBlockMatchResult;
}

export const DEFAULT_TEXT_REFINEMENT_THRESHOLD = 0.7;

export const DEFAULT_TEXT_REFINEMENT_WEIGHTS: TextRefinementWeights = {
  content: 0.7,
  length: 0.15,
  position: 0.15
};

export function normalizeText(source: string): string {
  return source
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n\s*\n+/)
    .map((block) => block.trim().replace(/\s+/g, ' '))
    .filter((block) => block.length > 0)
    .join('\n\n');
}

export function analyzeText(source: string): TextAnalysis {
  const normalizedSource = normalizeText(source);
  const parts = normalizedSource.length === 0 ? [] : normalizedSource.split('\n\n');
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
    kind: 'text',
    normalizedSource,
    blocks
  };
}

function tokenSet(normalized: string): Set<string> {
  return new Set(normalized.split(/\s+/).filter((token) => token.length > 0));
}

function levenshteinDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (left.length === 0) return right.length;
  if (right.length === 0) return left.length;

  const previous = Array.from({ length: left.length + 1 }, (_, index) => index);
  const current = new Array<number>(left.length + 1).fill(0);

  for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
    current[0] = rightIndex;

    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[leftIndex] = Math.min(
        current[leftIndex - 1] + 1,
        previous[leftIndex] + 1,
        previous[leftIndex - 1] + cost
      );
    }

    for (let index = 0; index < previous.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[left.length];
}

function stringSimilarity(left: string, right: string): number {
  if (left === right) return 1;
  if (left.length === 0 || right.length === 0) return 0;

  const distance = levenshteinDistance(left, right);
  return 1 - distance / Math.max(left.length, right.length);
}

function lengthSimilarity(left: string, right: string): number {
  if (left.length === right.length) return 1;
  const maxLength = Math.max(left.length, right.length);
  if (maxLength === 0) return 1;
  return Math.min(left.length, right.length) / maxLength;
}

function relativePosition(index: number, total: number): number {
  return total > 1 ? index / (total - 1) : 0.5;
}

function positionSimilarity(
  templateIndex: number,
  destinationIndex: number,
  templateTotal: number,
  destinationTotal: number
): number {
  return (
    1 -
    Math.abs(
      relativePosition(templateIndex, templateTotal) -
        relativePosition(destinationIndex, destinationTotal)
    )
  );
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

export function refinedTextSimilarity(
  templateBlock: TextBlock,
  destinationBlock: TextBlock,
  templateTotal: number,
  destinationTotal: number,
  weights: TextRefinementWeights = DEFAULT_TEXT_REFINEMENT_WEIGHTS
): number {
  const content = stringSimilarity(templateBlock.normalized, destinationBlock.normalized);
  const length = lengthSimilarity(templateBlock.normalized, destinationBlock.normalized);
  const position = positionSimilarity(
    templateBlock.index,
    destinationBlock.index,
    templateTotal,
    destinationTotal
  );

  return weights.content * content + weights.length * length + weights.position * position;
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
  const matches = matchTextBlocks(templateSource, destinationSource);
  const matchedTemplate = new Set(matches.matched.map((match) => match.templateIndex));
  const mergedBlocks: string[] = [];

  destination.blocks.forEach((block) => {
    mergedBlocks.push(block.normalized);
  });

  template.blocks.forEach((block, index) => {
    if (!matchedTemplate.has(index)) {
      mergedBlocks.push(block.normalized);
    }
  });

  return {
    ok: true,
    diagnostics: [],
    output: mergedBlocks.join('\n\n')
  };
}

export function matchTextBlocks(
  templateSource: string,
  destinationSource: string
): TextBlockMatchResult {
  const template = analyzeText(templateSource);
  const destination = analyzeText(destinationSource);
  const matchedTemplate = new Set<number>();
  const matchedDestination = new Set<number>();
  const matched: TextBlockMatch[] = [];

  destination.blocks.forEach((destinationBlock, destinationIndex) => {
    const templateIndex = template.blocks.findIndex(
      (templateBlock, candidateIndex) =>
        !matchedTemplate.has(candidateIndex) &&
        templateBlock.normalized === destinationBlock.normalized
    );

    if (templateIndex >= 0) {
      matchedTemplate.add(templateIndex);
      matchedDestination.add(destinationIndex);
      matched.push({ templateIndex, destinationIndex, phase: 'exact', score: 1 });
    }
  });

  destination.blocks.forEach((destinationBlock, destinationIndex) => {
    if (matchedDestination.has(destinationIndex)) return;

    let bestTemplateIndex = -1;
    let bestScore = 0;

    template.blocks.forEach((templateBlock, templateIndex) => {
      if (matchedTemplate.has(templateIndex)) return;

      const score = refinedTextSimilarity(
        templateBlock,
        destinationBlock,
        template.blocks.length,
        destination.blocks.length
      );

      if (score >= DEFAULT_TEXT_REFINEMENT_THRESHOLD && score > bestScore) {
        bestTemplateIndex = templateIndex;
        bestScore = score;
      }
    });

    if (bestTemplateIndex >= 0) {
      matchedTemplate.add(bestTemplateIndex);
      matchedDestination.add(destinationIndex);
      matched.push({
        templateIndex: bestTemplateIndex,
        destinationIndex,
        phase: 'refined',
        score: bestScore
      });
    }
  });

  matched.sort((left, right) => left.destinationIndex - right.destinationIndex);

  return {
    matched,
    unmatchedTemplate: template.blocks
      .map((_, index) => index)
      .filter((index) => !matchedTemplate.has(index)),
    unmatchedDestination: destination.blocks
      .map((_, index) => index)
      .filter((index) => !matchedDestination.has(index))
  };
}
