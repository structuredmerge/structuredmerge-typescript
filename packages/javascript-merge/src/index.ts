export const packageName = '@structuredmerge/javascript-merge';

export {
  matchJavaScriptOwners,
  mergeJavaScript,
  mergeJavaScriptAnalyses,
  mergeJavaScriptWithBackend,
  mergeJavaScriptWithParser,
  parseJavaScript,
  parseJavaScriptWithBackend,
  javaScriptBackendFeatureProfile,
  javaScriptBackends,
  javaScriptFeatureProfile,
  javaScriptPlanContext
} from './contracts';

export type {
  JavaScriptAnalysis,
  JavaScriptBackend,
  JavaScriptBackendFeatureProfile,
  JavaScriptDialect,
  JavaScriptFeatureProfile,
  JavaScriptOwner,
  JavaScriptOwnerKind,
  JavaScriptOwnerMatch,
  JavaScriptOwnerMatchResult
} from './contracts';
