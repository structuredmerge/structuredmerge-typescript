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

export type DiagnosticSeverity = 'info' | 'warning' | 'error';

export type DiagnosticCategory = 'parse_error' | 'unsupported_feature';

export interface Diagnostic {
  readonly severity: DiagnosticSeverity;
  readonly category: DiagnosticCategory;
  readonly message: string;
  readonly path?: string;
}

export type PolicySurface = 'fallback' | 'array';

export interface PolicyReference {
  readonly surface: PolicySurface;
  readonly name: string;
}

export interface ParseResult<TAnalysis> {
  readonly ok: boolean;
  readonly diagnostics: readonly Diagnostic[];
  readonly analysis?: TAnalysis;
  readonly policies?: readonly PolicyReference[];
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

export interface ByteRange {
  readonly startByte: number;
  readonly endByte: number;
}

export interface SourcePoint {
  readonly row: number;
  readonly column: number;
}

export interface SourceSpan {
  readonly range: ByteRange;
  readonly startPoint: SourcePoint;
  readonly endPoint: SourcePoint;
}

export interface ByteEditSpan {
  readonly startByte: number;
  readonly oldEndByte: number;
  readonly newEndByte: number;
  readonly startPoint: SourcePoint;
  readonly oldEndPoint: SourcePoint;
  readonly newEndPoint: SourcePoint;
}

export type BinaryScalarValue =
  | { readonly kind: 'string'; readonly value: string }
  | { readonly kind: 'integer'; readonly value: number }
  | { readonly kind: 'float'; readonly value: number }
  | { readonly kind: 'boolean'; readonly value: boolean }
  | { readonly kind: 'enum'; readonly symbol: string; readonly rawValue: number }
  | { readonly kind: 'bytes'; readonly encoding: string; readonly value: string }
  | { readonly kind: 'timestamp'; readonly value: string }
  | { readonly kind: 'opaque'; readonly format: string; readonly description: string }
  | { readonly kind: 'null' };

export interface BinaryRenderPolicy {
  readonly schemaPath: string;
  readonly byteRange?: ByteRange;
  readonly operation: string;
  readonly disposition: string;
  readonly reason: string;
}

export interface BinaryDiagnostic {
  readonly severity: string;
  readonly category: string;
  readonly message: string;
  readonly schemaPath: string;
  readonly byteRange?: ByteRange;
}

export interface BinaryNestedDispatch {
  readonly schemaPath: string;
  readonly family: string;
  readonly status: string;
}

export interface BinaryPayloadRegion {
  readonly kind: string;
  readonly schemaPath: string;
  readonly byteRange: ByteRange;
  readonly expectedHex: string;
}

export interface BinaryRawPayload {
  readonly encoding: string;
  readonly value: string;
  readonly byteLength: number;
  readonly regions: readonly BinaryPayloadRegion[];
}

export interface BinaryMergeReport {
  readonly format: string;
  readonly schema: string;
  readonly matchedSchemaPaths: readonly string[];
  readonly preservedRanges: readonly ByteRange[];
  readonly rewrittenNodes: readonly string[];
  readonly checksumUpdates: readonly string[];
  readonly nestedDispatches: readonly BinaryNestedDispatch[];
  readonly diagnostics: readonly BinaryDiagnostic[];
}

export interface ZipArchiveInfo {
  readonly format: string;
  readonly schema: string;
  readonly entryCount: number;
  readonly centralDirectoryRange: ByteRange;
}

export interface ZipArchiveEntry {
  readonly path: string;
  readonly normalizedPath: string;
  readonly directory: boolean;
  readonly compression: string;
  readonly compressedSize: number;
  readonly uncompressedSize: number;
  readonly crc32: string;
  readonly localHeaderRange: ByteRange;
  readonly dataRange: ByteRange;
  readonly centralDirectoryRange: ByteRange;
}

export interface ZipMemberDecision {
  readonly normalizedPath: string;
  readonly operation: string;
  readonly disposition: string;
  readonly nestedFamily?: string;
  readonly reason: string;
}

export interface ZipUnsafeEntry {
  readonly path: string;
  readonly normalizedPath: string;
  readonly category: string;
  readonly reason: string;
}

export interface ZipFamilyReport {
  readonly archive: ZipArchiveInfo;
  readonly entries: readonly ZipArchiveEntry[];
  readonly memberDecisions: readonly ZipMemberDecision[];
  readonly unsafeEntries?: readonly ZipUnsafeEntry[];
  readonly mergeReport: BinaryMergeReport;
}

export function byteRangeLength(range: ByteRange): number {
  return byteRangeIsValid(range) ? range.endByte - range.startByte : 0;
}

export function byteRangeIsValid(range: ByteRange): boolean {
  return range.startByte >= 0 && range.endByte >= range.startByte;
}

export function byteRangeContainsByte(range: ByteRange, offset: number): boolean {
  return byteRangeIsValid(range) && offset >= range.startByte && offset < range.endByte;
}

export function byteRangeContainsRange(range: ByteRange, other: ByteRange): boolean {
  return (
    byteRangeIsValid(range) &&
    byteRangeIsValid(other) &&
    other.startByte >= range.startByte &&
    other.endByte <= range.endByte
  );
}

export function byteRangeOverlaps(range: ByteRange, other: ByteRange): boolean {
  return (
    byteRangeIsValid(range) &&
    byteRangeIsValid(other) &&
    range.startByte < other.endByte &&
    other.startByte < range.endByte
  );
}

export function sliceByteRange(source: string, range: ByteRange): string {
  const sourceBytes = Buffer.from(source, 'utf8');
  if (!byteRangeIsValid(range) || range.endByte > sourceBytes.length) {
    throw new RangeError(
      `invalid byte range [${range.startByte}, ${range.endByte}) for source length ${sourceBytes.length}`
    );
  }

  return sourceBytes.subarray(range.startByte, range.endByte).toString('utf8');
}

export function byteOffsetForPoint(source: string, point: SourcePoint): number {
  if (point.row < 0 || point.column < 0) {
    throw new RangeError(`invalid source point (${point.row}, ${point.column})`);
  }

  const sourceBytes = Buffer.from(source, 'utf8');
  let row = 0;
  let column = 0;
  for (const [offset, value] of sourceBytes.entries()) {
    if (row === point.row && column === point.column) {
      return offset;
    }
    if (value === 10) {
      row += 1;
      column = 0;
    } else {
      column += 1;
    }
  }
  if (row === point.row && column === point.column) {
    return sourceBytes.length;
  }

  throw new RangeError(`source point (${point.row}, ${point.column}) is outside source`);
}

export function byteEditOldRange(edit: ByteEditSpan): ByteRange {
  return { startByte: edit.startByte, endByte: edit.oldEndByte };
}

export function byteEditNewRange(edit: ByteEditSpan): ByteRange {
  return { startByte: edit.startByte, endByte: edit.newEndByte };
}

export function byteEditDelta(edit: ByteEditSpan): number {
  return edit.newEndByte - edit.oldEndByte;
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
  readonly sourceByteLength?: number;
  readonly root: KaitaiTreeNode;
  readonly backendRef: BackendReference;
  readonly diagnostics?: readonly BinaryDiagnostic[];
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
