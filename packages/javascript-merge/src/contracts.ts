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

export type JavaScriptDialect = 'javascript';
export type JavaScriptBackend = 'kreuzberg-language-pack';
export type JavaScriptOwnerKind = 'import' | 'declaration';

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

export interface JavaScriptOwner {
  readonly path: string;
  readonly ownerKind: JavaScriptOwnerKind;
  readonly matchKey?: string;
}

export interface JavaScriptOwnerMatch {
  readonly templatePath: string;
  readonly destinationPath: string;
}

export interface JavaScriptOwnerMatchResult {
  readonly matched: readonly JavaScriptOwnerMatch[];
  readonly unmatchedTemplate: readonly string[];
  readonly unmatchedDestination: readonly string[];
}

export interface JavaScriptAnalysis {
  readonly kind: 'javascript';
  readonly dialect: JavaScriptDialect;
  readonly source: string;
  readonly owners: readonly JavaScriptOwner[];
  readonly imports: readonly ModuleImport[];
  readonly declarations: readonly ModuleDeclaration[];
}

export interface JavaScriptFeatureProfile extends FamilyFeatureProfile {
  readonly family: 'javascript';
  readonly supportedDialects: readonly JavaScriptDialect[];
  readonly supportedPolicies: readonly PolicyReference[];
}

export interface JavaScriptBackendFeatureProfile extends ConformanceFeatureProfileView {
  readonly backend: JavaScriptBackend;
  readonly backendRef: BackendReference;
  readonly supportsDialects: true;
}

const destinationWinsArrayPolicy: PolicyReference = {
  surface: 'array',
  name: 'destination_wins_array'
};

function javaScriptParseRequest(source: string): ParserRequest {
  return { source, language: 'javascript', dialect: 'javascript' };
}

function javaScriptProcessRequest(source: string): ProcessRequest {
  return { source, language: 'javascript' };
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

function normalizeJavaScriptImportPath(importSource: string): string {
  const fromMatch = importSource.match(/from\s+['"]([^'"]+)['"]/);
  if (fromMatch) {
    return fromMatch[1]!;
  }

  const bareImportMatch = importSource.match(/import\s+['"]([^'"]+)['"]/);
  if (bareImportMatch) {
    return bareImportMatch[1]!;
  }

  return importSource;
}

function analyzeJavaScriptModule(source: string): ParseResult<JavaScriptAnalysis> {
  return analyzeJavaScriptModuleWithBackend(source, 'kreuzberg-language-pack');
}

function analyzeJavaScriptModuleWithBackend(
  source: string,
  backend: JavaScriptBackend
): ParseResult<JavaScriptAnalysis> {
  if (backend !== 'kreuzberg-language-pack') {
    return {
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          category: 'unsupported_feature',
          message: `Unsupported JavaScript backend ${backend}.`
        }
      ]
    };
  }

  const parsed = parseWithLanguagePack(javaScriptParseRequest(source));
  if (!parsed.ok) {
    return { ok: false, diagnostics: parsed.diagnostics };
  }

  const processed = processWithLanguagePack(javaScriptProcessRequest(source));
  if (!processed.ok || !processed.analysis) {
    return { ok: false, diagnostics: processed.diagnostics };
  }

  const imports = processed.analysis.imports.map((item, index) => {
    const matchKey = normalizeJavaScriptImportPath(item.source);
    return {
      path: `/imports/${index}`,
      matchKey,
      text: importText(source, item.span)
    };
  });

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
      kind: 'javascript',
      dialect: 'javascript',
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

export function javaScriptFeatureProfile(): JavaScriptFeatureProfile {
  return {
    family: 'javascript',
    supportedDialects: ['javascript'],
    supportedPolicies: [destinationWinsArrayPolicy]
  };
}

export function javaScriptBackendFeatureProfile(
  backend: JavaScriptBackend = 'kreuzberg-language-pack'
): JavaScriptBackendFeatureProfile {
  return {
    backend,
    backendRef: KREUZBERG_LANGUAGE_PACK_BACKEND,
    supportsDialects: true,
    supportedPolicies: [destinationWinsArrayPolicy]
  };
}

export function javaScriptPlanContext(
  backend: JavaScriptBackend = 'kreuzberg-language-pack'
): ConformanceFamilyPlanContext {
  const featureProfile = javaScriptBackendFeatureProfile(backend);
  return {
    familyProfile: javaScriptFeatureProfile(),
    featureProfile: {
      backend: featureProfile.backend,
      supportsDialects: featureProfile.supportsDialects,
      supportedPolicies: featureProfile.supportedPolicies
    }
  };
}

export function parseJavaScript(
  source: string,
  dialect: JavaScriptDialect
): ParseResult<JavaScriptAnalysis> {
  void dialect;
  return analyzeJavaScriptModule(source);
}

export function javaScriptBackends(): readonly JavaScriptBackend[] {
  return ['kreuzberg-language-pack'];
}

export function parseJavaScriptWithBackend(
  source: string,
  dialect: JavaScriptDialect,
  backend: JavaScriptBackend
): ParseResult<JavaScriptAnalysis> {
  void dialect;
  return analyzeJavaScriptModuleWithBackend(source, backend);
}

export function matchJavaScriptOwners(
  template: JavaScriptAnalysis,
  destination: JavaScriptAnalysis
): JavaScriptOwnerMatchResult {
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

export function mergeJavaScript(
  templateSource: string,
  destinationSource: string,
  dialect: JavaScriptDialect
): MergeResult<string> {
  return mergeJavaScriptWithBackend(
    templateSource,
    destinationSource,
    dialect,
    'kreuzberg-language-pack'
  );
}

export function mergeJavaScriptWithParser(
  templateSource: string,
  destinationSource: string,
  dialect: JavaScriptDialect,
  parser: (source: string, dialect: JavaScriptDialect) => ParseResult<JavaScriptAnalysis>
): MergeResult<string> {
  const template = parser(templateSource, dialect);
  if (!template.ok || !template.analysis) {
    return { ok: false, diagnostics: template.diagnostics, policies: [] };
  }

  const destination = parser(destinationSource, dialect);
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

  return mergeJavaScriptAnalyses(template.analysis, destination.analysis);
}

export function mergeJavaScriptAnalyses(
  template: JavaScriptAnalysis,
  destination: JavaScriptAnalysis
): MergeResult<string> {
  const destinationDeclarations = new Map(
    destination.declarations.map((item) => [item.path, item])
  );
  const mergedDeclarationTexts = [
    ...destination.declarations.map((item) => item.text),
    ...template.declarations
      .filter((item) => !destinationDeclarations.has(item.path))
      .map((item) => item.text)
  ];
  const importBlock = destination.imports.map((item) => item.text).join('');
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

export function mergeJavaScriptWithBackend(
  templateSource: string,
  destinationSource: string,
  dialect: JavaScriptDialect,
  backend: JavaScriptBackend
): MergeResult<string> {
  return mergeJavaScriptWithParser(templateSource, destinationSource, dialect, (source, current) =>
    parseJavaScriptWithBackend(source, current, backend)
  );
}
