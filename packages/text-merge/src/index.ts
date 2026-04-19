export const packageName = '@structuredmerge/text-merge';

export {
  analyzeText,
  DEFAULT_TEXT_REFINEMENT_THRESHOLD,
  DEFAULT_TEXT_REFINEMENT_WEIGHTS,
  isSimilar,
  matchTextBlocks,
  mergeText,
  normalizeText,
  refinedTextSimilarity,
  similarityScore,
  textParseRequest
} from './contracts';
export type {
  TextAnalysis,
  TextAnalyzer,
  TextBlock,
  TextBlockMatch,
  TextBlockMatchResult,
  TextBlockMatcher,
  TextMergeResolution,
  TextMerger,
  TextMatchPhase,
  TextParserAdapter,
  TextRefinementWeights,
  TextSimilarity,
  TextSpan
} from './contracts';
