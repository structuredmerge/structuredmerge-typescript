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
  structuredImportSourceDiagnostics,
  type BackendReference,
  type ParserRequest,
  type ProcessRequest,
  type ProcessSpan
} from '@structuredmerge/tree-haver';

export type CSharpDialect = 'csharp';
export type CSharpBackend = 'kreuzberg-language-pack';
export type CSharpOwnerKind = 'import' | 'declaration';

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

export interface CSharpOwner {
  readonly path: string;
  readonly ownerKind: CSharpOwnerKind;
  readonly matchKey?: string;
}

export interface CSharpOwnerMatch {
  readonly templatePath: string;
  readonly destinationPath: string;
}

export interface CSharpOwnerMatchResult {
  readonly matched: readonly CSharpOwnerMatch[];
  readonly unmatchedTemplate: readonly string[];
  readonly unmatchedDestination: readonly string[];
}

export interface CSharpAnalysis {
  readonly kind: 'csharp';
  readonly dialect: CSharpDialect;
  readonly source: string;
  readonly owners: readonly CSharpOwner[];
  readonly imports: readonly ModuleImport[];
  readonly declarations: readonly ModuleDeclaration[];
}

export interface CSharpFeatureProfile extends FamilyFeatureProfile {
  readonly family: 'csharp';
  readonly supportedDialects: readonly CSharpDialect[];
  readonly supportedPolicies: readonly PolicyReference[];
}

export interface CSharpBackendFeatureProfile extends ConformanceFeatureProfileView {
  readonly backend: CSharpBackend;
  readonly backendRef: BackendReference;
  readonly supportsDialects: true;
}

const destinationWinsArrayPolicy: PolicyReference = {
  surface: 'array',
  name: 'destination_wins_array'
};

function csharpParseRequest(source: string): ParserRequest {
  return { source, language: 'csharp', dialect: 'csharp' };
}

function csharpProcessRequest(source: string): ProcessRequest {
  return { source, language: 'csharp' };
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

function unsupportedCSharpBackendFeature(message: string): ParseResult<CSharpAnalysis> {
  return {
    ok: false,
    diagnostics: [{ severity: 'error', category: 'unsupported_feature', message }]
  };
}

function hasUsingDirective(source: string): boolean {
  return source
    .split('\n')
    .some((line) => line.trimStart().startsWith('using '));
}

function analyzeCSharpModule(source: string): ParseResult<CSharpAnalysis> {
  return analyzeCSharpModuleWithBackend(source, 'kreuzberg-language-pack');
}

function analyzeCSharpModuleWithBackend(
  source: string,
  backend: CSharpBackend
): ParseResult<CSharpAnalysis> {
  if (backend !== 'kreuzberg-language-pack') {
    return {
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          category: 'unsupported_feature',
          message: `Unsupported CSharp backend ${backend}.`
        }
      ]
    };
  }

  const parsed = parseWithLanguagePack(csharpParseRequest(source));
  if (!parsed.ok) {
    return { ok: false, diagnostics: parsed.diagnostics };
  }

  const processed = processWithLanguagePack(csharpProcessRequest(source));
  if (!processed.ok || !processed.analysis) {
    return { ok: false, diagnostics: processed.diagnostics };
  }
  const importDiagnostics = structuredImportSourceDiagnostics('csharp', processed.analysis.imports);
  if (importDiagnostics.length > 0) {
    return { ok: false, diagnostics: importDiagnostics };
  }
  if (processed.analysis.imports.length === 0 && hasUsingDirective(source)) {
    return unsupportedCSharpBackendFeature(
      'tree-sitter-language-pack did not provide structured import records for csharp; report this as a backend import-record bug.'
    );
  }

  const imports = processed.analysis.imports.map((item, index) => ({
    path: `/imports/${index}`,
    matchKey: item.source,
    text: importText(source, item.span)
  }));
  const declarations = processed.analysis.structure
    .filter((item) => item.name)
    .map((item) => ({
      path: `/declarations/${item.name}`,
      matchKey: item.name!,
      text: declarationText(source, item.span)
    }))
    .sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));

  return {
    ok: true,
    diagnostics: [],
    analysis: {
      kind: 'csharp',
      dialect: 'csharp',
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

export function csharpFeatureProfile(): CSharpFeatureProfile {
  return {
    family: 'csharp',
    supportedDialects: ['csharp'],
    supportedPolicies: [destinationWinsArrayPolicy]
  };
}

export function csharpBackendFeatureProfile(
  backend: CSharpBackend = 'kreuzberg-language-pack'
): CSharpBackendFeatureProfile {
  return {
    backend,
    backendRef: KREUZBERG_LANGUAGE_PACK_BACKEND,
    supportsDialects: true,
    supportedPolicies: [destinationWinsArrayPolicy]
  };
}

export function csharpPlanContext(
  backend: CSharpBackend = 'kreuzberg-language-pack'
): ConformanceFamilyPlanContext {
  const featureProfile = csharpBackendFeatureProfile(backend);
  return {
    familyProfile: csharpFeatureProfile(),
    featureProfile: {
      backend: featureProfile.backend,
      supportsDialects: featureProfile.supportsDialects,
      supportedPolicies: featureProfile.supportedPolicies
    }
  };
}

export function csharpBackends(): readonly CSharpBackend[] {
  return ['kreuzberg-language-pack'];
}

export function parseCSharp(source: string, dialect: CSharpDialect): ParseResult<CSharpAnalysis> {
  void dialect;
  return analyzeCSharpModule(source);
}

export function parseCSharpWithBackend(
  source: string,
  dialect: CSharpDialect,
  backend: CSharpBackend
): ParseResult<CSharpAnalysis> {
  void dialect;
  return analyzeCSharpModuleWithBackend(source, backend);
}

export function matchCSharpOwners(
  template: CSharpAnalysis,
  destination: CSharpAnalysis
): CSharpOwnerMatchResult {
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

export function mergeCSharp(
  templateSource: string,
  destinationSource: string,
  dialect: CSharpDialect
): MergeResult<string> {
  return mergeCSharpWithBackend(
    templateSource,
    destinationSource,
    dialect,
    'kreuzberg-language-pack'
  );
}

export function mergeCSharpWithBackend(
  templateSource: string,
  destinationSource: string,
  dialect: CSharpDialect,
  backend: CSharpBackend
): MergeResult<string> {
  return mergeCSharpWithParser(templateSource, destinationSource, dialect, (source, current) =>
    parseCSharpWithBackend(source, current, backend)
  );
}

export function mergeCSharpWithParser(
  templateSource: string,
  destinationSource: string,
  dialect: CSharpDialect,
  parser: (source: string, dialect: CSharpDialect) => ParseResult<CSharpAnalysis>
): MergeResult<string> {
  void dialect;
  const template = parser(templateSource, 'csharp');
  if (!template.ok || !template.analysis) {
    return { ok: false, diagnostics: template.diagnostics, policies: [] };
  }

  const destination = parser(destinationSource, 'csharp');
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
