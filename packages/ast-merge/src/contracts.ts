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

export interface ReviewDiagnosticDetail {
  readonly requestId?: string;
  readonly action?: ReviewDecisionAction;
  readonly reason?: ReviewDiagnosticReason;
  readonly payloadKind?: 'conformance_family_context';
  readonly expectedFamily?: string;
  readonly providedFamily?: string;
}

export interface Diagnostic {
  readonly severity: DiagnosticSeverity;
  readonly category: DiagnosticCategory;
  readonly message: string;
  readonly path?: string;
  readonly review?: ReviewDiagnosticDetail;
}

export type SurfaceOwnerKind = 'structural_owner' | 'owned_region' | 'parent_surface';

export interface SurfaceOwnerRef {
  readonly kind: SurfaceOwnerKind;
  readonly address: string;
}

export interface SurfaceSpan {
  readonly startLine: number;
  readonly endLine: number;
}

export interface DiscoveredSurface {
  readonly surfaceKind: string;
  readonly declaredLanguage?: string;
  readonly effectiveLanguage: string;
  readonly address: string;
  readonly parentAddress?: string;
  readonly span?: SurfaceSpan;
  readonly owner: SurfaceOwnerRef;
  readonly reconstructionStrategy: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface DelegatedChildOperation {
  readonly operationId: string;
  readonly parentOperationId: string;
  readonly requestedStrategy: 'delegate_child_surface';
  readonly languageChain: readonly string[];
  readonly surface: DiscoveredSurface;
}

export interface ProjectedChildReviewCase {
  readonly caseId: string;
  readonly parentOperationId: string;
  readonly childOperationId: string;
  readonly surfacePath: string;
  readonly delegatedCaseId: string;
  readonly delegatedApplyGroup: string;
  readonly delegatedRuntimeSurfacePath: string;
}

export interface ProjectedChildReviewGroup {
  readonly delegatedApplyGroup: string;
  readonly parentOperationId: string;
  readonly childOperationId: string;
  readonly delegatedRuntimeSurfacePath: string;
  readonly caseIds: readonly string[];
  readonly delegatedCaseIds: readonly string[];
}

export interface ProjectedChildReviewGroupProgress {
  readonly delegatedApplyGroup: string;
  readonly parentOperationId: string;
  readonly childOperationId: string;
  readonly delegatedRuntimeSurfacePath: string;
  readonly resolvedCaseIds: readonly string[];
  readonly pendingCaseIds: readonly string[];
  readonly complete: boolean;
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

export interface TemplateTargetClassification {
  readonly destinationPath: string;
  readonly fileType: string;
  readonly family: string;
  readonly dialect: string;
}

export interface TemplateDestinationContext {
  readonly projectName?: string;
}

export interface TemplateTokenConfig {
  readonly pre: string;
  readonly post: string;
  readonly separators: readonly string[];
  readonly minSegments: number;
  readonly maxSegments?: number;
  readonly segmentPattern: string;
}

export type TemplateStrategy = 'merge' | 'accept_template' | 'keep_destination' | 'raw_copy';

export interface TemplateStrategyOverride {
  readonly path: string;
  readonly strategy: TemplateStrategy;
}

export interface TemplatePlanEntry {
  readonly templateSourcePath: string;
  readonly logicalDestinationPath: string;
  readonly destinationPath?: string;
  readonly classification: TemplateTargetClassification;
  readonly strategy: TemplateStrategy;
  readonly action: 'omit' | TemplateStrategy;
}

export interface TemplatePlanStateEntry extends TemplatePlanEntry {
  readonly destinationExists: boolean;
  readonly writeAction: 'omit' | 'keep' | 'create' | 'update';
}

export type TemplatePlanBlockReason = 'unresolved_tokens';

export interface TemplatePlanTokenStateEntry extends TemplatePlanStateEntry {
  readonly tokenKeys: readonly string[];
  readonly unresolvedTokenKeys: readonly string[];
  readonly tokenResolutionRequired: boolean;
  readonly blocked: boolean;
  readonly blockReason?: TemplatePlanBlockReason;
}

export type TemplatePreparationAction = 'blocked' | 'resolve_tokens' | 'pass_through';

export interface TemplatePreparedEntry extends TemplatePlanTokenStateEntry {
  readonly templateContent: string;
  readonly preparedTemplateContent?: string;
  readonly preparationAction: TemplatePreparationAction;
}

export type TemplateExecutionAction =
  | 'blocked'
  | 'omit'
  | 'keep'
  | 'raw_copy'
  | 'write_prepared_content'
  | 'merge_prepared_content';

export interface TemplateExecutionPlanEntry extends TemplatePreparedEntry {
  readonly executionAction: TemplateExecutionAction;
  readonly ready: boolean;
  readonly destinationContent?: string;
}

export interface TemplatePreviewResult {
  readonly resultFiles: Readonly<Record<string, string>>;
  readonly createdPaths: readonly string[];
  readonly updatedPaths: readonly string[];
  readonly keptPaths: readonly string[];
  readonly blockedPaths: readonly string[];
  readonly omittedPaths: readonly string[];
}

export interface TemplateApplyResult extends TemplatePreviewResult {
  readonly diagnostics: readonly Diagnostic[];
}

export interface TemplateConvergenceResult {
  readonly converged: boolean;
  readonly pendingPaths: readonly string[];
}

export interface TemplateTreeRunResult {
  readonly executionPlan: readonly TemplateExecutionPlanEntry[];
  readonly applyResult: TemplateApplyResult;
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
  readonly backend?: string;
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
  readonly suite_descriptors?: readonly ConformanceSuiteDefinition[];
  readonly families: Readonly<Record<string, readonly ConformanceManifestEntry[]>>;
}

export interface ConformanceSuiteSubject {
  readonly grammar: string;
  readonly variant?: string;
}

export interface ConformanceSuiteSelector {
  readonly kind: string;
  readonly subject: ConformanceSuiteSubject;
}

export interface ConformanceSuiteDefinition {
  readonly kind: string;
  readonly subject: ConformanceSuiteSubject;
  readonly roles: readonly string[];
}

export interface NamedConformanceSuiteReport {
  readonly suite: ConformanceSuiteDefinition;
  readonly report: ConformanceSuiteReport;
}

export interface ConformanceFamilyPlanContext {
  readonly familyProfile: FamilyFeatureProfile;
  readonly featureProfile?: ConformanceFeatureProfileView;
}

export interface NamedConformanceSuitePlan {
  readonly suite: ConformanceSuiteDefinition;
  readonly plan: ConformanceSuitePlan;
}

export interface NamedConformanceSuiteResults {
  readonly suite: ConformanceSuiteDefinition;
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

export type ReviewRequestKind = 'family_context' | 'delegated_child_group';

export type ReviewDecisionAction =
  | 'accept_default_context'
  | 'provide_explicit_context'
  | 'apply_delegated_child_group';

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
  readonly delegatedGroup?: ProjectedChildReviewGroup;
  readonly actionOffers: readonly ReviewActionOffer[];
  readonly defaultAction?: ReviewDecisionAction;
}

export interface ReviewDecision {
  readonly requestId: string;
  readonly action: ReviewDecisionAction;
  readonly context?: ConformanceFamilyPlanContext;
}

export interface DelegatedChildGroupReviewState {
  readonly requests: readonly ReviewRequest[];
  readonly acceptedGroups: readonly ProjectedChildReviewGroup[];
  readonly appliedDecisions: readonly ReviewDecision[];
  readonly diagnostics: readonly Diagnostic[];
}

export interface DelegatedChildApplyPlanEntry {
  readonly requestId: string;
  readonly family: string;
  readonly delegatedGroup: ProjectedChildReviewGroup;
  readonly decision: ReviewDecision;
}

export interface DelegatedChildApplyPlan {
  readonly entries: readonly DelegatedChildApplyPlanEntry[];
}

export interface DelegatedChildSurfaceOutput {
  readonly surfaceAddress: string;
  readonly output: string;
}

export interface AppliedDelegatedChildOutput {
  readonly operationId: string;
  readonly output: string;
}

export interface DelegatedChildOutputResolutionOptions {
  readonly defaultFamily: string;
  readonly requestIdPrefix: string;
}

export interface DelegatedChildOutputResolution {
  readonly ok: boolean;
  readonly diagnostics: readonly Diagnostic[];
  readonly applyPlan?: DelegatedChildApplyPlan;
  readonly appliedChildren?: readonly AppliedDelegatedChildOutput[];
}

export interface NestedMergeDiscoveryResult {
  readonly ok: boolean;
  readonly diagnostics: readonly Diagnostic[];
  readonly operations?: readonly DelegatedChildOperation[];
}

export interface NestedMergeExecutionCallbacks<TOutput> {
  readonly mergeParent: () => MergeResult<TOutput>;
  readonly discoverOperations: (mergedOutput: TOutput) => NestedMergeDiscoveryResult;
  readonly applyResolvedOutputs: (
    mergedOutput: TOutput,
    operations: readonly DelegatedChildOperation[],
    applyPlan: DelegatedChildApplyPlan,
    appliedChildren: readonly AppliedDelegatedChildOutput[]
  ) => MergeResult<TOutput>;
}

export interface ReviewReplayBundle {
  readonly replayContext: ReviewReplayContext;
  readonly decisions: readonly ReviewDecision[];
  readonly reviewedNestedExecutions?: readonly ReviewedNestedExecution[];
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

export interface ReviewedNestedExecution {
  readonly family: string;
  readonly reviewState: DelegatedChildGroupReviewState;
  readonly appliedChildren: readonly AppliedDelegatedChildOutput[];
}

export interface ReviewedNestedExecutionResult<TOutput> {
  readonly execution: ReviewedNestedExecution;
  readonly result: MergeResult<TOutput>;
}

export interface ReviewedNestedExecutionApplication<TOutput> {
  readonly diagnostics: readonly Diagnostic[];
  readonly results: readonly ReviewedNestedExecutionResult<TOutput>[];
}

export interface ConformanceManifestReviewedNestedApplication<TOutput> {
  readonly state: ConformanceManifestReviewState;
  readonly results: readonly ReviewedNestedExecutionResult<TOutput>[];
}

export interface ReviewedNestedExecutionEnvelope {
  readonly kind: 'reviewed_nested_execution';
  readonly version: typeof REVIEW_TRANSPORT_VERSION;
  readonly execution: ReviewedNestedExecution;
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
  readonly reviewedNestedExecutions?: readonly ReviewedNestedExecution[];
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

export function normalizeTemplateSourcePath(path: string): string {
  if (path.endsWith('.no-osc.example')) {
    return path.slice(0, -'.no-osc.example'.length);
  }

  if (path.endsWith('.example')) {
    return path.slice(0, -'.example'.length);
  }

  return path;
}

export function classifyTemplateTargetPath(path: string): TemplateTargetClassification {
  const normalizedPath = path.replace(/^\.\//, '');
  const lowerPath = normalizedPath.toLowerCase();
  const base = normalizedPath.split('/').at(-1) ?? normalizedPath;
  const lowerBase = base.toLowerCase();
  const classify = (
    fileType: string,
    family: string,
    dialect: string
  ): TemplateTargetClassification => ({
    destinationPath: path,
    fileType,
    family,
    dialect
  });

  if (normalizedPath === '.git-hooks/commit-msg') {
    return classify('ruby', 'ruby', 'ruby');
  }
  if (normalizedPath === '.git-hooks/prepare-commit-msg') {
    return classify('bash', 'bash', 'bash');
  }

  if (base === 'Gemfile' || base === 'Appraisal.root.gemfile') {
    return classify('gemfile', 'ruby', 'ruby');
  }
  if (base === 'Appraisals') {
    return classify('appraisals', 'ruby', 'ruby');
  }
  if (base === 'Rakefile' || base === '.simplecov') {
    return classify('ruby', 'ruby', 'ruby');
  }
  if (base === '.envrc') {
    return classify('bash', 'bash', 'bash');
  }
  if (base === '.tool-versions') {
    return classify('tool_versions', 'text', 'tool_versions');
  }
  if (base === 'CITATION.cff') {
    return classify('yaml', 'yaml', 'yaml');
  }

  if (lowerBase.endsWith('.gemspec')) {
    return classify('gemspec', 'ruby', 'ruby');
  }
  if (lowerBase.endsWith('.gemfile')) {
    return classify('gemfile', 'ruby', 'ruby');
  }
  if (lowerBase.endsWith('.rb') || lowerBase.endsWith('.rake')) {
    return classify('ruby', 'ruby', 'ruby');
  }
  if (lowerPath.endsWith('.yml') || lowerPath.endsWith('.yaml')) {
    return classify('yaml', 'yaml', 'yaml');
  }
  if (lowerPath.endsWith('.md') || lowerPath.endsWith('.markdown')) {
    return classify('markdown', 'markdown', 'markdown');
  }
  if (lowerPath.endsWith('.sh') || lowerPath.endsWith('.bash')) {
    return classify('bash', 'bash', 'bash');
  }
  if (lowerBase === '.env' || lowerBase.startsWith('.env.')) {
    return classify('dotenv', 'dotenv', 'dotenv');
  }
  if (lowerPath.endsWith('.jsonc')) {
    return classify('json', 'json', 'jsonc');
  }
  if (lowerPath.endsWith('.json')) {
    return classify('json', 'json', 'json');
  }
  if (lowerPath.endsWith('.toml')) {
    return classify('toml', 'toml', 'toml');
  }
  if (lowerPath.endsWith('.rbs')) {
    return classify('rbs', 'rbs', 'rbs');
  }

  return classify('text', 'text', 'text');
}

export function resolveTemplateDestinationPath(
  path: string,
  context: TemplateDestinationContext = {}
): string | undefined {
  if (path === '.kettle-jem.yml') {
    return undefined;
  }
  if (path === '.env.local') {
    return '.env.local.example';
  }
  if (path === 'gem.gemspec' && context.projectName?.trim()) {
    return `${context.projectName.trim()}.gemspec`;
  }

  return path;
}

export const DEFAULT_TEMPLATE_TOKEN_CONFIG: TemplateTokenConfig = {
  pre: '{',
  post: '}',
  separators: ['|', ':'],
  minSegments: 2,
  segmentPattern: '[A-Za-z0-9_]'
};

function separatorAt(config: TemplateTokenConfig, boundaryIndex: number): string {
  return config.separators[Math.min(boundaryIndex, config.separators.length - 1)] ?? '';
}

function segmentPatternRegExp(pattern: string): RegExp {
  return new RegExp(`^${pattern}$`);
}

function isValidTemplateTokenKey(key: string, config: TemplateTokenConfig): boolean {
  if (!key.length) {
    return false;
  }

  const segmentCharacter = segmentPatternRegExp(config.segmentPattern);
  let index = 0;
  let segments = 0;
  let boundaryIndex = 0;

  while (index < key.length) {
    const segmentStart = index;
    while (index < key.length && segmentCharacter.test(key[index] ?? '')) {
      index += 1;
    }

    if (index === segmentStart) {
      return false;
    }

    segments += 1;
    if (index === key.length) {
      break;
    }

    const separator = separatorAt(config, boundaryIndex);
    if (!separator || !key.startsWith(separator, index)) {
      return false;
    }

    index += separator.length;
    boundaryIndex += 1;
  }

  if (segments < config.minSegments) {
    return false;
  }

  return config.maxSegments === undefined || segments <= config.maxSegments;
}

export function templateTokenKeys(
  content: string,
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): readonly string[] {
  if (!content || !content.includes(config.pre)) {
    return [];
  }

  const keys: string[] = [];
  const seen = new Set<string>();
  let offset = 0;

  while (offset < content.length) {
    const tokenStart = content.indexOf(config.pre, offset);
    if (tokenStart === -1) {
      break;
    }

    const contentStart = tokenStart + config.pre.length;
    const tokenEnd = content.indexOf(config.post, contentStart);
    if (tokenEnd === -1) {
      break;
    }

    const key = content.slice(contentStart, tokenEnd);
    if (isValidTemplateTokenKey(key, config) && !seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }

    offset = tokenEnd + config.post.length;
  }

  return keys;
}

export function unresolvedTemplateTokenKeys(
  content: string,
  replacements: Readonly<Record<string, string>>,
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): readonly string[] {
  return templateTokenKeys(content, config).filter((key) => !(key in replacements));
}

export function resolveTemplateTokens(
  content: string,
  replacements: Readonly<Record<string, string>>,
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): string {
  let resolved = content;
  for (const key of templateTokenKeys(content, config)) {
    const replacement = replacements[key];
    if (replacement === undefined) {
      continue;
    }

    resolved = resolved.split(`${config.pre}${key}${config.post}`).join(replacement);
  }

  return resolved;
}

export function selectTemplateStrategy(
  path: string,
  defaultStrategy: TemplateStrategy = 'merge',
  overrides: readonly TemplateStrategyOverride[] = []
): TemplateStrategy {
  const normalizedPath = path.replace(/^\.\//, '');
  const override = overrides.find((entry) => entry.path.replace(/^\.\//, '') === normalizedPath);
  return override?.strategy ?? defaultStrategy;
}

export function planTemplateEntries(
  templateSourcePaths: readonly string[],
  context: TemplateDestinationContext = {},
  defaultStrategy: TemplateStrategy = 'merge',
  overrides: readonly TemplateStrategyOverride[] = []
): readonly TemplatePlanEntry[] {
  return templateSourcePaths.map((templateSourcePath) => {
    const logicalDestinationPath = normalizeTemplateSourcePath(templateSourcePath);
    const destinationPath = resolveTemplateDestinationPath(logicalDestinationPath, context);
    const classification = classifyTemplateTargetPath(logicalDestinationPath);
    const strategy = selectTemplateStrategy(logicalDestinationPath, defaultStrategy, overrides);

    return {
      templateSourcePath,
      logicalDestinationPath,
      destinationPath,
      classification,
      strategy,
      action: destinationPath === undefined ? 'omit' : strategy
    };
  });
}

export function enrichTemplatePlanEntries(
  entries: readonly TemplatePlanEntry[],
  existingDestinationPaths: readonly string[]
): readonly TemplatePlanStateEntry[] {
  const existing = new Set(existingDestinationPaths);
  return entries.map((entry) => {
    const destinationExists = entry.destinationPath ? existing.has(entry.destinationPath) : false;
    const writeAction = !entry.destinationPath
      ? 'omit'
      : entry.strategy === 'keep_destination'
        ? 'keep'
        : destinationExists
          ? 'update'
          : 'create';

    return {
      ...entry,
      destinationExists,
      writeAction
    };
  });
}

export function enrichTemplatePlanEntriesWithTokenState(
  entries: readonly TemplatePlanStateEntry[],
  templateContents: Readonly<Record<string, string>>,
  replacements: Readonly<Record<string, string>>,
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): readonly TemplatePlanTokenStateEntry[] {
  return entries.map((entry) => {
    const content = templateContents[entry.templateSourcePath] ?? '';
    const tokenKeys = templateTokenKeys(content, config);
    const unresolvedTokenKeys = tokenKeys.filter((key) => !(key in replacements));
    const tokenResolutionRequired =
      entry.destinationPath !== undefined &&
      entry.strategy !== 'keep_destination' &&
      entry.strategy !== 'raw_copy';
    const blocked = tokenResolutionRequired && unresolvedTokenKeys.length > 0;

    return {
      ...entry,
      tokenKeys,
      unresolvedTokenKeys,
      tokenResolutionRequired,
      blocked,
      blockReason: blocked ? 'unresolved_tokens' : undefined
    };
  });
}

export function prepareTemplateEntries(
  entries: readonly TemplatePlanTokenStateEntry[],
  templateContents: Readonly<Record<string, string>>,
  replacements: Readonly<Record<string, string>>,
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): readonly TemplatePreparedEntry[] {
  return entries.map((entry) => {
    const templateContent = templateContents[entry.templateSourcePath] ?? '';
    if (entry.blocked) {
      return {
        ...entry,
        templateContent,
        preparedTemplateContent: undefined,
        preparationAction: 'blocked'
      };
    }

    if (entry.tokenResolutionRequired) {
      return {
        ...entry,
        templateContent,
        preparedTemplateContent: resolveTemplateTokens(templateContent, replacements, config),
        preparationAction: 'resolve_tokens'
      };
    }

    return {
      ...entry,
      templateContent,
      preparedTemplateContent: templateContent,
      preparationAction: 'pass_through'
    };
  });
}

export function planTemplateExecution(
  entries: readonly TemplatePreparedEntry[],
  destinationContents: Readonly<Record<string, string>>
): readonly TemplateExecutionPlanEntry[] {
  return entries.map((entry) => {
    const destinationContent =
      entry.destinationPath === undefined ? undefined : destinationContents[entry.destinationPath];
    const executionAction: TemplateExecutionAction = entry.blocked
      ? 'blocked'
      : entry.destinationPath === undefined
        ? 'omit'
        : entry.writeAction === 'keep'
          ? 'keep'
          : entry.strategy === 'raw_copy'
            ? 'raw_copy'
            : entry.strategy === 'accept_template'
              ? 'write_prepared_content'
              : 'merge_prepared_content';
    const ready =
      executionAction !== 'blocked' && executionAction !== 'omit' && executionAction !== 'keep';

    return {
      ...entry,
      executionAction,
      ready,
      destinationContent
    };
  });
}

export function planTemplateTreeExecution(
  templateSourcePaths: readonly string[],
  templateContents: Readonly<Record<string, string>>,
  existingDestinationPaths: readonly string[],
  destinationContents: Readonly<Record<string, string>>,
  context: TemplateDestinationContext = {},
  defaultStrategy: TemplateStrategy = 'merge',
  overrides: readonly TemplateStrategyOverride[] = [],
  replacements: Readonly<Record<string, string>> = {},
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): readonly TemplateExecutionPlanEntry[] {
  const plannedEntries = planTemplateEntries(
    templateSourcePaths,
    context,
    defaultStrategy,
    overrides
  );
  const statefulEntries = enrichTemplatePlanEntries(plannedEntries, existingDestinationPaths);
  const tokenStateEntries = enrichTemplatePlanEntriesWithTokenState(
    statefulEntries,
    templateContents,
    replacements,
    config
  );
  const preparedEntries = prepareTemplateEntries(
    tokenStateEntries,
    templateContents,
    replacements,
    config
  );

  return planTemplateExecution(preparedEntries, destinationContents);
}

export function previewTemplateExecution(
  entries: readonly TemplateExecutionPlanEntry[]
): TemplatePreviewResult {
  const resultFiles: Record<string, string> = {};
  const createdPaths: string[] = [];
  const updatedPaths: string[] = [];
  const keptPaths: string[] = [];
  const blockedPaths: string[] = [];
  const omittedPaths: string[] = [];

  for (const entry of entries) {
    const destinationPath = entry.destinationPath;
    switch (entry.executionAction) {
      case 'blocked':
        if (destinationPath !== undefined) {
          blockedPaths.push(destinationPath);
        }
        break;
      case 'omit':
        omittedPaths.push(entry.logicalDestinationPath);
        break;
      case 'keep':
        if (destinationPath !== undefined && entry.destinationContent !== undefined) {
          resultFiles[destinationPath] = entry.destinationContent;
          keptPaths.push(destinationPath);
        }
        break;
      case 'raw_copy':
      case 'write_prepared_content':
        if (destinationPath !== undefined && entry.preparedTemplateContent !== undefined) {
          resultFiles[destinationPath] = entry.preparedTemplateContent;
          if (entry.destinationExists) {
            updatedPaths.push(destinationPath);
          } else {
            createdPaths.push(destinationPath);
          }
        }
        break;
      case 'merge_prepared_content':
        if (
          destinationPath !== undefined &&
          entry.preparedTemplateContent !== undefined &&
          entry.destinationContent === undefined
        ) {
          resultFiles[destinationPath] = entry.preparedTemplateContent;
          if (entry.destinationExists) {
            updatedPaths.push(destinationPath);
          } else {
            createdPaths.push(destinationPath);
          }
        }
        break;
    }
  }

  return {
    resultFiles,
    createdPaths,
    updatedPaths,
    keptPaths,
    blockedPaths,
    omittedPaths
  };
}

export function applyTemplateExecution(
  entries: readonly TemplateExecutionPlanEntry[],
  mergePreparedContent: (entry: TemplateExecutionPlanEntry) => MergeResult<string>
): TemplateApplyResult {
  const preview = previewTemplateExecution([]);
  const resultFiles: Record<string, string> = {};
  const createdPaths: string[] = [];
  const updatedPaths: string[] = [];
  const keptPaths: string[] = [];
  const blockedPaths: string[] = [];
  const omittedPaths: string[] = [];
  const diagnostics: Diagnostic[] = [];

  for (const entry of entries) {
    const destinationPath = entry.destinationPath;
    switch (entry.executionAction) {
      case 'blocked':
        if (destinationPath !== undefined) {
          blockedPaths.push(destinationPath);
        }
        break;
      case 'omit':
        omittedPaths.push(entry.logicalDestinationPath);
        break;
      case 'keep':
        if (destinationPath !== undefined && entry.destinationContent !== undefined) {
          resultFiles[destinationPath] = entry.destinationContent;
          keptPaths.push(destinationPath);
        }
        break;
      case 'raw_copy':
      case 'write_prepared_content':
        if (destinationPath !== undefined && entry.preparedTemplateContent !== undefined) {
          resultFiles[destinationPath] = entry.preparedTemplateContent;
          (entry.destinationExists ? updatedPaths : createdPaths).push(destinationPath);
        }
        break;
      case 'merge_prepared_content':
        if (destinationPath === undefined || entry.preparedTemplateContent === undefined) {
          break;
        }
        if (entry.destinationContent === undefined) {
          resultFiles[destinationPath] = entry.preparedTemplateContent;
          (entry.destinationExists ? updatedPaths : createdPaths).push(destinationPath);
          break;
        }
        {
          const mergeResult = mergePreparedContent(entry);
          diagnostics.push(...mergeResult.diagnostics);
          if (!mergeResult.ok || mergeResult.output === undefined) {
            blockedPaths.push(destinationPath);
            break;
          }
          resultFiles[destinationPath] = mergeResult.output;
          (entry.destinationExists ? updatedPaths : createdPaths).push(destinationPath);
        }
        break;
    }
  }

  void preview;
  return {
    resultFiles,
    createdPaths,
    updatedPaths,
    keptPaths,
    blockedPaths,
    omittedPaths,
    diagnostics
  };
}

export function evaluateTemplateTreeConvergence(
  templateSourcePaths: readonly string[],
  templateContents: Readonly<Record<string, string>>,
  destinationContents: Readonly<Record<string, string>>,
  context: TemplateDestinationContext = {},
  defaultStrategy: TemplateStrategy = 'merge',
  overrides: readonly TemplateStrategyOverride[] = [],
  replacements: Readonly<Record<string, string>> = {},
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): TemplateConvergenceResult {
  const executionPlan = planTemplateTreeExecution(
    templateSourcePaths,
    templateContents,
    Object.keys(destinationContents).sort(),
    destinationContents,
    context,
    defaultStrategy,
    overrides,
    replacements,
    config
  );
  const pendingPaths = executionPlan
    .filter((entry) => {
      if (entry.blocked) {
        return true;
      }
      if (!entry.ready) {
        return false;
      }

      return (
        entry.destinationContent === undefined ||
        entry.preparedTemplateContent === undefined ||
        entry.destinationContent !== entry.preparedTemplateContent
      );
    })
    .map((entry) => entry.destinationPath ?? entry.logicalDestinationPath);

  return {
    converged: pendingPaths.length === 0,
    pendingPaths
  };
}

export function runTemplateTreeExecution(
  templateSourcePaths: readonly string[],
  templateContents: Readonly<Record<string, string>>,
  destinationContents: Readonly<Record<string, string>>,
  context: TemplateDestinationContext = {},
  defaultStrategy: TemplateStrategy = 'merge',
  overrides: readonly TemplateStrategyOverride[] = [],
  replacements: Readonly<Record<string, string>> = {},
  mergePreparedContent: (entry: TemplateExecutionPlanEntry) => MergeResult<string>,
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): TemplateTreeRunResult {
  const executionPlan = planTemplateTreeExecution(
    templateSourcePaths,
    templateContents,
    Object.keys(destinationContents).sort(),
    destinationContents,
    context,
    defaultStrategy,
    overrides,
    replacements,
    config
  );

  return {
    executionPlan,
    applyResult: applyTemplateExecution(executionPlan, mergePreparedContent)
  };
}

export function conformanceSuiteDefinition(
  manifest: ConformanceManifest,
  suiteSelector: ConformanceSuiteSelector
): ConformanceSuiteDefinition | undefined {
  return manifest.suite_descriptors?.find(
    (candidate): candidate is ConformanceSuiteDefinition =>
      isSuiteDefinition(candidate) && suiteSelectorsEqual(candidate, suiteSelector)
  );
}

export function conformanceSuiteSelectors(
  manifest: ConformanceManifest
): readonly ConformanceSuiteSelector[] {
  return [...(manifest.suite_descriptors ?? [])]
    .filter(isSuiteDefinition)
    .map((definition) => ({ kind: definition.kind, subject: definition.subject }))
    .sort(compareSuiteSelectors);
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

export function groupProjectedChildReviewCases(
  cases: readonly ProjectedChildReviewCase[]
): readonly ProjectedChildReviewGroup[] {
  const groups = new Map<string, ProjectedChildReviewGroup>();
  const order: string[] = [];

  for (const entry of cases) {
    const key = entry.delegatedApplyGroup;
    const existing = groups.get(key);

    if (existing) {
      groups.set(key, {
        ...existing,
        caseIds: [...existing.caseIds, entry.caseId],
        delegatedCaseIds: [...existing.delegatedCaseIds, entry.delegatedCaseId]
      });
      continue;
    }

    order.push(key);
    groups.set(key, {
      delegatedApplyGroup: entry.delegatedApplyGroup,
      parentOperationId: entry.parentOperationId,
      childOperationId: entry.childOperationId,
      delegatedRuntimeSurfacePath: entry.delegatedRuntimeSurfacePath,
      caseIds: [entry.caseId],
      delegatedCaseIds: [entry.delegatedCaseId]
    });
  }

  return order.map((key) => groups.get(key)!);
}

export function summarizeProjectedChildReviewGroupProgress(
  groups: readonly ProjectedChildReviewGroup[],
  resolvedCaseIds: readonly string[]
): readonly ProjectedChildReviewGroupProgress[] {
  const resolved = new Set(resolvedCaseIds);

  return groups.map((group) => {
    const resolvedGroupCaseIds = group.caseIds.filter((caseId) => resolved.has(caseId));
    const pendingCaseIds = group.caseIds.filter((caseId) => !resolved.has(caseId));

    return {
      delegatedApplyGroup: group.delegatedApplyGroup,
      parentOperationId: group.parentOperationId,
      childOperationId: group.childOperationId,
      delegatedRuntimeSurfacePath: group.delegatedRuntimeSurfacePath,
      resolvedCaseIds: resolvedGroupCaseIds,
      pendingCaseIds,
      complete: pendingCaseIds.length === 0
    };
  });
}

export function selectProjectedChildReviewGroupsReadyForApply(
  groups: readonly ProjectedChildReviewGroup[],
  resolvedCaseIds: readonly string[]
): readonly ProjectedChildReviewGroup[] {
  const resolved = new Set(resolvedCaseIds);

  return groups.filter((group) => group.caseIds.every((caseId) => resolved.has(caseId)));
}

export function reviewRequestIdForProjectedChildGroup(group: ProjectedChildReviewGroup): string {
  return `projected_child_group:${group.delegatedApplyGroup}`;
}

export function projectedChildGroupReviewRequest(
  group: ProjectedChildReviewGroup,
  family: string
): ReviewRequest {
  return {
    id: reviewRequestIdForProjectedChildGroup(group),
    kind: 'delegated_child_group',
    family,
    message: `delegated child group ${group.delegatedApplyGroup} is ready to apply for ${family}.`,
    blocking: true,
    delegatedGroup: group,
    actionOffers: [
      {
        action: 'apply_delegated_child_group',
        requiresContext: false
      }
    ],
    defaultAction: 'apply_delegated_child_group'
  };
}

export function selectProjectedChildReviewGroupsAcceptedForApply(
  groups: readonly ProjectedChildReviewGroup[],
  _family: string,
  decisions: readonly ReviewDecision[]
): readonly ProjectedChildReviewGroup[] {
  const acceptedRequestIds = new Set(
    decisions
      .filter((decision) => decision.action === 'apply_delegated_child_group')
      .map((decision) => decision.requestId)
  );

  return groups.filter((group) =>
    acceptedRequestIds.has(reviewRequestIdForProjectedChildGroup(group))
  );
}

export function reviewProjectedChildGroups(
  groups: readonly ProjectedChildReviewGroup[],
  family: string,
  decisions: readonly ReviewDecision[]
): DelegatedChildGroupReviewState {
  const requestIds = new Set(groups.map((group) => reviewRequestIdForProjectedChildGroup(group)));
  const appliedDecisions: ReviewDecision[] = [];
  const diagnostics: Diagnostic[] = [];

  for (const decision of decisions) {
    if (decision.action !== 'apply_delegated_child_group') {
      continue;
    }

    if (requestIds.has(decision.requestId)) {
      appliedDecisions.push(decision);
      continue;
    }

    diagnostics.push({
      severity: 'error',
      category: 'replay_rejected',
      message: `review decision ${decision.requestId} does not match any current delegated child review request.`,
      review: {
        requestId: decision.requestId,
        action: decision.action,
        reason: 'request_not_found'
      }
    });
  }

  const acceptedGroups = selectProjectedChildReviewGroupsAcceptedForApply(
    groups,
    family,
    appliedDecisions
  );
  const acceptedRequestIds = new Set(
    acceptedGroups.map((group) => reviewRequestIdForProjectedChildGroup(group))
  );
  const requests = groups
    .filter((group) => !acceptedRequestIds.has(reviewRequestIdForProjectedChildGroup(group)))
    .map((group) => projectedChildGroupReviewRequest(group, family));

  return {
    requests,
    acceptedGroups,
    appliedDecisions,
    diagnostics
  };
}

export function delegatedChildApplyPlan(
  state: DelegatedChildGroupReviewState,
  family: string
): DelegatedChildApplyPlan {
  const decisionByRequestId = new Map(
    state.appliedDecisions.map((decision) => [decision.requestId, decision] as const)
  );

  return {
    entries: state.acceptedGroups.flatMap((group) => {
      const requestId = reviewRequestIdForProjectedChildGroup(group);
      const decision = decisionByRequestId.get(requestId);

      if (!decision) {
        return [];
      }

      return [
        {
          requestId,
          family,
          delegatedGroup: group,
          decision
        }
      ];
    })
  };
}

export function resolveDelegatedChildOutputs(
  operations: readonly DelegatedChildOperation[],
  nestedOutputs: readonly DelegatedChildSurfaceOutput[],
  options: DelegatedChildOutputResolutionOptions
): DelegatedChildOutputResolution {
  const operationsBySurfaceAddress = new Map(
    operations.map((operation) => [operation.surface.address, operation] as const)
  );

  for (const nestedOutput of nestedOutputs) {
    if (!operationsBySurfaceAddress.has(nestedOutput.surfaceAddress)) {
      return {
        ok: false,
        diagnostics: [
          {
            severity: 'error',
            category: 'configuration_error',
            message: `missing delegated child surface ${nestedOutput.surfaceAddress}.`
          }
        ]
      };
    }
  }

  return {
    ok: true,
    diagnostics: [],
    applyPlan: {
      entries: nestedOutputs.map((nestedOutput, index) => {
        const operation = operationsBySurfaceAddress.get(nestedOutput.surfaceAddress)!;
        const requestId = `${options.requestIdPrefix}:${index}`;
        const family =
          typeof operation.surface.metadata?.family === 'string'
            ? operation.surface.metadata.family
            : options.defaultFamily;
        return {
          requestId,
          family,
          delegatedGroup: {
            delegatedApplyGroup: requestId,
            parentOperationId: operation.parentOperationId,
            childOperationId: operation.operationId,
            delegatedRuntimeSurfacePath: nestedOutput.surfaceAddress,
            caseIds: [],
            delegatedCaseIds: []
          },
          decision: {
            requestId,
            action: 'apply_delegated_child_group'
          }
        };
      })
    },
    appliedChildren: nestedOutputs.map((nestedOutput) => ({
      operationId: operationsBySurfaceAddress.get(nestedOutput.surfaceAddress)!.operationId,
      output: nestedOutput.output
    }))
  };
}

export function executeNestedMerge<TOutput>(
  nestedOutputs: readonly DelegatedChildSurfaceOutput[],
  options: DelegatedChildOutputResolutionOptions,
  callbacks: NestedMergeExecutionCallbacks<TOutput>
): MergeResult<TOutput> {
  const merged = callbacks.mergeParent();
  if (!merged.ok || merged.output === undefined) {
    return merged;
  }

  const discovery = callbacks.discoverOperations(merged.output);
  if (!discovery.ok || discovery.operations === undefined) {
    return {
      ok: false,
      diagnostics: discovery.diagnostics,
      policies: []
    };
  }

  const resolved = resolveDelegatedChildOutputs(discovery.operations, nestedOutputs, options);
  if (!resolved.ok || resolved.applyPlan === undefined || resolved.appliedChildren === undefined) {
    return {
      ok: false,
      diagnostics: resolved.diagnostics,
      policies: []
    };
  }

  return callbacks.applyResolvedOutputs(
    merged.output,
    discovery.operations,
    resolved.applyPlan,
    resolved.appliedChildren
  );
}

export function executeDelegatedChildApplyPlan<TOutput>(
  applyPlan: DelegatedChildApplyPlan,
  appliedChildren: readonly AppliedDelegatedChildOutput[],
  callbacks: NestedMergeExecutionCallbacks<TOutput>
): MergeResult<TOutput> {
  const merged = callbacks.mergeParent();
  if (!merged.ok || merged.output === undefined) {
    return merged;
  }

  const discovery = callbacks.discoverOperations(merged.output);
  if (!discovery.ok || discovery.operations === undefined) {
    return {
      ok: false,
      diagnostics: discovery.diagnostics,
      policies: []
    };
  }

  return callbacks.applyResolvedOutputs(
    merged.output,
    discovery.operations,
    applyPlan,
    appliedChildren
  );
}

export function executeReviewedNestedMerge<TOutput>(
  reviewState: DelegatedChildGroupReviewState,
  family: string,
  appliedChildren: readonly AppliedDelegatedChildOutput[],
  callbacks: NestedMergeExecutionCallbacks<TOutput>
): MergeResult<TOutput> {
  return executeDelegatedChildApplyPlan(
    delegatedChildApplyPlan(reviewState, family),
    appliedChildren,
    callbacks
  );
}

export function reviewedNestedExecution(
  family: string,
  reviewState: DelegatedChildGroupReviewState,
  appliedChildren: readonly AppliedDelegatedChildOutput[]
): ReviewedNestedExecution {
  return {
    family,
    reviewState,
    appliedChildren
  };
}

export function executeReviewedNestedExecution<TOutput>(
  execution: ReviewedNestedExecution,
  callbacks: NestedMergeExecutionCallbacks<TOutput>
): MergeResult<TOutput> {
  return executeReviewedNestedMerge(
    execution.reviewState,
    execution.family,
    execution.appliedChildren,
    callbacks
  );
}

export function executeReviewedNestedExecutions<TOutput>(
  executions: readonly ReviewedNestedExecution[],
  callbacksForExecution: (
    execution: ReviewedNestedExecution,
    index: number
  ) => NestedMergeExecutionCallbacks<TOutput>
): readonly ReviewedNestedExecutionResult<TOutput>[] {
  return executions.map((execution, index) => ({
    execution,
    result: executeReviewedNestedExecution(execution, callbacksForExecution(execution, index))
  }));
}

export function executeReviewReplayBundleReviewedNestedExecutions<TOutput>(
  replayBundle: ReviewReplayBundle,
  callbacksForExecution: (
    execution: ReviewedNestedExecution,
    index: number
  ) => NestedMergeExecutionCallbacks<TOutput>
): readonly ReviewedNestedExecutionResult<TOutput>[] {
  return executeReviewedNestedExecutions(
    replayBundle.reviewedNestedExecutions ?? [],
    callbacksForExecution
  );
}

export function executeReviewReplayBundleEnvelopeReviewedNestedExecutions<TOutput>(
  replayBundleEnvelope: unknown,
  callbacksForExecution: (
    execution: ReviewedNestedExecution,
    index: number
  ) => NestedMergeExecutionCallbacks<TOutput>
): ReviewedNestedExecutionApplication<TOutput> {
  const imported = importReviewReplayBundleEnvelope(replayBundleEnvelope);

  if (!imported.replayBundle) {
    return {
      diagnostics: [
        {
          severity: 'error',
          category: imported.error!.category,
          message: imported.error!.message
        }
      ],
      results: []
    };
  }

  return {
    diagnostics: [],
    results: executeReviewReplayBundleReviewedNestedExecutions(
      imported.replayBundle,
      callbacksForExecution
    )
  };
}

export function executeReviewStateReviewedNestedExecutions<TOutput>(
  state: ConformanceManifestReviewState,
  callbacksForExecution: (
    execution: ReviewedNestedExecution,
    index: number
  ) => NestedMergeExecutionCallbacks<TOutput>
): readonly ReviewedNestedExecutionResult<TOutput>[] {
  return executeReviewedNestedExecutions(
    state.reviewedNestedExecutions ?? [],
    callbacksForExecution
  );
}

export function executeReviewStateEnvelopeReviewedNestedExecutions<TOutput>(
  stateEnvelope: unknown,
  callbacksForExecution: (
    execution: ReviewedNestedExecution,
    index: number
  ) => NestedMergeExecutionCallbacks<TOutput>
): ReviewedNestedExecutionApplication<TOutput> {
  const imported = importConformanceManifestReviewStateEnvelope(stateEnvelope);

  if (!imported.state) {
    return {
      diagnostics: [
        {
          severity: 'error',
          category: imported.error!.category,
          message: imported.error!.message
        }
      ],
      results: []
    };
  }

  return {
    diagnostics: [],
    results: executeReviewStateReviewedNestedExecutions(imported.state, callbacksForExecution)
  };
}

export function conformanceManifestReplayContext(
  manifest: ConformanceManifest,
  options: ConformanceManifestReviewOptions
): ReviewReplayContext {
  const families: string[] = [];
  const seen = new Set<string>();
  for (const suiteSelector of conformanceSuiteSelectors(manifest)) {
    const definition = conformanceSuiteDefinition(manifest, suiteSelector);
    const family = definition?.subject.grammar;
    if (!family || seen.has(family)) {
      continue;
    }

    seen.add(family);
    families.push(family);
  }

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
  reviewedNestedExecutions: readonly ReviewedNestedExecution[];
} {
  if (options.reviewReplayBundle) {
    return {
      replayContext: options.reviewReplayBundle.replayContext,
      decisions: options.reviewReplayBundle.decisions,
      reviewedNestedExecutions: options.reviewReplayBundle.reviewedNestedExecutions ?? []
    };
  }

  return {
    replayContext: options.reviewReplayContext,
    decisions: options.reviewDecisions ?? [],
    reviewedNestedExecutions: []
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

export function reviewedNestedExecutionEnvelope(
  execution: ReviewedNestedExecution
): ReviewedNestedExecutionEnvelope {
  return {
    kind: 'reviewed_nested_execution',
    version: REVIEW_TRANSPORT_VERSION,
    execution
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

export function importReviewedNestedExecutionEnvelope(value: unknown): {
  execution?: ReviewedNestedExecution;
  error?: ReviewTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'reviewed_nested_execution'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected reviewed_nested_execution envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    execution: ReviewedNestedExecution;
  };

  if (envelope.version !== REVIEW_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported reviewed_nested_execution envelope version ${String(envelope.version)}.`
      }
    };
  }

  return { execution: envelope.execution };
}

export function conformanceManifestReviewRequestIds(
  manifest: ConformanceManifest,
  options: ConformanceManifestReviewOptions
): readonly string[] {
  if (!(options.requireExplicitContexts ?? false)) {
    return [];
  }

  const requestIds = new Set<string>();

  for (const suiteSelector of conformanceSuiteSelectors(manifest)) {
    const family = suiteSelector.subject.grammar;

    if (options.contexts?.[family]) {
      continue;
    }

    if (options.familyProfiles?.[family]) {
      requestIds.add(reviewRequestIdForFamilyContext(family));
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
            review: {
              requestId,
              action: 'provide_explicit_context',
              reason: 'missing_required_payload',
              payloadKind: 'conformance_family_context'
            }
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
              review: {
                requestId,
                action: 'provide_explicit_context',
                reason: 'family_mismatch',
                expectedFamily: family,
                providedFamily: decision.context.familyProfile.family
              }
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

  if (requirements.backend) {
    if (!featureProfile) {
      messages.push(
        `case requires backend ${requirements.backend} but no backend feature profile is available for family ${familyProfile.family}.`
      );
    } else if (featureProfile.backend !== requirements.backend) {
      messages.push(
        `case requires backend ${requirements.backend} but backend ${featureProfile.backend} is active for family ${familyProfile.family}.`
      );
    }
  }

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
  suiteSelector: ConformanceSuiteSelector,
  familyProfile: FamilyFeatureProfile,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution,
  featureProfile?: ConformanceFeatureProfileView
): readonly ConformanceCaseResult[] | undefined {
  const plan = planNamedConformanceSuite(manifest, suiteSelector, familyProfile, featureProfile);

  if (!plan) {
    return undefined;
  }

  return runPlannedConformanceSuite(plan, execute);
}

export function runNamedConformanceSuiteEntry(
  manifest: ConformanceManifest,
  suiteSelector: ConformanceSuiteSelector,
  familyProfile: FamilyFeatureProfile,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution,
  featureProfile?: ConformanceFeatureProfileView
): NamedConformanceSuiteResults | undefined {
  const results = runNamedConformanceSuite(
    manifest,
    suiteSelector,
    familyProfile,
    execute,
    featureProfile
  );

  if (!results) {
    return undefined;
  }

  return {
    suite: conformanceSuiteDefinition(manifest, suiteSelector)!,
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
  suiteSelector: ConformanceSuiteSelector,
  familyProfile: FamilyFeatureProfile,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution,
  featureProfile?: ConformanceFeatureProfileView
): ConformanceSuiteReport | undefined {
  const plan = planNamedConformanceSuite(manifest, suiteSelector, familyProfile, featureProfile);

  if (!plan) {
    return undefined;
  }

  return reportPlannedConformanceSuite(plan, execute);
}

export function reportNamedConformanceSuiteEntry(
  manifest: ConformanceManifest,
  suiteSelector: ConformanceSuiteSelector,
  familyProfile: FamilyFeatureProfile,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution,
  featureProfile?: ConformanceFeatureProfileView
): NamedConformanceSuiteReport | undefined {
  const report = reportNamedConformanceSuite(
    manifest,
    suiteSelector,
    familyProfile,
    execute,
    featureProfile
  );

  if (!report) {
    return undefined;
  }

  return {
    suite: conformanceSuiteDefinition(manifest, suiteSelector)!,
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
  suiteSelector: ConformanceSuiteSelector,
  familyProfile: FamilyFeatureProfile,
  featureProfile?: ConformanceFeatureProfileView
): ConformanceSuitePlan | undefined {
  const definition = conformanceSuiteDefinition(manifest, suiteSelector);

  if (!definition) {
    return undefined;
  }

  return planConformanceSuite(
    manifest,
    definition.subject.grammar,
    definition.roles,
    familyProfile,
    featureProfile
  );
}

export function planNamedConformanceSuiteEntry(
  manifest: ConformanceManifest,
  suiteSelector: ConformanceSuiteSelector,
  context: ConformanceFamilyPlanContext
): NamedConformanceSuitePlan | undefined {
  const plan = planNamedConformanceSuite(
    manifest,
    suiteSelector,
    context.familyProfile,
    context.featureProfile
  );

  if (!plan) {
    return undefined;
  }

  return {
    suite: conformanceSuiteDefinition(manifest, suiteSelector)!,
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

  for (const suiteSelector of conformanceSuiteSelectors(manifest)) {
    const definition = conformanceSuiteDefinition(manifest, suiteSelector);

    if (!definition) {
      continue;
    }

    let context = resolvedContexts.get(definition.subject.grammar);

    if (context === undefined && !resolvedContexts.has(definition.subject.grammar)) {
      const resolved = resolveConformanceFamilyContext(definition.subject.grammar, options);
      diagnostics.push(...resolved.diagnostics);
      context = resolved.context;
      resolvedContexts.set(definition.subject.grammar, context);
    }

    if (!context) {
      continue;
    }

    const plan = planNamedConformanceSuiteEntry(manifest, suiteSelector, context);

    if (!plan) {
      continue;
    }

    if (plan.plan.missingRoles.length > 0) {
      diagnostics.push({
        severity: 'error',
        category: 'configuration_error',
        message: `suite ${JSON.stringify(plan.suite)} declares missing roles: ${plan.plan.missingRoles.join(', ')}.`
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
  return conformanceSuiteSelectors(manifest)
    .map((suiteSelector) => {
      const definition = conformanceSuiteDefinition(manifest, suiteSelector);

      if (!definition) {
        return undefined;
      }

      const context = contexts[definition.subject.grammar];

      if (!context) {
        return undefined;
      }

      return planNamedConformanceSuiteEntry(manifest, suiteSelector, context);
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
  let reviewedNestedExecutions = [...replayInputs.reviewedNestedExecutions];

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
      reviewedNestedExecutions = [];
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
      reviewedNestedExecutions = [];
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
            review: {
              requestId: decision.requestId,
              action: decision.action,
              reason: 'request_not_found'
            }
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

  for (const suiteSelector of conformanceSuiteSelectors(manifest)) {
    const definition = conformanceSuiteDefinition(manifest, suiteSelector);

    if (!definition) {
      continue;
    }

    let context = resolvedContexts.get(definition.subject.grammar);

    if (context === undefined && !resolvedContexts.has(definition.subject.grammar)) {
      const reviewed = reviewConformanceFamilyContext(definition.subject.grammar, effectiveOptions);
      diagnostics.push(...reviewed.diagnostics);
      requests.push(...reviewed.requests);
      appliedDecisions.push(...reviewed.appliedDecisions);
      context = reviewed.context;
      resolvedContexts.set(definition.subject.grammar, context);
    }

    if (!context) {
      continue;
    }

    const plan = planNamedConformanceSuiteEntry(manifest, suiteSelector, context);

    if (!plan) {
      continue;
    }

    if (plan.plan.missingRoles.length > 0) {
      diagnostics.push({
        severity: 'error',
        category: 'configuration_error',
        message: `suite ${JSON.stringify(plan.suite)} declares missing roles: ${plan.plan.missingRoles.join(', ')}.`
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
    replayContext,
    ...(reviewedNestedExecutions.length > 0 ? { reviewedNestedExecutions } : {})
  };
}

export function reviewConformanceManifestWithReplayBundleEnvelope(
  manifest: ConformanceManifest,
  options: ConformanceManifestReviewOptions,
  replayBundleEnvelope: unknown,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution
): ConformanceManifestReviewState {
  const imported = importReviewReplayBundleEnvelope(replayBundleEnvelope);

  if (imported.replayBundle) {
    return reviewConformanceManifest(
      manifest,
      {
        ...options,
        reviewReplayBundle: imported.replayBundle
      },
      execute
    );
  }

  const state = reviewConformanceManifest(
    manifest,
    {
      ...options,
      reviewReplayBundle: undefined
    },
    execute
  );

  return {
    ...state,
    diagnostics: [
      ...state.diagnostics,
      {
        severity: 'error',
        category: imported.error!.category,
        message: imported.error!.message
      }
    ]
  };
}

export function reviewAndExecuteConformanceManifestWithReplayBundleEnvelope<TOutput>(
  manifest: ConformanceManifest,
  options: ConformanceManifestReviewOptions,
  replayBundleEnvelope: unknown,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution,
  callbacksForExecution: (
    execution: ReviewedNestedExecution,
    index: number
  ) => NestedMergeExecutionCallbacks<TOutput>
): ConformanceManifestReviewedNestedApplication<TOutput> {
  const state = reviewConformanceManifestWithReplayBundleEnvelope(
    manifest,
    options,
    replayBundleEnvelope,
    execute
  );

  return {
    state,
    results: executeReviewStateReviewedNestedExecutions(state, callbacksForExecution)
  };
}

function suiteSelectorsEqual(
  left: ConformanceSuiteSelector,
  right: ConformanceSuiteSelector
): boolean {
  return (
    left.kind === right.kind &&
    left.subject.grammar === right.subject.grammar &&
    left.subject.variant === right.subject.variant
  );
}

function isSuiteDefinition(value: unknown): value is ConformanceSuiteDefinition {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { kind?: unknown }).kind === 'string' &&
    typeof (value as { subject?: { grammar?: unknown } }).subject?.grammar === 'string' &&
    Array.isArray((value as { roles?: unknown }).roles)
  );
}

function compareSuiteSelectors(
  left: ConformanceSuiteSelector,
  right: ConformanceSuiteSelector
): number {
  const leftKey = `${left.kind}:${left.subject.grammar}:${left.subject.variant ?? ''}`;
  const rightKey = `${right.kind}:${right.subject.grammar}:${right.subject.variant ?? ''}`;
  return leftKey.localeCompare(rightKey);
}
