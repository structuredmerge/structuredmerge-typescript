import MarkdownIt from 'markdown-it';
import type {
  ConformanceFamilyPlanContext,
  Diagnostic,
  ParseResult
} from '@structuredmerge/ast-merge';
import {
  collectMarkdownOwners,
  type MarkdownAnalysis,
  markdownEmbeddedFamilies as markdownEmbeddedFamiliesWithSubstrate,
  type MarkdownFeatureProfile,
  matchMarkdownOwners as matchMarkdownOwnersWithSubstrate,
  markdownFeatureProfile,
  normalizeMarkdownSource
} from '@structuredmerge/markdown-merge';

export const packageName = '@structuredmerge/markdown-it-merge';
export const backendId = 'markdown-it';

function parseError(message: string): Diagnostic {
  return { severity: 'error', category: 'parse_error', message };
}

function unsupportedFeature(message: string): Diagnostic {
  return { severity: 'error', category: 'unsupported_feature', message };
}

export function availableMarkdownBackends(): readonly ['markdown-it'] {
  return ['markdown-it'];
}

export function markdownBackendFeatureProfile(): MarkdownFeatureProfile & {
  readonly backend: 'markdown-it';
} {
  return {
    ...markdownFeatureProfile(),
    backend: 'markdown-it'
  };
}

export function markdownPlanContext(): ConformanceFamilyPlanContext {
  return {
    familyProfile: markdownFeatureProfile(),
    featureProfile: {
      backend: 'markdown-it',
      supportsDialects: true,
      supportedPolicies: []
    }
  };
}

export function parseMarkdown(
  source: string,
  dialect: 'markdown',
  backend?: string
): ParseResult<MarkdownAnalysis> {
  const requested = backend ?? 'markdown-it';
  if (requested !== 'markdown-it') {
    return {
      ok: false,
      diagnostics: [unsupportedFeature(`Unsupported Markdown backend ${requested}.`)]
    };
  }

  if (dialect !== 'markdown') {
    return {
      ok: false,
      diagnostics: [unsupportedFeature(`Unsupported Markdown dialect ${dialect}.`)]
    };
  }

  try {
    const parser = new MarkdownIt();
    parser.parse(source, {});
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        parseError(error instanceof Error ? error.message : 'markdown-it parse failed.')
      ]
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

export const matchMarkdownOwners = matchMarkdownOwnersWithSubstrate;
export const markdownEmbeddedFamilies = markdownEmbeddedFamiliesWithSubstrate;
export { markdownFeatureProfile };
