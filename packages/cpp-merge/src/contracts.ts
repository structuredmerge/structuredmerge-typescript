import type {
  ConformanceFeatureProfileView,
  ConformanceFamilyPlanContext,
  FamilyFeatureProfile,
  MergeResult,
  ParseResult,
  PolicyReference
} from '@structuredmerge/ast-merge';
import {
  KREUZBERG_LANGUAGE_PACK_BACKEND,
  parseWithLanguagePack,
  processWithLanguagePack,
  type BackendReference,
  type ParserRequest,
  type ProcessRequest,
  type ProcessSpan
} from '@structuredmerge/tree-haver';

export type CppDialect = 'cpp';
export type CppBackend = 'kreuzberg-language-pack';
export type CppOwnerKind = 'import' | 'declaration';

interface ModuleImport {
  readonly path: string;
  readonly matchKey: string;
  readonly text: string;
}

interface ModuleDeclaration {
  readonly path: string;
  readonly matchKey: string;
  readonly text: string;
}

export interface CppOwner {
  readonly path: string;
  readonly ownerKind: CppOwnerKind;
  readonly matchKey?: string;
}

export interface CppOwnerMatch {
  readonly templatePath: string;
  readonly destinationPath: string;
}

export interface CppOwnerMatchResult {
  readonly matched: readonly CppOwnerMatch[];
  readonly unmatchedTemplate: readonly string[];
  readonly unmatchedDestination: readonly string[];
}

export interface CppAnalysis {
  readonly kind: 'cpp';
  readonly dialect: CppDialect;
  readonly source: string;
  readonly owners: readonly CppOwner[];
  readonly imports: readonly ModuleImport[];
  readonly declarations: readonly ModuleDeclaration[];
}

export interface CppFeatureProfile extends FamilyFeatureProfile {
  readonly family: 'cpp';
  readonly supportedDialects: readonly CppDialect[];
  readonly supportedPolicies: readonly PolicyReference[];
}

export interface CppBackendFeatureProfile extends ConformanceFeatureProfileView {
  readonly backend: CppBackend;
  readonly backendRef: BackendReference;
  readonly supportsDialects: true;
}

const destinationWinsArrayPolicy: PolicyReference = {
  surface: 'array',
  name: 'destination_wins_array'
};

function cppParseRequest(source: string): ParserRequest {
  return { source, language: 'cpp', dialect: 'cpp' };
}

function cppProcessRequest(source: string): ProcessRequest {
  return { source, language: 'cpp' };
}

function sliceSpan(source: string, span: ProcessSpan): string {
  return source.slice(span.startByte, span.endByte).trim();
}

function lineAnchoredSlice(source: string, span: ProcessSpan): string {
  const lineStart = source.lastIndexOf('\n', Math.max(0, span.startByte - 1)) + 1;
  return source.slice(lineStart, span.endByte).trim();
}

function declarationText(source: string, span: ProcessSpan): string {
  return `${lineAnchoredSlice(source, span)}\n`;
}

function importText(source: string, span: ProcessSpan): string {
  return `${sliceSpan(source, span)}\n`;
}

function normalizeCppImportSource(importSource: string): string {
  return importSource.trim();
}

function byteOffsetToPoint(source: string, byteOffset: number): { row: number; column: number } {
  const sourceBytes = Buffer.from(source, 'utf8');
  const before = sourceBytes.slice(0, byteOffset);
  let row = 0;
  let column = 0;
  for (const value of before) {
    if (value === 10) {
      row += 1;
      column = 0;
    } else {
      column += 1;
    }
  }
  return { row, column };
}

function extractCppImports(source: string): ModuleImport[] {
  const matches = [...source.matchAll(/^\s*#include\s+([<"][^>"\n]+[>"])/gm)];
  return matches
    .map((match, index) => {
      if (match.index === undefined) {
        return undefined;
      }

      const line = match[0];
      const path = match[1]!.slice(1, -1);
      const startByte = Buffer.from(source.slice(0, match.index), 'utf8').length;
      const endByte = startByte + Buffer.from(line, 'utf8').length;
      const startPoint = byteOffsetToPoint(source, startByte);
      const endPoint = byteOffsetToPoint(source, endByte);

      return {
        path: `/imports/${index}`,
        matchKey: normalizeCppImportSource(path),
        text: importText(source, {
          startByte,
          endByte,
          startRow: startPoint.row,
          endRow: endPoint.row,
          startCol: startPoint.column,
          endCol: endPoint.column
        })
      };
    })
    .filter((item): item is ModuleImport => item !== undefined);
}

function extractFunctionName(source: string, span: ProcessSpan): string | undefined {
  const sourceText = source.slice(span.startByte, span.endByte);
  const openBrace = sourceText.indexOf('{');
  if (openBrace < 0) {
    return undefined;
  }
  const signature = sourceText.slice(0, openBrace);
  const beforeParen = signature.slice(0, signature.lastIndexOf('('));
  const match = beforeParen.match(/([A-Za-z_][A-Za-z0-9_]*)\s*$/);
  return match?.[1];
}

function analyzeCppModule(source: string): ParseResult<CppAnalysis> {
  return analyzeCppModuleWithBackend(source, 'kreuzberg-language-pack');
}

function analyzeCppModuleWithBackend(
  source: string,
  backend: CppBackend
): ParseResult<CppAnalysis> {
  if (backend !== 'kreuzberg-language-pack') {
    return {
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          category: 'unsupported_feature',
          message: `Unsupported Cpp backend ${backend}.`
        }
      ]
    };
  }

  const parsed = parseWithLanguagePack(cppParseRequest(source));
  if (!parsed.ok) {
    return { ok: false, diagnostics: parsed.diagnostics };
  }

  const processed = processWithLanguagePack(cppProcessRequest(source));
  if (!processed.ok || !processed.analysis) {
    return { ok: false, diagnostics: processed.diagnostics };
  }

  const imports = extractCppImports(source);
  const declarations = processed.analysis.structure
    .filter((item) => item.kind === 'function')
    .map((item) => {
      const matchKey = extractFunctionName(source, item.span);
      return matchKey
        ? {
            path: `/declarations/${matchKey}`,
            matchKey,
            text: declarationText(source, item.span)
          }
        : undefined;
    })
    .filter((item): item is ModuleDeclaration => item !== undefined)
    .sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));

  return {
    ok: true,
    diagnostics: [],
    analysis: {
      kind: 'cpp',
      dialect: 'cpp',
      source,
      owners: [
        ...imports.map((item) => ({
          path: item.path,
          ownerKind: 'import' as const,
          matchKey: item.matchKey
        })),
        ...declarations.map((item) => ({
          path: item.path,
          ownerKind: 'declaration' as const,
          matchKey: item.matchKey
        }))
      ],
      imports,
      declarations
    },
    policies: []
  };
}

export function cppFeatureProfile(): CppFeatureProfile {
  return {
    family: 'cpp',
    supportedDialects: ['cpp'],
    supportedPolicies: [destinationWinsArrayPolicy]
  };
}

export function cppBackendFeatureProfile(
  backend: CppBackend = 'kreuzberg-language-pack'
): CppBackendFeatureProfile {
  return {
    backend,
    backendRef: KREUZBERG_LANGUAGE_PACK_BACKEND,
    supportsDialects: true,
    supportedPolicies: [destinationWinsArrayPolicy]
  };
}

export function cppPlanContext(
  backend: CppBackend = 'kreuzberg-language-pack'
): ConformanceFamilyPlanContext {
  const featureProfile = cppBackendFeatureProfile(backend);
  return {
    familyProfile: cppFeatureProfile(),
    featureProfile: {
      backend: featureProfile.backend,
      supportsDialects: featureProfile.supportsDialects,
      supportedPolicies: featureProfile.supportedPolicies
    }
  };
}

export function cppBackends(): readonly CppBackend[] {
  return ['kreuzberg-language-pack'];
}

export function parseCpp(source: string, dialect: CppDialect): ParseResult<CppAnalysis> {
  void dialect;
  return analyzeCppModule(source);
}

export function parseCppWithBackend(
  source: string,
  dialect: CppDialect,
  backend: CppBackend
): ParseResult<CppAnalysis> {
  void dialect;
  return analyzeCppModuleWithBackend(source, backend);
}

export function matchCppOwners(
  template: CppAnalysis,
  destination: CppAnalysis
): CppOwnerMatchResult {
  const destinationOwners = new Set(destination.owners.map((owner) => owner.path));
  const templateOwners = new Set(template.owners.map((owner) => owner.path));

  return {
    matched: template.owners
      .filter((owner) => destinationOwners.has(owner.path))
      .map((owner) => ({ templatePath: owner.path, destinationPath: owner.path })),
    unmatchedTemplate: template.owners
      .map((owner) => owner.path)
      .filter((path) => !destinationOwners.has(path)),
    unmatchedDestination: destination.owners
      .map((owner) => owner.path)
      .filter((path) => !templateOwners.has(path))
  };
}

export function mergeCpp(
  templateSource: string,
  destinationSource: string,
  dialect: CppDialect
): MergeResult<string> {
  return mergeCppWithBackend(templateSource, destinationSource, dialect, 'kreuzberg-language-pack');
}

export function mergeCppWithBackend(
  templateSource: string,
  destinationSource: string,
  dialect: CppDialect,
  backend: CppBackend
): MergeResult<string> {
  return mergeCppWithParser(templateSource, destinationSource, dialect, (source, current) =>
    parseCppWithBackend(source, current, backend)
  );
}

export function mergeCppWithParser(
  templateSource: string,
  destinationSource: string,
  dialect: CppDialect,
  parser: (source: string, dialect: CppDialect) => ParseResult<CppAnalysis>
): MergeResult<string> {
  void dialect;
  const template = parser(templateSource, 'cpp');
  if (!template.ok || !template.analysis) {
    return { ok: false, diagnostics: template.diagnostics, policies: [] };
  }

  const destination = parser(destinationSource, 'cpp');
  if (!destination.ok || !destination.analysis) {
    return {
      ok: false,
      diagnostics: destination.diagnostics.map((diagnostic) => ({
        ...diagnostic,
        category:
          diagnostic.category === 'parse_error' ? 'destination_parse_error' : diagnostic.category
      })),
      policies: []
    };
  }

  const destinationDeclarations = new Map(
    destination.analysis.declarations.map((item) => [item.path, item])
  );
  const mergedDeclarationTexts = [
    ...destination.analysis.declarations.map((item) => item.text),
    ...template.analysis.declarations
      .filter((item) => !destinationDeclarations.has(item.path))
      .map((item) => item.text)
  ];
  const importBlock = destination.analysis.imports.map((item) => item.text).join('');
  const declarationBlock = mergedDeclarationTexts.join('\n').trimEnd();
  const sections = [importBlock.trimEnd(), declarationBlock].filter(
    (section) => section.length > 0
  );

  return {
    ok: true,
    diagnostics: [],
    output: `${sections.join('\n\n').trimEnd()}\n`,
    policies: [destinationWinsArrayPolicy]
  };
}
