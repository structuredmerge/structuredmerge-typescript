import type {
  MergeResult,
  TemplateDestinationContext,
  TemplateExecutionPlanEntry,
  TemplateStrategy,
  TemplateStrategyOverride,
  TemplateTokenConfig,
  TemplateTreeRunResult
} from '@structuredmerge/ast-merge';
import {
  DEFAULT_TEMPLATE_TOKEN_CONFIG,
  applyTemplateTreeExecutionToDirectory,
  planTemplateTreeExecutionFromDirectories,
  reportTemplateDirectoryRunner
} from '@structuredmerge/ast-merge';
import { mergeMarkdown } from '../../markdown-merge/src/index';
import { mergeRuby } from '../../ruby-merge/src/index';
import { mergeToml } from '../../toml-merge/src/index';

export const packageName = '@structuredmerge/ast-template';

export type DirectorySessionMode = 'plan' | 'apply' | 'reapply';

export interface TemplateDirectorySessionReport {
  mode: DirectorySessionMode;
  runner_report: Record<string, unknown>;
}

export type FamilyMergeAdapter = (entry: TemplateExecutionPlanEntry) => MergeResult<string>;
export type FamilyMergeAdapterRegistry = Readonly<Record<string, FamilyMergeAdapter>>;

export interface TemplateDirectoryRegistrySessionReport {
  mode: DirectorySessionMode;
  adapter_families: readonly string[];
  diagnostics: readonly Record<string, unknown>[];
  runner_report: Record<string, unknown>;
}

export interface AdapterCapabilityReport {
  required_families: readonly string[];
  adapter_families: readonly string[];
  missing_families: readonly string[];
  ready: boolean;
}

export interface SessionEnvelopeReport {
  session_report: unknown;
  adapter_capabilities: AdapterCapabilityReport;
}

export interface SessionStatusReport {
  mode: DirectorySessionMode;
  ready: boolean;
  missing_families: readonly string[];
  blocked_paths: readonly string[];
  planned_write_count: number;
  written_count: number;
}

export interface SessionDiagnostic {
  severity: 'error' | 'warning' | 'info';
  category: 'configuration_error';
  reason:
    | 'missing_destination_root'
    | 'missing_family_adapter'
    | 'missing_profile'
    | 'missing_template_root'
    | 'unresolved_tokens';
  path?: string;
  family?: string;
  message: string;
}

export interface SessionDiagnosticsReport {
  mode: DirectorySessionMode;
  ready: boolean;
  diagnostics: readonly SessionDiagnostic[];
}

export interface SessionOutcomeReport {
  session_report: unknown;
  status: SessionStatusReport;
  diagnostics: SessionDiagnosticsReport;
}

export interface SessionRequestReport {
  request_kind: 'options' | 'profile';
  profile_name?: string;
  mode: DirectorySessionMode;
  ready: boolean;
  diagnostics: readonly SessionDiagnostic[];
  resolved_options: unknown | null;
}

export interface SessionRunnerRequest {
  request_kind: 'options' | 'profile';
  profile_name?: string;
  options?: unknown;
  overrides?: unknown;
}

export interface SessionRunnerInput {
  request_kind: 'options' | 'profile';
  profile_name?: string;
  mode: DirectorySessionMode;
  template_root: string;
  destination_root: string;
  context?: { project_name?: string };
  default_strategy?: TemplateStrategy;
  overrides?: readonly TemplateStrategyOverride[];
  replacements?: Readonly<Record<string, string>>;
  allowed_families?: readonly string[] | null;
}

export interface SessionRunnerPayload {
  request_kind?: 'options' | 'profile';
  default_profile_name?: string;
  profile_name?: string;
  mode: DirectorySessionMode;
  template_root: string;
  destination_root: string;
  context?: { project_name?: string };
  default_strategy?: TemplateStrategy;
  overrides?: readonly TemplateStrategyOverride[];
  replacements?: Readonly<Record<string, string>>;
  allowed_families?: readonly string[] | null;
}

export interface SessionEntrypoint {
  payload?: SessionRunnerPayload;
  request?: SessionRunnerRequest;
}

export interface SessionEntrypointReport {
  source_kind: '' | 'payload' | 'request';
  runner_request: SessionRunnerRequest;
}

export interface SessionResolutionReport {
  source_kind: '' | 'payload' | 'request';
  runner_request: SessionRunnerRequest;
  session_request: SessionRequestReport;
}

export interface SessionInspectionReport {
  entrypoint_report: SessionEntrypointReport;
  session_resolution: SessionResolutionReport;
  adapter_capabilities: AdapterCapabilityReport;
  status: SessionStatusReport;
  diagnostics: SessionDiagnosticsReport;
}

export interface SessionDispatchReport {
  operation: string;
  inspection: SessionInspectionReport | null;
  outcome: SessionOutcomeReport | null;
}

export interface SessionCommand {
  operation: string;
  payload?: SessionRunnerPayload;
  request?: SessionRunnerRequest;
}

export const SESSION_COMMAND_TRANSPORT_VERSION = 1;

export type SessionCommandTransportImportErrorCategory = 'kind_mismatch' | 'unsupported_version';

export interface SessionCommandTransportImportError {
  readonly category: SessionCommandTransportImportErrorCategory;
  readonly message: string;
}

export interface SessionCommandEnvelope {
  readonly kind: 'template_directory_session_command';
  readonly version: typeof SESSION_COMMAND_TRANSPORT_VERSION;
  readonly command: SessionCommand;
}

export function sessionCommandEnvelope(command: SessionCommand): SessionCommandEnvelope {
  return {
    kind: 'template_directory_session_command',
    version: SESSION_COMMAND_TRANSPORT_VERSION,
    command
  };
}

export function importSessionCommandEnvelope(value: unknown): {
  command?: SessionCommand;
  error?: SessionCommandTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'template_directory_session_command'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected template_directory_session_command envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    command: SessionCommand;
  };

  if (envelope.version !== SESSION_COMMAND_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported template_directory_session_command envelope version ${String(envelope.version)}.`
      }
    };
  }

  return { command: envelope.command };
}

export interface SessionCommandPayload {
  operation: string;
  request_kind?: 'options' | 'profile';
  default_profile_name?: string;
  profile_name?: string;
  mode: DirectorySessionMode;
  template_root: string;
  destination_root: string;
  context?: { project_name?: string };
  default_strategy?: TemplateStrategy;
  overrides?: readonly TemplateStrategyOverride[];
  replacements?: Readonly<Record<string, string>>;
  allowed_families?: readonly string[] | null;
}

export const SESSION_COMMAND_PAYLOAD_TRANSPORT_VERSION = 1;

export type SessionCommandPayloadTransportImportErrorCategory =
  | 'kind_mismatch'
  | 'unsupported_version';

export interface SessionCommandPayloadTransportImportError {
  readonly category: SessionCommandPayloadTransportImportErrorCategory;
  readonly message: string;
}

export interface SessionCommandPayloadEnvelope {
  readonly kind: 'template_directory_session_command_payload';
  readonly version: typeof SESSION_COMMAND_PAYLOAD_TRANSPORT_VERSION;
  readonly payload: SessionCommandPayload;
}

export function sessionCommandPayloadEnvelope(
  payload: SessionCommandPayload
): SessionCommandPayloadEnvelope {
  return {
    kind: 'template_directory_session_command_payload',
    version: SESSION_COMMAND_PAYLOAD_TRANSPORT_VERSION,
    payload
  };
}

export function importSessionCommandPayloadEnvelope(value: unknown): {
  payload?: SessionCommandPayload;
  error?: SessionCommandPayloadTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'template_directory_session_command_payload'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected template_directory_session_command_payload envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    payload: SessionCommandPayload;
  };

  if (envelope.version !== SESSION_COMMAND_PAYLOAD_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported template_directory_session_command_payload envelope version ${String(envelope.version)}.`
      }
    };
  }

  return { payload: envelope.payload };
}

export interface SessionInvocation {
  operation: string;
  payload?: SessionRunnerPayload;
  request?: SessionRunnerRequest;
  request_kind?: 'options' | 'profile';
  default_profile_name?: string;
  profile_name?: string;
  mode?: DirectorySessionMode;
  template_root?: string;
  destination_root?: string;
  context?: { project_name?: string };
  default_strategy?: TemplateStrategy;
  overrides?: readonly TemplateStrategyOverride[];
  replacements?: Readonly<Record<string, string>>;
  allowed_families?: readonly string[] | null;
}

export const SESSION_INVOCATION_TRANSPORT_VERSION = 1;

export type SessionInvocationTransportImportErrorCategory = 'kind_mismatch' | 'unsupported_version';

export interface SessionInvocationTransportImportError {
  readonly category: SessionInvocationTransportImportErrorCategory;
  readonly message: string;
}

export interface SessionInvocationEnvelope {
  readonly kind: 'template_directory_session_invocation';
  readonly version: typeof SESSION_INVOCATION_TRANSPORT_VERSION;
  readonly invocation: SessionInvocation;
}

interface InternalSessionRequest {
  requestKind: 'options' | 'profile';
  profileName?: string;
  mode: DirectorySessionMode;
  ready: boolean;
  diagnostics: readonly SessionDiagnostic[];
  resolvedOptions: DirectorySessionOptions | null;
}

export function sessionInvocationEnvelope(
  invocation: SessionInvocation
): SessionInvocationEnvelope {
  return {
    kind: 'template_directory_session_invocation',
    version: SESSION_INVOCATION_TRANSPORT_VERSION,
    invocation
  };
}

export function importSessionInvocationEnvelope(value: unknown): {
  invocation?: SessionInvocation;
  error?: SessionInvocationTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'template_directory_session_invocation'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected template_directory_session_invocation envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    invocation: SessionInvocation;
  };

  if (envelope.version !== SESSION_INVOCATION_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported template_directory_session_invocation envelope version ${String(envelope.version)}.`
      }
    };
  }

  return { invocation: envelope.invocation };
}

export interface DirectorySessionOptions {
  mode: DirectorySessionMode;
  templateRoot: string;
  destinationRoot: string;
  context: TemplateDestinationContext;
  defaultStrategy: TemplateStrategy;
  overrides: readonly TemplateStrategyOverride[];
  replacements: Readonly<Record<string, string>>;
  allowedFamilies?: readonly string[];
  config?: TemplateTokenConfig;
}

export interface DirectorySessionProfile {
  mode: DirectorySessionMode;
  context: TemplateDestinationContext;
  defaultStrategy: TemplateStrategy;
  overrides: readonly TemplateStrategyOverride[];
  replacements: Readonly<Record<string, string>>;
  allowedFamilies?: readonly string[];
  config?: TemplateTokenConfig;
}

export function reportTemplateDirectorySession(
  mode: DirectorySessionMode,
  entries: readonly TemplateExecutionPlanEntry[],
  result?: TemplateTreeRunResult
): TemplateDirectorySessionReport {
  return {
    mode,
    runner_report: snakeifyKeys(reportTemplateDirectoryRunner(entries, result)) as Record<
      string,
      unknown
    >
  };
}

export function planTemplateDirectorySessionFromDirectories(
  templateRoot: string,
  destinationRoot: string,
  context: TemplateDestinationContext,
  defaultStrategy: TemplateStrategy,
  overrides: readonly TemplateStrategyOverride[],
  replacements: Readonly<Record<string, string>>,
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): TemplateDirectorySessionReport {
  const plan = planTemplateTreeExecutionFromDirectories(
    templateRoot,
    destinationRoot,
    context,
    defaultStrategy,
    overrides,
    replacements,
    config
  );
  return reportTemplateDirectorySession('plan', plan);
}

export function applyTemplateDirectorySessionToDirectory(
  templateRoot: string,
  destinationRoot: string,
  context: TemplateDestinationContext,
  defaultStrategy: TemplateStrategy,
  overrides: readonly TemplateStrategyOverride[],
  replacements: Readonly<Record<string, string>>,
  mergePreparedContent: (entry: TemplateExecutionPlanEntry) => MergeResult<string>,
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): TemplateDirectorySessionReport {
  const result = applyTemplateTreeExecutionToDirectory(
    templateRoot,
    destinationRoot,
    context,
    defaultStrategy,
    overrides,
    replacements,
    mergePreparedContent,
    config
  );
  return reportTemplateDirectorySession('apply', result.executionPlan, result);
}

export function reapplyTemplateDirectorySessionToDirectory(
  templateRoot: string,
  destinationRoot: string,
  context: TemplateDestinationContext,
  defaultStrategy: TemplateStrategy,
  overrides: readonly TemplateStrategyOverride[],
  replacements: Readonly<Record<string, string>>,
  mergePreparedContent: (entry: TemplateExecutionPlanEntry) => MergeResult<string>,
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): TemplateDirectorySessionReport {
  const result = applyTemplateTreeExecutionToDirectory(
    templateRoot,
    destinationRoot,
    context,
    defaultStrategy,
    overrides,
    replacements,
    mergePreparedContent,
    config
  );
  return reportTemplateDirectorySession('reapply', result.executionPlan, result);
}

export function mergePreparedContentFromRegistry(
  registry: FamilyMergeAdapterRegistry,
  entry: TemplateExecutionPlanEntry
): MergeResult<string> {
  const family = entry.classification.family;
  const adapter = registry[family];
  if (!adapter) {
    return {
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          category: 'configuration_error',
          message: `missing family adapter for ${family}`
        }
      ],
      policies: []
    };
  }
  return adapter(entry);
}

export function registeredAdapterFamilies(registry: FamilyMergeAdapterRegistry): readonly string[] {
  return Object.keys(registry).sort();
}

export function reportTemplateDirectoryRegistrySession(
  mode: DirectorySessionMode,
  entries: readonly TemplateExecutionPlanEntry[],
  registry: FamilyMergeAdapterRegistry,
  result?: TemplateTreeRunResult
): TemplateDirectoryRegistrySessionReport {
  return {
    mode,
    adapter_families: registeredAdapterFamilies(registry),
    diagnostics: snakeifyKeys(result?.applyResult.diagnostics ?? []) as readonly Record<
      string,
      unknown
    >[],
    runner_report: snakeifyKeys(reportTemplateDirectoryRunner(entries, result)) as Record<
      string,
      unknown
    >
  };
}

export function applyTemplateDirectorySessionWithRegistryToDirectory(
  templateRoot: string,
  destinationRoot: string,
  context: TemplateDestinationContext,
  defaultStrategy: TemplateStrategy,
  overrides: readonly TemplateStrategyOverride[],
  replacements: Readonly<Record<string, string>>,
  registry: FamilyMergeAdapterRegistry,
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): TemplateDirectoryRegistrySessionReport {
  const result = applyTemplateTreeExecutionToDirectory(
    templateRoot,
    destinationRoot,
    context,
    defaultStrategy,
    overrides,
    replacements,
    (entry) => mergePreparedContentFromRegistry(registry, entry),
    config
  );
  return reportTemplateDirectoryRegistrySession('apply', result.executionPlan, registry, result);
}

export function defaultFamilyMergeAdapterRegistry(
  allowedFamilies?: readonly string[]
): FamilyMergeAdapterRegistry {
  const include = (family: string): boolean =>
    !allowedFamilies || allowedFamilies.length === 0 || allowedFamilies.includes(family);

  const registry: Record<string, FamilyMergeAdapter> = {};
  if (include('markdown')) {
    registry.markdown = (entry) =>
      mergeMarkdown(
        entry.preparedTemplateContent ?? '',
        entry.destinationContent ?? '',
        'markdown'
      );
  }
  if (include('toml')) {
    registry.toml = (entry) =>
      mergeToml(entry.preparedTemplateContent ?? '', entry.destinationContent ?? '', 'toml');
  }
  if (include('ruby')) {
    registry.ruby = (entry) =>
      mergeRuby(entry.preparedTemplateContent ?? '', entry.destinationContent ?? '', 'ruby');
  }
  return registry;
}

export function applyTemplateDirectorySessionWithDefaultRegistryToDirectory(
  templateRoot: string,
  destinationRoot: string,
  context: TemplateDestinationContext,
  defaultStrategy: TemplateStrategy,
  overrides: readonly TemplateStrategyOverride[],
  replacements: Readonly<Record<string, string>>,
  allowedFamilies?: readonly string[],
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): TemplateDirectoryRegistrySessionReport {
  return applyTemplateDirectorySessionWithRegistryToDirectory(
    templateRoot,
    destinationRoot,
    context,
    defaultStrategy,
    overrides,
    replacements,
    defaultFamilyMergeAdapterRegistry(allowedFamilies),
    config
  );
}

export function requiredFamilies(
  entries: readonly TemplateExecutionPlanEntry[]
): readonly string[] {
  return [
    ...new Set(
      entries
        .filter((entry) => entry.executionAction === 'merge_prepared_content')
        .map((entry) => entry.classification.family)
    )
  ].sort();
}

export function reportAdapterCapabilities(
  entries: readonly TemplateExecutionPlanEntry[],
  registry: FamilyMergeAdapterRegistry
): AdapterCapabilityReport {
  const required = requiredFamilies(entries);
  const available = registeredAdapterFamilies(registry);
  const missing = required.filter((family) => !available.includes(family));
  return {
    required_families: required,
    adapter_families: available,
    missing_families: missing,
    ready: missing.length === 0
  };
}

export function reportAdapterCapabilitiesFromDirectories(
  templateRoot: string,
  destinationRoot: string,
  context: TemplateDestinationContext,
  defaultStrategy: TemplateStrategy,
  overrides: readonly TemplateStrategyOverride[],
  replacements: Readonly<Record<string, string>>,
  registry: FamilyMergeAdapterRegistry,
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): AdapterCapabilityReport {
  const plan = planTemplateTreeExecutionFromDirectories(
    templateRoot,
    destinationRoot,
    context,
    defaultStrategy,
    overrides,
    replacements,
    config
  );
  return reportAdapterCapabilities(plan, registry);
}

export function reportDefaultAdapterCapabilitiesFromDirectories(
  templateRoot: string,
  destinationRoot: string,
  context: TemplateDestinationContext,
  defaultStrategy: TemplateStrategy,
  overrides: readonly TemplateStrategyOverride[],
  replacements: Readonly<Record<string, string>>,
  allowedFamilies?: readonly string[],
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): AdapterCapabilityReport {
  return reportAdapterCapabilitiesFromDirectories(
    templateRoot,
    destinationRoot,
    context,
    defaultStrategy,
    overrides,
    replacements,
    defaultFamilyMergeAdapterRegistry(allowedFamilies),
    config
  );
}

export function reportTemplateDirectorySessionEnvelope(
  sessionReport: unknown,
  adapterCapabilities: AdapterCapabilityReport
): SessionEnvelopeReport {
  return {
    session_report: sessionReport,
    adapter_capabilities: adapterCapabilities
  };
}

export function planTemplateDirectorySessionEnvelopeFromDirectories(
  templateRoot: string,
  destinationRoot: string,
  context: TemplateDestinationContext,
  defaultStrategy: TemplateStrategy,
  overrides: readonly TemplateStrategyOverride[],
  replacements: Readonly<Record<string, string>>,
  allowedFamilies?: readonly string[],
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): SessionEnvelopeReport {
  return reportTemplateDirectorySessionEnvelope(
    planTemplateDirectorySessionFromDirectories(
      templateRoot,
      destinationRoot,
      context,
      defaultStrategy,
      overrides,
      replacements,
      config
    ),
    reportDefaultAdapterCapabilitiesFromDirectories(
      templateRoot,
      destinationRoot,
      context,
      defaultStrategy,
      overrides,
      replacements,
      allowedFamilies,
      config
    )
  );
}

export function applyTemplateDirectorySessionEnvelopeWithDefaultRegistryToDirectory(
  templateRoot: string,
  destinationRoot: string,
  context: TemplateDestinationContext,
  defaultStrategy: TemplateStrategy,
  overrides: readonly TemplateStrategyOverride[],
  replacements: Readonly<Record<string, string>>,
  allowedFamilies?: readonly string[],
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): SessionEnvelopeReport {
  return reportTemplateDirectorySessionEnvelope(
    applyTemplateDirectorySessionWithDefaultRegistryToDirectory(
      templateRoot,
      destinationRoot,
      context,
      defaultStrategy,
      overrides,
      replacements,
      allowedFamilies,
      config
    ),
    reportDefaultAdapterCapabilitiesFromDirectories(
      templateRoot,
      destinationRoot,
      context,
      defaultStrategy,
      overrides,
      replacements,
      allowedFamilies,
      config
    )
  );
}

export function reportTemplateDirectorySessionStatus(
  envelope: SessionEnvelopeReport
): SessionStatusReport {
  const sessionReport = envelope.session_report as {
    mode: DirectorySessionMode;
    runner_report: {
      plan_report: {
        entries: Array<{ destination_path: string | null; status: string }>;
        summary: { create: number; update: number };
      };
      apply_report?: {
        entries: Array<{ destination_path: string | null; status: string }>;
        summary: { written: number };
      } | null;
    };
  };
  const blockedPaths = [
    ...new Set(
      [
        ...sessionReport.runner_report.plan_report.entries,
        ...(sessionReport.runner_report.apply_report?.entries ?? [])
      ]
        .filter((entry) => entry.status === 'blocked' && typeof entry.destination_path === 'string')
        .map((entry) => entry.destination_path as string)
    )
  ].sort();
  const missingFamilies = [...envelope.adapter_capabilities.missing_families].sort();
  return {
    mode: sessionReport.mode,
    ready: envelope.adapter_capabilities.ready && blockedPaths.length === 0,
    missing_families: missingFamilies,
    blocked_paths: blockedPaths,
    planned_write_count:
      sessionReport.runner_report.plan_report.summary.create +
      sessionReport.runner_report.plan_report.summary.update,
    written_count: sessionReport.runner_report.apply_report?.summary.written ?? 0
  };
}

export function reportTemplateDirectorySessionDiagnostics(
  mode: DirectorySessionMode,
  entries: readonly TemplateExecutionPlanEntry[],
  capabilities: AdapterCapabilityReport,
  result?: TemplateTreeRunResult
): SessionDiagnosticsReport {
  const missingFamilies = new Set(capabilities.missing_families);
  const blockedApplyPaths = new Set(result?.applyResult.blockedPaths ?? []);
  const diagnostics = entries.flatMap((entry): SessionDiagnostic[] => {
    const path = entry.destinationPath ?? entry.logicalDestinationPath;
    const output: SessionDiagnostic[] = [];
    if (entry.blocked && entry.blockReason === 'unresolved_tokens') {
      output.push({
        severity: 'error',
        category: 'configuration_error',
        reason: 'unresolved_tokens',
        path,
        message: `unresolved template tokens block ${path}`
      });
    }
    if (
      entry.executionAction === 'merge_prepared_content' &&
      missingFamilies.has(entry.classification.family) &&
      (!result || blockedApplyPaths.size === 0 || blockedApplyPaths.has(path))
    ) {
      output.push({
        severity: 'error',
        category: 'configuration_error',
        reason: 'missing_family_adapter',
        path,
        family: entry.classification.family,
        message: `missing family adapter for ${entry.classification.family} blocks ${path}`
      });
    }
    return output;
  });
  diagnostics.sort((a, b) =>
    `${a.path ?? ''}:${a.reason}:${a.family ?? ''}`.localeCompare(
      `${b.path ?? ''}:${b.reason}:${b.family ?? ''}`
    )
  );
  return {
    mode,
    ready: diagnostics.length === 0,
    diagnostics
  };
}

export function planTemplateDirectorySessionDiagnosticsFromDirectories(
  templateRoot: string,
  destinationRoot: string,
  context: TemplateDestinationContext,
  defaultStrategy: TemplateStrategy,
  overrides: readonly TemplateStrategyOverride[],
  replacements: Readonly<Record<string, string>>,
  allowedFamilies?: readonly string[],
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): SessionDiagnosticsReport {
  const entries = planTemplateTreeExecutionFromDirectories(
    templateRoot,
    destinationRoot,
    context,
    defaultStrategy,
    overrides,
    replacements,
    config
  );
  return reportTemplateDirectorySessionDiagnostics(
    'plan',
    entries,
    reportAdapterCapabilities(entries, defaultFamilyMergeAdapterRegistry(allowedFamilies))
  );
}

export function applyTemplateDirectorySessionDiagnosticsWithDefaultRegistryToDirectory(
  templateRoot: string,
  destinationRoot: string,
  context: TemplateDestinationContext,
  defaultStrategy: TemplateStrategy,
  overrides: readonly TemplateStrategyOverride[],
  replacements: Readonly<Record<string, string>>,
  allowedFamilies?: readonly string[],
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): SessionDiagnosticsReport {
  const registry = defaultFamilyMergeAdapterRegistry(allowedFamilies);
  const result = applyTemplateTreeExecutionToDirectory(
    templateRoot,
    destinationRoot,
    context,
    defaultStrategy,
    overrides,
    replacements,
    (entry) => mergePreparedContentFromRegistry(registry, entry),
    config
  );
  return reportTemplateDirectorySessionDiagnostics(
    'apply',
    result.executionPlan,
    reportAdapterCapabilities(result.executionPlan, registry),
    result
  );
}

export function reportTemplateDirectorySessionOutcome(
  sessionReport: unknown,
  status: SessionStatusReport,
  diagnostics: SessionDiagnosticsReport
): SessionOutcomeReport {
  return {
    session_report: sessionReport,
    status,
    diagnostics
  };
}

export function planTemplateDirectorySessionOutcomeFromDirectories(
  templateRoot: string,
  destinationRoot: string,
  context: TemplateDestinationContext,
  defaultStrategy: TemplateStrategy,
  overrides: readonly TemplateStrategyOverride[],
  replacements: Readonly<Record<string, string>>,
  allowedFamilies?: readonly string[],
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): SessionOutcomeReport {
  const sessionReport = planTemplateDirectorySessionFromDirectories(
    templateRoot,
    destinationRoot,
    context,
    defaultStrategy,
    overrides,
    replacements,
    config
  );
  const envelope = planTemplateDirectorySessionEnvelopeFromDirectories(
    templateRoot,
    destinationRoot,
    context,
    defaultStrategy,
    overrides,
    replacements,
    allowedFamilies,
    config
  );
  const diagnostics = planTemplateDirectorySessionDiagnosticsFromDirectories(
    templateRoot,
    destinationRoot,
    context,
    defaultStrategy,
    overrides,
    replacements,
    allowedFamilies,
    config
  );
  return reportTemplateDirectorySessionOutcome(
    sessionReport,
    reportTemplateDirectorySessionStatus(envelope),
    diagnostics
  );
}

export function applyTemplateDirectorySessionOutcomeWithDefaultRegistryToDirectory(
  templateRoot: string,
  destinationRoot: string,
  context: TemplateDestinationContext,
  defaultStrategy: TemplateStrategy,
  overrides: readonly TemplateStrategyOverride[],
  replacements: Readonly<Record<string, string>>,
  allowedFamilies?: readonly string[],
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): SessionOutcomeReport {
  const registry = defaultFamilyMergeAdapterRegistry(allowedFamilies);
  const result = applyTemplateTreeExecutionToDirectory(
    templateRoot,
    destinationRoot,
    context,
    defaultStrategy,
    overrides,
    replacements,
    (entry) => mergePreparedContentFromRegistry(registry, entry),
    config
  );
  const sessionReport = reportTemplateDirectoryRegistrySession(
    'apply',
    result.executionPlan,
    registry,
    result
  );
  const capabilities = reportAdapterCapabilities(result.executionPlan, registry);
  const diagnostics = reportTemplateDirectorySessionDiagnostics(
    'apply',
    result.executionPlan,
    capabilities,
    result
  );
  return reportTemplateDirectorySessionOutcome(
    sessionReport,
    reportTemplateDirectorySessionStatus(
      reportTemplateDirectorySessionEnvelope(sessionReport, capabilities)
    ),
    diagnostics
  );
}

export function reapplyTemplateDirectorySessionOutcomeWithDefaultRegistryToDirectory(
  templateRoot: string,
  destinationRoot: string,
  context: TemplateDestinationContext,
  defaultStrategy: TemplateStrategy,
  overrides: readonly TemplateStrategyOverride[],
  replacements: Readonly<Record<string, string>>,
  allowedFamilies?: readonly string[],
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): SessionOutcomeReport {
  const registry = defaultFamilyMergeAdapterRegistry(allowedFamilies);
  const result = applyTemplateTreeExecutionToDirectory(
    templateRoot,
    destinationRoot,
    context,
    defaultStrategy,
    overrides,
    replacements,
    (entry) => mergePreparedContentFromRegistry(registry, entry),
    config
  );
  const sessionReport = reportTemplateDirectoryRegistrySession(
    'reapply',
    result.executionPlan,
    registry,
    result
  );
  const capabilities = reportAdapterCapabilities(result.executionPlan, registry);
  const diagnostics = reportTemplateDirectorySessionDiagnostics(
    'reapply',
    result.executionPlan,
    capabilities,
    result
  );
  return reportTemplateDirectorySessionOutcome(
    sessionReport,
    reportTemplateDirectorySessionStatus(
      reportTemplateDirectorySessionEnvelope(sessionReport, capabilities)
    ),
    diagnostics
  );
}

export function runTemplateDirectorySessionWithDefaultRegistryToDirectory(
  mode: DirectorySessionMode,
  templateRoot: string,
  destinationRoot: string,
  context: TemplateDestinationContext,
  defaultStrategy: TemplateStrategy,
  overrides: readonly TemplateStrategyOverride[],
  replacements: Readonly<Record<string, string>>,
  allowedFamilies?: readonly string[],
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): SessionOutcomeReport {
  if (mode === 'plan') {
    return planTemplateDirectorySessionOutcomeFromDirectories(
      templateRoot,
      destinationRoot,
      context,
      defaultStrategy,
      overrides,
      replacements,
      allowedFamilies,
      config
    );
  }
  if (mode === 'apply') {
    return applyTemplateDirectorySessionOutcomeWithDefaultRegistryToDirectory(
      templateRoot,
      destinationRoot,
      context,
      defaultStrategy,
      overrides,
      replacements,
      allowedFamilies,
      config
    );
  }
  return reapplyTemplateDirectorySessionOutcomeWithDefaultRegistryToDirectory(
    templateRoot,
    destinationRoot,
    context,
    defaultStrategy,
    overrides,
    replacements,
    allowedFamilies,
    config
  );
}

export function runTemplateDirectorySessionWithOptions(
  options: DirectorySessionOptions
): SessionOutcomeReport {
  const request = resolveTemplateDirectorySessionOptionsRequest(options);
  if (!request.ready) {
    return reportTemplateDirectorySessionConfigurationOutcome(request.mode, {
      mode: request.mode,
      ready: request.ready,
      diagnostics: request.diagnostics
    });
  }
  const resolved = request.resolvedOptions as DirectorySessionOptions;
  return runTemplateDirectorySessionWithDefaultRegistryToDirectory(
    resolved.mode,
    resolved.templateRoot,
    resolved.destinationRoot,
    resolved.context,
    resolved.defaultStrategy,
    resolved.overrides,
    resolved.replacements,
    resolved.allowedFamilies,
    resolved.config
  );
}

function normalizeSessionMode(mode: DirectorySessionMode | undefined): DirectorySessionMode {
  return mode === 'apply' || mode === 'reapply' ? mode : 'plan';
}

export function reportTemplateDirectorySessionOptionsConfiguration(
  options: Pick<DirectorySessionOptions, 'mode' | 'templateRoot' | 'destinationRoot'>
): SessionDiagnosticsReport {
  const diagnostics: SessionDiagnostic[] = [];
  if (!options.destinationRoot) {
    diagnostics.push({
      severity: 'error',
      category: 'configuration_error',
      reason: 'missing_destination_root',
      message: 'missing destination_root for template session'
    });
  }
  if (!options.templateRoot) {
    diagnostics.push({
      severity: 'error',
      category: 'configuration_error',
      reason: 'missing_template_root',
      message: 'missing template_root for template session'
    });
  }
  diagnostics.sort((a, b) => a.reason.localeCompare(b.reason));
  return {
    mode: normalizeSessionMode(options.mode),
    ready: diagnostics.length === 0,
    diagnostics
  };
}

export function reportTemplateDirectorySessionProfileConfiguration(
  profiles: Readonly<Record<string, DirectorySessionProfile>>,
  profileName: string,
  overrides: Pick<DirectorySessionOptions, 'mode' | 'templateRoot' | 'destinationRoot'>
): SessionDiagnosticsReport {
  const diagnostics = [
    ...reportTemplateDirectorySessionOptionsConfiguration(overrides).diagnostics
  ];
  const profile = profiles[profileName];
  const mode = normalizeSessionMode(overrides.mode ?? profile?.mode);
  if (!profile) {
    diagnostics.push({
      severity: 'error',
      category: 'configuration_error',
      reason: 'missing_profile',
      message: `unknown template session profile: ${profileName}`
    });
  }
  diagnostics.sort((a, b) => a.reason.localeCompare(b.reason));
  return {
    mode,
    ready: diagnostics.length === 0,
    diagnostics
  };
}

export function reportTemplateDirectorySessionOptionsRequest(
  options: DirectorySessionOptions
): SessionRequestReport {
  const request = resolveTemplateDirectorySessionOptionsRequest(options);
  return {
    request_kind: request.requestKind,
    mode: request.mode,
    ready: request.ready,
    diagnostics: request.diagnostics,
    resolved_options: normalizeResolvedSessionOptions(request.resolvedOptions)
  };
}

function resolveTemplateDirectorySessionOptionsRequest(
  options: DirectorySessionOptions
): InternalSessionRequest {
  const configuration = reportTemplateDirectorySessionOptionsConfiguration(options);
  return {
    requestKind: 'options',
    mode: configuration.mode,
    ready: configuration.ready,
    diagnostics: configuration.diagnostics,
    resolvedOptions: configuration.ready ? options : null
  };
}

export function reportTemplateDirectorySessionProfileRequest(
  profiles: Readonly<Record<string, DirectorySessionProfile>>,
  profileName: string,
  overrides: DirectorySessionOptions
): SessionRequestReport {
  const request = resolveTemplateDirectorySessionProfileRequest(profiles, profileName, overrides);
  return {
    request_kind: request.requestKind,
    profile_name: request.profileName,
    mode: request.mode,
    ready: request.ready,
    diagnostics: request.diagnostics,
    resolved_options: normalizeResolvedSessionOptions(request.resolvedOptions)
  };
}

function resolveTemplateDirectorySessionProfileRequest(
  profiles: Readonly<Record<string, DirectorySessionProfile>>,
  profileName: string,
  overrides: DirectorySessionOptions
): InternalSessionRequest {
  const configuration = reportTemplateDirectorySessionProfileConfiguration(
    profiles,
    profileName,
    overrides
  );
  const resolved = configuration.ready
    ? (resolveTemplateDirectorySessionOptions(profiles, profileName, overrides) ?? null)
    : null;
  return {
    requestKind: 'profile',
    profileName,
    mode: configuration.mode,
    ready: configuration.ready,
    diagnostics: configuration.diagnostics,
    resolvedOptions: resolved
  };
}

function reportTemplateDirectorySessionConfigurationOutcome(
  mode: DirectorySessionMode,
  diagnostics: SessionDiagnosticsReport
): SessionOutcomeReport {
  return reportTemplateDirectorySessionOutcome(
    reportTemplateDirectorySession(mode, []),
    {
      mode,
      ready: false,
      missing_families: [],
      blocked_paths: [],
      planned_write_count: 0,
      written_count: 0
    },
    diagnostics
  );
}

export function runTemplateDirectorySessionRequest(
  request: SessionRequestReport
): SessionOutcomeReport {
  if (!request.ready) {
    return reportTemplateDirectorySessionConfigurationOutcome(request.mode, {
      mode: request.mode,
      ready: request.ready,
      diagnostics: request.diagnostics
    });
  }
  return runTemplateDirectorySessionWithOptions(
    denormalizeResolvedSessionOptions(request.resolved_options) as DirectorySessionOptions
  );
}

export function runTemplateDirectorySessionRunnerRequest(
  request: SessionRunnerRequest,
  profiles: Readonly<Record<string, DirectorySessionProfile>> = {}
): SessionOutcomeReport {
  if (request.request_kind === 'profile') {
    return runTemplateDirectorySessionRequest(
      reportTemplateDirectorySessionProfileRequest(
        profiles,
        String(request.profile_name ?? ''),
        denormalizeRunnerOptions(request.overrides) as DirectorySessionOptions
      )
    );
  }
  return runTemplateDirectorySessionRequest(
    reportTemplateDirectorySessionOptionsRequest(
      denormalizeRunnerOptions(request.options) as DirectorySessionOptions
    )
  );
}

export function reportTemplateDirectorySessionRunnerInput(
  input: SessionRunnerInput
): SessionRunnerRequest {
  const normalizedOptions = {
    mode: input.mode,
    template_root: input.template_root,
    destination_root: input.destination_root,
    context: input.context ?? {},
    default_strategy: input.default_strategy ?? 'merge',
    overrides: input.overrides ?? [],
    replacements: input.replacements ?? {},
    allowed_families: input.allowed_families ?? null
  };
  if (input.request_kind === 'profile') {
    const overrides: Record<string, unknown> = {
      mode: input.mode,
      template_root: input.template_root,
      destination_root: input.destination_root
    };
    if (input.context && input.context.project_name) overrides.context = input.context;
    if (input.default_strategy !== undefined && input.default_strategy !== 'merge') {
      overrides.default_strategy = input.default_strategy;
    }
    if (input.overrides !== undefined && input.overrides.length > 0) {
      overrides.overrides = input.overrides;
    }
    if (input.replacements !== undefined && Object.keys(input.replacements).length > 0) {
      overrides.replacements = input.replacements;
    }
    if (input.allowed_families !== undefined && input.allowed_families !== null) {
      overrides.allowed_families = input.allowed_families;
    }
    return {
      request_kind: 'profile',
      profile_name: input.profile_name,
      overrides
    };
  }
  return {
    request_kind: 'options',
    options: normalizedOptions
  };
}

export function reportTemplateDirectorySessionRunnerPayload(
  payload: SessionRunnerPayload
): SessionRunnerInput {
  const requestKind =
    payload.request_kind ??
    (payload.profile_name !== undefined || payload.default_profile_name !== undefined
      ? 'profile'
      : 'options');
  return {
    request_kind: requestKind,
    profile_name: payload.profile_name ?? payload.default_profile_name,
    mode: payload.mode,
    template_root: payload.template_root,
    destination_root: payload.destination_root,
    context: payload.context ?? {},
    default_strategy: payload.default_strategy ?? 'merge',
    overrides: payload.overrides ?? [],
    replacements: payload.replacements ?? {},
    allowed_families: payload.allowed_families ?? null
  };
}

export function runTemplateDirectorySessionRunnerPayload(
  payload: SessionRunnerPayload,
  profiles: Readonly<Record<string, DirectorySessionProfile>> = {}
): SessionOutcomeReport {
  return runTemplateDirectorySessionRunnerRequest(
    reportTemplateDirectorySessionRunnerInput(reportTemplateDirectorySessionRunnerPayload(payload)),
    profiles
  );
}

export function runTemplateDirectorySessionEntrypoint(
  entrypoint: SessionEntrypoint,
  profiles: Readonly<Record<string, DirectorySessionProfile>> = {}
): SessionOutcomeReport {
  if (entrypoint.payload) {
    return runTemplateDirectorySessionRunnerPayload(entrypoint.payload, profiles);
  }
  if (entrypoint.request) {
    return runTemplateDirectorySessionRunnerRequest(entrypoint.request, profiles);
  }
  return {
    session_report: {
      mode: 'plan',
      runner_report: {
        plan_report: {
          entries: [],
          summary: { create: 0, update: 0, keep: 0, blocked: 0, omitted: 0 }
        },
        preview: {
          result_files: {},
          created_paths: [],
          updated_paths: [],
          kept_paths: [],
          blocked_paths: [],
          omitted_paths: []
        },
        run_report: null,
        apply_report: null
      }
    },
    status: {
      mode: 'plan',
      ready: false,
      missing_families: [],
      blocked_paths: [],
      planned_write_count: 0,
      written_count: 0
    },
    diagnostics: { mode: 'plan', ready: false, diagnostics: [] }
  };
}

export function reportTemplateDirectorySessionEntrypoint(
  entrypoint: SessionEntrypoint
): SessionEntrypointReport {
  if (entrypoint.payload) {
    return {
      source_kind: 'payload',
      runner_request: reportTemplateDirectorySessionRunnerInput(
        reportTemplateDirectorySessionRunnerPayload(entrypoint.payload)
      )
    };
  }
  if (entrypoint.request) {
    return {
      source_kind: 'request',
      runner_request: entrypoint.request
    };
  }
  return {
    source_kind: '',
    runner_request: { request_kind: 'options' }
  };
}

export function reportTemplateDirectorySessionResolution(
  entrypoint: SessionEntrypoint,
  profiles: Readonly<Record<string, DirectorySessionProfile>> = {}
): SessionResolutionReport {
  const entrypointReport = reportTemplateDirectorySessionEntrypoint(entrypoint);
  return {
    source_kind: entrypointReport.source_kind,
    runner_request: entrypointReport.runner_request,
    session_request: reportSessionRequestFromRunnerRequest(
      entrypointReport.runner_request,
      profiles
    )
  };
}

function reportSessionRequestFromRunnerRequest(
  request: SessionRunnerRequest,
  profiles: Readonly<Record<string, DirectorySessionProfile>>
): SessionRequestReport {
  if (request.request_kind === 'profile') {
    return reportTemplateDirectorySessionProfileRequest(
      profiles,
      String(request.profile_name ?? ''),
      denormalizeRunnerOptions(request.overrides) as DirectorySessionOptions
    );
  }
  return reportTemplateDirectorySessionOptionsRequest(
    denormalizeRunnerOptions(request.options) as DirectorySessionOptions
  );
}

export function reportTemplateDirectorySessionInspection(
  entrypoint: SessionEntrypoint,
  profiles: Readonly<Record<string, DirectorySessionProfile>> = {}
): SessionInspectionReport {
  const entrypointReport = reportTemplateDirectorySessionEntrypoint(entrypoint);
  const sessionResolution = reportTemplateDirectorySessionResolution(entrypoint, profiles);
  if (
    !sessionResolution.session_request.ready ||
    !sessionResolution.session_request.resolved_options
  ) {
    return {
      entrypoint_report: entrypointReport,
      session_resolution: sessionResolution,
      adapter_capabilities: {
        required_families: [],
        adapter_families: [],
        missing_families: [],
        ready: false
      },
      status: {
        mode: sessionResolution.session_request.mode,
        ready: false,
        missing_families: [],
        blocked_paths: [],
        planned_write_count: 0,
        written_count: 0
      },
      diagnostics: {
        mode: sessionResolution.session_request.mode,
        ready: false,
        diagnostics: sessionResolution.session_request.diagnostics
      }
    };
  }

  const resolved = denormalizeResolvedSessionOptions(
    sessionResolution.session_request.resolved_options
  ) as DirectorySessionOptions;
  const adapterCapabilities = reportDefaultAdapterCapabilitiesFromDirectories(
    resolved.templateRoot,
    resolved.destinationRoot,
    resolved.context,
    resolved.defaultStrategy,
    resolved.overrides,
    resolved.replacements,
    resolved.allowedFamilies,
    resolved.config ?? DEFAULT_TEMPLATE_TOKEN_CONFIG
  );
  const sessionReport = planTemplateDirectorySessionFromDirectories(
    resolved.templateRoot,
    resolved.destinationRoot,
    resolved.context,
    resolved.defaultStrategy,
    resolved.overrides,
    resolved.replacements,
    resolved.config ?? DEFAULT_TEMPLATE_TOKEN_CONFIG
  );
  const status = reportTemplateDirectorySessionStatus(
    reportTemplateDirectorySessionEnvelope(sessionReport, adapterCapabilities)
  );
  const diagnostics = planTemplateDirectorySessionDiagnosticsFromDirectories(
    resolved.templateRoot,
    resolved.destinationRoot,
    resolved.context,
    resolved.defaultStrategy,
    resolved.overrides,
    resolved.replacements,
    resolved.allowedFamilies,
    resolved.config ?? DEFAULT_TEMPLATE_TOKEN_CONFIG
  );

  return {
    entrypoint_report: entrypointReport,
    session_resolution: sessionResolution,
    adapter_capabilities: adapterCapabilities,
    status,
    diagnostics
  };
}

export function runTemplateDirectorySessionDispatch(
  operation: string,
  entrypoint: SessionEntrypoint,
  profiles: Readonly<Record<string, DirectorySessionProfile>> = {}
): SessionDispatchReport {
  if (operation === 'inspect') {
    return {
      operation,
      inspection: reportTemplateDirectorySessionInspection(entrypoint, profiles),
      outcome: null
    };
  }
  if (operation !== 'run') {
    throw new Error(`unsupported template directory session operation: ${operation}`);
  }
  return {
    operation,
    inspection: null,
    outcome: runTemplateDirectorySessionEntrypoint(entrypoint, profiles)
  };
}

export function runTemplateDirectorySessionCommand(
  command: SessionCommand,
  profiles: Readonly<Record<string, DirectorySessionProfile>> = {}
): SessionDispatchReport {
  return runTemplateDirectorySessionDispatch(
    command.operation,
    {
      payload: command.payload,
      request: command.request
    },
    profiles
  );
}

export function runTemplateDirectorySessionCommandPayload(
  command: SessionCommandPayload,
  profiles: Readonly<Record<string, DirectorySessionProfile>> = {}
): SessionDispatchReport {
  return runTemplateDirectorySessionCommand(
    {
      operation: command.operation,
      payload: {
        request_kind: command.request_kind,
        default_profile_name: command.default_profile_name,
        profile_name: command.profile_name,
        mode: command.mode,
        template_root: command.template_root,
        destination_root: command.destination_root,
        context: command.context,
        default_strategy: command.default_strategy,
        overrides: command.overrides,
        replacements: command.replacements,
        allowed_families: command.allowed_families
      }
    },
    profiles
  );
}

export function runTemplateDirectorySession(
  invocation: SessionInvocation,
  profiles: Readonly<Record<string, DirectorySessionProfile>> = {}
): SessionDispatchReport {
  if (invocation.payload || invocation.request) {
    return runTemplateDirectorySessionCommand(
      {
        operation: invocation.operation,
        payload: invocation.payload,
        request: invocation.request
      },
      profiles
    );
  }

  return runTemplateDirectorySessionCommandPayload(
    {
      operation: invocation.operation,
      request_kind: invocation.request_kind,
      default_profile_name: invocation.default_profile_name,
      profile_name: invocation.profile_name,
      mode: invocation.mode ?? 'plan',
      template_root: invocation.template_root ?? '',
      destination_root: invocation.destination_root ?? '',
      context: invocation.context,
      default_strategy: invocation.default_strategy,
      overrides: invocation.overrides,
      replacements: invocation.replacements,
      allowed_families: invocation.allowed_families
    },
    profiles
  );
}

export function resolveTemplateDirectorySessionOptions(
  profiles: Readonly<Record<string, DirectorySessionProfile>>,
  profileName: string,
  overrides: DirectorySessionOptions
): DirectorySessionOptions | undefined {
  const profile = profiles[profileName];
  if (!profile) {
    return undefined;
  }
  return {
    mode: overrides.mode ?? profile.mode,
    templateRoot: overrides.templateRoot,
    destinationRoot: overrides.destinationRoot,
    context: overrides.context ?? profile.context,
    defaultStrategy: overrides.defaultStrategy ?? profile.defaultStrategy,
    overrides: overrides.overrides ?? profile.overrides,
    replacements: overrides.replacements ?? profile.replacements,
    allowedFamilies: overrides.allowedFamilies ?? profile.allowedFamilies,
    config: overrides.config ?? profile.config
  };
}

export function runTemplateDirectorySessionWithProfile(
  profiles: Readonly<Record<string, DirectorySessionProfile>>,
  profileName: string,
  overrides: DirectorySessionOptions
): SessionOutcomeReport {
  const request = resolveTemplateDirectorySessionProfileRequest(profiles, profileName, overrides);
  if (!request.ready) {
    return reportTemplateDirectorySessionConfigurationOutcome(request.mode, {
      mode: request.mode,
      ready: request.ready,
      diagnostics: request.diagnostics
    });
  }
  return runTemplateDirectorySessionWithOptions(request.resolvedOptions as DirectorySessionOptions);
}

function snakeifyKeys(value: unknown): unknown {
  if (value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => snakeifyKeys(entry));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`),
        snakeifyKeys(entry)
      ])
    );
  }
  return value;
}

function normalizeResolvedSessionOptions(options: DirectorySessionOptions | null): unknown {
  if (!options) {
    return null;
  }
  return {
    mode: options.mode,
    template_root: options.templateRoot,
    destination_root: options.destinationRoot,
    context: {
      project_name: options.context?.projectName ?? undefined
    },
    default_strategy: options.defaultStrategy,
    overrides: options.overrides ?? [],
    replacements: options.replacements ?? {},
    allowed_families: options.allowedFamilies ?? null
  };
}

function denormalizeResolvedSessionOptions(options: unknown): DirectorySessionOptions | null {
  if (!options || typeof options !== 'object') {
    return null;
  }
  const value = options as Record<string, unknown>;
  const context = (value.context ?? {}) as Record<string, unknown>;
  return {
    mode: value.mode as DirectorySessionMode,
    templateRoot: (value.template_root ?? '') as string,
    destinationRoot: (value.destination_root ?? '') as string,
    context: {
      projectName: typeof context.project_name === 'string' ? context.project_name : undefined
    },
    defaultStrategy: value.default_strategy as TemplateStrategy,
    overrides: (value.overrides ?? []) as TemplateStrategyOverride[],
    replacements: (value.replacements ?? {}) as Record<string, string>,
    allowedFamilies: (value.allowed_families ?? undefined) as string[] | undefined
  };
}

function denormalizeRunnerOptions(options: unknown): DirectorySessionOptions | null {
  if (!options || typeof options !== 'object') {
    return null;
  }
  const value = options as Record<string, unknown>;
  const context = value.context as Record<string, unknown> | undefined;
  return {
    mode: value.mode as DirectorySessionMode,
    templateRoot: (value.template_root ?? '') as string,
    destinationRoot: (value.destination_root ?? '') as string,
    context: context
      ? {
          projectName: typeof context.project_name === 'string' ? context.project_name : undefined
        }
      : undefined,
    defaultStrategy: value.default_strategy as TemplateStrategy | undefined,
    overrides: value.overrides as TemplateStrategyOverride[] | undefined,
    replacements: value.replacements as Record<string, string> | undefined,
    allowedFamilies: (value.allowed_families ?? undefined) as string[] | undefined
  };
}
