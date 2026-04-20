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
  markdownBackendFeatureProfile,
  markdownFeatureProfile,
  markdownManifestRolePaths,
  markdownPlanContext,
  matchMarkdownOwners,
  parseMarkdown
} from './contracts';
