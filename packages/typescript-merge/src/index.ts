export const packageName = '@structuredmerge/typescript-merge';

export {
  matchTypeScriptOwners,
  mergeTypeScript,
  parseTypeScript,
  typeScriptFeatureProfile
} from './contracts';

export type {
  TypeScriptAnalysis,
  TypeScriptDialect,
  TypeScriptFeatureProfile,
  TypeScriptOwner,
  TypeScriptOwnerKind,
  TypeScriptOwnerMatch,
  TypeScriptOwnerMatchResult
} from './contracts';
