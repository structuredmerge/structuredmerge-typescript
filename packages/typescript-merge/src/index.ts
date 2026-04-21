export const packageName = '@structuredmerge/typescript-merge';

export {
  matchTypeScriptOwners,
  mergeTypeScriptAnalyses,
  mergeTypeScript,
  mergeTypeScriptWithBackend,
  mergeTypeScriptWithParser,
  parseTypeScript,
  parseTypeScriptWithBackend,
  typeScriptBackendFeatureProfile,
  typeScriptBackends,
  typeScriptFeatureProfile,
  typeScriptPlanContext
} from './contracts';

export type {
  TypeScriptAnalysis,
  TypeScriptBackend,
  TypeScriptBackendFeatureProfile,
  TypeScriptDialect,
  TypeScriptFeatureProfile,
  TypeScriptOwner,
  TypeScriptOwnerKind,
  TypeScriptOwnerMatch,
  TypeScriptOwnerMatchResult
} from './contracts';
