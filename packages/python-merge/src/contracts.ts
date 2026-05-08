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

export type PythonDialect = 'python';
export type PythonBackend = 'kreuzberg-language-pack';
export type PythonOwnerKind = 'import' | 'declaration';

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

export interface PythonOwner {
  readonly path: string;
  readonly ownerKind: PythonOwnerKind;
  readonly matchKey?: string;
}

export interface PythonOwnerMatch {
  readonly templatePath: string;
  readonly destinationPath: string;
}

export interface PythonOwnerMatchResult {
  readonly matched: readonly PythonOwnerMatch[];
  readonly unmatchedTemplate: readonly string[];
  readonly unmatchedDestination: readonly string[];
}

export interface PythonAnalysis {
  readonly kind: 'python';
  readonly dialect: PythonDialect;
  readonly source: string;
  readonly owners: readonly PythonOwner[];
  readonly imports: readonly ModuleImport[];
  readonly declarations: readonly ModuleDeclaration[];
}

export interface PythonFeatureProfile extends FamilyFeatureProfile {
  readonly family: 'python';
  readonly supportedDialects: readonly PythonDialect[];
  readonly supportedPolicies: readonly PolicyReference[];
}

export interface PythonBackendFeatureProfile extends ConformanceFeatureProfileView {
  readonly backend: PythonBackend;
  readonly backendRef: BackendReference;
  readonly supportsDialects: true;
}

const destinationWinsArrayPolicy: PolicyReference = {
  surface: 'array',
  name: 'destination_wins_array'
};

function pythonParseRequest(source: string): ParserRequest {
  return { source, language: 'python', dialect: 'python' };
}

function pythonProcessRequest(source: string): ProcessRequest {
  return { source, language: 'python' };
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

function normalizePythonImportSource(importSource: string): string {
  const trimmed = importSource.trim();
  const fromMatch = trimmed.match(/^from\s+([^\s]+)\s+import\b/i);
  if (fromMatch) {
    return fromMatch[1]!;
  }

  const importMatch = trimmed.match(/^import\s+(.+)$/i);
  if (!importMatch) {
    return trimmed;
  }

  const [moduleSource] = importMatch[1]!.split(',');
  return moduleSource?.trim().replace(/\s+as\s+.*$/i, '') ?? trimmed;
}

function analyzePythonModule(source: string): ParseResult<PythonAnalysis> {
  return analyzePythonModuleWithBackend(source, 'kreuzberg-language-pack');
}

function analyzePythonModuleWithBackend(
  source: string,
  backend: PythonBackend
): ParseResult<PythonAnalysis> {
  if (backend !== 'kreuzberg-language-pack') {
    return {
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          category: 'unsupported_feature',
          message: `Unsupported Python backend ${backend}.`
        }
      ]
    };
  }

  const parsed = parseWithLanguagePack(pythonParseRequest(source));
  if (!parsed.ok) {
    return { ok: false, diagnostics: parsed.diagnostics };
  }

  const processed = processWithLanguagePack(pythonProcessRequest(source));
  if (!processed.ok || !processed.analysis) {
    return { ok: false, diagnostics: processed.diagnostics };
  }

  const imports = processed.analysis.imports.map((item, index) => {
    const sourceText = normalizePythonImportSource(item.source);
    return {
      path: `/imports/${index}`,
      matchKey: sourceText,
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
      kind: 'python',
      dialect: 'python',
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

export function pythonFeatureProfile(): PythonFeatureProfile {
  return {
    family: 'python',
    supportedDialects: ['python'],
    supportedPolicies: [destinationWinsArrayPolicy]
  };
}

export function pythonBackendFeatureProfile(
  backend: PythonBackend = 'kreuzberg-language-pack'
): PythonBackendFeatureProfile {
  return {
    backend,
    backendRef: KREUZBERG_LANGUAGE_PACK_BACKEND,
    supportsDialects: true,
    supportedPolicies: [destinationWinsArrayPolicy]
  };
}

export function pythonPlanContext(
  backend: PythonBackend = 'kreuzberg-language-pack'
): ConformanceFamilyPlanContext {
  const featureProfile = pythonBackendFeatureProfile(backend);
  return {
    familyProfile: pythonFeatureProfile(),
    featureProfile: {
      backend: featureProfile.backend,
      supportsDialects: featureProfile.supportsDialects,
      supportedPolicies: featureProfile.supportedPolicies
    }
  };
}

export function parsePython(source: string, dialect: PythonDialect): ParseResult<PythonAnalysis> {
  void dialect;
  return analyzePythonModule(source);
}

export function pythonBackends(): readonly PythonBackend[] {
  return ['kreuzberg-language-pack'];
}

export function parsePythonWithBackend(
  source: string,
  dialect: PythonDialect,
  backend: PythonBackend
): ParseResult<PythonAnalysis> {
  void dialect;
  return analyzePythonModuleWithBackend(source, backend);
}

export function matchPythonOwners(
  template: PythonAnalysis,
  destination: PythonAnalysis
): PythonOwnerMatchResult {
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

export function mergePython(
  templateSource: string,
  destinationSource: string,
  dialect: PythonDialect
): MergeResult<string> {
  return mergePythonWithBackend(
    templateSource,
    destinationSource,
    dialect,
    'kreuzberg-language-pack'
  );
}

export function mergePythonWithBackend(
  templateSource: string,
  destinationSource: string,
  dialect: PythonDialect,
  backend: PythonBackend
): MergeResult<string> {
  return mergePythonWithParser(templateSource, destinationSource, dialect, (source, current) =>
    parsePythonWithBackend(source, current, backend)
  );
}

export function mergePythonWithParser(
  templateSource: string,
  destinationSource: string,
  dialect: PythonDialect,
  parser: (source: string, dialect: PythonDialect) => ParseResult<PythonAnalysis>
): MergeResult<string> {
  void dialect;
  const template = parser(templateSource, 'python');
  if (!template.ok || !template.analysis) {
    return { ok: false, diagnostics: template.diagnostics, policies: [] };
  }

  const destination = parser(destinationSource, 'python');
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

  return mergePythonAnalyses(template.analysis, destination.analysis);
}

export function mergePythonAnalyses(
  template: PythonAnalysis,
  destination: PythonAnalysis
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
