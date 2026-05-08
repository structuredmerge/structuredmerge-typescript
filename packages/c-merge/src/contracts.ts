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

export type CDialect = 'c';
export type CBackend = 'kreuzberg-language-pack';
export type COwnerKind = 'import' | 'declaration';

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

export interface COwner {
  readonly path: string;
  readonly ownerKind: COwnerKind;
  readonly matchKey?: string;
}

export interface COwnerMatch {
  readonly templatePath: string;
  readonly destinationPath: string;
}

export interface COwnerMatchResult {
  readonly matched: readonly COwnerMatch[];
  readonly unmatchedTemplate: readonly string[];
  readonly unmatchedDestination: readonly string[];
}

export interface CAnalysis {
  readonly kind: 'c';
  readonly dialect: CDialect;
  readonly source: string;
  readonly owners: readonly COwner[];
  readonly imports: readonly ModuleImport[];
  readonly declarations: readonly ModuleDeclaration[];
}

export interface CFeatureProfile extends FamilyFeatureProfile {
  readonly family: 'c';
  readonly supportedDialects: readonly CDialect[];
  readonly supportedPolicies: readonly PolicyReference[];
}

export interface CBackendFeatureProfile extends ConformanceFeatureProfileView {
  readonly backend: CBackend;
  readonly backendRef: BackendReference;
  readonly supportsDialects: true;
}

const destinationWinsArrayPolicy: PolicyReference = {
  surface: 'array',
  name: 'destination_wins_array'
};

function cParseRequest(source: string): ParserRequest {
  return { source, language: 'c', dialect: 'c' };
}

function cProcessRequest(source: string): ProcessRequest {
  return { source, language: 'c' };
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

function normalizeCImportSource(importSource: string): string {
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

function extractCImports(source: string): ModuleImport[] {
  const matches = [...source.matchAll(/^\s*#include\s+([<\"][^>"\n]+[>"])/gm)];
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
        matchKey: normalizeCImportSource(path),
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

function analyzeCModule(source: string): ParseResult<CAnalysis> {
  return analyzeCModuleWithBackend(source, 'kreuzberg-language-pack');
}

function analyzeCModuleWithBackend(source: string, backend: CBackend): ParseResult<CAnalysis> {
  if (backend !== 'kreuzberg-language-pack') {
    return {
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          category: 'unsupported_feature',
          message: `Unsupported C backend ${backend}.`
        }
      ]
    };
  }

  const parsed = parseWithLanguagePack(cParseRequest(source));
  if (!parsed.ok) {
    return { ok: false, diagnostics: parsed.diagnostics };
  }

  const processed = processWithLanguagePack(cProcessRequest(source));
  if (!processed.ok || !processed.analysis) {
    return { ok: false, diagnostics: processed.diagnostics };
  }

  const imports = extractCImports(source);
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
      kind: 'c',
      dialect: 'c',
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

export function cFeatureProfile(): CFeatureProfile {
  return {
    family: 'c',
    supportedDialects: ['c'],
    supportedPolicies: [destinationWinsArrayPolicy]
  };
}

export function cBackendFeatureProfile(
  backend: CBackend = 'kreuzberg-language-pack'
): CBackendFeatureProfile {
  return {
    backend,
    backendRef: KREUZBERG_LANGUAGE_PACK_BACKEND,
    supportsDialects: true,
    supportedPolicies: [destinationWinsArrayPolicy]
  };
}

export function cPlanContext(
  backend: CBackend = 'kreuzberg-language-pack'
): ConformanceFamilyPlanContext {
  const featureProfile = cBackendFeatureProfile(backend);
  return {
    familyProfile: cFeatureProfile(),
    featureProfile: {
      backend: featureProfile.backend,
      supportsDialects: featureProfile.supportsDialects,
      supportedPolicies: featureProfile.supportedPolicies
    }
  };
}

export function cBackends(): readonly CBackend[] {
  return ['kreuzberg-language-pack'];
}

export function parseC(source: string, dialect: CDialect): ParseResult<CAnalysis> {
  void dialect;
  return analyzeCModule(source);
}

export function parseCWithBackend(
  source: string,
  dialect: CDialect,
  backend: CBackend
): ParseResult<CAnalysis> {
  void dialect;
  return analyzeCModuleWithBackend(source, backend);
}

export function matchCOwners(template: CAnalysis, destination: CAnalysis): COwnerMatchResult {
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

export function mergeC(
  templateSource: string,
  destinationSource: string,
  dialect: CDialect
): MergeResult<string> {
  return mergeCWithBackend(templateSource, destinationSource, dialect, 'kreuzberg-language-pack');
}

export function mergeCWithBackend(
  templateSource: string,
  destinationSource: string,
  dialect: CDialect,
  backend: CBackend
): MergeResult<string> {
  return mergeCWithParser(templateSource, destinationSource, dialect, (source, current) =>
    parseCWithBackend(source, current, backend)
  );
}

export function mergeCWithParser(
  templateSource: string,
  destinationSource: string,
  dialect: CDialect,
  parser: (source: string, dialect: CDialect) => ParseResult<CAnalysis>
): MergeResult<string> {
  void dialect;
  const template = parser(templateSource, 'c');
  if (!template.ok || !template.analysis) {
    return { ok: false, diagnostics: template.diagnostics, policies: [] };
  }

  const destination = parser(destinationSource, 'c');
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
