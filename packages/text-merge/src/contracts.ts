import type { AnalysisHandle, ParserAdapter } from "@structuredmerge/tree-haver";
import type { MergeResult } from "@structuredmerge/ast-merge";

export interface TextAnalysis extends AnalysisHandle {
  readonly kind: "text";
  readonly blocks: readonly string[];
}

export interface TextMerger {
  merge(template: TextAnalysis, destination: TextAnalysis): MergeResult<string>;
}

export interface TextParserAdapter extends ParserAdapter<TextAnalysis> {}
