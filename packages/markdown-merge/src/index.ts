export const packageName = '@structuredmerge/markdown-merge';

export type {
  MarkdownAnalysis,
  MarkdownBackend,
  MarkdownBackendFeatureProfile,
  MarkdownDialect,
  MarkdownEmbeddedFamilyCandidate,
  MarkdownFeatureProfile,
  MarkdownOwner,
  MarkdownOwnerKind,
  MarkdownOwnerMatch,
  MarkdownOwnerMatchResult,
  MarkdownRootKind
} from './contracts';

export {
  availableMarkdownBackends,
  collectMarkdownOwners,
  markdownDelegatedChildOperations,
  markdownDiscoveredSurfaces,
  markdownEmbeddedFamilies,
  markdownBackendFeatureProfile,
  markdownFeatureProfile,
  markdownManifestRolePaths,
  markdownPlanContext,
  mergeMarkdown,
  matchMarkdownOwners,
  normalizeMarkdownSource,
  parseMarkdown
} from './contracts';
