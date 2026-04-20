export const packageName = '@structuredmerge/typescript-merge';

export {
  matchTypeScriptOwners,
  mergeTypeScript,
  mergeTypeScriptWithBackend,
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
  TypeScriptDialect,
  TypeScriptFeatureProfile,
  TypeScriptOwner,
  TypeScriptOwnerKind,
  TypeScriptOwnerMatch,
  TypeScriptOwnerMatchResult
} from './contracts';
