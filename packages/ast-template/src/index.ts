import type {
  MergeResult,
  TemplateDestinationContext,
  TemplateDirectoryRunnerReport,
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
  reason: 'missing_family_adapter' | 'unresolved_tokens';
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
