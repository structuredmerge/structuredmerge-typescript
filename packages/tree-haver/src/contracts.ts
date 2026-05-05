import type { Diagnostic, ParseResult, PolicyReference } from '@structuredmerge/ast-merge';
import peggy from 'peggy';
import {
  hasLanguage,
  init,
  process as processWithKreuzbergLanguagePack,
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

export interface ProcessRequest {
  readonly source: string;
  readonly language: string;
}

export interface ProcessSpan {
  readonly startByte: number;
  readonly endByte: number;
  readonly startRow: number;
  readonly startCol: number;
  readonly endRow: number;
  readonly endCol: number;
}

export interface ProcessStructureItem {
  readonly kind: string;
  readonly name?: string;
  readonly span: ProcessSpan;
}

export interface ProcessImportInfo {
  readonly source: string;
  readonly items: readonly string[];
  readonly span: ProcessSpan;
}

export interface ProcessDiagnostic {
  readonly message: string;
  readonly severity: string;
}

export interface LanguagePackAnalysis extends AnalysisHandle {
  readonly kind: string;
  readonly language: string;
  readonly dialect?: string;
  readonly rootType: string;
  readonly hasError: boolean;
  readonly backendRef: BackendReference;
}

export interface LanguagePackProcessAnalysis extends AnalysisHandle {
  readonly kind: 'tree-sitter-process';
  readonly language: string;
  readonly structure: readonly ProcessStructureItem[];
  readonly imports: readonly ProcessImportInfo[];
  readonly diagnostics: readonly ProcessDiagnostic[];
  readonly backendRef: BackendReference;
}

export interface KaitaiByteSpan {
  readonly startByte: number;
  readonly endByte: number;
}

export interface KaitaiTreeNode {
  readonly kind: string;
  readonly schemaPath: string;
  readonly span: KaitaiByteSpan;
  readonly fields: Readonly<Record<string, unknown>>;
  readonly children: readonly KaitaiTreeNode[];
}

export interface KaitaiTreeAnalysis extends AnalysisHandle {
  readonly kind: 'kaitai-tree';
  readonly schema: string;
  readonly root: KaitaiTreeNode;
  readonly backendRef: BackendReference;
}

export interface PeggyParser {
  parse(source: string): unknown;
}

export const KREUZBERG_LANGUAGE_PACK_BACKEND: BackendReference = {
  id: 'kreuzberg-language-pack',
  family: 'tree-sitter'
};
export const PEGGY_BACKEND: BackendReference = {
  id: 'peggy',
  family: 'peg'
};
export const KAITAI_STRUCT_BACKEND: BackendReference = {
  id: 'kaitai-struct',
  family: 'kaitai'
};

export const languagePackAdapterInfo: AdapterInfo = {
  backend: KREUZBERG_LANGUAGE_PACK_BACKEND.id,
  backendRef: KREUZBERG_LANGUAGE_PACK_BACKEND,
  supportsDialects: false
};
export const peggyAdapterInfo: AdapterInfo = {
  backend: PEGGY_BACKEND.id,
  backendRef: PEGGY_BACKEND,
  supportsDialects: false
};
export const peggyFeatureProfile: FeatureProfile = {
  backend: PEGGY_BACKEND.id,
  backendRef: PEGGY_BACKEND,
  supportsDialects: false
};
export const kaitaiAdapterInfo: AdapterInfo = {
  backend: KAITAI_STRUCT_BACKEND.id,
  backendRef: KAITAI_STRUCT_BACKEND,
  supportsDialects: false
};
export const kaitaiFeatureProfile: FeatureProfile = {
  backend: KAITAI_STRUCT_BACKEND.id,
  backendRef: KAITAI_STRUCT_BACKEND,
  supportsDialects: false
};

const initializedLanguages = new Set<string>();
const backendRegistry = new Map<string, BackendReference>([
  [KREUZBERG_LANGUAGE_PACK_BACKEND.id, KREUZBERG_LANGUAGE_PACK_BACKEND],
  [PEGGY_BACKEND.id, PEGGY_BACKEND],
  [KAITAI_STRUCT_BACKEND.id, KAITAI_STRUCT_BACKEND]
]);
let currentBackend: string | undefined;

export function registerBackend(backend: BackendReference): void {
  backendRegistry.set(backend.id, { ...backend });
}

export function backendReference(id: string): BackendReference | undefined {
  const backend = backendRegistry.get(id);

  return backend ? { ...backend } : undefined;
}

export function registeredBackends(): BackendReference[] {
  return [...backendRegistry.values()].map((backend) => ({ ...backend }));
}

export function currentBackendId(): string | undefined {
  return currentBackend;
}

export function withBackend<T>(backendId: string, fn: () => T): T {
  if (!backendRegistry.has(backendId)) {
    throw new Error(`Unknown tree-haver backend ${backendId}.`);
  }

  const previousBackend = currentBackend;
  currentBackend = backendId;
  try {
    return fn();
  } finally {
    currentBackend = previousBackend;
  }
}

export function createPeggyParser(
  grammar: string,
  options?: peggy.ParserBuildOptions
): PeggyParser {
  return peggy.generate(grammar, { ...options, output: 'parser' }) as PeggyParser;
}

export function parseWithPeggy(
  source: string,
  parser: PeggyParser
): ParseResult<{ kind: 'peggy'; backendRef: BackendReference }> {
  try {
    parser.parse(source);
    return {
      ok: true,
      diagnostics: [],
      analysis: {
        kind: 'peggy',
        backendRef: PEGGY_BACKEND
      }
    };
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          category: 'parse_error',
          message: error instanceof Error ? error.message : 'Peggy parse failed.'
        }
      ]
    };
  }
}

function ensureLanguagePackLanguage(language: string): void {
  if (initializedLanguages.has(language) || hasLanguage(language)) {
    initializedLanguages.add(language);
    return;
  }

  init({ languages: [language] });
  initializedLanguages.add(language);
}

function normalizeStructureKind(kind: string): string {
  return kind.toLowerCase();
}

function normalizeTypeScriptImport(importText: string, span: ProcessSpan): ProcessImportInfo {
  const sourceMatch = importText.match(/from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/);
  const source = sourceMatch?.[1] ?? sourceMatch?.[2] ?? importText.trim();
  const namedItemsMatch = importText.match(/\{([^}]+)\}/);
  const items = namedItemsMatch
    ? namedItemsMatch[1]
        .split(',')
        .map((item) => item.replace(/\btype\b/g, '').trim())
        .filter((item) => item.length > 0)
    : [];

  return { source, items, span };
}

export function processWithLanguagePack(
  request: ProcessRequest
): ParseResult<LanguagePackProcessAnalysis> {
  try {
    ensureLanguagePackLanguage(request.language);
    const result = processWithKreuzbergLanguagePack(request.source, {
      language: request.language,
      structure: true,
      imports: true,
      diagnostics: true
    });

    return {
      ok: true,
      diagnostics: [],
      analysis: {
        kind: 'tree-sitter-process',
        language: result.language,
        structure: (result.structure ?? []).map((item) => ({
          kind: normalizeStructureKind(item.kind),
          ...(item.name ? { name: item.name } : {}),
          span: item.span
        })),
        imports: (result.imports ?? []).map((item) => {
          const rawItem = item as typeof item & {
            source?: string;
            module?: string;
            items?: string[];
          };
          const importSourceText = rawItem.source ?? rawItem.module ?? '';
          const importItems = rawItem.items ?? rawItem.names ?? [];

          return request.language === 'typescript'
            ? normalizeTypeScriptImport(importSourceText, item.span)
            : { source: importSourceText, items: importItems, span: item.span };
        }),
        diagnostics: (result.diagnostics ?? []).map((diagnostic) => ({
          message: diagnostic.message,
          severity: diagnostic.severity
        })),
        backendRef: KREUZBERG_LANGUAGE_PACK_BACKEND
      }
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
              : `tree-sitter-language-pack could not process ${request.language}.`
        }
      ]
    };
  }
}

export function parseWithLanguagePack(request: ParserRequest): ParseResult<LanguagePackAnalysis> {
  try {
    ensureLanguagePackLanguage(request.language);
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
