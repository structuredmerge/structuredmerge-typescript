export const packageName = '@structuredmerge/markdown-merge';

export type {
  MarkdownAnalysis,
  MarkdownBackend,
  MarkdownBackendFeatureProfile,
  MarkdownDialect,
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
  markdownBackendFeatureProfile,
  markdownFeatureProfile,
  markdownManifestRolePaths,
  markdownPlanContext,
  matchMarkdownOwners,
  normalizeMarkdownSource,
  parseMarkdown
} from './contracts';
