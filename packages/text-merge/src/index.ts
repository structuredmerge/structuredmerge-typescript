export const packageName = "@structuredmerge/text-merge";

export {
  analyzeText,
  isSimilar,
  mergeText,
  normalizeText,
  similarityScore,
  textParseRequest
} from "./contracts";
export type {
  TextAnalysis,
  TextAnalyzer,
  TextBlock,
  TextMergeResolution,
  TextMerger,
  TextParserAdapter,
  TextSimilarity,
  TextSpan
} from "./contracts";
