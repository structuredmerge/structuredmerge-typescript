export const packageName = '@structuredmerge/csharp-merge';

export {
  csharpBackends,
  csharpBackendFeatureProfile,
  csharpFeatureProfile,
  csharpPlanContext,
  matchCSharpOwners,
  mergeCSharp,
  mergeCSharpWithBackend,
  mergeCSharpWithParser,
  parseCSharp,
  parseCSharpWithBackend
} from './contracts';

export type {
  CSharpAnalysis,
  CSharpBackend,
  CSharpBackendFeatureProfile,
  CSharpDialect,
  CSharpFeatureProfile,
  CSharpOwner,
  CSharpOwnerKind,
  CSharpOwnerMatch,
  CSharpOwnerMatchResult
} from './contracts';
