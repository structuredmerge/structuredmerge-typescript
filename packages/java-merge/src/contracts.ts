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

export type JavaDialect = 'java';
export type JavaBackend = 'kreuzberg-language-pack';
export type JavaOwnerKind = 'import' | 'declaration';

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

export interface JavaOwner {
  readonly path: string;
  readonly ownerKind: JavaOwnerKind;
  readonly matchKey?: string;
}

export interface JavaOwnerMatch {
  readonly templatePath: string;
  readonly destinationPath: string;
}

export interface JavaOwnerMatchResult {
  readonly matched: readonly JavaOwnerMatch[];
  readonly unmatchedTemplate: readonly string[];
  readonly unmatchedDestination: readonly string[];
}

export interface JavaAnalysis {
  readonly kind: 'java';
  readonly dialect: JavaDialect;
  readonly source: string;
  readonly owners: readonly JavaOwner[];
  readonly imports: readonly ModuleImport[];
  readonly declarations: readonly ModuleDeclaration[];
}

export interface JavaFeatureProfile extends FamilyFeatureProfile {
  readonly family: 'java';
  readonly supportedDialects: readonly JavaDialect[];
  readonly supportedPolicies: readonly PolicyReference[];
}

export interface JavaBackendFeatureProfile extends ConformanceFeatureProfileView {
  readonly backend: JavaBackend;
  readonly backendRef: BackendReference;
  readonly supportsDialects: true;
}

const destinationWinsArrayPolicy: PolicyReference = {
  surface: 'array',
  name: 'destination_wins_array'
};

function javaParseRequest(source: string): ParserRequest {
  return { source, language: 'java', dialect: 'java' };
}

function javaProcessRequest(source: string): ProcessRequest {
  return { source, language: 'java' };
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

function normalizeJavaImportSource(importSource: string): string {
  const trimmed = importSource
    .trim()
    .replace(/^import\s+/, '')
    .replace(/;$/, '');
  return trimmed.replace(/^static\s+/, '').trim();
}

function analyzeJavaModule(source: string): ParseResult<JavaAnalysis> {
  return analyzeJavaModuleWithBackend(source, 'kreuzberg-language-pack');
}

function analyzeJavaModuleWithBackend(
  source: string,
  backend: JavaBackend
): ParseResult<JavaAnalysis> {
  if (backend !== 'kreuzberg-language-pack') {
    return {
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          category: 'unsupported_feature',
          message: `Unsupported Java backend ${backend}.`
        }
      ]
    };
  }

  const parsed = parseWithLanguagePack(javaParseRequest(source));
  if (!parsed.ok) {
    return { ok: false, diagnostics: parsed.diagnostics };
  }

  const processed = processWithLanguagePack(javaProcessRequest(source));
  if (!processed.ok || !processed.analysis) {
    return { ok: false, diagnostics: processed.diagnostics };
  }

  const imports = processed.analysis.imports.map((item, index) => ({
    path: `/imports/${index}`,
    matchKey: normalizeJavaImportSource(item.source),
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
      kind: 'java',
      dialect: 'java',
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

export function javaFeatureProfile(): JavaFeatureProfile {
  return {
    family: 'java',
    supportedDialects: ['java'],
    supportedPolicies: [destinationWinsArrayPolicy]
  };
}

export function javaBackendFeatureProfile(
  backend: JavaBackend = 'kreuzberg-language-pack'
): JavaBackendFeatureProfile {
  return {
    backend,
    backendRef: KREUZBERG_LANGUAGE_PACK_BACKEND,
    supportsDialects: true,
    supportedPolicies: [destinationWinsArrayPolicy]
  };
}

export function javaPlanContext(
  backend: JavaBackend = 'kreuzberg-language-pack'
): ConformanceFamilyPlanContext {
  const featureProfile = javaBackendFeatureProfile(backend);
  return {
    familyProfile: javaFeatureProfile(),
    featureProfile: {
      backend: featureProfile.backend,
      supportsDialects: featureProfile.supportsDialects,
      supportedPolicies: featureProfile.supportedPolicies
    }
  };
}

export function javaBackends(): readonly JavaBackend[] {
  return ['kreuzberg-language-pack'];
}

export function parseJava(source: string, dialect: JavaDialect): ParseResult<JavaAnalysis> {
  void dialect;
  return analyzeJavaModule(source);
}

export function parseJavaWithBackend(
  source: string,
  dialect: JavaDialect,
  backend: JavaBackend
): ParseResult<JavaAnalysis> {
  void dialect;
  return analyzeJavaModuleWithBackend(source, backend);
}

export function matchJavaOwners(
  template: JavaAnalysis,
  destination: JavaAnalysis
): JavaOwnerMatchResult {
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

export function mergeJava(
  templateSource: string,
  destinationSource: string,
  dialect: JavaDialect
): MergeResult<string> {
  return mergeJavaWithBackend(
    templateSource,
    destinationSource,
    dialect,
    'kreuzberg-language-pack'
  );
}

export function mergeJavaWithBackend(
  templateSource: string,
  destinationSource: string,
  dialect: JavaDialect,
  backend: JavaBackend
): MergeResult<string> {
  return mergeJavaWithParser(templateSource, destinationSource, dialect, (source, current) =>
    parseJavaWithBackend(source, current, backend)
  );
}

export function mergeJavaWithParser(
  templateSource: string,
  destinationSource: string,
  dialect: JavaDialect,
  parser: (source: string, dialect: JavaDialect) => ParseResult<JavaAnalysis>
): MergeResult<string> {
  void dialect;
  const template = parser(templateSource, 'java');
  if (!template.ok || !template.analysis) {
    return { ok: false, diagnostics: template.diagnostics, policies: [] };
  }

  const destination = parser(destinationSource, 'java');
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
