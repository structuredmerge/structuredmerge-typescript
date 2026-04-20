export type DiagnosticSeverity = 'info' | 'warning' | 'error';

export type DiagnosticCategory =
  | 'parse_error'
  | 'destination_parse_error'
  | 'unsupported_feature'
  | 'fallback_applied'
  | 'ambiguity'
  | 'assumed_default'
  | 'configuration_error'
  | 'replay_rejected';

export type ReviewDiagnosticReason =
  | 'missing_required_payload'
  | 'family_mismatch'
  | 'request_not_found';

export interface Diagnostic {
  readonly severity: DiagnosticSeverity;
  readonly category: DiagnosticCategory;
  readonly message: string;
  readonly path?: string;
  readonly requestId?: string;
  readonly action?: ReviewDecisionAction;
  readonly reason?: ReviewDiagnosticReason;
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
  readonly suites?: Readonly<Record<string, ConformanceSuiteDefinition>>;
  readonly families: Readonly<Record<string, readonly ConformanceManifestEntry[]>>;
}

export interface ConformanceSuiteDefinition {
  readonly family: string;
  readonly roles: readonly string[];
}

export interface NamedConformanceSuiteReport {
  readonly suite: string;
  readonly report: ConformanceSuiteReport;
}

export interface ConformanceFamilyPlanContext {
  readonly familyProfile: FamilyFeatureProfile;
  readonly featureProfile?: ConformanceFeatureProfileView;
}

export interface NamedConformanceSuitePlan {
  readonly suite: string;
  readonly plan: ConformanceSuitePlan;
}

export interface NamedConformanceSuiteResults {
  readonly suite: string;
  readonly results: readonly ConformanceCaseResult[];
}

export interface NamedConformanceSuiteReportEnvelope {
  readonly entries: readonly NamedConformanceSuiteReport[];
  readonly summary: ConformanceSuiteSummary;
}

export interface ConformanceManifestPlanningOptions {
  readonly contexts?: Readonly<Record<string, ConformanceFamilyPlanContext>>;
  readonly familyProfiles?: Readonly<Record<string, FamilyFeatureProfile>>;
  readonly requireExplicitContexts?: boolean;
}

export interface ConformanceManifestReport {
  readonly report: NamedConformanceSuiteReportEnvelope;
  readonly diagnostics: readonly Diagnostic[];
}

export type ReviewRequestKind = 'family_context';

export type ReviewDecisionAction = 'accept_default_context' | 'provide_explicit_context';

export interface ReviewActionOffer {
  readonly action: ReviewDecisionAction;
  readonly requiresContext: boolean;
  readonly payloadKind?: 'conformance_family_context';
}

export interface ReviewRequest {
  readonly id: string;
  readonly kind: ReviewRequestKind;
  readonly family: string;
  readonly message: string;
  readonly blocking: boolean;
  readonly proposedContext?: ConformanceFamilyPlanContext;
  readonly actionOffers: readonly ReviewActionOffer[];
  readonly defaultAction?: ReviewDecisionAction;
}

export interface ReviewDecision {
  readonly requestId: string;
  readonly action: ReviewDecisionAction;
  readonly context?: ConformanceFamilyPlanContext;
}

export interface ReviewReplayBundle {
  readonly replayContext: ReviewReplayContext;
  readonly decisions: readonly ReviewDecision[];
}

export const REVIEW_TRANSPORT_VERSION = 1;

export type ReviewTransportImportErrorCategory = 'kind_mismatch' | 'unsupported_version';

export interface ReviewTransportImportError {
  readonly category: ReviewTransportImportErrorCategory;
  readonly message: string;
}

export interface ConformanceManifestReviewStateEnvelope {
  readonly kind: 'conformance_manifest_review_state';
  readonly version: typeof REVIEW_TRANSPORT_VERSION;
  readonly state: ConformanceManifestReviewState;
}

export interface ReviewReplayBundleEnvelope {
  readonly kind: 'review_replay_bundle';
  readonly version: typeof REVIEW_TRANSPORT_VERSION;
  readonly replayBundle: ReviewReplayBundle;
}

export interface ReviewHostHints {
  readonly interactive: boolean;
  readonly requireExplicitContexts: boolean;
}

export interface ReviewReplayContext {
  readonly surface: 'conformance_manifest';
  readonly families: readonly string[];
  readonly requireExplicitContexts: boolean;
}

export interface ConformanceManifestReviewOptions extends ConformanceManifestPlanningOptions {
  readonly reviewDecisions?: readonly ReviewDecision[];
  readonly reviewReplayContext?: ReviewReplayContext;
  readonly reviewReplayBundle?: ReviewReplayBundle;
  readonly interactive?: boolean;
}

export interface ConformanceManifestReviewState {
  readonly report: NamedConformanceSuiteReportEnvelope;
  readonly diagnostics: readonly Diagnostic[];
  readonly requests: readonly ReviewRequest[];
  readonly appliedDecisions: readonly ReviewDecision[];
  readonly hostHints: ReviewHostHints;
  readonly replayContext: ReviewReplayContext;
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

export function conformanceSuiteDefinition(
  manifest: ConformanceManifest,
  suiteName: string
): ConformanceSuiteDefinition | undefined {
  return manifest.suites?.[suiteName];
}

export function conformanceSuiteNames(manifest: ConformanceManifest): readonly string[] {
  return Object.keys(manifest.suites ?? {}).sort((left, right) => left.localeCompare(right));
}

export function defaultConformanceFamilyContext(
  familyProfile: FamilyFeatureProfile
): ConformanceFamilyPlanContext {
  return {
    familyProfile
  };
}

export function reviewRequestIdForFamilyContext(family: string): string {
  return `family_context:${family}`;
}

export function conformanceReviewHostHints(
  options: ConformanceManifestReviewOptions
): ReviewHostHints {
  return {
    interactive: options.interactive ?? false,
    requireExplicitContexts: options.requireExplicitContexts ?? false
  };
}

export function conformanceManifestReplayContext(
  manifest: ConformanceManifest,
  options: ConformanceManifestReviewOptions
): ReviewReplayContext {
  const families = Array.from(
    new Set(
      conformanceSuiteNames(manifest)
        .map((suiteName) => conformanceSuiteDefinition(manifest, suiteName)?.family)
        .filter((family): family is string => family !== undefined)
    )
  ).sort((left, right) => left.localeCompare(right));

  return {
    surface: 'conformance_manifest',
    families,
    requireExplicitContexts: options.requireExplicitContexts ?? false
  };
}

export function reviewReplayContextCompatible(
  current: ReviewReplayContext,
  candidate?: ReviewReplayContext
): boolean {
  return (
    candidate !== undefined &&
    candidate.surface === current.surface &&
    candidate.requireExplicitContexts === current.requireExplicitContexts &&
    candidate.families.length === current.families.length &&
    candidate.families.every((family, index) => family === current.families[index])
  );
}

export function reviewReplayBundleInputs(options: ConformanceManifestReviewOptions): {
  replayContext?: ReviewReplayContext;
  decisions: readonly ReviewDecision[];
} {
  if (options.reviewReplayBundle) {
    return {
      replayContext: options.reviewReplayBundle.replayContext,
      decisions: options.reviewReplayBundle.decisions
    };
  }

  return {
    replayContext: options.reviewReplayContext,
    decisions: options.reviewDecisions ?? []
  };
}

export function conformanceManifestReviewStateEnvelope(
  state: ConformanceManifestReviewState
): ConformanceManifestReviewStateEnvelope {
  return {
    kind: 'conformance_manifest_review_state',
    version: REVIEW_TRANSPORT_VERSION,
    state
  };
}

export function reviewReplayBundleEnvelope(
  replayBundle: ReviewReplayBundle
): ReviewReplayBundleEnvelope {
  return {
    kind: 'review_replay_bundle',
    version: REVIEW_TRANSPORT_VERSION,
    replayBundle
  };
}

export function importConformanceManifestReviewStateEnvelope(value: unknown): {
  state?: ConformanceManifestReviewState;
  error?: ReviewTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'conformance_manifest_review_state'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected conformance_manifest_review_state envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    state: ConformanceManifestReviewState;
  };

  if (envelope.version !== REVIEW_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported conformance_manifest_review_state envelope version ${String(envelope.version)}.`
      }
    };
  }

  return { state: envelope.state };
}

export function importReviewReplayBundleEnvelope(value: unknown): {
  replayBundle?: ReviewReplayBundle;
  error?: ReviewTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'review_replay_bundle'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected review_replay_bundle envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    replayBundle: ReviewReplayBundle;
  };

  if (envelope.version !== REVIEW_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported review_replay_bundle envelope version ${String(envelope.version)}.`
      }
    };
  }

  return { replayBundle: envelope.replayBundle };
}

export function conformanceManifestReviewRequestIds(
  manifest: ConformanceManifest,
  options: ConformanceManifestReviewOptions
): readonly string[] {
  if (!(options.requireExplicitContexts ?? false)) {
    return [];
  }

  const requestIds = new Set<string>();

  for (const suiteName of conformanceSuiteNames(manifest)) {
    const definition = conformanceSuiteDefinition(manifest, suiteName);

    if (!definition) {
      continue;
    }

    if (options.contexts?.[definition.family]) {
      continue;
    }

    if (options.familyProfiles?.[definition.family]) {
      requestIds.add(reviewRequestIdForFamilyContext(definition.family));
    }
  }

  return Array.from(requestIds).sort((left, right) => left.localeCompare(right));
}

export function resolveConformanceFamilyContext(
  family: string,
  options: ConformanceManifestPlanningOptions
): { context?: ConformanceFamilyPlanContext; diagnostics: readonly Diagnostic[] } {
  const explicitContext = options.contexts?.[family];

  if (explicitContext) {
    return {
      context: explicitContext,
      diagnostics: []
    };
  }

  if (options.requireExplicitContexts) {
    return {
      diagnostics: [
        {
          severity: 'error',
          category: 'configuration_error',
          message: `missing explicit family context for ${family}.`
        }
      ]
    };
  }

  const familyProfile = options.familyProfiles?.[family];

  if (!familyProfile) {
    return {
      diagnostics: [
        {
          severity: 'error',
          category: 'configuration_error',
          message: `missing family context for ${family} and no default family profile is available.`
        }
      ]
    };
  }

  return {
    context: defaultConformanceFamilyContext(familyProfile),
    diagnostics: [
      {
        severity: 'warning',
        category: 'assumed_default',
        message: `using default family context for ${family}.`
      }
    ]
  };
}

function reviewDecisionForFamilyContext(
  family: string,
  options: ConformanceManifestReviewOptions
):
  | {
      context?: ConformanceFamilyPlanContext;
      decision?: ReviewDecision;
      assumedDefault: boolean;
      diagnostics: readonly Diagnostic[];
    }
  | undefined {
  const requestId = reviewRequestIdForFamilyContext(family);
  const familyProfile = options.familyProfiles?.[family];

  for (const decision of options.reviewDecisions ?? []) {
    if (decision.requestId !== requestId) {
      continue;
    }

    if (decision.action === 'accept_default_context') {
      if (!familyProfile) {
        continue;
      }

      return {
        context: defaultConformanceFamilyContext(familyProfile),
        decision,
        assumedDefault: true,
        diagnostics: []
      };
    }

    if (decision.action === 'provide_explicit_context' && !decision.context) {
      return {
        assumedDefault: false,
        diagnostics: [
          {
            severity: 'error',
            category: 'configuration_error',
            message: `review decision ${requestId} requires explicit context payload.`,
            requestId,
            action: 'provide_explicit_context',
            reason: 'missing_required_payload'
          }
        ]
      };
    }

    if (decision.action === 'provide_explicit_context' && decision.context) {
      if (decision.context.familyProfile.family !== family) {
        return {
          assumedDefault: false,
          diagnostics: [
            {
              severity: 'error',
              category: 'configuration_error',
              message: `review decision ${requestId} provided context for ${decision.context.familyProfile.family}, expected ${family}.`,
              requestId,
              action: 'provide_explicit_context',
              reason: 'family_mismatch'
            }
          ]
        };
      }

      return {
        context: decision.context,
        decision,
        assumedDefault: false,
        diagnostics: []
      };
    }
  }

  return undefined;
}

export function reviewConformanceFamilyContext(
  family: string,
  options: ConformanceManifestReviewOptions
): {
  context?: ConformanceFamilyPlanContext;
  diagnostics: readonly Diagnostic[];
  requests: readonly ReviewRequest[];
  appliedDecisions: readonly ReviewDecision[];
} {
  const explicitContext = options.contexts?.[family];

  if (explicitContext) {
    return {
      context: explicitContext,
      diagnostics: [],
      requests: [],
      appliedDecisions: []
    };
  }

  const familyProfile = options.familyProfiles?.[family];

  if (!(options.requireExplicitContexts ?? false)) {
    const resolved = resolveConformanceFamilyContext(family, options);
    return {
      context: resolved.context,
      diagnostics: resolved.diagnostics,
      requests: [],
      appliedDecisions: []
    };
  }

  if (!familyProfile) {
    return {
      diagnostics: [
        {
          severity: 'error',
          category: 'configuration_error',
          message: `missing family context for ${family} and no default family profile is available.`
        }
      ],
      requests: [],
      appliedDecisions: []
    };
  }

  const reviewedDecision = reviewDecisionForFamilyContext(family, options);

  if (reviewedDecision && reviewedDecision.context && reviewedDecision.decision) {
    return {
      context: reviewedDecision.context,
      diagnostics: reviewedDecision.assumedDefault
        ? [
            {
              severity: 'warning',
              category: 'assumed_default',
              message: `using default family context for ${family}.`
            }
          ]
        : [],
      requests: [],
      appliedDecisions: [reviewedDecision.decision]
    };
  }

  return {
    diagnostics:
      reviewedDecision && reviewedDecision.diagnostics.length > 0
        ? reviewedDecision.diagnostics
        : [
            {
              severity: 'error',
              category: 'configuration_error',
              message: `missing explicit family context for ${family}.`
            }
          ],
    requests: [
      {
        id: reviewRequestIdForFamilyContext(family),
        kind: 'family_context',
        family,
        message: `explicit family context is required for ${family}; a synthesized default may be accepted by review.`,
        blocking: true,
        proposedContext: defaultConformanceFamilyContext(familyProfile),
        actionOffers: [
          { action: 'accept_default_context', requiresContext: false },
          {
            action: 'provide_explicit_context',
            requiresContext: true,
            payloadKind: 'conformance_family_context'
          }
        ],
        defaultAction: 'accept_default_context'
      }
    ],
    appliedDecisions: []
  };
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

export function runNamedConformanceSuite(
  manifest: ConformanceManifest,
  suiteName: string,
  familyProfile: FamilyFeatureProfile,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution,
  featureProfile?: ConformanceFeatureProfileView
): readonly ConformanceCaseResult[] | undefined {
  const plan = planNamedConformanceSuite(manifest, suiteName, familyProfile, featureProfile);

  if (!plan) {
    return undefined;
  }

  return runPlannedConformanceSuite(plan, execute);
}

export function runNamedConformanceSuiteEntry(
  manifest: ConformanceManifest,
  suiteName: string,
  familyProfile: FamilyFeatureProfile,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution,
  featureProfile?: ConformanceFeatureProfileView
): NamedConformanceSuiteResults | undefined {
  const results = runNamedConformanceSuite(
    manifest,
    suiteName,
    familyProfile,
    execute,
    featureProfile
  );

  if (!results) {
    return undefined;
  }

  return {
    suite: suiteName,
    results
  };
}

export function runPlannedNamedConformanceSuites(
  entries: readonly NamedConformanceSuitePlan[],
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution
): readonly NamedConformanceSuiteResults[] {
  return entries.map((entry) => ({
    suite: entry.suite,
    results: runPlannedConformanceSuite(entry.plan, execute)
  }));
}

export function reportPlannedConformanceSuite(
  plan: ConformanceSuitePlan,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution
): ConformanceSuiteReport {
  return reportConformanceSuite(runPlannedConformanceSuite(plan, execute));
}

export function reportNamedConformanceSuite(
  manifest: ConformanceManifest,
  suiteName: string,
  familyProfile: FamilyFeatureProfile,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution,
  featureProfile?: ConformanceFeatureProfileView
): ConformanceSuiteReport | undefined {
  const plan = planNamedConformanceSuite(manifest, suiteName, familyProfile, featureProfile);

  if (!plan) {
    return undefined;
  }

  return reportPlannedConformanceSuite(plan, execute);
}

export function reportNamedConformanceSuiteEntry(
  manifest: ConformanceManifest,
  suiteName: string,
  familyProfile: FamilyFeatureProfile,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution,
  featureProfile?: ConformanceFeatureProfileView
): NamedConformanceSuiteReport | undefined {
  const report = reportNamedConformanceSuite(
    manifest,
    suiteName,
    familyProfile,
    execute,
    featureProfile
  );

  if (!report) {
    return undefined;
  }

  return {
    suite: suiteName,
    report
  };
}

export function reportPlannedNamedConformanceSuites(
  entries: readonly NamedConformanceSuitePlan[],
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution
): readonly NamedConformanceSuiteReport[] {
  return entries.map((entry) => ({
    suite: entry.suite,
    report: reportPlannedConformanceSuite(entry.plan, execute)
  }));
}

export function summarizeNamedConformanceSuiteReports(
  entries: readonly NamedConformanceSuiteReport[]
): ConformanceSuiteSummary {
  return entries.reduce<ConformanceSuiteSummary>(
    (summary, entry) => ({
      total: summary.total + entry.report.summary.total,
      passed: summary.passed + entry.report.summary.passed,
      failed: summary.failed + entry.report.summary.failed,
      skipped: summary.skipped + entry.report.summary.skipped
    }),
    {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    }
  );
}

export function reportNamedConformanceSuiteEnvelope(
  entries: readonly NamedConformanceSuiteReport[]
): NamedConformanceSuiteReportEnvelope {
  return {
    entries,
    summary: summarizeNamedConformanceSuiteReports(entries)
  };
}

export function reportNamedConformanceSuiteManifest(
  manifest: ConformanceManifest,
  contexts: Readonly<Record<string, ConformanceFamilyPlanContext>>,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution
): NamedConformanceSuiteReportEnvelope {
  return reportNamedConformanceSuiteEnvelope(
    reportPlannedNamedConformanceSuites(planNamedConformanceSuites(manifest, contexts), execute)
  );
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

export function planNamedConformanceSuite(
  manifest: ConformanceManifest,
  suiteName: string,
  familyProfile: FamilyFeatureProfile,
  featureProfile?: ConformanceFeatureProfileView
): ConformanceSuitePlan | undefined {
  const definition = conformanceSuiteDefinition(manifest, suiteName);

  if (!definition) {
    return undefined;
  }

  return planConformanceSuite(
    manifest,
    definition.family,
    definition.roles,
    familyProfile,
    featureProfile
  );
}

export function planNamedConformanceSuiteEntry(
  manifest: ConformanceManifest,
  suiteName: string,
  context: ConformanceFamilyPlanContext
): NamedConformanceSuitePlan | undefined {
  const plan = planNamedConformanceSuite(
    manifest,
    suiteName,
    context.familyProfile,
    context.featureProfile
  );

  if (!plan) {
    return undefined;
  }

  return {
    suite: suiteName,
    plan
  };
}

export function planNamedConformanceSuitesWithDiagnostics(
  manifest: ConformanceManifest,
  options: ConformanceManifestPlanningOptions
): { entries: readonly NamedConformanceSuitePlan[]; diagnostics: readonly Diagnostic[] } {
  const entries: NamedConformanceSuitePlan[] = [];
  const diagnostics: Diagnostic[] = [];
  const resolvedContexts = new Map<string, ConformanceFamilyPlanContext | undefined>();

  for (const suiteName of conformanceSuiteNames(manifest)) {
    const definition = conformanceSuiteDefinition(manifest, suiteName);

    if (!definition) {
      continue;
    }

    let context = resolvedContexts.get(definition.family);

    if (context === undefined && !resolvedContexts.has(definition.family)) {
      const resolved = resolveConformanceFamilyContext(definition.family, options);
      diagnostics.push(...resolved.diagnostics);
      context = resolved.context;
      resolvedContexts.set(definition.family, context);
    }

    if (!context) {
      continue;
    }

    const plan = planNamedConformanceSuiteEntry(manifest, suiteName, context);

    if (!plan) {
      continue;
    }

    if (plan.plan.missingRoles.length > 0) {
      diagnostics.push({
        severity: 'error',
        category: 'configuration_error',
        message: `suite ${suiteName} declares missing roles: ${plan.plan.missingRoles.join(', ')}.`
      });
      continue;
    }

    entries.push(plan);
  }

  return {
    entries,
    diagnostics
  };
}

export function planNamedConformanceSuites(
  manifest: ConformanceManifest,
  contexts: Readonly<Record<string, ConformanceFamilyPlanContext>>
): readonly NamedConformanceSuitePlan[] {
  return conformanceSuiteNames(manifest)
    .map((suiteName) => {
      const definition = conformanceSuiteDefinition(manifest, suiteName);

      if (!definition) {
        return undefined;
      }

      const context = contexts[definition.family];

      if (!context) {
        return undefined;
      }

      return planNamedConformanceSuiteEntry(manifest, suiteName, context);
    })
    .filter((entry): entry is NamedConformanceSuitePlan => entry !== undefined);
}

export function reportConformanceManifest(
  manifest: ConformanceManifest,
  options: ConformanceManifestPlanningOptions,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution
): ConformanceManifestReport {
  const planned = planNamedConformanceSuitesWithDiagnostics(manifest, options);

  return {
    report: reportNamedConformanceSuiteEnvelope(
      reportPlannedNamedConformanceSuites(planned.entries, execute)
    ),
    diagnostics: planned.diagnostics
  };
}

export function reviewConformanceManifest(
  manifest: ConformanceManifest,
  options: ConformanceManifestReviewOptions,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution
): ConformanceManifestReviewState {
  const replayContext = conformanceManifestReplayContext(manifest, options);
  const diagnostics: Diagnostic[] = [];
  let effectiveOptions: ConformanceManifestReviewOptions = options;
  const replayInputs = reviewReplayBundleInputs(options);

  if (replayInputs.decisions.length > 0) {
    if (!replayInputs.replayContext) {
      diagnostics.push({
        severity: 'error',
        category: 'replay_rejected',
        message: 'review decisions were provided without replay context.'
      });
      effectiveOptions = {
        ...options,
        reviewReplayBundle: undefined,
        reviewReplayContext: undefined,
        reviewDecisions: []
      };
    } else if (!reviewReplayContextCompatible(replayContext, replayInputs.replayContext)) {
      diagnostics.push({
        severity: 'error',
        category: 'replay_rejected',
        message: 'review replay context does not match the current conformance manifest state.'
      });
      effectiveOptions = {
        ...options,
        reviewReplayBundle: undefined,
        reviewReplayContext: undefined,
        reviewDecisions: []
      };
    } else {
      const allowedRequestIds = new Set(conformanceManifestReviewRequestIds(manifest, options));
      const acceptedDecisions: ReviewDecision[] = [];

      for (const decision of replayInputs.decisions) {
        if (allowedRequestIds.has(decision.requestId)) {
          acceptedDecisions.push(decision);
        } else {
          diagnostics.push({
            severity: 'error',
            category: 'replay_rejected',
            message: `review decision ${decision.requestId} does not match any current review request.`,
            requestId: decision.requestId,
            action: decision.action,
            reason: 'request_not_found'
          });
        }
      }

      effectiveOptions = {
        ...options,
        reviewReplayBundle: undefined,
        reviewReplayContext: replayInputs.replayContext,
        reviewDecisions: acceptedDecisions
      };
    }
  }

  const entries: NamedConformanceSuitePlan[] = [];
  const requests: ReviewRequest[] = [];
  const appliedDecisions: ReviewDecision[] = [];
  const resolvedContexts = new Map<string, ConformanceFamilyPlanContext | undefined>();

  for (const suiteName of conformanceSuiteNames(manifest)) {
    const definition = conformanceSuiteDefinition(manifest, suiteName);

    if (!definition) {
      continue;
    }

    let context = resolvedContexts.get(definition.family);

    if (context === undefined && !resolvedContexts.has(definition.family)) {
      const reviewed = reviewConformanceFamilyContext(definition.family, effectiveOptions);
      diagnostics.push(...reviewed.diagnostics);
      requests.push(...reviewed.requests);
      appliedDecisions.push(...reviewed.appliedDecisions);
      context = reviewed.context;
      resolvedContexts.set(definition.family, context);
    }

    if (!context) {
      continue;
    }

    const plan = planNamedConformanceSuiteEntry(manifest, suiteName, context);

    if (!plan) {
      continue;
    }

    if (plan.plan.missingRoles.length > 0) {
      diagnostics.push({
        severity: 'error',
        category: 'configuration_error',
        message: `suite ${suiteName} declares missing roles: ${plan.plan.missingRoles.join(', ')}.`
      });
      continue;
    }

    entries.push(plan);
  }

  return {
    report: reportNamedConformanceSuiteEnvelope(
      reportPlannedNamedConformanceSuites(entries, execute)
    ),
    diagnostics,
    requests,
    appliedDecisions,
    hostHints: conformanceReviewHostHints(options),
    replayContext
  };
}
