import type { AnalysisHandle, ParserAdapter } from "@structuredmerge/tree-haver";
import type { MergeResult } from "@structuredmerge/ast-merge";

export interface JsonAnalysis extends AnalysisHandle {
  readonly kind: "json";
  readonly allowsComments: boolean;
}

export interface JsonMerger {
  merge(template: JsonAnalysis, destination: JsonAnalysis): MergeResult<string>;
}

export interface JsonParserAdapter extends ParserAdapter<JsonAnalysis> {}
