import MarkdownIt from 'markdown-it';
import { registerBackend, type BackendReference } from '@structuredmerge/tree-haver';
import type {
  ConformanceFamilyPlanContext,
  ConformanceManifestReviewState,
  ConformanceManifestReviewStateEnvelope,
  DelegatedChildGroupReviewState,
  Diagnostic,
  MergeResult,
  ParseResult,
  ReviewReplayBundleEnvelope,
  ReviewReplayBundle
} from '@structuredmerge/ast-merge';
import {
  collectMarkdownOwners,
  type AppliedChildOutput,
  type MarkdownAnalysis,
  markdownEmbeddedFamilies as markdownEmbeddedFamiliesWithSubstrate,
  type MarkdownFeatureProfile,
  mergeMarkdown as mergeMarkdownWithSubstrate,
  mergeMarkdownWithReviewedNestedOutputsFromReplayBundleEnvelope as mergeMarkdownWithReviewedNestedOutputsFromReplayBundleEnvelopeWithSubstrate,
  mergeMarkdownWithReviewedNestedOutputsFromReplayBundle as mergeMarkdownWithReviewedNestedOutputsFromReplayBundleWithSubstrate,
  mergeMarkdownWithReviewedNestedOutputsFromReviewStateEnvelope as mergeMarkdownWithReviewedNestedOutputsFromReviewStateEnvelopeWithSubstrate,
  mergeMarkdownWithReviewedNestedOutputsFromReviewState as mergeMarkdownWithReviewedNestedOutputsFromReviewStateWithSubstrate,
  mergeMarkdownWithReviewedNestedOutputs as mergeMarkdownWithReviewedNestedOutputsWithSubstrate,
  matchMarkdownOwners as matchMarkdownOwnersWithSubstrate,
  markdownFeatureProfile,
  normalizeMarkdownSource
} from '@structuredmerge/markdown-merge';

export const packageName = '@structuredmerge/markdown-it-merge';
export const backendId = 'markdown-it';

registerBackend({ id: backendId, family: 'native' });

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
  readonly backendRef: BackendReference;
} {
  return {
    ...markdownFeatureProfile(),
    backend: 'markdown-it',
    backendRef: { id: 'markdown-it', family: 'native' }
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
export function mergeMarkdown(
  templateSource: string,
  destinationSource: string,
  dialect: 'markdown',
  backend?: string
): MergeResult<string> {
  const requested = backend ?? 'markdown-it';
  if (requested !== 'markdown-it') {
    return {
      ok: false,
      diagnostics: [unsupportedFeature(`Unsupported Markdown backend ${requested}.`)]
    };
  }

  return mergeMarkdownWithSubstrate(
    templateSource,
    destinationSource,
    dialect,
    'kreuzberg-language-pack'
  );
}

export function mergeMarkdownWithReviewedNestedOutputs(
  templateSource: string,
  destinationSource: string,
  dialect: 'markdown',
  reviewState: DelegatedChildGroupReviewState,
  appliedChildren: readonly AppliedChildOutput[],
  backend?: string
): MergeResult<string> {
  const requested = backend ?? 'markdown-it';
  if (requested !== 'markdown-it') {
    return {
      ok: false,
      diagnostics: [unsupportedFeature(`Unsupported Markdown backend ${requested}.`)]
    };
  }

  return mergeMarkdownWithReviewedNestedOutputsWithSubstrate(
    templateSource,
    destinationSource,
    dialect,
    reviewState,
    appliedChildren,
    'kreuzberg-language-pack'
  );
}

export function mergeMarkdownWithReviewedNestedOutputsFromReplayBundle(
  templateSource: string,
  destinationSource: string,
  dialect: 'markdown',
  replayBundle: ReviewReplayBundle,
  backend?: string
): MergeResult<string> {
  const requested = backend ?? 'markdown-it';
  if (requested !== 'markdown-it') {
    return {
      ok: false,
      diagnostics: [unsupportedFeature(`Unsupported Markdown backend ${requested}.`)],
      policies: []
    };
  }

  return mergeMarkdownWithReviewedNestedOutputsFromReplayBundleWithSubstrate(
    templateSource,
    destinationSource,
    dialect,
    replayBundle,
    'kreuzberg-language-pack'
  );
}

export function mergeMarkdownWithReviewedNestedOutputsFromReplayBundleEnvelope(
  templateSource: string,
  destinationSource: string,
  dialect: 'markdown',
  replayBundleEnvelope: ReviewReplayBundleEnvelope,
  backend?: string
): MergeResult<string> {
  const requested = backend ?? 'markdown-it';
  if (requested !== 'markdown-it') {
    return {
      ok: false,
      diagnostics: [unsupportedFeature(`Unsupported Markdown backend ${requested}.`)],
      policies: []
    };
  }

  return mergeMarkdownWithReviewedNestedOutputsFromReplayBundleEnvelopeWithSubstrate(
    templateSource,
    destinationSource,
    dialect,
    replayBundleEnvelope,
    'kreuzberg-language-pack'
  );
}

export function mergeMarkdownWithReviewedNestedOutputsFromReviewState(
  templateSource: string,
  destinationSource: string,
  dialect: 'markdown',
  reviewState: ConformanceManifestReviewState,
  backend?: string
): MergeResult<string> {
  const requested = backend ?? 'markdown-it';
  if (requested !== 'markdown-it') {
    return {
      ok: false,
      diagnostics: [unsupportedFeature(`Unsupported Markdown backend ${requested}.`)],
      policies: []
    };
  }

  return mergeMarkdownWithReviewedNestedOutputsFromReviewStateWithSubstrate(
    templateSource,
    destinationSource,
    dialect,
    reviewState,
    'kreuzberg-language-pack'
  );
}

export function mergeMarkdownWithReviewedNestedOutputsFromReviewStateEnvelope(
  templateSource: string,
  destinationSource: string,
  dialect: 'markdown',
  reviewStateEnvelope: ConformanceManifestReviewStateEnvelope,
  backend?: string
): MergeResult<string> {
  const requested = backend ?? 'markdown-it';
  if (requested !== 'markdown-it') {
    return {
      ok: false,
      diagnostics: [unsupportedFeature(`Unsupported Markdown backend ${requested}.`)],
      policies: []
    };
  }

  return mergeMarkdownWithReviewedNestedOutputsFromReviewStateEnvelopeWithSubstrate(
    templateSource,
    destinationSource,
    dialect,
    reviewStateEnvelope,
    'kreuzberg-language-pack'
  );
}
export { markdownFeatureProfile };
