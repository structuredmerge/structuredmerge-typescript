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

export const packageName = '@structuredmerge/ast-template';

export type DirectorySessionMode = 'plan' | 'apply' | 'reapply';

export interface TemplateDirectorySessionReport {
  mode: DirectorySessionMode;
  runner_report: Record<string, unknown>;
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
