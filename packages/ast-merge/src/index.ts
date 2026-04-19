export const packageName = '@structuredmerge/ast-merge';

export type {
  ConformanceCaseRef,
  ConformanceCaseRun,
  ConformanceCaseRequirements,
  ConformanceCaseExecution,
  ConformanceFeatureProfileView,
  ConformanceCaseSelection,
  ConformanceCaseResult,
  ConformanceFamilyFeatureProfileEntry,
  ConformanceManifest,
  ConformanceManifestEntry,
  ConformanceOutcome,
  ConformanceSelectionStatus,
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
  runConformanceCase,
  runConformanceSuite,
  selectConformanceCase,
  summarizeConformanceResults
} from './contracts';
