import MarkdownIt from 'markdown-it';
import type {
  ConformanceFamilyPlanContext,
  ConformanceManifest,
  Diagnostic,
  FamilyFeatureProfile,
  ParseResult
} from '@structuredmerge/ast-merge';
import { currentBackendId, parseWithLanguagePack } from '@structuredmerge/tree-haver';

export type MarkdownDialect = 'markdown';
export type MarkdownBackend = 'markdown-it' | 'kreuzberg-language-pack';
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

export interface MarkdownFeatureProfile extends FamilyFeatureProfile {
  readonly family: 'markdown';
  readonly supportedDialects: readonly MarkdownDialect[];
  readonly supportedPolicies: readonly [];
}

export interface MarkdownBackendFeatureProfile extends MarkdownFeatureProfile {
  readonly backend: MarkdownBackend;
}

function parseError(message: string): Diagnostic {
  return { severity: 'error', category: 'parse_error', message };
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

function validateNativeMarkdown(source: string): void {
  const parser = new MarkdownIt();
  parser.parse(source, {});
}

function resolveBackend(backend?: MarkdownBackend): MarkdownBackend {
  if (backend) return backend;
  return currentBackendId() === 'kreuzberg-language-pack'
    ? 'kreuzberg-language-pack'
    : 'markdown-it';
}

export function markdownFeatureProfile(): MarkdownFeatureProfile {
  return {
    family: 'markdown',
    supportedDialects: ['markdown'],
    supportedPolicies: []
  };
}

export function availableMarkdownBackends(): readonly MarkdownBackend[] {
  return ['markdown-it', 'kreuzberg-language-pack'];
}

export function markdownBackendFeatureProfile(
  backend?: MarkdownBackend
): MarkdownBackendFeatureProfile {
  return {
    ...markdownFeatureProfile(),
    backend: resolveBackend(backend)
  };
}

export function markdownPlanContext(backend?: MarkdownBackend): ConformanceFamilyPlanContext {
  const resolvedBackend = resolveBackend(backend);
  return {
    familyProfile: markdownFeatureProfile(),
    featureProfile: {
      backend: resolvedBackend,
      supportsDialects: resolvedBackend !== 'kreuzberg-language-pack',
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

  if (resolvedBackend === 'kreuzberg-language-pack') {
    const syntax = parseWithLanguagePack({ source, language: 'markdown', dialect });
    if (!syntax.ok) {
      return { ok: false, diagnostics: syntax.diagnostics };
    }
  } else if (resolvedBackend === 'markdown-it') {
    try {
      validateNativeMarkdown(source);
    } catch (error) {
      return {
        ok: false,
        diagnostics: [
          parseError(error instanceof Error ? error.message : 'markdown-it parse failed.')
        ]
      };
    }
  } else {
    return {
      ok: false,
      diagnostics: [unsupportedFeature(`Unsupported Markdown backend ${resolvedBackend}.`)]
    };
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
