export const packageName = '@structuredmerge/ast-merge';

export type {
  ConformanceCaseRef,
  ConformanceCaseRequirements,
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
  selectConformanceCase,
  summarizeConformanceResults
} from './contracts';
