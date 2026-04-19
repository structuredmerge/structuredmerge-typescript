export type DiagnosticSeverity = 'info' | 'warning' | 'error';

export type DiagnosticCategory =
  | 'parse_error'
  | 'destination_parse_error'
  | 'unsupported_feature'
  | 'fallback_applied'
  | 'ambiguity';

export interface Diagnostic {
  readonly severity: DiagnosticSeverity;
  readonly category: DiagnosticCategory;
  readonly message: string;
  readonly path?: string;
}

export interface ParseResult<TAnalysis> {
  readonly ok: boolean;
  readonly diagnostics: readonly Diagnostic[];
  readonly analysis?: TAnalysis;
  readonly policies?: readonly PolicyReference[];
}

export interface MergeResult<TOutput> {
  readonly ok: boolean;
  readonly diagnostics: readonly Diagnostic[];
  readonly output?: TOutput;
  readonly policies?: readonly PolicyReference[];
}

export type PolicySurface = 'fallback' | 'array';

export interface PolicyReference {
  readonly surface: PolicySurface;
  readonly name: string;
}

export interface FamilyFeatureProfile {
  readonly family: string;
  readonly supportedDialects: readonly string[];
  readonly supportedPolicies: readonly PolicyReference[];
}

export type ConformanceOutcome = 'passed' | 'failed' | 'skipped';

export interface ConformanceCaseRef {
  readonly family: string;
  readonly role: string;
  readonly case: string;
}

export interface ConformanceCaseResult {
  readonly ref: ConformanceCaseRef;
  readonly outcome: ConformanceOutcome;
  readonly messages: readonly string[];
}

export interface ConformanceManifestEntry {
  readonly role: string;
  readonly path: readonly string[];
}

export interface ConformanceFamilyFeatureProfileEntry extends ConformanceManifestEntry {
  readonly family: string;
}

export interface ConformanceManifest {
  readonly family_feature_profiles: readonly ConformanceFamilyFeatureProfileEntry[];
  readonly families: Readonly<Record<string, readonly ConformanceManifestEntry[]>>;
}

export interface ConformanceSuiteSummary {
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
}

export function conformanceFamilyEntries(
  manifest: ConformanceManifest,
  family: string
): readonly ConformanceManifestEntry[] {
  return manifest.families[family] ?? [];
}

export function conformanceFixturePath(
  manifest: ConformanceManifest,
  family: string,
  role: string
): readonly string[] | undefined {
  return conformanceFamilyEntries(manifest, family).find((entry) => entry.role === role)?.path;
}

export function conformanceFamilyFeatureProfilePath(
  manifest: ConformanceManifest,
  family: string
): readonly string[] | undefined {
  return manifest.family_feature_profiles.find((entry) => entry.family === family)?.path;
}

export function summarizeConformanceResults(
  results: readonly ConformanceCaseResult[]
): ConformanceSuiteSummary {
  return results.reduce<ConformanceSuiteSummary>(
    (summary, result) => ({
      total: summary.total + 1,
      passed: summary.passed + Number(result.outcome === 'passed'),
      failed: summary.failed + Number(result.outcome === 'failed'),
      skipped: summary.skipped + Number(result.outcome === 'skipped')
    }),
    {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    }
  );
}
