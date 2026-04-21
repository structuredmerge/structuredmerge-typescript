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

export type GoDialect = 'go';
export type GoBackend = 'kreuzberg-language-pack';
export type GoOwnerKind = 'import' | 'declaration';

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

export interface GoOwner {
  readonly path: string;
  readonly ownerKind: GoOwnerKind;
  readonly matchKey?: string;
}

export interface GoOwnerMatch {
  readonly templatePath: string;
  readonly destinationPath: string;
}

export interface GoOwnerMatchResult {
  readonly matched: readonly GoOwnerMatch[];
  readonly unmatchedTemplate: readonly string[];
  readonly unmatchedDestination: readonly string[];
}

export interface GoAnalysis {
  readonly kind: 'go';
  readonly dialect: GoDialect;
  readonly source: string;
  readonly owners: readonly GoOwner[];
  readonly imports: readonly ModuleImport[];
  readonly declarations: readonly ModuleDeclaration[];
}

export interface GoFeatureProfile extends FamilyFeatureProfile {
  readonly family: 'go';
  readonly supportedDialects: readonly GoDialect[];
  readonly supportedPolicies: readonly PolicyReference[];
}

export interface GoBackendFeatureProfile extends ConformanceFeatureProfileView {
  readonly backend: GoBackend;
  readonly backendRef: BackendReference;
  readonly supportsDialects: true;
}

const destinationWinsArrayPolicy: PolicyReference = {
  surface: 'array',
  name: 'destination_wins_array'
};

function goParseRequest(source: string): ParserRequest {
  return { source, language: 'go', dialect: 'go' };
}

function goProcessRequest(source: string): ProcessRequest {
  return { source, language: 'go' };
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

function normalizeGoImportPath(importSource: string): string {
  const quoteMatch = importSource.match(/"([^"]+)"/);
  return quoteMatch?.[1] ?? importSource.replace(/^import\s+/, '').trim();
}

function analyzeGoModule(source: string): ParseResult<GoAnalysis> {
  const parsed = parseWithLanguagePack(goParseRequest(source));
  if (!parsed.ok) {
    return { ok: false, diagnostics: parsed.diagnostics };
  }

  const processed = processWithLanguagePack(goProcessRequest(source));
  if (!processed.ok || !processed.analysis) {
    return { ok: false, diagnostics: processed.diagnostics };
  }

  const dedupedImports = new Map<string, ModuleImport>();
  for (const item of processed.analysis.imports) {
    const matchKey = normalizeGoImportPath(item.source);
    const candidate: ModuleImport = {
      path: '',
      matchKey,
      text: importText(source, item.span)
    };
    const current = dedupedImports.get(matchKey);
    if (!current || candidate.text.length > current.text.length) {
      dedupedImports.set(matchKey, candidate);
    }
  }

  const imports = [...dedupedImports.values()].map((item, index) => ({
    ...item,
    path: `/imports/${index}`
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
      kind: 'go',
      dialect: 'go',
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

export function goFeatureProfile(): GoFeatureProfile {
  return {
    family: 'go',
    supportedDialects: ['go'],
    supportedPolicies: [destinationWinsArrayPolicy]
  };
}

export function goBackendFeatureProfile(
  backend: GoBackend = 'kreuzberg-language-pack'
): GoBackendFeatureProfile {
  return {
    backend,
    backendRef: KREUZBERG_LANGUAGE_PACK_BACKEND,
    supportsDialects: true,
    supportedPolicies: [destinationWinsArrayPolicy]
  };
}

export function goPlanContext(
  backend: GoBackend = 'kreuzberg-language-pack'
): ConformanceFamilyPlanContext {
  const featureProfile = goBackendFeatureProfile(backend);
  return {
    familyProfile: goFeatureProfile(),
    featureProfile: {
      backend: featureProfile.backend,
      supportsDialects: featureProfile.supportsDialects,
      supportedPolicies: featureProfile.supportedPolicies
    }
  };
}

export function goBackends(): readonly GoBackend[] {
  return ['kreuzberg-language-pack'];
}

export function parseGo(source: string, dialect: GoDialect): ParseResult<GoAnalysis> {
  void dialect;
  return analyzeGoModule(source);
}

export function matchGoOwners(template: GoAnalysis, destination: GoAnalysis): GoOwnerMatchResult {
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

export function mergeGo(
  templateSource: string,
  destinationSource: string,
  dialect: GoDialect
): MergeResult<string> {
  const template = parseGo(templateSource, dialect);
  if (!template.ok || !template.analysis) {
    return { ok: false, diagnostics: template.diagnostics, policies: [] };
  }

  const destination = parseGo(destinationSource, dialect);
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
