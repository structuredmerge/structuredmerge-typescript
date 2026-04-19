export const packageName = "@structuredmerge/text-merge";

export {
  analyzeText,
  isSimilar,
  normalizeText,
  similarityScore,
  textParseRequest
} from "./contracts";
export type {
  TextAnalysis,
  TextAnalyzer,
  TextBlock,
  TextMerger,
  TextParserAdapter,
  TextSimilarity,
  TextSpan
} from "./contracts";
