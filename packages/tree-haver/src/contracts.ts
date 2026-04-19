import type { Diagnostic, ParseResult } from '@structuredmerge/ast-merge';

export interface AnalysisHandle {
  readonly kind: string;
}

export interface ParserRequest {
  readonly source: string;
  readonly language: string;
  readonly dialect?: string;
}

export interface AdapterInfo {
  readonly backend: string;
  readonly supportsDialects: boolean;
}

export interface ParserAdapter<TAnalysis extends AnalysisHandle> {
  readonly info: AdapterInfo;
  parse(request: ParserRequest): ParseResult<TAnalysis>;
}

export interface ParserDiagnostics {
  readonly backend: string;
  readonly diagnostics: readonly Diagnostic[];
}
