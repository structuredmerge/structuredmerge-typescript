export const packageName = "@structuredmerge/text-merge";

export {
  analyzeText,
  isSimilar,
  matchTextBlocks,
  mergeText,
  normalizeText,
  similarityScore,
  textParseRequest
} from "./contracts";
export type {
  TextAnalysis,
  TextAnalyzer,
  TextBlock,
  TextBlockMatch,
  TextBlockMatchResult,
  TextBlockMatcher,
  TextMergeResolution,
  TextMerger,
  TextParserAdapter,
  TextSimilarity,
  TextSpan
} from "./contracts";
