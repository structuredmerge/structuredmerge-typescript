import type {
  ConformanceFamilyPlanContext,
  ConformanceManifest,
  DelegatedChildOperation,
  DiscoveredSurface,
  Diagnostic,
  FamilyFeatureProfile,
  ParseResult
} from '@structuredmerge/ast-merge';
import {
  KREUZBERG_LANGUAGE_PACK_BACKEND,
  parseWithLanguagePack,
  type BackendReference
} from '@structuredmerge/tree-haver';

export type MarkdownDialect = 'markdown';
export type MarkdownBackend = 'kreuzberg-language-pack';
export type MarkdownRootKind = 'document';
export type MarkdownOwnerKind = 'heading' | 'code_fence';

export interface MarkdownOwner {
  readonly path: string;
  readonly ownerKind: MarkdownOwnerKind;
  readonly matchKey: string;
  readonly level?: number;
  readonly infoString?: string;
}

export interface MarkdownOwnerMatch {
  readonly templatePath: string;
  readonly destinationPath: string;
}

export interface MarkdownOwnerMatchResult {
  readonly matched: readonly MarkdownOwnerMatch[];
  readonly unmatchedTemplate: readonly string[];
  readonly unmatchedDestination: readonly string[];
}

export interface MarkdownAnalysis {
  readonly kind: 'markdown';
  readonly dialect: MarkdownDialect;
  readonly normalizedSource: string;
  readonly rootKind: MarkdownRootKind;
  readonly owners: readonly MarkdownOwner[];
}

export interface MarkdownEmbeddedFamilyCandidate {
  readonly path: string;
  readonly language: string;
  readonly family: 'typescript' | 'rust' | 'go' | 'json' | 'yaml' | 'toml';
  readonly dialect: string;
}

export interface MarkdownFeatureProfile extends FamilyFeatureProfile {
  readonly family: 'markdown';
  readonly supportedDialects: readonly MarkdownDialect[];
  readonly supportedPolicies: readonly [];
}

export interface MarkdownBackendFeatureProfile extends MarkdownFeatureProfile {
  readonly backend: MarkdownBackend;
  readonly backendRef: BackendReference;
}

function unsupportedFeature(message: string): Diagnostic {
  return { severity: 'error', category: 'unsupported_feature', message };
}

export function normalizeMarkdownSource(source: string): string {
  return source.replace(/\r\n?/g, '\n');
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[`*_~[\]()<>]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section'
  );
}

export function collectMarkdownOwners(source: string): MarkdownOwner[] {
  const owners: MarkdownOwner[] = [];
  const lines = normalizeMarkdownSource(source).split('\n');
  let headingIndex = 0;
  let codeFenceIndex = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const level = heading[1].length;
      const title = heading[2].trim();
      owners.push({
        path: `/heading/${headingIndex}`,
        ownerKind: 'heading',
        matchKey: `h${level}:${slugify(title)}`,
        level
      });
      headingIndex += 1;
      continue;
    }

    const fence = line.match(/^\s*(`{3,}|~{3,})\s*(.*?)\s*$/);
    if (!fence) {
      continue;
    }

    const marker = fence[1];
    const markerChar = marker[0];
    const markerLength = marker.length;
    const infoString = fence[2].trim().split(/\s+/)[0] ?? '';
    owners.push({
      path: `/code_fence/${codeFenceIndex}`,
      ownerKind: 'code_fence',
      matchKey: `fence:${infoString || 'plain'}`,
      ...(infoString ? { infoString } : {})
    });
    codeFenceIndex += 1;

    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (new RegExp(`^\\s*${markerChar}{${markerLength},}\\s*$`).test(lines[cursor])) {
        index = cursor;
        break;
      }
      if (cursor === lines.length - 1) {
        index = cursor;
      }
    }
  }

  return owners;
}

function resolveBackend(backend?: MarkdownBackend): MarkdownBackend {
  if (backend) return backend;
  return 'kreuzberg-language-pack';
}

export function markdownFeatureProfile(): MarkdownFeatureProfile {
  return {
    family: 'markdown',
    supportedDialects: ['markdown'],
    supportedPolicies: []
  };
}

export function availableMarkdownBackends(): readonly MarkdownBackend[] {
  return ['kreuzberg-language-pack'];
}

export function markdownBackendFeatureProfile(
  backend?: MarkdownBackend
): MarkdownBackendFeatureProfile {
  return {
    ...markdownFeatureProfile(),
    backend: resolveBackend(backend),
    backendRef: KREUZBERG_LANGUAGE_PACK_BACKEND
  };
}

export function markdownPlanContext(backend?: MarkdownBackend): ConformanceFamilyPlanContext {
  const resolvedBackend = resolveBackend(backend);
  return {
    familyProfile: markdownFeatureProfile(),
    featureProfile: {
      backend: resolvedBackend,
      supportsDialects: false,
      supportedPolicies: []
    }
  };
}

export function parseMarkdown(
  source: string,
  dialect: MarkdownDialect,
  backend?: MarkdownBackend
): ParseResult<MarkdownAnalysis> {
  if (dialect !== 'markdown') {
    return {
      ok: false,
      diagnostics: [unsupportedFeature(`Unsupported Markdown dialect ${dialect}.`)]
    };
  }

  const resolvedBackend = resolveBackend(backend);

  if (resolvedBackend !== 'kreuzberg-language-pack') {
    return {
      ok: false,
      diagnostics: [unsupportedFeature(`Unsupported Markdown backend ${resolvedBackend}.`)]
    };
  }

  const syntax = parseWithLanguagePack({ source, language: 'markdown', dialect });
  if (!syntax.ok) {
    return { ok: false, diagnostics: syntax.diagnostics };
  }

  const normalizedSource = normalizeMarkdownSource(source);
  return {
    ok: true,
    diagnostics: [],
    analysis: {
      kind: 'markdown',
      dialect,
      normalizedSource,
      rootKind: 'document',
      owners: collectMarkdownOwners(normalizedSource)
    },
    policies: []
  };
}

export function matchMarkdownOwners(
  template: MarkdownAnalysis,
  destination: MarkdownAnalysis
): MarkdownOwnerMatchResult {
  const destinationPaths = new Set(destination.owners.map((owner) => owner.path));
  const templatePaths = new Set(template.owners.map((owner) => owner.path));

  return {
    matched: template.owners
      .filter((owner) => destinationPaths.has(owner.path))
      .map((owner) => ({ templatePath: owner.path, destinationPath: owner.path })),
    unmatchedTemplate: template.owners
      .map((owner) => owner.path)
      .filter((path) => !destinationPaths.has(path)),
    unmatchedDestination: destination.owners
      .map((owner) => owner.path)
      .filter((path) => !templatePaths.has(path))
  };
}

function codeFenceFamily(
  infoString?: string
): MarkdownEmbeddedFamilyCandidate['family'] | undefined {
  switch ((infoString ?? '').toLowerCase()) {
    case 'ts':
    case 'typescript':
      return 'typescript';
    case 'rust':
    case 'rs':
      return 'rust';
    case 'go':
      return 'go';
    case 'json':
    case 'jsonc':
      return 'json';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'toml':
      return 'toml';
    default:
      return undefined;
  }
}

function codeFenceDialect(
  infoString?: string,
  family?: MarkdownEmbeddedFamilyCandidate['family']
): string | undefined {
  const language = (infoString ?? '').toLowerCase();
  if (!family) {
    return undefined;
  }

  switch (family) {
    case 'typescript':
      return 'typescript';
    case 'rust':
      return 'rust';
    case 'go':
      return 'go';
    case 'json':
      return language === 'jsonc' ? 'jsonc' : 'json';
    case 'yaml':
      return 'yaml';
    case 'toml':
      return 'toml';
  }
}

export function markdownEmbeddedFamilies(
  analysis: MarkdownAnalysis
): readonly MarkdownEmbeddedFamilyCandidate[] {
  return analysis.owners.flatMap((owner) => {
    if (owner.ownerKind !== 'code_fence' || !owner.infoString) {
      return [];
    }

    const family = codeFenceFamily(owner.infoString);
    const dialect = codeFenceDialect(owner.infoString, family);
    if (!family || !dialect) {
      return [];
    }

    return [
      {
        path: owner.path,
        language: owner.infoString,
        family,
        dialect
      }
    ];
  });
}

export function markdownDiscoveredSurfaces(
  analysis: MarkdownAnalysis
): readonly DiscoveredSurface[] {
  return markdownEmbeddedFamilies(analysis).map((candidate) => ({
    surfaceKind: 'markdown_fenced_code_block',
    declaredLanguage: candidate.language,
    effectiveLanguage: candidate.dialect,
    address: `document[0] > fenced_code_block[${candidate.path}]`,
    parentAddress: 'document[0]',
    owner: {
      kind: 'structural_owner',
      address: candidate.path
    },
    reconstructionStrategy: 'portable_write',
    metadata: {
      family: candidate.family,
      dialect: candidate.dialect,
      path: candidate.path
    }
  }));
}

export function markdownDelegatedChildOperations(
  analysis: MarkdownAnalysis,
  parentOperationId = 'markdown-document-0'
): readonly DelegatedChildOperation[] {
  return markdownDiscoveredSurfaces(analysis).map((surface, index) => ({
    operationId: `markdown-fence-${index}`,
    parentOperationId,
    requestedStrategy: 'delegate_child_surface',
    languageChain: ['markdown', surface.effectiveLanguage],
    surface
  }));
}

export function markdownManifestRolePaths(manifest: ConformanceManifest): {
  readonly familyProfile: readonly string[] | undefined;
  readonly analysis: readonly string[] | undefined;
  readonly matching: readonly string[] | undefined;
} {
  return {
    familyProfile: manifest.family_feature_profiles.find((entry) => entry.family === 'markdown')
      ?.path,
    analysis: manifest.families.markdown?.find((entry) => entry.role === 'analysis')?.path,
    matching: manifest.families.markdown?.find((entry) => entry.role === 'matching')?.path
  };
}
