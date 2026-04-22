export const packageName = '@structuredmerge/markdown-merge';

export type {
  AppliedChildOutput,
  MarkdownAnalysis,
  MarkdownBackend,
  MarkdownBackendFeatureProfile,
  MarkdownDialect,
  MarkdownEmbeddedFamilyCandidate,
  MarkdownFeatureProfile,
  NestedChildOutput,
  MarkdownOwner,
  MarkdownOwnerKind,
  MarkdownOwnerMatch,
  MarkdownOwnerMatchResult,
  MarkdownRootKind
} from './contracts';

export {
  availableMarkdownBackends,
  applyMarkdownDelegatedChildOutputs,
  collectMarkdownOwners,
  markdownDelegatedChildOperations,
  markdownDiscoveredSurfaces,
  markdownEmbeddedFamilies,
  markdownBackendFeatureProfile,
  markdownFeatureProfile,
  markdownManifestRolePaths,
  markdownPlanContext,
  mergeMarkdown,
  mergeMarkdownWithReviewedNestedOutputs,
  mergeMarkdownWithNestedOutputs,
  matchMarkdownOwners,
  normalizeMarkdownSource,
  parseMarkdown
} from './contracts';
