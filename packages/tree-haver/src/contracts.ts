import type { Diagnostic, ParseResult } from "@structuredmerge/ast-merge";

export interface AnalysisHandle {
  readonly kind: string;
}

export interface ParserAdapter<TAnalysis extends AnalysisHandle> {
  parse(source: string): ParseResult<TAnalysis>;
}

export interface ParserDiagnostics {
  readonly diagnostics: readonly Diagnostic[];
}
