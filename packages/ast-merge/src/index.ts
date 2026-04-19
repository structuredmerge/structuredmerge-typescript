export const packageName = '@structuredmerge/ast-merge';

export type {
  ConformanceCaseRef,
  ConformanceCaseRun,
  ConformanceCaseRequirements,
  ConformanceCaseExecution,
  ConformanceFeatureProfileView,
  ConformanceCaseSelection,
  ConformanceCaseResult,
  ConformanceSuitePlan,
  ConformanceSuitePlanEntry,
  ConformanceFamilyFeatureProfileEntry,
  ConformanceManifest,
  ConformanceManifestEntry,
  ConformanceOutcome,
  ConformanceSelectionStatus,
  ConformanceSuiteReport,
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
  planConformanceSuite,
  reportPlannedConformanceSuite,
  reportConformanceSuite,
  runConformanceCase,
  runPlannedConformanceSuite,
  runConformanceSuite,
  selectConformanceCase,
  summarizeConformanceResults
} from './contracts';
