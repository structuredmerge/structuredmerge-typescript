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

export interface ConformanceCaseRequirements {
  readonly dialect?: string;
  readonly policies?: readonly PolicyReference[];
}

export type ConformanceSelectionStatus = 'selected' | 'skipped';

export interface ConformanceCaseSelection {
  readonly ref: ConformanceCaseRef;
  readonly status: ConformanceSelectionStatus;
  readonly messages: readonly string[];
}

export interface ConformanceFeatureProfileView {
  readonly backend: string;
  readonly supportsDialects: boolean;
  readonly supportedPolicies?: readonly PolicyReference[];
}

export interface ConformanceCaseRun {
  readonly ref: ConformanceCaseRef;
  readonly requirements: ConformanceCaseRequirements;
  readonly familyProfile: FamilyFeatureProfile;
  readonly featureProfile?: ConformanceFeatureProfileView;
}

export interface ConformanceCaseExecution {
  readonly outcome: Exclude<ConformanceOutcome, 'skipped'>;
  readonly messages: readonly string[];
}

export interface ConformanceManifestEntry {
  readonly role: string;
  readonly path: readonly string[];
  readonly requirements?: ConformanceCaseRequirements;
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

export interface ConformanceSuiteReport {
  readonly results: readonly ConformanceCaseResult[];
  readonly summary: ConformanceSuiteSummary;
}

export interface ConformanceSuitePlanEntry {
  readonly ref: ConformanceCaseRef;
  readonly path: readonly string[];
  readonly run: ConformanceCaseRun;
}

export interface ConformanceSuitePlan {
  readonly family: string;
  readonly entries: readonly ConformanceSuitePlanEntry[];
  readonly missingRoles: readonly string[];
}

function includesPolicy(
  supportedPolicies: readonly PolicyReference[],
  policy: PolicyReference
): boolean {
  return supportedPolicies.some(
    (supportedPolicy) =>
      supportedPolicy.surface === policy.surface && supportedPolicy.name === policy.name
  );
}

function isDefaultDialect(familyProfile: FamilyFeatureProfile, dialect: string): boolean {
  return dialect === familyProfile.family;
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

export function selectConformanceCase(
  ref: ConformanceCaseRef,
  requirements: ConformanceCaseRequirements,
  familyProfile: FamilyFeatureProfile,
  featureProfile?: ConformanceFeatureProfileView
): ConformanceCaseSelection {
  const messages: string[] = [];

  if (requirements.dialect) {
    const { dialect } = requirements;

    if (!familyProfile.supportedDialects.includes(dialect)) {
      messages.push(`family ${familyProfile.family} does not support dialect ${dialect}.`);
    } else if (
      featureProfile &&
      !featureProfile.supportsDialects &&
      !isDefaultDialect(familyProfile, dialect)
    ) {
      messages.push(
        `backend ${featureProfile.backend} does not support dialect ${dialect} for family ${familyProfile.family}.`
      );
    }
  }

  for (const policy of requirements.policies ?? []) {
    if (!includesPolicy(familyProfile.supportedPolicies, policy)) {
      messages.push(`family ${familyProfile.family} does not support policy ${policy.name}.`);
      continue;
    }

    if (featureProfile && !includesPolicy(featureProfile.supportedPolicies ?? [], policy)) {
      messages.push(`backend ${featureProfile.backend} does not support policy ${policy.name}.`);
    }
  }

  return {
    ref,
    status: messages.length === 0 ? 'selected' : 'skipped',
    messages
  };
}

export function runConformanceCase(
  run: ConformanceCaseRun,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution
): ConformanceCaseResult {
  const selection = selectConformanceCase(
    run.ref,
    run.requirements,
    run.familyProfile,
    run.featureProfile
  );

  if (selection.status === 'skipped') {
    return {
      ref: run.ref,
      outcome: 'skipped',
      messages: selection.messages
    };
  }

  const execution = execute(run);
  return {
    ref: run.ref,
    outcome: execution.outcome,
    messages: execution.messages
  };
}

export function runConformanceSuite(
  runs: readonly ConformanceCaseRun[],
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution
): readonly ConformanceCaseResult[] {
  return runs.map((run) => runConformanceCase(run, execute));
}

export function runPlannedConformanceSuite(
  plan: ConformanceSuitePlan,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution
): readonly ConformanceCaseResult[] {
  return runConformanceSuite(
    plan.entries.map((entry) => entry.run),
    execute
  );
}

export function reportPlannedConformanceSuite(
  plan: ConformanceSuitePlan,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution
): ConformanceSuiteReport {
  return reportConformanceSuite(runPlannedConformanceSuite(plan, execute));
}

export function reportConformanceSuite(
  results: readonly ConformanceCaseResult[]
): ConformanceSuiteReport {
  return {
    results,
    summary: summarizeConformanceResults(results)
  };
}

export function planConformanceSuite(
  manifest: ConformanceManifest,
  family: string,
  roles: readonly string[],
  familyProfile: FamilyFeatureProfile,
  featureProfile?: ConformanceFeatureProfileView
): ConformanceSuitePlan {
  const entries: ConformanceSuitePlanEntry[] = [];
  const missingRoles: string[] = [];

  for (const role of roles) {
    const entry = conformanceFamilyEntries(manifest, family).find(
      (manifestEntry) => manifestEntry.role === role
    );

    if (!entry) {
      missingRoles.push(role);
      continue;
    }

    const ref: ConformanceCaseRef = {
      family,
      role,
      case: role
    };

    entries.push({
      ref,
      path: entry.path,
      run: {
        ref,
        requirements: entry.requirements ?? {},
        familyProfile,
        featureProfile
      }
    });
  }

  return {
    family,
    entries,
    missingRoles
  };
}
