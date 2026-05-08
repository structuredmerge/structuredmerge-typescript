export const packageName = '@structuredmerge/cpp-merge';

export {
  cppBackends,
  cppBackendFeatureProfile,
  cppFeatureProfile,
  cppPlanContext,
  matchCppOwners,
  mergeCpp,
  mergeCppWithBackend,
  mergeCppWithParser,
  parseCpp,
  parseCppWithBackend
} from './contracts';

export type {
  CppAnalysis,
  CppBackend,
  CppBackendFeatureProfile,
  CppDialect,
  CppFeatureProfile,
  CppOwner,
  CppOwnerKind,
  CppOwnerMatch,
  CppOwnerMatchResult
} from './contracts';
