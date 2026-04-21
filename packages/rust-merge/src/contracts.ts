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

export type RustDialect = 'rust';
export type RustBackend = 'kreuzberg-language-pack';
export type RustOwnerKind = 'import' | 'declaration';

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

export interface RustOwner {
  readonly path: string;
  readonly ownerKind: RustOwnerKind;
  readonly matchKey?: string;
}

export interface RustOwnerMatch {
  readonly templatePath: string;
  readonly destinationPath: string;
}

export interface RustOwnerMatchResult {
  readonly matched: readonly RustOwnerMatch[];
  readonly unmatchedTemplate: readonly string[];
  readonly unmatchedDestination: readonly string[];
}

export interface RustAnalysis {
  readonly kind: 'rust';
  readonly dialect: RustDialect;
  readonly source: string;
  readonly owners: readonly RustOwner[];
  readonly imports: readonly ModuleImport[];
  readonly declarations: readonly ModuleDeclaration[];
}

export interface RustFeatureProfile extends FamilyFeatureProfile {
  readonly family: 'rust';
  readonly supportedDialects: readonly RustDialect[];
  readonly supportedPolicies: readonly PolicyReference[];
}

export interface RustBackendFeatureProfile extends ConformanceFeatureProfileView {
  readonly backend: RustBackend;
  readonly backendRef: BackendReference;
  readonly supportsDialects: true;
}

const destinationWinsArrayPolicy: PolicyReference = {
  surface: 'array',
  name: 'destination_wins_array'
};

function rustParseRequest(source: string): ParserRequest {
  return { source, language: 'rust', dialect: 'rust' };
}

function rustProcessRequest(source: string): ProcessRequest {
  return { source, language: 'rust' };
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

function normalizeRustImportPath(importSource: string): string {
  return importSource
    .replace(/^use\s+/, '')
    .replace(/;$/, '')
    .trim();
}

function analyzeRustModule(source: string): ParseResult<RustAnalysis> {
  const parsed = parseWithLanguagePack(rustParseRequest(source));
  if (!parsed.ok) {
    return { ok: false, diagnostics: parsed.diagnostics };
  }

  const processed = processWithLanguagePack(rustProcessRequest(source));
  if (!processed.ok || !processed.analysis) {
    return { ok: false, diagnostics: processed.diagnostics };
  }

  const imports = processed.analysis.imports.map((item, index) => ({
    path: `/imports/${index}`,
    matchKey: normalizeRustImportPath(item.source),
    text: importText(source, item.span)
  }));

  const declarations = processed.analysis.structure
    .filter((item) => item.name)
    .map((item) => ({
      path: `/declarations/${item.name!}`,
      matchKey: item.name!,
      text: declarationText(source, item.span)
    }))
    .sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));

  return {
    ok: true,
    diagnostics: [],
    analysis: {
      kind: 'rust',
      dialect: 'rust',
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

export function rustFeatureProfile(): RustFeatureProfile {
  return {
    family: 'rust',
    supportedDialects: ['rust'],
    supportedPolicies: [destinationWinsArrayPolicy]
  };
}

export function rustBackendFeatureProfile(
  backend: RustBackend = 'kreuzberg-language-pack'
): RustBackendFeatureProfile {
  return {
    backend,
    backendRef: KREUZBERG_LANGUAGE_PACK_BACKEND,
    supportsDialects: true,
    supportedPolicies: [destinationWinsArrayPolicy]
  };
}

export function rustPlanContext(
  backend: RustBackend = 'kreuzberg-language-pack'
): ConformanceFamilyPlanContext {
  const featureProfile = rustBackendFeatureProfile(backend);
  return {
    familyProfile: rustFeatureProfile(),
    featureProfile: {
      backend: featureProfile.backend,
      supportsDialects: featureProfile.supportsDialects,
      supportedPolicies: featureProfile.supportedPolicies
    }
  };
}

export function rustBackends(): readonly RustBackend[] {
  return ['kreuzberg-language-pack'];
}

export function parseRust(source: string, dialect: RustDialect): ParseResult<RustAnalysis> {
  void dialect;
  return analyzeRustModule(source);
}

export function matchRustOwners(
  template: RustAnalysis,
  destination: RustAnalysis
): RustOwnerMatchResult {
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

export function mergeRust(
  templateSource: string,
  destinationSource: string,
  dialect: RustDialect
): MergeResult<string> {
  const template = parseRust(templateSource, dialect);
  if (!template.ok || !template.analysis) {
    return { ok: false, diagnostics: template.diagnostics, policies: [] };
  }

  const destination = parseRust(destinationSource, dialect);
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
