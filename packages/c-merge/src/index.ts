export const packageName = '@structuredmerge/c-merge';

export {
  cBackends,
  cBackendFeatureProfile,
  cFeatureProfile,
  cPlanContext,
  matchCOwners,
  mergeC,
  mergeCWithBackend,
  mergeCWithParser,
  parseC,
  parseCWithBackend
} from './contracts';

export type {
  CAnalysis,
  CBackend,
  CBackendFeatureProfile,
  CDialect,
  CFeatureProfile,
  COwner,
  COwnerKind,
  COwnerMatch,
  COwnerMatchResult
} from './contracts';
