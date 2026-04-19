export const packageName = '@structuredmerge/ast-merge';

export type {
  ConformanceCaseRef,
  ConformanceCaseResult,
  ConformanceFamilyFeatureProfileEntry,
  ConformanceManifest,
  ConformanceManifestEntry,
  ConformanceOutcome,
  ConformanceSuiteSummary,
  Diagnostic,
  DiagnosticCategory,
  DiagnosticSeverity,
  MergeResult,
  FamilyFeatureProfile,
  PolicyReference,
  PolicySurface,
  ParseResult
} from './contracts';

export {
  conformanceFamilyEntries,
  conformanceFamilyFeatureProfilePath,
  conformanceFixturePath,
  summarizeConformanceResults
} from './contracts';
