export const packageName = '@structuredmerge/java-merge';

export {
  javaBackends,
  javaBackendFeatureProfile,
  javaFeatureProfile,
  javaPlanContext,
  matchJavaOwners,
  mergeJava,
  mergeJavaWithBackend,
  mergeJavaWithParser,
  parseJava,
  parseJavaWithBackend
} from './contracts';

export type {
  JavaAnalysis,
  JavaBackend,
  JavaBackendFeatureProfile,
  JavaDialect,
  JavaFeatureProfile,
  JavaOwner,
  JavaOwnerKind,
  JavaOwnerMatch,
  JavaOwnerMatchResult
} from './contracts';
