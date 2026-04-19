import type { Diagnostic, ParseResult, PolicyReference } from '@structuredmerge/ast-merge';
import {
  parseString as parseWithKreuzbergLanguagePack,
  treeHasErrorNodes,
  treeRootNodeType
} from '@kreuzberg/tree-sitter-language-pack';

export interface AnalysisHandle {
  readonly kind: string;
}

export interface ParserRequest {
  readonly source: string;
  readonly language: string;
  readonly dialect?: string;
}

export interface BackendReference {
  readonly id: string;
  readonly family: string;
}

export interface AdapterInfo {
  readonly backend: string;
  readonly backendRef?: BackendReference;
  readonly supportsDialects: boolean;
  readonly supportedPolicies?: readonly PolicyReference[];
}

export interface FeatureProfile {
  readonly backend: string;
  readonly backendRef?: BackendReference;
  readonly supportsDialects: boolean;
  readonly supportedPolicies?: readonly PolicyReference[];
}

export interface ParserAdapter<TAnalysis extends AnalysisHandle> {
  readonly info: AdapterInfo;
  parse(request: ParserRequest): ParseResult<TAnalysis>;
}

export interface ParserDiagnostics {
  readonly backend: string;
  readonly backendRef?: BackendReference;
  readonly diagnostics: readonly Diagnostic[];
}

export interface LanguagePackAnalysis extends AnalysisHandle {
  readonly kind: string;
  readonly language: string;
  readonly dialect?: string;
  readonly rootType: string;
  readonly hasError: boolean;
  readonly backendRef: BackendReference;
}

export const KREUZBERG_LANGUAGE_PACK_BACKEND: BackendReference = {
  id: 'kreuzberg-language-pack',
  family: 'tree-sitter'
};

export const languagePackAdapterInfo: AdapterInfo = {
  backend: KREUZBERG_LANGUAGE_PACK_BACKEND.id,
  backendRef: KREUZBERG_LANGUAGE_PACK_BACKEND,
  supportsDialects: false
};

export function parseWithLanguagePack(request: ParserRequest): ParseResult<LanguagePackAnalysis> {
  try {
    const tree = parseWithKreuzbergLanguagePack(request.language, request.source);
    const hasError = treeHasErrorNodes(tree);
    const analysis: LanguagePackAnalysis = {
      kind: request.language,
      language: request.language,
      dialect: request.dialect,
      rootType: treeRootNodeType(tree),
      hasError,
      backendRef: KREUZBERG_LANGUAGE_PACK_BACKEND
    };

    if (hasError) {
      return {
        ok: false,
        diagnostics: [
          {
            severity: 'error',
            category: 'parse_error',
            message: `tree-sitter-language-pack reported syntax errors for ${request.language}.`
          }
        ]
      };
    }

    return {
      ok: true,
      diagnostics: [],
      analysis
    };
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          category: 'unsupported_feature',
          message:
            error instanceof Error
              ? error.message
              : `tree-sitter-language-pack could not parse ${request.language}.`
        }
      ]
    };
  }
}
