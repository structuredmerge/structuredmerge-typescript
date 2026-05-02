import { mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { mergeMarkdown } from '../../markdown-merge/src/index';
import { mergeToml } from '../../toml-merge/src/index';
import { mergeRuby } from '../../ruby-merge/src/index';
import type {
  ConformanceCaseRef,
  ConformanceCaseRun,
  ConformanceCaseExecution,
  ConformanceCaseRequirements,
  ConformanceCaseSelection,
  ConformanceCaseResult,
  ConformanceFamilyPlanContext,
  ConformanceManifest,
  ConformanceManifestPlanningOptions,
  ConformanceManifestReport,
  ConformanceManifestReviewOptions,
  ConformanceManifestReviewedNestedApplication,
  ConformanceManifestReviewState,
  ConformanceManifestReviewStateEnvelope,
  NamedConformanceSuiteReport,
  NamedConformanceSuitePlan,
  NamedConformanceSuiteResults,
  NamedConformanceSuiteReportEnvelope,
  ConformanceOutcome,
  ConformanceSuiteSelector,
  ConformanceSuiteDefinition,
  ConformanceSuitePlan,
  ConformanceSuiteReport,
  ConformanceSuiteSummary,
  DelegatedChildOperation,
  DelegatedChildOutputResolution,
  DelegatedChildSurfaceOutput,
  DiagnosticCategory,
  DiagnosticSeverity,
  DiscoveredSurface,
  FamilyFeatureProfile,
  StructuredEditStructureProfile,
  StructuredEditSelectionProfile,
  StructuredEditMatchProfile,
  StructuredEditOperationProfile,
  StructuredEditDestinationProfile,
  StructuredEditRequest,
  StructuredEditResult,
  StructuredEditApplication,
  StructuredEditApplicationEnvelope,
  StructuredEditBatchReportEnvelope,
  StructuredEditBatchReport,
  StructuredEditBatchRequest,
  StructuredEditProviderBatchExecutionDispatch,
  StructuredEditProviderBatchExecutionDispatchEnvelope,
  StructuredEditProviderBatchExecutionRequest,
  StructuredEditProviderBatchExecutionRequestEnvelope,
  StructuredEditProviderBatchExecutionReport,
  StructuredEditProviderBatchExecutionReportEnvelope,
  StructuredEditProviderExecutionApplication,
  StructuredEditProviderExecutionApplicationEnvelope,
  StructuredEditProviderExecutionDispatch,
  StructuredEditProviderExecutionDispatchEnvelope,
  StructuredEditProviderExecutionOutcome,
  StructuredEditProviderExecutionOutcomeEnvelope,
  StructuredEditProviderBatchExecutionOutcome,
  StructuredEditProviderBatchExecutionOutcomeEnvelope,
  StructuredEditProviderExecutionProvenance,
  StructuredEditProviderExecutionProvenanceEnvelope,
  StructuredEditProviderBatchExecutionProvenance,
  StructuredEditProviderBatchExecutionProvenanceEnvelope,
  StructuredEditProviderExecutionReplayBundle,
  StructuredEditProviderExecutionReplayBundleEnvelope,
  StructuredEditProviderBatchExecutionReplayBundle,
  StructuredEditProviderBatchExecutionReplayBundleEnvelope,
  StructuredEditProviderExecutorProfile,
  StructuredEditProviderExecutorProfileEnvelope,
  StructuredEditProviderExecutorRegistry,
  StructuredEditProviderExecutorRegistryEnvelope,
  StructuredEditProviderExecutorSelectionPolicy,
  StructuredEditProviderExecutorSelectionPolicyEnvelope,
  StructuredEditProviderExecutorResolution,
  StructuredEditProviderExecutorResolutionEnvelope,
  StructuredEditProviderExecutionRequest,
  StructuredEditProviderExecutionRequestEnvelope,
  StructuredEditProviderExecutionPlan,
  StructuredEditProviderExecutionPlanEnvelope,
  StructuredEditProviderExecutionHandoff,
  StructuredEditProviderExecutionHandoffEnvelope,
  StructuredEditProviderBatchExecutionHandoff,
  StructuredEditProviderBatchExecutionHandoffEnvelope,
  StructuredEditProviderBatchExecutionPlan,
  StructuredEditProviderBatchExecutionPlanEnvelope,
  StructuredEditExecutionReport,
  StructuredEditExecutionReportEnvelope,
  PolicyReference,
  PolicySurface,
  Diagnostic,
  ProjectedChildReviewCase,
  ProjectedChildReviewGroup,
  ProjectedChildReviewGroupProgress,
  ReviewDecision,
  ReviewActionOffer,
  ReviewHostHints,
  ReviewedNestedExecution,
  ReviewedNestedExecutionEnvelope,
  ReviewReplayBundleEnvelope,
  ReviewReplayContext,
  ReviewDiagnosticReason,
  ReviewTransportImportError,
  StructuredEditTransportImportError,
  ReviewRequest,
  ReviewedNestedExecutionApplication,
  TemplateTokenConfig,
  TemplateExecutionPlanEntry,
  TemplateDirectoryApplyReport,
  TemplateDirectoryPlanReport,
  TemplateDirectoryRunnerReport,
  SurfaceOwnerRef,
  SurfaceSpan,
  TemplateTreeRunReport,
  TemplateTreeRunResult
} from '../src/index';
import {
  REVIEW_TRANSPORT_VERSION,
  STRUCTURED_EDIT_TRANSPORT_VERSION,
  applyTemplateExecution,
  conformanceManifestReplayContext,
  conformanceManifestReviewStateEnvelope,
  conformanceManifestReviewRequestIds,
  conformanceReviewHostHints,
  delegatedChildApplyPlan,
  executeReviewReplayBundleReviewedNestedExecutions,
  executeReviewReplayBundleEnvelopeReviewedNestedExecutions,
  executeReviewStateReviewedNestedExecutions,
  executeReviewStateEnvelopeReviewedNestedExecutions,
  resolveDelegatedChildOutputs,
  groupProjectedChildReviewCases,
  projectedChildGroupReviewRequest,
  reviewProjectedChildGroups,
  reviewRequestIdForProjectedChildGroup,
  selectProjectedChildReviewGroupsAcceptedForApply,
  selectProjectedChildReviewGroupsReadyForApply,
  structuredEditApplicationEnvelope,
  structuredEditBatchReportEnvelope,
  structuredEditProviderBatchExecutionDispatchEnvelope,
  structuredEditProviderBatchExecutionRequestEnvelope,
  structuredEditProviderBatchExecutionReportEnvelope,
  structuredEditProviderExecutionApplicationEnvelope,
  structuredEditProviderExecutionDispatchEnvelope,
  structuredEditProviderExecutionOutcomeEnvelope,
  structuredEditProviderBatchExecutionOutcomeEnvelope,
  structuredEditProviderExecutionProvenanceEnvelope,
  structuredEditProviderBatchExecutionProvenanceEnvelope,
  structuredEditProviderExecutionReplayBundleEnvelope,
  structuredEditProviderBatchExecutionReplayBundleEnvelope,
  structuredEditProviderExecutorProfileEnvelope,
  structuredEditProviderExecutorRegistryEnvelope,
  structuredEditProviderExecutorSelectionPolicyEnvelope,
  structuredEditProviderExecutorResolutionEnvelope,
  structuredEditProviderExecutionRequestEnvelope,
  structuredEditProviderExecutionPlanEnvelope,
  structuredEditProviderExecutionHandoffEnvelope,
  structuredEditProviderBatchExecutionHandoffEnvelope,
  structuredEditProviderBatchExecutionPlanEnvelope,
  structuredEditExecutionReportEnvelope,
  summarizeProjectedChildReviewGroupProgress,
  conformanceFamilyFeatureProfilePath,
  conformanceFixturePath,
  normalizeTemplateSourcePath,
  classifyTemplateTargetPath,
  resolveTemplateDestinationPath,
  templateTokenKeys,
  prepareTemplateEntries,
  planTemplateExecution,
  planTemplateTreeExecution,
  previewTemplateExecution,
  reportTemplateTreeRun,
  reportTemplateDirectoryApply,
  reportTemplateDirectoryPlan,
  reportTemplateDirectoryRunner,
  runTemplateTreeExecution,
  runTemplateTreeExecutionFromDirectories,
  planTemplateTreeExecutionFromDirectories,
  selectTemplateStrategy,
  planTemplateEntries,
  enrichTemplatePlanEntries,
  enrichTemplatePlanEntriesWithTokenState,
  evaluateTemplateTreeConvergence,
  applyTemplateTreeExecutionToDirectory,
  writeRelativeFileTree as writeRelativeFileTreeFromLibrary,
  readRelativeFileTree as readRelativeFileTreeFromLibrary,
  conformanceSuiteDefinition,
  conformanceSuiteSelectors,
  defaultConformanceFamilyContext,
  planConformanceSuite,
  planNamedConformanceSuiteEntry,
  planNamedConformanceSuitesWithDiagnostics,
  planNamedConformanceSuites,
  planNamedConformanceSuite,
  reportConformanceManifest,
  reportNamedConformanceSuiteEnvelope,
  reportNamedConformanceSuiteManifest,
  reportNamedConformanceSuiteEntry,
  reportNamedConformanceSuite,
  reportPlannedNamedConformanceSuites,
  reportPlannedConformanceSuite,
  reportConformanceSuite,
  reviewConformanceFamilyContext,
  reviewConformanceManifest,
  reviewAndExecuteConformanceManifestWithReplayBundleEnvelope,
  reviewConformanceManifestWithReplayBundleEnvelope,
  importConformanceManifestReviewStateEnvelope,
  importReviewedNestedExecutionEnvelope,
  importReviewReplayBundleEnvelope,
  importStructuredEditApplicationEnvelope,
  importStructuredEditBatchReportEnvelope,
  importStructuredEditProviderBatchExecutionDispatchEnvelope,
  importStructuredEditProviderBatchExecutionRequestEnvelope,
  importStructuredEditProviderBatchExecutionReportEnvelope,
  importStructuredEditProviderExecutionApplicationEnvelope,
  importStructuredEditProviderExecutionDispatchEnvelope,
  importStructuredEditProviderExecutionOutcomeEnvelope,
  importStructuredEditProviderBatchExecutionOutcomeEnvelope,
  importStructuredEditProviderExecutionProvenanceEnvelope,
  importStructuredEditProviderBatchExecutionProvenanceEnvelope,
  importStructuredEditProviderExecutionReplayBundleEnvelope,
  importStructuredEditProviderBatchExecutionReplayBundleEnvelope,
  importStructuredEditProviderExecutorProfileEnvelope,
  importStructuredEditProviderExecutorRegistryEnvelope,
  importStructuredEditProviderExecutorSelectionPolicyEnvelope,
  importStructuredEditProviderExecutorResolutionEnvelope,
  importStructuredEditProviderExecutionRequestEnvelope,
  importStructuredEditProviderExecutionPlanEnvelope,
  importStructuredEditProviderExecutionHandoffEnvelope,
  importStructuredEditProviderBatchExecutionHandoffEnvelope,
  importStructuredEditProviderBatchExecutionPlanEnvelope,
  importStructuredEditExecutionReportEnvelope,
  reviewReplayBundleInputs,
  reviewReplayBundleEnvelope,
  reviewedNestedExecution,
  reviewedNestedExecutionEnvelope,
  reviewReplayContextCompatible,
  reviewRequestIdForFamilyContext,
  runConformanceCase,
  runNamedConformanceSuiteEntry,
  runNamedConformanceSuite,
  runPlannedNamedConformanceSuites,
  runPlannedConformanceSuite,
  runConformanceSuite,
  resolveConformanceFamilyContext,
  selectConformanceCase,
  summarizeNamedConformanceSuiteReports,
  summarizeConformanceResults
} from '../src/index';

// parity anchors:
// diagnosticsFixturePath('mini_template_tree_plan')
// diagnosticsFixturePath('mini_template_tree_preview')
// diagnosticsFixturePath('mini_template_tree_apply')
// diagnosticsFixturePath('mini_template_tree_convergence')
// diagnosticsFixturePath('mini_template_tree_run')
// diagnosticsFixturePath('mini_template_tree_run_report')
// diagnosticsFixturePath('mini_template_tree_family_merge_callback')
// diagnosticsFixturePath('mini_template_tree_multi_family_merge_callback')
// diagnosticsFixturePath('mini_template_tree_multi_family_run_report')
// diagnosticsFixturePath('mini_template_tree_directory_run_report')
// diagnosticsFixturePath('mini_template_tree_directory_apply_convergence')
// diagnosticsFixturePath('mini_template_tree_directory_apply_report')
// diagnosticsFixturePath('mini_template_tree_directory_plan_report')
// diagnosticsFixturePath('mini_template_tree_directory_runner_report')
// diagnosticsFixturePath('review_replay_bundle_envelope_reviewed_nested_execution_application')
// diagnosticsFixturePath('review_replay_bundle_envelope_reviewed_nested_manifest_application')

interface DiagnosticFixture {
  severities: DiagnosticSeverity[];
  categories: DiagnosticCategory[];
}

interface PolicyFixture {
  surfaces: PolicySurface[];
  policies: PolicyReference[];
}

interface PolicyReportingFixture {
  merge_policies: PolicyReference[];
}

interface FamilyFeatureProfileFixture {
  feature_profile: {
    family: string;
    supported_dialects: string[];
    supported_policies: PolicyReference[];
  };
}

interface TemplateSourcePathMappingFixture {
  cases: Array<{
    template_source_path: string;
    expected_destination_path: string;
  }>;
}

interface TemplateTargetClassificationFixture {
  cases: Array<{
    destination_path: string;
    expected: {
      destination_path: string;
      file_type: string;
      family: string;
      dialect: string;
    };
  }>;
}

interface TemplateDestinationMappingFixture {
  cases: Array<{
    logical_destination_path: string;
    context: {
      project_name?: string;
    };
    expected_destination_path: string | null;
  }>;
}

interface TemplateStrategySelectionFixture {
  cases: Array<{
    destination_path: string;
    default_strategy: 'merge' | 'accept_template' | 'keep_destination' | 'raw_copy';
    overrides: Array<{
      path: string;
      strategy: 'merge' | 'accept_template' | 'keep_destination' | 'raw_copy';
    }>;
    expected_strategy: 'merge' | 'accept_template' | 'keep_destination' | 'raw_copy';
  }>;
}

interface TemplateTokenKeysFixture {
  cases: Array<{
    content: string;
    config?: {
      pre: string;
      post: string;
      separators: string[];
      min_segments: number;
      max_segments?: number;
      segment_pattern: string;
    };
    expected_token_keys: string[];
  }>;
}

interface TemplateEntryPlanFixture {
  template_source_paths: string[];
  context: {
    project_name?: string;
  };
  default_strategy: 'merge' | 'accept_template' | 'keep_destination' | 'raw_copy';
  overrides: Array<{
    path: string;
    strategy: 'merge' | 'accept_template' | 'keep_destination' | 'raw_copy';
  }>;
  expected_entries: Array<{
    template_source_path: string;
    logical_destination_path: string;
    destination_path: string | null;
    classification: {
      destination_path: string;
      file_type: string;
      family: string;
      dialect: string;
    };
    strategy: 'merge' | 'accept_template' | 'keep_destination' | 'raw_copy';
    action: 'omit' | 'merge' | 'accept_template' | 'keep_destination' | 'raw_copy';
  }>;
}

interface TemplateEntryPlanStateFixture {
  planned_entries: TemplateEntryPlanFixture['expected_entries'];
  existing_destination_paths: string[];
  expected_entries: Array<
    TemplateEntryPlanFixture['expected_entries'][number] & {
      destination_exists: boolean;
      write_action: 'omit' | 'keep' | 'create' | 'update';
    }
  >;
}

interface TemplateEntryTokenStateFixture {
  planned_entries: Array<
    TemplateEntryPlanFixture['expected_entries'][number] & {
      destination_exists: boolean;
      write_action: 'omit' | 'keep' | 'create' | 'update';
    }
  >;
  template_contents: Record<string, string>;
  replacements: Record<string, string>;
  expected_entries: Array<
    TemplateEntryPlanFixture['expected_entries'][number] & {
      destination_exists: boolean;
      write_action: 'omit' | 'keep' | 'create' | 'update';
      token_keys: string[];
      unresolved_token_keys: string[];
      token_resolution_required: boolean;
      blocked: boolean;
      block_reason: 'unresolved_tokens' | null;
    }
  >;
}

interface TemplateEntryPreparedContentFixture {
  planned_entries: TemplateEntryTokenStateFixture['expected_entries'];
  template_contents: Record<string, string>;
  replacements: Record<string, string>;
  expected_entries: Array<
    TemplateEntryTokenStateFixture['expected_entries'][number] & {
      template_content: string;
      prepared_template_content: string | null;
      preparation_action: 'blocked' | 'resolve_tokens' | 'pass_through';
    }
  >;
}

interface TemplateExecutionPlanFixture {
  prepared_entries: TemplateEntryPreparedContentFixture['expected_entries'];
  destination_contents: Record<string, string>;
  expected_entries: Array<
    TemplateEntryPreparedContentFixture['expected_entries'][number] & {
      execution_action:
        | 'blocked'
        | 'omit'
        | 'keep'
        | 'raw_copy'
        | 'write_prepared_content'
        | 'merge_prepared_content';
      ready: boolean;
      destination_content: string | null;
    }
  >;
}

interface MiniTemplateTreePlanFixture {
  context: {
    project_name?: string;
  };
  default_strategy: 'merge' | 'accept_template' | 'keep_destination' | 'raw_copy';
  overrides: Array<{
    path: string;
    strategy: 'merge' | 'accept_template' | 'keep_destination' | 'raw_copy';
  }>;
  replacements: Record<string, string>;
  expected_entries: TemplateExecutionPlanFixture['expected_entries'];
}

interface MiniTemplateTreePreviewFixture {
  expected_preview: {
    result_files: Record<string, string>;
    created_paths: string[];
    updated_paths: string[];
    kept_paths: string[];
    blocked_paths: string[];
    omitted_paths: string[];
  };
}

interface MiniTemplateTreeApplyFixture {
  merge_results: Record<
    string,
    {
      ok: boolean;
      diagnostics: Array<{
        severity: DiagnosticSeverity;
        category: DiagnosticCategory;
        message: string;
        path?: string;
      }>;
      output: string | null;
      policies: PolicyReference[];
    }
  >;
  expected_result: {
    result_files: Record<string, string>;
    created_paths: string[];
    updated_paths: string[];
    kept_paths: string[];
    blocked_paths: string[];
    omitted_paths: string[];
    diagnostics: Array<{
      severity: DiagnosticSeverity;
      category: DiagnosticCategory;
      message: string;
      path?: string;
    }>;
  };
}

interface MiniTemplateTreeConvergenceFixture {
  replacements: Record<string, string>;
  expected: {
    converged: boolean;
    pending_paths: string[];
  };
}

interface MiniTemplateTreeRunFixture {
  merge_results: MiniTemplateTreeApplyFixture['merge_results'];
  expected: {
    execution_plan: MiniTemplateTreePlanFixture['expected_entries'];
    apply_result: MiniTemplateTreeApplyFixture['expected_result'];
  };
}

interface MiniTemplateTreeRunReportFixture {
  expected: {
    entries: Array<{
      template_source_path: string;
      logical_destination_path: string;
      destination_path: string | null;
      execution_action: TemplateExecutionPlanFixture['expected_entries'][number]['execution_action'];
      status: 'created' | 'updated' | 'kept' | 'blocked' | 'omitted';
    }>;
    summary: {
      created: number;
      updated: number;
      kept: number;
      blocked: number;
      omitted: number;
    };
  };
}

interface MiniTemplateTreeFamilyMergeCallbackFixture {
  context: {
    project_name?: string;
  };
  default_strategy: 'merge' | 'accept_template' | 'keep_destination' | 'raw_copy';
  overrides: Array<{
    path: string;
    strategy: 'merge' | 'accept_template' | 'keep_destination' | 'raw_copy';
  }>;
  replacements: Record<string, string>;
  expected: {
    execution_plan: MiniTemplateTreePlanFixture['expected_entries'];
    apply_result: MiniTemplateTreeApplyFixture['expected_result'];
  };
}

interface MiniTemplateTreeMultiFamilyMergeCallbackFixture extends MiniTemplateTreeFamilyMergeCallbackFixture {}

interface MiniTemplateTreeMultiFamilyRunReportFixture extends MiniTemplateTreeRunReportFixture {}

interface MiniTemplateTreeDirectoryApplyConvergenceFixture {
  context: Record<string, string>;
  default_strategy: 'merge' | 'accept_template' | 'keep_destination' | 'raw_copy';
  overrides: Array<{
    path: string;
    strategy: 'merge' | 'accept_template' | 'keep_destination' | 'raw_copy';
  }>;
  replacements: Record<string, string>;
  expected_destination_files: Record<string, string>;
  expected_first_report: MiniTemplateTreeRunReportFixture['expected'];
  expected_second_report: MiniTemplateTreeRunReportFixture['expected'];
}

interface MiniTemplateTreeDirectoryApplyReportFixture {
  context: Record<string, string>;
  default_strategy: 'merge' | 'accept_template' | 'keep_destination' | 'raw_copy';
  overrides: Array<{
    path: string;
    strategy: 'merge' | 'accept_template' | 'keep_destination' | 'raw_copy';
  }>;
  replacements: Record<string, string>;
  expected_first_report: {
    entries: Array<{
      template_source_path: string;
      logical_destination_path: string;
      destination_path: string | null;
      execution_action: string;
      status: string;
      written: boolean;
    }>;
    summary: TemplateDirectoryApplyReport['summary'];
  };
  expected_second_report: {
    entries: Array<{
      template_source_path: string;
      logical_destination_path: string;
      destination_path: string | null;
      execution_action: string;
      status: string;
      written: boolean;
    }>;
    summary: TemplateDirectoryApplyReport['summary'];
  };
}

interface MiniTemplateTreeDirectoryPlanReportFixture {
  context: Record<string, string>;
  default_strategy: 'merge' | 'accept_template' | 'keep_destination' | 'raw_copy';
  overrides: Array<{
    path: string;
    strategy: 'merge' | 'accept_template' | 'keep_destination' | 'raw_copy';
  }>;
  replacements: Record<string, string>;
  expected: {
    entries: Array<{
      template_source_path: string;
      logical_destination_path: string;
      destination_path: string | null;
      execution_action: string;
      write_action: string;
      status: string;
      previewable: boolean;
    }>;
    summary: TemplateDirectoryPlanReport['summary'];
  };
}

interface MiniTemplateTreeDirectoryRunnerReportFixture {
  dry_run: {
    context: Record<string, string>;
    default_strategy: 'merge' | 'accept_template' | 'keep_destination' | 'raw_copy';
    overrides: Array<{
      path: string;
      strategy: 'merge' | 'accept_template' | 'keep_destination' | 'raw_copy';
    }>;
    replacements: Record<string, string>;
    expected: {
      plan_report: MiniTemplateTreeDirectoryPlanReportFixture['expected'];
      preview: {
        result_files: Record<string, string>;
        created_paths: string[];
        updated_paths: string[];
        kept_paths: string[];
        blocked_paths: string[];
        omitted_paths: string[];
      };
      run_report: null;
      apply_report: null;
    };
  };
  apply_run: {
    context: Record<string, string>;
    default_strategy: 'merge' | 'accept_template' | 'keep_destination' | 'raw_copy';
    overrides: Array<{
      path: string;
      strategy: 'merge' | 'accept_template' | 'keep_destination' | 'raw_copy';
    }>;
    replacements: Record<string, string>;
    expected: {
      plan_report: MiniTemplateTreeDirectoryPlanReportFixture['expected'];
      preview: {
        result_files: Record<string, string>;
        created_paths: string[];
        updated_paths: string[];
        kept_paths: string[];
        blocked_paths: string[];
        omitted_paths: string[];
      };
      run_report: MiniTemplateTreeRunReportFixture['expected'];
      apply_report: MiniTemplateTreeDirectoryApplyReportFixture['expected_first_report'];
    };
  };
}

function readRelativeFileTree(rootPath: string): Record<string, string> {
  const files: Record<string, string> = {};
  const walk = (currentPath: string, prefix = ''): void => {
    for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolutePath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath, relativePath);
      } else {
        files[relativePath] = readFileSync(absolutePath, 'utf8');
      }
    }
  };

  walk(rootPath);
  return files;
}

function repoTempDir(): string {
  const root = path.join(__dirname, '..', '..', '..', 'tmp');
  mkdirSync(root, { recursive: true });
  const dir = path.join(root, `ast-merge-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function multiFamilyMergeCallback(entry: TemplateExecutionPlanEntry) {
  switch (entry.classification.family) {
    case 'markdown':
      return mergeMarkdown(entry.preparedTemplateContent!, entry.destinationContent!, 'markdown');
    case 'toml':
      return mergeToml(entry.preparedTemplateContent!, entry.destinationContent!, 'toml');
    case 'ruby':
      return mergeRuby(entry.preparedTemplateContent!, entry.destinationContent!, 'ruby');
    default:
      return {
        ok: false,
        diagnostics: [
          {
            severity: 'error',
            category: 'configuration_error',
            message: `missing family merge adapter for ${entry.classification.family}`
          }
        ],
        output: undefined,
        policies: []
      };
  }
}

interface DelegatedChildApplyPlanFixture {
  family: string;
  review_state: {
    requests: ProjectedChildGroupReviewRequestFixture['expected_request'][];
    accepted_groups: ProjectedChildReviewGroupsFixture['expected_groups'];
    applied_decisions: ReviewDecisionFixture[];
    diagnostics: DiagnosticFixtureEntry[];
  };
  expected_plan: {
    entries: Array<{
      request_id: string;
      family: string;
      delegated_group: ProjectedChildReviewGroupsFixture['expected_groups'][number];
      decision: ReviewDecisionFixture;
    }>;
  };
}

interface DelegatedChildNestedOutputResolutionFixture {
  default_family: string;
  request_id_prefix: string;
  operations: DelegatedChildOperationFixture['operation'][];
  nested_outputs: Array<{
    surface_address: string;
    output: string;
  }>;
  expected: {
    ok: boolean;
    diagnostics: DiagnosticFixtureEntry[];
    apply_plan?: DelegatedChildApplyPlanFixture['expected_plan'];
    applied_children?: Array<{
      operation_id: string;
      output: string;
    }>;
  };
}

interface ReviewDecisionFixture {
  request_id: string;
  action: ReviewDecision['action'];
  context?: {
    family_profile: NamedSuiteReportFixture['family_profile'];
    feature_profile?: {
      backend: string;
      supports_dialects: boolean;
      supported_policies: PolicyReference[];
    };
  };
}

interface DiagnosticFixtureEntry {
  severity: DiagnosticSeverity;
  category: DiagnosticCategory;
  message: string;
  path?: string;
  review?: {
    request_id?: string;
    action?: ReviewDecision['action'];
    reason?: ReviewDiagnosticReason;
    payload_kind?: 'conformance_family_context';
    expected_family?: string;
    provided_family?: string;
  };
}

interface ConformanceRunnerFixture {
  case_ref: ConformanceCaseRef;
  result: {
    ref: ConformanceCaseRef;
    outcome: ConformanceOutcome;
    messages: string[];
  };
}

interface ConformanceSummaryFixture {
  results: ConformanceCaseResult[];
  summary: ConformanceSuiteSummary;
}

interface SurfaceOwnershipFixture {
  surface: {
    surface_kind: string;
    declared_language?: string;
    effective_language: string;
    address: string;
    parent_address?: string;
    span?: {
      start_line: number;
      end_line: number;
    };
    owner: {
      kind: 'structural_owner' | 'owned_region' | 'parent_surface';
      address: string;
    };
    reconstruction_strategy: string;
    metadata?: Record<string, unknown>;
  };
}

interface DelegatedChildOperationFixture {
  operation: {
    operation_id: string;
    parent_operation_id: string;
    requested_strategy: 'delegate_child_surface';
    language_chain: string[];
    surface: SurfaceOwnershipFixture['surface'];
  };
}

interface StructuredEditStructureProfileFixture {
  cases: Array<{
    label: string;
    profile: {
      owner_scope: string;
      owner_selector: string;
      owner_selector_family?: string;
      known_owner_selector: boolean;
      supported_comment_regions: string[];
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditSelectionProfileFixture {
  cases: Array<{
    label: string;
    profile: {
      owner_scope: string;
      owner_selector: string;
      owner_selector_family?: string;
      selector_kind: string;
      selection_intent: string;
      selection_intent_family?: string;
      known_selection_intent: boolean;
      comment_region?: string | null;
      include_trailing_gap: boolean;
      comment_anchored: boolean;
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditMatchProfileFixture {
  cases: Array<{
    label: string;
    profile: {
      start_boundary: string;
      start_boundary_family?: string;
      known_start_boundary: boolean;
      end_boundary: string;
      end_boundary_family?: string;
      known_end_boundary: boolean;
      payload_kind: string;
      payload_family?: string;
      known_payload_kind: boolean;
      comment_anchored: boolean;
      trailing_gap_extended: boolean;
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditOperationProfileFixture {
  cases: Array<{
    label: string;
    profile: {
      operation_kind: string;
      operation_family?: string;
      known_operation_kind: boolean;
      source_requirement: string;
      destination_requirement: string;
      replacement_source: string;
      captures_source_text: boolean;
      supports_if_missing: boolean;
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditDestinationProfileFixture {
  cases: Array<{
    label: string;
    profile: {
      resolution_kind: string;
      resolution_source: string;
      anchor_boundary: string;
      resolution_family: string;
      resolution_source_family: string;
      anchor_boundary_family: string;
      known_resolution_kind: boolean;
      known_resolution_source: boolean;
      known_anchor_boundary: boolean;
      used_if_missing: boolean;
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditRequestFixture {
  cases: Array<{
    label: string;
    request: {
      operation_kind: string;
      content: string;
      source_label: string;
      target_selector?: string | null;
      target_selector_family?: string | null;
      destination_selector?: string | null;
      destination_selector_family?: string | null;
      payload_text?: string | null;
      if_missing?: string | null;
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditResultFixture {
  cases: Array<{
    label: string;
    result: {
      operation_kind: string;
      updated_content: string;
      changed: boolean;
      captured_text?: string | null;
      match_count?: number | null;
      operation_profile: StructuredEditOperationProfileFixture['cases'][number]['profile'];
      destination_profile?:
        | StructuredEditDestinationProfileFixture['cases'][number]['profile']
        | null;
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditApplicationFixture {
  cases: Array<{
    label: string;
    application: {
      request: StructuredEditRequestFixture['cases'][number]['request'];
      result: StructuredEditResultFixture['cases'][number]['result'];
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditApplicationEnvelopeFixture {
  structured_edit_application: StructuredEditApplicationFixture['cases'][number]['application'];
  expected_envelope: {
    kind: StructuredEditApplicationEnvelope['kind'];
    version: number;
    application: StructuredEditApplicationFixture['cases'][number]['application'];
  };
}

interface StructuredEditApplicationEnvelopeRejectionFixture {
  cases: Array<{
    label: string;
    envelope: {
      kind: string;
      version: number;
      application: StructuredEditApplicationFixture['cases'][number]['application'];
    };
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditApplicationEnvelopeApplicationFixture {
  structured_edit_application_envelope: StructuredEditApplicationEnvelopeFixture['expected_envelope'];
  expected_application: StructuredEditApplicationFixture['cases'][number]['application'];
  cases: Array<{
    label: string;
    envelope: StructuredEditApplicationEnvelopeRejectionFixture['cases'][number]['envelope'];
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditExecutionReportFixture {
  cases: Array<{
    label: string;
    report: {
      application: StructuredEditApplicationFixture['cases'][number]['application'];
      provider_family: string;
      provider_backend?: string | null;
      diagnostics: DiagnosticFixture['diagnostics'];
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditProviderExecutionRequestFixture {
  cases: Array<{
    label: string;
    execution_request: {
      request: StructuredEditRequestFixture['cases'][number]['request'];
      provider_family: string;
      provider_backend?: string | null;
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditProviderExecutionRequestEnvelopeFixture {
  structured_edit_provider_execution_request: StructuredEditProviderExecutionRequestFixture['cases'][number]['execution_request'];
  expected_envelope: {
    kind: StructuredEditProviderExecutionRequestEnvelope['kind'];
    version: number;
    execution_request: StructuredEditProviderExecutionRequestFixture['cases'][number]['execution_request'];
  };
}

interface StructuredEditProviderExecutionRequestEnvelopeRejectionFixture {
  cases: Array<{
    label: string;
    envelope: {
      kind: string;
      version: number;
      execution_request: StructuredEditProviderExecutionRequestFixture['cases'][number]['execution_request'];
    };
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderExecutionRequestEnvelopeApplicationFixture {
  structured_edit_provider_execution_request_envelope: StructuredEditProviderExecutionRequestEnvelopeFixture['expected_envelope'];
  expected_execution_request: StructuredEditProviderExecutionRequestFixture['cases'][number]['execution_request'];
  cases: Array<{
    label: string;
    envelope: StructuredEditProviderExecutionRequestEnvelopeRejectionFixture['cases'][number]['envelope'];
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderExecutionApplicationFixture {
  cases: Array<{
    label: string;
    application: {
      execution_request: StructuredEditProviderExecutionRequestFixture['cases'][number]['execution_request'];
      report: StructuredEditExecutionReportFixture['cases'][number]['report'];
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditProviderExecutionDispatchFixture {
  cases: Array<{
    label: string;
    dispatch: {
      execution_request: StructuredEditProviderExecutionRequestFixture['cases'][number]['execution_request'];
      resolved_provider_family: string;
      resolved_provider_backend: string;
      executor_label?: string;
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditProviderExecutionDispatchEnvelopeFixture {
  structured_edit_provider_execution_dispatch: StructuredEditProviderExecutionDispatchFixture['cases'][number]['dispatch'];
  expected_envelope: {
    kind: StructuredEditProviderExecutionDispatchEnvelope['kind'];
    version: number;
    provider_execution_dispatch: StructuredEditProviderExecutionDispatchFixture['cases'][number]['dispatch'];
  };
}

interface StructuredEditProviderExecutionDispatchEnvelopeRejectionFixture {
  cases: Array<{
    label: string;
    envelope: {
      kind: string;
      version: number;
      provider_execution_dispatch: StructuredEditProviderExecutionDispatchFixture['cases'][number]['dispatch'];
    };
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderExecutionDispatchEnvelopeApplicationFixture {
  structured_edit_provider_execution_dispatch_envelope: StructuredEditProviderExecutionDispatchEnvelopeFixture['expected_envelope'];
  expected_dispatch: StructuredEditProviderExecutionDispatchFixture['cases'][number]['dispatch'];
  cases: Array<{
    label: string;
    envelope: StructuredEditProviderExecutionDispatchEnvelopeRejectionFixture['cases'][number]['envelope'];
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderExecutionOutcomeFixture {
  cases: Array<{
    label: string;
    outcome: {
      dispatch: StructuredEditProviderExecutionDispatchFixture['cases'][number]['dispatch'];
      application: StructuredEditProviderExecutionApplicationFixture['cases'][number]['application'];
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditProviderExecutionOutcomeEnvelopeFixture {
  structured_edit_provider_execution_outcome: StructuredEditProviderExecutionOutcomeFixture['cases'][number]['outcome'];
  expected_envelope: {
    kind: StructuredEditProviderExecutionOutcomeEnvelope['kind'];
    version: number;
    provider_execution_outcome: StructuredEditProviderExecutionOutcomeFixture['cases'][number]['outcome'];
  };
}

interface StructuredEditProviderExecutionOutcomeEnvelopeRejectionFixture {
  cases: Array<{
    label: string;
    envelope: {
      kind: string;
      version: number;
      provider_execution_outcome: StructuredEditProviderExecutionOutcomeFixture['cases'][number]['outcome'];
    };
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderExecutionOutcomeEnvelopeApplicationFixture {
  structured_edit_provider_execution_outcome_envelope: StructuredEditProviderExecutionOutcomeEnvelopeFixture['expected_envelope'];
  expected_outcome: StructuredEditProviderExecutionOutcomeFixture['cases'][number]['outcome'];
  cases: Array<{
    label: string;
    envelope: StructuredEditProviderExecutionOutcomeEnvelopeRejectionFixture['cases'][number]['envelope'];
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderBatchExecutionOutcomeFixture {
  cases: Array<{
    label: string;
    batch_outcome: {
      outcomes: StructuredEditProviderExecutionOutcomeFixture['cases'][number]['outcome'][];
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditProviderBatchExecutionOutcomeEnvelopeFixture {
  structured_edit_provider_batch_execution_outcome: StructuredEditProviderBatchExecutionOutcomeFixture['cases'][number]['batch_outcome'];
  expected_envelope: {
    kind: StructuredEditProviderBatchExecutionOutcomeEnvelope['kind'];
    version: number;
    batch_outcome: StructuredEditProviderBatchExecutionOutcomeFixture['cases'][number]['batch_outcome'];
  };
}

interface StructuredEditProviderBatchExecutionOutcomeEnvelopeRejectionFixture {
  cases: Array<{
    label: string;
    envelope: {
      kind: string;
      version: number;
      batch_outcome: StructuredEditProviderBatchExecutionOutcomeFixture['cases'][number]['batch_outcome'];
    };
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderBatchExecutionOutcomeEnvelopeApplicationFixture {
  structured_edit_provider_batch_execution_outcome_envelope: StructuredEditProviderBatchExecutionOutcomeEnvelopeFixture['expected_envelope'];
  expected_batch_outcome: StructuredEditProviderBatchExecutionOutcomeFixture['cases'][number]['batch_outcome'];
  cases: Array<{
    label: string;
    envelope: StructuredEditProviderBatchExecutionOutcomeEnvelopeRejectionFixture['cases'][number]['envelope'];
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderExecutionProvenanceFixture {
  cases: Array<{
    label: string;
    provenance: {
      dispatch: StructuredEditProviderExecutionDispatchFixture['cases'][number]['dispatch'];
      outcome: StructuredEditProviderExecutionOutcomeFixture['cases'][number]['outcome'];
      diagnostics: DiagnosticFixture['diagnostics'];
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditProviderExecutionProvenanceEnvelopeFixture {
  structured_edit_provider_execution_provenance: StructuredEditProviderExecutionProvenanceFixture['cases'][number]['provenance'];
  expected_envelope: {
    kind: StructuredEditProviderExecutionProvenanceEnvelope['kind'];
    version: number;
    provenance: StructuredEditProviderExecutionProvenanceFixture['cases'][number]['provenance'];
  };
}

interface StructuredEditProviderExecutionProvenanceEnvelopeRejectionFixture {
  cases: Array<{
    label: string;
    envelope: {
      kind: string;
      version: number;
      provenance: StructuredEditProviderExecutionProvenanceFixture['cases'][number]['provenance'];
    };
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderExecutionProvenanceEnvelopeApplicationFixture {
  structured_edit_provider_execution_provenance_envelope: StructuredEditProviderExecutionProvenanceEnvelopeFixture['expected_envelope'];
  expected_provenance: StructuredEditProviderExecutionProvenanceFixture['cases'][number]['provenance'];
  cases: Array<{
    label: string;
    envelope: StructuredEditProviderExecutionProvenanceEnvelopeRejectionFixture['cases'][number]['envelope'];
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderBatchExecutionProvenanceFixture {
  cases: Array<{
    label: string;
    batch_provenance: {
      provenances: StructuredEditProviderExecutionProvenanceFixture['cases'][number]['provenance'][];
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditProviderBatchExecutionProvenanceEnvelopeFixture {
  structured_edit_provider_batch_execution_provenance: StructuredEditProviderBatchExecutionProvenanceFixture['cases'][number]['batch_provenance'];
  expected_envelope: {
    kind: StructuredEditProviderBatchExecutionProvenanceEnvelope['kind'];
    version: number;
    batch_provenance: StructuredEditProviderBatchExecutionProvenanceFixture['cases'][number]['batch_provenance'];
  };
}

interface StructuredEditProviderBatchExecutionProvenanceEnvelopeRejectionFixture {
  cases: Array<{
    label: string;
    envelope: {
      kind: string;
      version: number;
      batch_provenance: StructuredEditProviderBatchExecutionProvenanceFixture['cases'][number]['batch_provenance'];
    };
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderBatchExecutionProvenanceEnvelopeApplicationFixture {
  structured_edit_provider_batch_execution_provenance_envelope: StructuredEditProviderBatchExecutionProvenanceEnvelopeFixture['expected_envelope'];
  expected_batch_provenance: StructuredEditProviderBatchExecutionProvenanceFixture['cases'][number]['batch_provenance'];
  cases: Array<{
    label: string;
    envelope: StructuredEditProviderBatchExecutionProvenanceEnvelopeRejectionFixture['cases'][number]['envelope'];
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderExecutionReplayBundleFixture {
  cases: Array<{
    label: string;
    replay_bundle: {
      execution_request: StructuredEditProviderExecutionRequestFixture['cases'][number]['execution_request'];
      provenance: StructuredEditProviderExecutionProvenanceFixture['cases'][number]['provenance'];
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditProviderExecutionReplayBundleEnvelopeFixture {
  structured_edit_provider_execution_replay_bundle: StructuredEditProviderExecutionReplayBundleFixture['cases'][number]['replay_bundle'];
  expected_envelope: {
    kind: StructuredEditProviderExecutionReplayBundleEnvelope['kind'];
    version: number;
    replay_bundle: StructuredEditProviderExecutionReplayBundleFixture['cases'][number]['replay_bundle'];
  };
}

interface StructuredEditProviderExecutionReplayBundleEnvelopeRejectionFixture {
  cases: Array<{
    label: string;
    envelope: {
      kind: string;
      version: number;
      replay_bundle: StructuredEditProviderExecutionReplayBundleFixture['cases'][number]['replay_bundle'];
    };
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderExecutionReplayBundleEnvelopeApplicationFixture {
  structured_edit_provider_execution_replay_bundle_envelope: StructuredEditProviderExecutionReplayBundleEnvelopeFixture['expected_envelope'];
  expected_replay_bundle: StructuredEditProviderExecutionReplayBundleFixture['cases'][number]['replay_bundle'];
  cases: Array<{
    label: string;
    envelope: StructuredEditProviderExecutionReplayBundleEnvelopeRejectionFixture['cases'][number]['envelope'];
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderBatchExecutionReplayBundleFixture {
  cases: Array<{
    label: string;
    batch_replay_bundle: {
      replay_bundles: StructuredEditProviderExecutionReplayBundleFixture['cases'][number]['replay_bundle'][];
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditProviderBatchExecutionReplayBundleEnvelopeFixture {
  structured_edit_provider_batch_execution_replay_bundle: StructuredEditProviderBatchExecutionReplayBundleFixture['cases'][number]['batch_replay_bundle'];
  expected_envelope: {
    kind: StructuredEditProviderBatchExecutionReplayBundleEnvelope['kind'];
    version: number;
    batch_replay_bundle: StructuredEditProviderBatchExecutionReplayBundleFixture['cases'][number]['batch_replay_bundle'];
  };
}

interface StructuredEditProviderBatchExecutionReplayBundleEnvelopeRejectionFixture {
  cases: Array<{
    label: string;
    envelope: {
      kind: string;
      version: number;
      batch_replay_bundle: StructuredEditProviderBatchExecutionReplayBundleFixture['cases'][number]['batch_replay_bundle'];
    };
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderBatchExecutionReplayBundleEnvelopeApplicationFixture {
  structured_edit_provider_batch_execution_replay_bundle_envelope: StructuredEditProviderBatchExecutionReplayBundleEnvelopeFixture['expected_envelope'];
  expected_batch_replay_bundle: StructuredEditProviderBatchExecutionReplayBundleFixture['cases'][number]['batch_replay_bundle'];
  cases: Array<{
    label: string;
    envelope: StructuredEditProviderBatchExecutionReplayBundleEnvelopeRejectionFixture['cases'][number]['envelope'];
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderExecutorProfileFixture {
  cases: Array<{
    label: string;
    executor_profile: {
      provider_family: string;
      provider_backend: string;
      executor_label: string;
      structure_profile: StructuredEditStructureProfileFixture['cases'][number]['profile'];
      selection_profile: StructuredEditSelectionProfileFixture['cases'][number]['profile'];
      match_profile: StructuredEditMatchProfileFixture['cases'][number]['profile'];
      operation_profiles: StructuredEditOperationProfileFixture['cases'][number]['profile'][];
      destination_profile: StructuredEditDestinationProfileFixture['cases'][number]['profile'];
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditProviderExecutorProfileEnvelopeFixture {
  structured_edit_provider_executor_profile: StructuredEditProviderExecutorProfileFixture['cases'][number]['executor_profile'];
  expected_envelope: {
    kind: StructuredEditProviderExecutorProfileEnvelope['kind'];
    version: number;
    executor_profile: StructuredEditProviderExecutorProfileFixture['cases'][number]['executor_profile'];
  };
}

interface StructuredEditProviderExecutorProfileEnvelopeRejectionFixture {
  cases: Array<{
    label: string;
    envelope: {
      kind: string;
      version: number;
      executor_profile: StructuredEditProviderExecutorProfileFixture['cases'][number]['executor_profile'];
    };
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderExecutorProfileEnvelopeApplicationFixture {
  structured_edit_provider_executor_profile_envelope: StructuredEditProviderExecutorProfileEnvelopeFixture['expected_envelope'];
  expected_executor_profile: StructuredEditProviderExecutorProfileFixture['cases'][number]['executor_profile'];
  cases: Array<{
    label: string;
    envelope: StructuredEditProviderExecutorProfileEnvelopeRejectionFixture['cases'][number]['envelope'];
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderExecutorRegistryFixture {
  cases: Array<{
    label: string;
    executor_registry: {
      executor_profiles: StructuredEditProviderExecutorProfileFixture['cases'][number]['executor_profile'][];
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditProviderExecutorRegistryEnvelopeFixture {
  structured_edit_provider_executor_registry: StructuredEditProviderExecutorRegistryFixture['cases'][number]['executor_registry'];
  expected_envelope: {
    kind: StructuredEditProviderExecutorRegistryEnvelope['kind'];
    version: number;
    executor_registry: StructuredEditProviderExecutorRegistryFixture['cases'][number]['executor_registry'];
  };
}

interface StructuredEditProviderExecutorRegistryEnvelopeRejectionFixture {
  cases: Array<{
    label: string;
    envelope: {
      kind: string;
      version: number;
      executor_registry: StructuredEditProviderExecutorRegistryFixture['cases'][number]['executor_registry'];
    };
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderExecutorRegistryEnvelopeApplicationFixture {
  structured_edit_provider_executor_registry_envelope: StructuredEditProviderExecutorRegistryEnvelopeFixture['expected_envelope'];
  expected_executor_registry: StructuredEditProviderExecutorRegistryFixture['cases'][number]['executor_registry'];
  cases: Array<{
    label: string;
    envelope: StructuredEditProviderExecutorRegistryEnvelopeRejectionFixture['cases'][number]['envelope'];
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderExecutorSelectionPolicyFixture {
  cases: Array<{
    label: string;
    selection_policy: {
      provider_family: string;
      provider_backend?: string;
      executor_label?: string;
      selection_mode: string;
      allow_registry_fallback: boolean;
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditProviderExecutorSelectionPolicyEnvelopeFixture {
  structured_edit_provider_executor_selection_policy: StructuredEditProviderExecutorSelectionPolicyFixture['cases'][number]['selection_policy'];
  expected_envelope: {
    kind: StructuredEditProviderExecutorSelectionPolicyEnvelope['kind'];
    version: number;
    selection_policy: StructuredEditProviderExecutorSelectionPolicyFixture['cases'][number]['selection_policy'];
  };
}

interface StructuredEditProviderExecutorSelectionPolicyEnvelopeRejectionFixture {
  cases: Array<{
    label: string;
    envelope: {
      kind: string;
      version: number;
      selection_policy: StructuredEditProviderExecutorSelectionPolicyFixture['cases'][number]['selection_policy'];
    };
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderExecutorSelectionPolicyEnvelopeApplicationFixture {
  structured_edit_provider_executor_selection_policy_envelope: StructuredEditProviderExecutorSelectionPolicyEnvelopeFixture['expected_envelope'];
  expected_selection_policy: StructuredEditProviderExecutorSelectionPolicyFixture['cases'][number]['selection_policy'];
  cases: Array<{
    label: string;
    envelope: StructuredEditProviderExecutorSelectionPolicyEnvelopeRejectionFixture['cases'][number]['envelope'];
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderExecutorResolutionFixture {
  cases: Array<{
    label: string;
    executor_resolution: {
      executor_registry: StructuredEditProviderExecutorRegistryFixture['cases'][number]['executor_registry'];
      selection_policy: StructuredEditProviderExecutorSelectionPolicyFixture['cases'][number]['selection_policy'];
      selected_executor_profile: StructuredEditProviderExecutorProfileFixture['cases'][number]['executor_profile'];
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditProviderExecutorResolutionEnvelopeFixture {
  structured_edit_provider_executor_resolution: StructuredEditProviderExecutorResolutionFixture['cases'][number]['executor_resolution'];
  expected_envelope: {
    kind: StructuredEditProviderExecutorResolutionEnvelope['kind'];
    version: number;
    executor_resolution: StructuredEditProviderExecutorResolutionFixture['cases'][number]['executor_resolution'];
  };
}

interface StructuredEditProviderExecutorResolutionEnvelopeRejectionFixture {
  cases: Array<{
    label: string;
    envelope: {
      kind: string;
      version: number;
      executor_resolution: StructuredEditProviderExecutorResolutionFixture['cases'][number]['executor_resolution'];
    };
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderExecutorResolutionEnvelopeApplicationFixture {
  structured_edit_provider_executor_resolution_envelope: StructuredEditProviderExecutorResolutionEnvelopeFixture['expected_envelope'];
  expected_executor_resolution: StructuredEditProviderExecutorResolutionFixture['cases'][number]['executor_resolution'];
  cases: Array<{
    label: string;
    envelope: StructuredEditProviderExecutorResolutionEnvelopeRejectionFixture['cases'][number]['envelope'];
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderExecutionApplicationEnvelopeFixture {
  structured_edit_provider_execution_application: StructuredEditProviderExecutionApplicationFixture['cases'][number]['application'];
  expected_envelope: {
    kind: StructuredEditProviderExecutionApplicationEnvelope['kind'];
    version: number;
    provider_execution_application: StructuredEditProviderExecutionApplicationFixture['cases'][number]['application'];
  };
}

interface StructuredEditProviderExecutionApplicationEnvelopeRejectionFixture {
  cases: Array<{
    label: string;
    envelope: {
      kind: string;
      version: number;
      provider_execution_application: StructuredEditProviderExecutionApplicationFixture['cases'][number]['application'];
    };
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderExecutionApplicationEnvelopeApplicationFixture {
  structured_edit_provider_execution_application_envelope: StructuredEditProviderExecutionApplicationEnvelopeFixture['expected_envelope'];
  expected_application: StructuredEditProviderExecutionApplicationFixture['cases'][number]['application'];
  cases: Array<{
    label: string;
    envelope: StructuredEditProviderExecutionApplicationEnvelopeRejectionFixture['cases'][number]['envelope'];
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderExecutionPlanFixture {
  cases: Array<{
    label: string;
    execution_plan: {
      execution_request: StructuredEditProviderExecutionRequestFixture['cases'][number]['execution_request'];
      executor_resolution: StructuredEditProviderExecutorResolutionFixture['cases'][number]['executor_resolution'];
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditProviderExecutionHandoffFixture {
  cases: Array<{
    label: string;
    execution_handoff: {
      execution_plan: StructuredEditProviderExecutionPlanFixture['cases'][number]['execution_plan'];
      execution_dispatch: StructuredEditProviderExecutionDispatchFixture['cases'][number]['dispatch'];
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditProviderExecutionHandoffEnvelopeFixture {
  structured_edit_provider_execution_handoff: StructuredEditProviderExecutionHandoffFixture['cases'][number]['execution_handoff'];
  expected_envelope: {
    kind: StructuredEditProviderExecutionHandoffEnvelope['kind'];
    version: number;
    execution_handoff: StructuredEditProviderExecutionHandoffFixture['cases'][number]['execution_handoff'];
  };
}

interface StructuredEditProviderExecutionHandoffEnvelopeRejectionFixture {
  cases: Array<{
    label: string;
    envelope: {
      kind: string;
      version: number;
      execution_handoff: StructuredEditProviderExecutionHandoffFixture['cases'][number]['execution_handoff'];
    };
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderExecutionHandoffEnvelopeApplicationFixture {
  structured_edit_provider_execution_handoff_envelope: StructuredEditProviderExecutionHandoffEnvelopeFixture['expected_envelope'];
  expected_execution_handoff: StructuredEditProviderExecutionHandoffFixture['cases'][number]['execution_handoff'];
  cases: Array<{
    label: string;
    envelope: StructuredEditProviderExecutionHandoffEnvelopeRejectionFixture['cases'][number]['envelope'];
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderBatchExecutionHandoffFixture {
  cases: Array<{
    label: string;
    batch_execution_handoff: {
      handoffs: StructuredEditProviderExecutionHandoffFixture['cases'][number]['execution_handoff'][];
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditProviderBatchExecutionHandoffEnvelopeFixture {
  structured_edit_provider_batch_execution_handoff: StructuredEditProviderBatchExecutionHandoffFixture['cases'][number]['batch_execution_handoff'];
  expected_envelope: {
    kind: StructuredEditProviderBatchExecutionHandoffEnvelope['kind'];
    version: number;
    batch_execution_handoff: StructuredEditProviderBatchExecutionHandoffFixture['cases'][number]['batch_execution_handoff'];
  };
}

interface StructuredEditProviderBatchExecutionHandoffEnvelopeRejectionFixture {
  cases: Array<{
    label: string;
    envelope: {
      kind: string;
      version: number;
      batch_execution_handoff: StructuredEditProviderBatchExecutionHandoffFixture['cases'][number]['batch_execution_handoff'];
    };
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderBatchExecutionHandoffEnvelopeApplicationFixture {
  structured_edit_provider_batch_execution_handoff_envelope: StructuredEditProviderBatchExecutionHandoffEnvelopeFixture['expected_envelope'];
  expected_batch_execution_handoff: StructuredEditProviderBatchExecutionHandoffFixture['cases'][number]['batch_execution_handoff'];
  cases: Array<{
    label: string;
    envelope: StructuredEditProviderBatchExecutionHandoffEnvelopeRejectionFixture['cases'][number]['envelope'];
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderExecutionPlanEnvelopeFixture {
  structured_edit_provider_execution_plan: StructuredEditProviderExecutionPlanFixture['cases'][number]['execution_plan'];
  expected_envelope: {
    kind: StructuredEditProviderExecutionPlanEnvelope['kind'];
    version: number;
    execution_plan: StructuredEditProviderExecutionPlanFixture['cases'][number]['execution_plan'];
  };
}

interface StructuredEditProviderExecutionPlanEnvelopeRejectionFixture {
  cases: Array<{
    label: string;
    envelope: {
      kind: string;
      version: number;
      execution_plan: StructuredEditProviderExecutionPlanFixture['cases'][number]['execution_plan'];
    };
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderExecutionPlanEnvelopeApplicationFixture {
  structured_edit_provider_execution_plan_envelope: StructuredEditProviderExecutionPlanEnvelopeFixture['expected_envelope'];
  expected_execution_plan: StructuredEditProviderExecutionPlanFixture['cases'][number]['execution_plan'];
  cases: Array<{
    label: string;
    envelope: StructuredEditProviderExecutionPlanEnvelopeRejectionFixture['cases'][number]['envelope'];
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderBatchExecutionPlanFixture {
  cases: Array<{
    label: string;
    batch_execution_plan: {
      plans: StructuredEditProviderExecutionPlanFixture['cases'][number]['execution_plan'][];
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditProviderBatchExecutionPlanEnvelopeFixture {
  structured_edit_provider_batch_execution_plan: StructuredEditProviderBatchExecutionPlanFixture['cases'][number]['batch_execution_plan'];
  expected_envelope: {
    kind: StructuredEditProviderBatchExecutionPlanEnvelope['kind'];
    version: number;
    batch_execution_plan: StructuredEditProviderBatchExecutionPlanFixture['cases'][number]['batch_execution_plan'];
  };
}

interface StructuredEditProviderBatchExecutionPlanEnvelopeRejectionFixture {
  cases: Array<{
    label: string;
    envelope: {
      kind: string;
      version: number;
      batch_execution_plan: StructuredEditProviderBatchExecutionPlanFixture['cases'][number]['batch_execution_plan'];
    };
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderBatchExecutionPlanEnvelopeApplicationFixture {
  structured_edit_provider_batch_execution_plan_envelope: StructuredEditProviderBatchExecutionPlanEnvelopeFixture['expected_envelope'];
  expected_batch_execution_plan: StructuredEditProviderBatchExecutionPlanFixture['cases'][number]['batch_execution_plan'];
  cases: Array<{
    label: string;
    envelope: StructuredEditProviderBatchExecutionPlanEnvelopeRejectionFixture['cases'][number]['envelope'];
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditExecutionReportEnvelopeFixture {
  structured_edit_execution_report: StructuredEditExecutionReportFixture['cases'][number]['report'];
  expected_envelope: {
    kind: StructuredEditExecutionReportEnvelope['kind'];
    version: number;
    report: StructuredEditExecutionReportFixture['cases'][number]['report'];
  };
}

interface StructuredEditExecutionReportEnvelopeRejectionFixture {
  cases: Array<{
    label: string;
    envelope: {
      kind: string;
      version: number;
      report: StructuredEditExecutionReportFixture['cases'][number]['report'];
    };
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditExecutionReportEnvelopeApplicationFixture {
  structured_edit_execution_report_envelope: StructuredEditExecutionReportEnvelopeFixture['expected_envelope'];
  expected_report: StructuredEditExecutionReportFixture['cases'][number]['report'];
  cases: Array<{
    label: string;
    envelope: StructuredEditExecutionReportEnvelopeRejectionFixture['cases'][number]['envelope'];
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditBatchRequestFixture {
  cases: Array<{
    label: string;
    batch_request: {
      requests: StructuredEditRequestFixture['cases'][number]['request'][];
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditProviderBatchExecutionRequestFixture {
  cases: Array<{
    label: string;
    batch_execution_request: {
      requests: StructuredEditProviderExecutionRequestFixture['cases'][number]['execution_request'][];
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditProviderBatchExecutionRequestEnvelopeFixture {
  structured_edit_provider_batch_execution_request: StructuredEditProviderBatchExecutionRequestFixture['cases'][number]['batch_execution_request'];
  expected_envelope: {
    kind: StructuredEditProviderBatchExecutionRequestEnvelope['kind'];
    version: number;
    batch_execution_request: StructuredEditProviderBatchExecutionRequestFixture['cases'][number]['batch_execution_request'];
  };
}

interface StructuredEditProviderBatchExecutionRequestEnvelopeRejectionFixture {
  cases: Array<{
    label: string;
    envelope: {
      kind: string;
      version: number;
      batch_execution_request: StructuredEditProviderBatchExecutionRequestFixture['cases'][number]['batch_execution_request'];
    };
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderBatchExecutionRequestEnvelopeApplicationFixture {
  structured_edit_provider_batch_execution_request_envelope: StructuredEditProviderBatchExecutionRequestEnvelopeFixture['expected_envelope'];
  expected_batch_execution_request: StructuredEditProviderBatchExecutionRequestFixture['cases'][number]['batch_execution_request'];
  cases: Array<{
    label: string;
    envelope: StructuredEditProviderBatchExecutionRequestEnvelopeRejectionFixture['cases'][number]['envelope'];
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderBatchExecutionDispatchFixture {
  cases: Array<{
    label: string;
    batch_dispatch: {
      dispatches: StructuredEditProviderExecutionDispatchFixture['cases'][number]['dispatch'][];
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditProviderBatchExecutionDispatchEnvelopeFixture {
  structured_edit_provider_batch_execution_dispatch: StructuredEditProviderBatchExecutionDispatchFixture['cases'][number]['batch_dispatch'];
  expected_envelope: {
    kind: StructuredEditProviderBatchExecutionDispatchEnvelope['kind'];
    version: number;
    batch_dispatch: StructuredEditProviderBatchExecutionDispatchFixture['cases'][number]['batch_dispatch'];
  };
}

interface StructuredEditProviderBatchExecutionDispatchEnvelopeRejectionFixture {
  cases: Array<{
    label: string;
    envelope: {
      kind: string;
      version: number;
      batch_dispatch: StructuredEditProviderBatchExecutionDispatchFixture['cases'][number]['batch_dispatch'];
    };
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderBatchExecutionDispatchEnvelopeApplicationFixture {
  structured_edit_provider_batch_execution_dispatch_envelope: StructuredEditProviderBatchExecutionDispatchEnvelopeFixture['expected_envelope'];
  expected_batch_dispatch: StructuredEditProviderBatchExecutionDispatchFixture['cases'][number]['batch_dispatch'];
  cases: Array<{
    label: string;
    envelope: StructuredEditProviderBatchExecutionDispatchEnvelopeRejectionFixture['cases'][number]['envelope'];
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderBatchExecutionReportFixture {
  cases: Array<{
    label: string;
    batch_report: {
      applications: StructuredEditProviderExecutionApplicationFixture['cases'][number]['application'][];
      diagnostics: DiagnosticFixture['diagnostics'];
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditProviderBatchExecutionReportEnvelopeFixture {
  structured_edit_provider_batch_execution_report: StructuredEditProviderBatchExecutionReportFixture['cases'][number]['batch_report'];
  expected_envelope: {
    kind: StructuredEditProviderBatchExecutionReportEnvelope['kind'];
    version: number;
    batch_report: StructuredEditProviderBatchExecutionReportFixture['cases'][number]['batch_report'];
  };
}

interface StructuredEditProviderBatchExecutionReportEnvelopeRejectionFixture {
  cases: Array<{
    label: string;
    envelope: {
      kind: string;
      version: number;
      batch_report: StructuredEditProviderBatchExecutionReportFixture['cases'][number]['batch_report'];
    };
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditProviderBatchExecutionReportEnvelopeApplicationFixture {
  structured_edit_provider_batch_execution_report_envelope: StructuredEditProviderBatchExecutionReportEnvelopeFixture['expected_envelope'];
  expected_batch_report: StructuredEditProviderBatchExecutionReportFixture['cases'][number]['batch_report'];
  cases: Array<{
    label: string;
    envelope: StructuredEditProviderBatchExecutionReportEnvelopeRejectionFixture['cases'][number]['envelope'];
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditBatchReportFixture {
  cases: Array<{
    label: string;
    batch_report: {
      reports: StructuredEditExecutionReportFixture['cases'][number]['report'][];
      diagnostics: DiagnosticFixture['diagnostics'];
      metadata?: Record<string, unknown>;
    };
  }>;
}

interface StructuredEditBatchReportEnvelopeFixture {
  structured_edit_batch_report: StructuredEditBatchReportFixture['cases'][number]['batch_report'];
  expected_envelope: {
    kind: StructuredEditBatchReportEnvelope['kind'];
    version: number;
    batch_report: StructuredEditBatchReportFixture['cases'][number]['batch_report'];
  };
}

interface StructuredEditBatchReportEnvelopeRejectionFixture {
  cases: Array<{
    label: string;
    envelope: {
      kind: string;
      version: number;
      batch_report: StructuredEditBatchReportFixture['cases'][number]['batch_report'];
    };
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface StructuredEditBatchReportEnvelopeApplicationFixture {
  structured_edit_batch_report_envelope: StructuredEditBatchReportEnvelopeFixture['expected_envelope'];
  expected_batch_report: StructuredEditBatchReportFixture['cases'][number]['batch_report'];
  cases: Array<{
    label: string;
    envelope: StructuredEditBatchReportEnvelopeRejectionFixture['cases'][number]['envelope'];
    expected_error: StructuredEditTransportImportError;
  }>;
}

interface ProjectedChildReviewCasesFixture {
  cases: Array<{
    case_id: string;
    parent_operation_id: string;
    child_operation_id: string;
    surface_path: string;
    delegated_case_id: string;
    delegated_apply_group: string;
    delegated_runtime_surface_path: string;
  }>;
}

interface ProjectedChildReviewGroupsFixture extends ProjectedChildReviewCasesFixture {
  expected_groups: Array<{
    delegated_apply_group: string;
    parent_operation_id: string;
    child_operation_id: string;
    delegated_runtime_surface_path: string;
    case_ids: string[];
    delegated_case_ids: string[];
  }>;
}

interface ProjectedChildReviewGroupProgressFixture {
  groups: ProjectedChildReviewGroupsFixture['expected_groups'];
  resolved_case_ids: string[];
  expected_progress: Array<{
    delegated_apply_group: string;
    parent_operation_id: string;
    child_operation_id: string;
    delegated_runtime_surface_path: string;
    resolved_case_ids: string[];
    pending_case_ids: string[];
    complete: boolean;
  }>;
}

interface ProjectedChildGroupReviewRequestFixture {
  family: string;
  group: ProjectedChildReviewGroupsFixture['expected_groups'][number];
  expected_request: {
    id: string;
    kind: ReviewRequest['kind'];
    family: string;
    message: string;
    blocking: boolean;
    delegated_group: ProjectedChildReviewGroupsFixture['expected_groups'][number];
    action_offers: Array<{
      action: ReviewActionOffer['action'];
      requires_context: boolean;
      payload_kind?: ReviewActionOffer['payloadKind'];
    }>;
    default_action?: ReviewRequest['defaultAction'];
  };
}

interface ProjectedChildGroupsAcceptedForApplyFixture {
  family: string;
  groups: ProjectedChildReviewGroupsFixture['expected_groups'];
  decisions: Array<{
    request_id: string;
    action: ReviewDecision['action'];
  }>;
  expected_accepted_groups: ProjectedChildReviewGroupsFixture['expected_groups'];
}

interface DelegatedChildGroupReviewStateFixture {
  family: string;
  groups: ProjectedChildReviewGroupsFixture['expected_groups'];
  decisions: Array<{
    request_id: string;
    action: ReviewDecision['action'];
  }>;
  expected_state: {
    requests: Array<{
      id: string;
      kind: ReviewRequest['kind'];
      family: string;
      message: string;
      blocking: boolean;
      delegated_group: ProjectedChildReviewGroupsFixture['expected_groups'][number];
      action_offers: Array<{
        action: ReviewActionOffer['action'];
        requires_context: boolean;
        payload_kind?: ReviewActionOffer['payloadKind'];
      }>;
      default_action?: ReviewRequest['defaultAction'];
    }>;
    accepted_groups: ProjectedChildReviewGroupsFixture['expected_groups'];
    applied_decisions: Array<{
      request_id: string;
      action: ReviewDecision['action'];
    }>;
    diagnostics: Diagnostic[];
  };
}

interface ProjectedChildReviewGroupsReadyForApplyFixture {
  groups: ProjectedChildReviewGroupsFixture['expected_groups'];
  resolved_case_ids: string[];
  expected_ready_groups: ProjectedChildReviewGroupsFixture['expected_groups'];
}

interface ConformanceSelectionFixtureCase {
  ref: ConformanceCaseRef;
  family_profile: {
    family: string;
    supported_dialects: string[];
    supported_policies: PolicyReference[];
  };
  feature_profile: {
    backend: string;
    supports_dialects: boolean;
    supported_policies: PolicyReference[];
  };
  requirements: ConformanceCaseRequirements;
  expected: ConformanceCaseSelection;
}

interface ConformanceSelectionFixture {
  cases: ConformanceSelectionFixtureCase[];
}

interface ConformanceCaseRunnerFixtureCase {
  run: {
    ref: ConformanceCaseRef;
    requirements: ConformanceCaseRequirements;
    family_profile: {
      family: string;
      supported_dialects: string[];
      supported_policies: PolicyReference[];
    };
    feature_profile?: {
      backend: string;
      supports_dialects: boolean;
      supported_policies: PolicyReference[];
    };
  };
  execution: ConformanceCaseExecution;
  expected: ConformanceCaseResult;
}

interface ConformanceCaseRunnerFixture {
  cases: ConformanceCaseRunnerFixtureCase[];
}

interface ConformanceSuiteRunnerFixture {
  cases: Array<{
    ref: ConformanceCaseRef;
    requirements: ConformanceCaseRequirements;
    family_profile: {
      family: string;
      supported_dialects: string[];
      supported_policies: PolicyReference[];
    };
    feature_profile?: {
      backend: string;
      supports_dialects: boolean;
      supported_policies: PolicyReference[];
    };
  }>;
  executions: Record<string, ConformanceCaseExecution>;
  expected_results: ConformanceCaseResult[];
}

interface ConformanceSuitePlanFixture {
  family: string;
  roles: string[];
  family_profile: {
    family: string;
    supported_dialects: string[];
    supported_policies: PolicyReference[];
  };
  feature_profile?: {
    backend: string;
    supports_dialects: boolean;
    supported_policies: PolicyReference[];
  };
  expected: {
    family: string;
    entries: Array<{
      ref: ConformanceCaseRef;
      path: string[];
      run: {
        ref: ConformanceCaseRef;
        requirements: ConformanceCaseRequirements;
        family_profile: {
          family: string;
          supported_dialects: string[];
          supported_policies: PolicyReference[];
        };
        feature_profile?: {
          backend: string;
          supports_dialects: boolean;
          supported_policies: PolicyReference[];
        };
      };
    }>;
    missing_roles: string[];
  };
}

interface PlannedConformanceSuiteRunnerFixture {
  plan: ConformanceSuitePlanFixture['expected'];
  executions: Record<string, ConformanceCaseExecution>;
  expected_results: ConformanceCaseResult[];
}

interface PlannedConformanceSuiteReportFixture {
  plan: ConformanceSuitePlanFixture['expected'];
  executions: Record<string, ConformanceCaseExecution>;
  expected_report: ConformanceSuiteReport;
}

interface ManifestRequirementsFixture {
  family: string;
  roles: string[];
  family_profile: {
    family: string;
    supported_dialects: string[];
    supported_policies: PolicyReference[];
  };
  expected_requirements: Record<string, ConformanceCaseRequirements>;
}

interface ManifestBackendRequirementsFixture {
  manifest: ConformanceManifest;
  family: string;
  roles: string[];
  family_profile: ManifestRequirementsFixture['family_profile'];
  feature_profile: {
    backend: string;
    supports_dialects: boolean;
    supported_policies: PolicyReference[];
  };
  expected: ConformanceSuitePlanFixture['expected'];
}

interface ManifestBackendReportFixture {
  manifest: ConformanceManifest;
  family: string;
  roles: string[];
  family_profile: ManifestRequirementsFixture['family_profile'];
  feature_profile: ManifestBackendRequirementsFixture['feature_profile'];
  expected_report: ConformanceSuiteReport;
}

interface SuiteDefinitionsFixture {
  suite_selector: ConformanceSuiteSelector;
  expected: ConformanceSuiteDefinition;
}

interface NamedSuiteReportFixture {
  suite_selector: ConformanceSuiteSelector;
  family_profile: {
    family: string;
    supported_dialects: string[];
    supported_policies: PolicyReference[];
  };
  executions: Record<string, ConformanceCaseExecution>;
  expected_report: ConformanceSuiteReport;
}

interface NamedSuiteRunnerFixture {
  suite_selector: ConformanceSuiteSelector;
  family_profile: NamedSuiteReportFixture['family_profile'];
  executions: Record<string, ConformanceCaseExecution>;
  expected_results: ConformanceCaseResult[];
}

interface SuiteNamesFixture {
  suite_selectors: ConformanceSuiteSelector[];
}

interface NamedSuiteEntryFixture {
  suite_selector: ConformanceSuiteSelector;
  family_profile: NamedSuiteReportFixture['family_profile'];
  executions: Record<string, ConformanceCaseExecution>;
  expected_entry: NamedConformanceSuiteReport;
}

interface FamilyPlanContextFixture {
  context: ConformanceFamilyPlanContext;
}

interface NamedSuitePlanEntryFixture {
  suite_selector: ConformanceSuiteSelector;
  context: ConformanceFamilyPlanContext;
  expected_entry: NamedConformanceSuitePlan;
}

interface NamedSuitePlansFixture {
  contexts: Record<string, ConformanceFamilyPlanContext>;
  expected_entries: NamedConformanceSuitePlan[];
}

interface NamedSuiteResultsFixture {
  suite_selector: ConformanceSuiteSelector;
  family_profile: NamedSuiteReportFixture['family_profile'];
  executions: Record<string, ConformanceCaseExecution>;
  expected_entry: NamedConformanceSuiteResults;
}

interface NamedSuiteRunnerEntriesFixture {
  contexts: Record<string, ConformanceFamilyPlanContext>;
  executions: Record<string, ConformanceCaseExecution>;
  expected_entries: NamedConformanceSuiteResults[];
}

interface NamedSuiteReportEntriesFixture {
  contexts: Record<string, ConformanceFamilyPlanContext>;
  executions: Record<string, ConformanceCaseExecution>;
  expected_entries: NamedConformanceSuiteReport[];
}

interface NamedSuiteSummaryFixture {
  entries: NamedConformanceSuiteReport[];
  expected_summary: ConformanceSuiteSummary;
}

interface NamedSuiteReportEnvelopeFixture {
  entries: NamedConformanceSuiteReport[];
  expected_report: NamedConformanceSuiteReportEnvelope;
}

interface NamedSuiteReportManifestFixture {
  contexts: Record<string, ConformanceFamilyPlanContext>;
  executions: Record<string, ConformanceCaseExecution>;
  expected_report: NamedConformanceSuiteReportEnvelope;
}

interface DefaultFamilyContextFixture {
  family: string;
  family_profile: NamedSuiteReportFixture['family_profile'];
  expected_context: {
    family_profile: NamedSuiteReportFixture['family_profile'];
  };
  expected_diagnostic: Diagnostic;
}

interface ExplicitFamilyContextModeFixture {
  manifest: ConformanceManifest;
  options: {
    contexts: Record<string, ConformanceFamilyPlanContext>;
    family_profiles: Record<string, NamedSuiteReportFixture['family_profile']>;
    require_explicit_contexts: boolean;
  };
  expected_diagnostic: Diagnostic;
}

interface MissingSuiteRolesFixture {
  manifest: ConformanceManifest;
  options: {
    contexts: Record<string, ConformanceFamilyPlanContext>;
  };
  expected_diagnostic: Diagnostic;
}

interface ConformanceManifestReportFixture {
  manifest: ConformanceManifest;
  options: {
    contexts: Record<string, ConformanceFamilyPlanContext>;
    family_profiles: Record<string, NamedSuiteReportFixture['family_profile']>;
  };
  executions: Record<string, ConformanceCaseExecution>;
  expected_report: ConformanceManifestReport;
}

interface ReviewHostHintsFixture {
  options: {
    require_explicit_contexts?: boolean;
    interactive?: boolean;
  };
  expected_hints: {
    interactive: boolean;
    require_explicit_contexts: boolean;
  };
}

interface FamilyContextReviewRequestFixture {
  family: string;
  options: {
    family_profiles: Record<string, NamedSuiteReportFixture['family_profile']>;
    require_explicit_contexts: boolean;
    review_decisions?: Array<{
      request_id: string;
      action: ReviewDecision['action'];
      context?: {
        family_profile: NamedSuiteReportFixture['family_profile'];
        feature_profile?: {
          backend: string;
          supports_dialects: boolean;
          supported_policies: PolicyReference[];
        };
      };
    }>;
  };
  expected_diagnostic: Diagnostic;
  expected_request: {
    id: string;
    kind: ReviewRequest['kind'];
    family: string;
    message: string;
    blocking: boolean;
    proposed_context?: {
      family_profile: NamedSuiteReportFixture['family_profile'];
      feature_profile?: {
        backend: string;
        supports_dialects: boolean;
        supported_policies: PolicyReference[];
      };
    };
    action_offers: Array<{
      action: ReviewActionOffer['action'];
      requires_context: boolean;
      payload_kind?: ReviewActionOffer['payloadKind'];
    }>;
    default_action?: ReviewRequest['defaultAction'];
  };
}

interface ConformanceManifestReviewStateFixture {
  manifest: ConformanceManifest;
  options: {
    contexts?: Record<string, ConformanceFamilyPlanContext>;
    family_profiles?: Record<string, NamedSuiteReportFixture['family_profile']>;
    require_explicit_contexts?: boolean;
    interactive?: boolean;
    review_decisions?: Array<{
      request_id: string;
      action: ReviewDecision['action'];
      context?: {
        family_profile: NamedSuiteReportFixture['family_profile'];
        feature_profile?: {
          backend: string;
          supports_dialects: boolean;
          supported_policies: PolicyReference[];
        };
      };
    }>;
    review_replay_context?: {
      surface: 'conformance_manifest';
      families: string[];
      require_explicit_contexts: boolean;
    };
  };
  executions: Record<string, ConformanceCaseExecution>;
  expected_state: {
    report: {
      entries: readonly NamedConformanceSuiteReport[];
      summary: ConformanceSuiteSummary;
    };
    diagnostics: Diagnostic[];
    requests: Array<{
      id: string;
      kind: ReviewRequest['kind'];
      family: string;
      message: string;
      blocking: boolean;
      action_offers: Array<{
        action: ReviewActionOffer['action'];
        requires_context: boolean;
        payload_kind?: ReviewActionOffer['payloadKind'];
      }>;
      default_action?: ReviewRequest['defaultAction'];
    }>;
    applied_decisions: Array<{
      request_id: string;
      action: ReviewDecision['action'];
    }>;
    host_hints: {
      interactive: boolean;
      require_explicit_contexts: boolean;
    };
    replay_context: {
      surface: 'conformance_manifest';
      families: string[];
      require_explicit_contexts: boolean;
    };
  };
}

interface ReviewReplayCompatibilityFixture {
  current_context: {
    surface: 'conformance_manifest';
    families: string[];
    require_explicit_contexts: boolean;
  };
  compatible_context: {
    surface: 'conformance_manifest';
    families: string[];
    require_explicit_contexts: boolean;
  };
  incompatible_context: {
    surface: 'conformance_manifest';
    families: string[];
    require_explicit_contexts: boolean;
  };
}

interface ReviewRequestIdsFixture {
  manifest: ConformanceManifest;
  options: {
    contexts?: Record<string, ConformanceFamilyPlanContext>;
    family_profiles?: Record<string, NamedSuiteReportFixture['family_profile']>;
    require_explicit_contexts?: boolean;
  };
  expected_request_ids: string[];
}

interface ReviewReplayBundleFixture {
  replay_bundle: {
    replay_context: {
      surface: 'conformance_manifest';
      families: string[];
      require_explicit_contexts: boolean;
    };
    decisions: Array<{
      request_id: string;
      action: ReviewDecision['action'];
      context?: {
        family_profile: NamedSuiteReportFixture['family_profile'];
        feature_profile?: {
          backend: string;
          supports_dialects: boolean;
          supported_policies: PolicyReference[];
        };
      };
    }>;
    reviewed_nested_executions?: ReviewedNestedExecutionFixture['execution'][];
  };
}

interface ReviewStateJsonRoundtripFixture {
  state: ConformanceManifestReviewStateFixture['expected_state'];
}

interface ReviewStateEnvelopeFixture {
  state: ConformanceManifestReviewStateFixture['expected_state'];
  expected_envelope: {
    kind: 'conformance_manifest_review_state';
    version: 1;
    state: ConformanceManifestReviewStateFixture['expected_state'];
  };
}

interface ReviewReplayBundleEnvelopeFixture extends ReviewReplayBundleFixture {
  expected_envelope: {
    kind: 'review_replay_bundle';
    version: 1;
    replay_bundle: ReviewReplayBundleFixture['replay_bundle'];
  };
}

interface ReviewTransportRejectionFixture {
  cases: Array<{
    label: string;
    envelope: Record<string, unknown>;
    expected_error: ReviewTransportImportError;
  }>;
}

interface ReviewedNestedExecutionFixture {
  execution: {
    family: string;
    review_state: {
      requests: Array<{
        id: string;
        kind: ReviewRequest['kind'];
        family: string;
        message: string;
        blocking: boolean;
        proposed_context?: {
          family_profile: NamedSuiteReportFixture['family_profile'];
          feature_profile?: {
            backend: string;
            supports_dialects: boolean;
            supported_policies: PolicyReference[];
          };
        };
        delegated_group?: ProjectedChildReviewGroupsFixture['expected_groups'][number];
        action_offers: Array<{
          action: ReviewActionOffer['action'];
          requires_context: boolean;
          payload_kind?: ReviewActionOffer['payloadKind'];
        }>;
        default_action?: ReviewRequest['defaultAction'];
      }>;
      accepted_groups: ProjectedChildReviewGroupsFixture['expected_groups'];
      applied_decisions: ReviewDecisionFixture[];
      diagnostics: DiagnosticFixtureEntry[];
    };
    applied_children: Array<{
      operation_id: string;
      output: string;
    }>;
  };
}

interface ReviewedNestedExecutionEnvelopeFixture extends ReviewedNestedExecutionFixture {
  expected_envelope: {
    kind: 'reviewed_nested_execution';
    version: 1;
    execution: ReviewedNestedExecutionFixture['execution'];
  };
}

interface ReviewedNestedExecutionPayloadFixture {
  family: string;
  review_state: ReviewedNestedExecutionFixture['execution']['review_state'];
  applied_children: ReviewedNestedExecutionFixture['execution']['applied_children'];
  expected_execution: ReviewedNestedExecutionFixture['execution'];
}

interface ReviewedNestedExecutionApplicationFixture {
  replay_bundle?: {
    replay_context: ConformanceManifestReviewStateFixture['expected_state']['replay_context'];
    decisions: ReviewDecisionFixture[];
    reviewed_nested_executions: ReviewedNestedExecutionFixture['execution'][];
  };
  review_state?: ConformanceManifestReviewStateFixture['expected_state'];
  expected_results: Array<{
    execution_family: string;
    result: {
      ok: boolean;
      diagnostics: DiagnosticFixtureEntry[];
      output?: string;
      policies: PolicyReference[];
    };
  }>;
}

interface ReviewedNestedExecutionEnvelopeApplicationFixture {
  replay_bundle_envelope?: {
    kind: string;
    version: number;
    replay_bundle: NonNullable<ReviewedNestedExecutionApplicationFixture['replay_bundle']>;
  };
  review_state_envelope?: {
    kind: string;
    version: number;
    state: NonNullable<ReviewedNestedExecutionApplicationFixture['review_state']>;
  };
  expected_application: {
    diagnostics: DiagnosticFixtureEntry[];
    results: ReviewedNestedExecutionApplicationFixture['expected_results'];
  };
}

interface ReviewedNestedManifestApplicationFixture {
  manifest: ConformanceManifest;
  options: ConformanceManifestReviewOptions;
  executions: Record<string, ConformanceCaseExecution>;
  review_replay_bundle_envelope?: unknown;
  cases?: Array<{
    name: string;
    review_replay_bundle_envelope: unknown;
    expected_state: ConformanceManifestReviewStateFixture['expected_state'];
    expected_application: {
      results: ReviewedNestedExecutionApplicationFixture['expected_results'];
    };
  }>;
  expected_state?: ConformanceManifestReviewStateFixture['expected_state'];
  expected_application?: {
    results: ReviewedNestedExecutionApplicationFixture['expected_results'];
  };
}

interface FamilyContextExplicitReviewDecisionFixture {
  family: string;
  options: {
    family_profiles: Record<string, NamedSuiteReportFixture['family_profile']>;
    require_explicit_contexts: boolean;
    review_decisions: Array<{
      request_id: string;
      action: ReviewDecision['action'];
      context?: {
        family_profile: NamedSuiteReportFixture['family_profile'];
        feature_profile?: {
          backend: string;
          supports_dialects: boolean;
          supported_policies: PolicyReference[];
        };
      };
    }>;
  };
  expected_context: {
    family_profile: NamedSuiteReportFixture['family_profile'];
    feature_profile?: {
      backend: string;
      supports_dialects: boolean;
      supported_policies: PolicyReference[];
    };
  };
  expected_applied_decisions: Array<{
    request_id: string;
    action: ReviewDecision['action'];
    context?: {
      family_profile: NamedSuiteReportFixture['family_profile'];
      feature_profile?: {
        backend: string;
        supports_dialects: boolean;
        supported_policies: PolicyReference[];
      };
    };
  }>;
}

function readFixture<T>(...segments: string[]): T {
  const fixturePath = path.resolve(process.cwd(), '..', 'fixtures', ...segments);

  return JSON.parse(readFileSync(fixturePath, 'utf8')) as T;
}

function diagnosticsFixturePath(role: string): string[] {
  const manifest = readFixture<ConformanceManifest>(
    'conformance',
    'slice-24-manifest',
    'family-feature-profiles.json'
  );
  const entry = conformanceFixturePath(manifest, 'diagnostics', role);

  if (!entry) {
    throw new Error(`missing diagnostics fixture entry for ${role}`);
  }

  return [...entry];
}

function normalizeFamilyPlanContext(raw: {
  family_profile: NamedSuiteReportFixture['family_profile'];
  feature_profile?: {
    backend: string;
    supports_dialects: boolean;
    supported_policies: PolicyReference[];
  };
}): ConformanceFamilyPlanContext {
  return {
    familyProfile: {
      family: raw.family_profile.family,
      supportedDialects: raw.family_profile.supported_dialects,
      supportedPolicies: raw.family_profile.supported_policies
    },
    featureProfile: raw.feature_profile
      ? {
          backend: raw.feature_profile.backend,
          supportsDialects: raw.feature_profile.supports_dialects,
          supportedPolicies: raw.feature_profile.supported_policies
        }
      : undefined
  };
}

function normalizeSuitePlan(raw: {
  suite: ConformanceSuiteDefinition;
  plan: {
    family: string;
    entries: Array<{
      ref: ConformanceCaseRef;
      path: string[];
      run: {
        ref: ConformanceCaseRef;
        requirements: ConformanceCaseRequirements;
        family_profile: NamedSuiteReportFixture['family_profile'];
        feature_profile?: {
          backend: string;
          supports_dialects: boolean;
          supported_policies: PolicyReference[];
        };
      };
    }>;
    missing_roles: string[];
  };
}): NamedConformanceSuitePlan {
  return {
    suite: raw.suite,
    plan: {
      family: raw.plan.family,
      entries: raw.plan.entries.map((entry) => ({
        ref: entry.ref,
        path: entry.path,
        run: {
          ref: entry.run.ref,
          requirements: entry.run.requirements,
          familyProfile: {
            family: entry.run.family_profile.family,
            supportedDialects: entry.run.family_profile.supported_dialects,
            supportedPolicies: entry.run.family_profile.supported_policies
          },
          featureProfile: entry.run.feature_profile
            ? {
                backend: entry.run.feature_profile.backend,
                supportsDialects: entry.run.feature_profile.supports_dialects,
                supportedPolicies: entry.run.feature_profile.supported_policies
              }
            : undefined
        }
      })),
      missingRoles: raw.plan.missing_roles
    }
  };
}

function normalizeSuiteResults(raw: {
  suite: ConformanceSuiteDefinition;
  results: ConformanceCaseResult[];
}): NamedConformanceSuiteResults {
  return {
    suite: raw.suite,
    results: raw.results
  };
}

function normalizeSuiteReportEnvelope(raw: {
  entries: readonly NamedConformanceSuiteReport[];
  summary: ConformanceSuiteSummary;
}): NamedConformanceSuiteReportEnvelope {
  return {
    entries: raw.entries,
    summary: raw.summary
  };
}

function normalizeDiagnostic(
  raw: Diagnostic & {
    requestId?: string;
    request_id?: string;
    action?: ReviewDecision['action'];
    reason?: ReviewDiagnosticReason;
    payloadKind?: 'conformance_family_context';
    payload_kind?: 'conformance_family_context';
    expectedFamily?: string;
    expected_family?: string;
    providedFamily?: string;
    provided_family?: string;
    review?: {
      request_id?: string;
      action?: ReviewDecision['action'];
      reason?: ReviewDiagnosticReason;
      payload_kind?: 'conformance_family_context';
      expected_family?: string;
      provided_family?: string;
    };
  }
): Diagnostic {
  const rawReview = raw.review;
  return {
    severity: raw.severity,
    category: raw.category,
    message: raw.message,
    path: raw.path,
    review:
      rawReview ||
      raw.requestId ||
      raw.request_id ||
      raw.action ||
      raw.reason ||
      raw.payloadKind ||
      raw.payload_kind ||
      raw.expectedFamily ||
      raw.expected_family ||
      raw.providedFamily ||
      raw.provided_family
        ? {
            requestId: rawReview?.request_id ?? raw.requestId ?? raw.request_id,
            action: rawReview?.action ?? raw.action,
            reason: rawReview?.reason ?? raw.reason,
            payloadKind: rawReview?.payload_kind ?? raw.payloadKind ?? raw.payload_kind,
            expectedFamily: rawReview?.expected_family ?? raw.expectedFamily ?? raw.expected_family,
            providedFamily: rawReview?.provided_family ?? raw.providedFamily ?? raw.provided_family
          }
        : undefined
  };
}

function normalizeManifestPlanningOptions(raw: {
  contexts?: Record<string, ConformanceFamilyPlanContext>;
  family_profiles?: Record<string, NamedSuiteReportFixture['family_profile']>;
  require_explicit_contexts?: boolean;
}): ConformanceManifestPlanningOptions {
  return {
    contexts: raw.contexts
      ? Object.fromEntries(
          Object.entries(raw.contexts).map(([family, context]) => [
            family,
            normalizeFamilyPlanContext(context as never)
          ])
        )
      : undefined,
    familyProfiles: raw.family_profiles
      ? Object.fromEntries(
          Object.entries(raw.family_profiles).map(([family, profile]) => [
            family,
            {
              family: profile.family,
              supportedDialects: profile.supported_dialects,
              supportedPolicies: profile.supported_policies
            }
          ])
        )
      : undefined,
    requireExplicitContexts: raw.require_explicit_contexts
  };
}

function normalizeManifestReviewOptions(raw: {
  contexts?: Record<string, ConformanceFamilyPlanContext>;
  family_profiles?: Record<string, NamedSuiteReportFixture['family_profile']>;
  require_explicit_contexts?: boolean;
  interactive?: boolean;
  review_decisions?: Array<{
    request_id: string;
    action: ReviewDecision['action'];
    context?: {
      family_profile: NamedSuiteReportFixture['family_profile'];
      feature_profile?: {
        backend: string;
        supports_dialects: boolean;
        supported_policies: PolicyReference[];
      };
    };
  }>;
  review_replay_context?: {
    surface: 'conformance_manifest';
    families: string[];
    require_explicit_contexts: boolean;
  };
  review_replay_bundle?: {
    replay_context: {
      surface: 'conformance_manifest';
      families: string[];
      require_explicit_contexts: boolean;
    };
    decisions: Array<{
      request_id: string;
      action: ReviewDecision['action'];
      context?: {
        family_profile: NamedSuiteReportFixture['family_profile'];
        feature_profile?: {
          backend: string;
          supports_dialects: boolean;
          supported_policies: PolicyReference[];
        };
      };
    }>;
    reviewed_nested_executions?: ReviewedNestedExecutionFixture['execution'][];
  };
}): ConformanceManifestReviewOptions {
  return {
    ...normalizeManifestPlanningOptions(raw),
    interactive: raw.interactive,
    reviewDecisions: raw.review_decisions?.map((decision) => ({
      requestId: decision.request_id,
      action: decision.action,
      context: decision.context ? normalizeFamilyPlanContext(decision.context) : undefined
    })),
    reviewReplayContext: raw.review_replay_context
      ? normalizeReviewReplayContext(raw.review_replay_context)
      : undefined,
    reviewReplayBundle: raw.review_replay_bundle
      ? {
          replayContext: normalizeReviewReplayContext(raw.review_replay_bundle.replay_context),
          decisions: raw.review_replay_bundle.decisions.map((decision) =>
            normalizeReviewDecision(decision)
          ),
          reviewedNestedExecutions: raw.review_replay_bundle.reviewed_nested_executions?.map(
            (execution) => normalizeReviewedNestedExecution(execution)
          )
        }
      : undefined
  };
}

function normalizeManifestReport(raw: {
  report: {
    entries: readonly NamedConformanceSuiteReport[];
    summary: ConformanceSuiteSummary;
  };
  diagnostics: Diagnostic[];
}): ConformanceManifestReport {
  return {
    report: normalizeSuiteReportEnvelope(raw.report),
    diagnostics: raw.diagnostics.map((diagnostic) => normalizeDiagnostic(diagnostic))
  };
}

function normalizeReviewRequest(raw: {
  id: string;
  kind: ReviewRequest['kind'];
  family: string;
  message: string;
  blocking: boolean;
  proposed_context?: {
    family_profile: NamedSuiteReportFixture['family_profile'];
    feature_profile?: {
      backend: string;
      supports_dialects: boolean;
      supported_policies: PolicyReference[];
    };
  };
  delegated_group?: ProjectedChildReviewGroupsFixture['expected_groups'][number];
  action_offers: Array<{
    action: ReviewActionOffer['action'];
    requires_context: boolean;
    payload_kind?: ReviewActionOffer['payloadKind'];
  }>;
  default_action?: ReviewRequest['defaultAction'];
}): ReviewRequest {
  return {
    id: raw.id,
    kind: raw.kind,
    family: raw.family,
    message: raw.message,
    blocking: raw.blocking,
    proposedContext: raw.proposed_context
      ? normalizeFamilyPlanContext(raw.proposed_context)
      : undefined,
    delegatedGroup: raw.delegated_group
      ? normalizeProjectedChildReviewGroup(raw.delegated_group)
      : undefined,
    actionOffers: raw.action_offers.map((offer) => ({
      action: offer.action,
      requiresContext: offer.requires_context,
      payloadKind: offer.payload_kind
    })),
    defaultAction: raw.default_action
  };
}

function normalizeReviewDecision(raw: {
  request_id: string;
  action: ReviewDecision['action'];
  context?: {
    family_profile: NamedSuiteReportFixture['family_profile'];
    feature_profile?: {
      backend: string;
      supports_dialects: boolean;
      supported_policies: PolicyReference[];
    };
  };
}): ReviewDecision {
  return {
    requestId: raw.request_id,
    action: raw.action,
    context: raw.context ? normalizeFamilyPlanContext(raw.context) : undefined
  };
}

function normalizeReviewHostHints(raw: {
  interactive: boolean;
  require_explicit_contexts: boolean;
}): ReviewHostHints {
  return {
    interactive: raw.interactive,
    requireExplicitContexts: raw.require_explicit_contexts
  };
}

function normalizeReviewReplayContext(raw: {
  surface: 'conformance_manifest';
  families: string[];
  require_explicit_contexts: boolean;
}): ReviewReplayContext {
  return {
    surface: raw.surface,
    families: raw.families,
    requireExplicitContexts: raw.require_explicit_contexts
  };
}

function normalizeReviewReplayBundleEnvelope(raw: {
  kind: ReviewReplayBundleEnvelope['kind'];
  version: number;
  replay_bundle: {
    replay_context: {
      surface: 'conformance_manifest';
      families: string[];
      require_explicit_contexts: boolean;
    };
    decisions: ReviewDecisionFixture[];
    reviewed_nested_executions?: ReviewedNestedExecutionFixture[];
  };
}): ReviewReplayBundleEnvelope {
  return {
    kind: raw.kind,
    version: raw.version,
    replayBundle: {
      replayContext: normalizeReviewReplayContext(raw.replay_bundle.replay_context),
      decisions: raw.replay_bundle.decisions.map((decision) => normalizeReviewDecision(decision)),
      ...(raw.replay_bundle.reviewed_nested_executions
        ? {
            reviewedNestedExecutions: raw.replay_bundle.reviewed_nested_executions.map(
              (execution) => normalizeReviewedNestedExecution(execution)
            )
          }
        : {})
    }
  };
}

function normalizeReviewStateEnvelope(raw: {
  kind: ConformanceManifestReviewStateEnvelope['kind'];
  version: number;
  state: ConformanceManifestReviewStateFixture['expected_state'];
}): ConformanceManifestReviewStateEnvelope {
  return {
    kind: raw.kind,
    version: raw.version,
    state: normalizeManifestReviewState(raw.state as never)
  };
}

function normalizeManifestReviewState(raw: {
  report: {
    entries: readonly NamedConformanceSuiteReport[];
    summary: ConformanceSuiteSummary;
  };
  diagnostics: Diagnostic[];
  requests: Array<{
    id: string;
    kind: ReviewRequest['kind'];
    family: string;
    message: string;
    blocking: boolean;
    action_offers: Array<{
      action: ReviewActionOffer['action'];
      requires_context: boolean;
      payload_kind?: ReviewActionOffer['payloadKind'];
    }>;
    default_action?: ReviewRequest['defaultAction'];
  }>;
  applied_decisions: Array<{
    request_id: string;
    action: ReviewDecision['action'];
  }>;
  host_hints: {
    interactive: boolean;
    require_explicit_contexts: boolean;
  };
  replay_context: {
    surface: 'conformance_manifest';
    families: string[];
    require_explicit_contexts: boolean;
  };
  reviewed_nested_executions?: ReviewedNestedExecutionFixture['execution'][];
}): ConformanceManifestReviewState {
  return {
    report: normalizeSuiteReportEnvelope(raw.report),
    diagnostics: raw.diagnostics.map((diagnostic) => normalizeDiagnostic(diagnostic)),
    requests: raw.requests.map((request) => normalizeReviewRequest(request)),
    appliedDecisions: raw.applied_decisions.map((decision) => normalizeReviewDecision(decision)),
    hostHints: normalizeReviewHostHints(raw.host_hints),
    replayContext: normalizeReviewReplayContext(raw.replay_context),
    ...(raw.reviewed_nested_executions
      ? {
          reviewedNestedExecutions: raw.reviewed_nested_executions.map((execution) =>
            normalizeReviewedNestedExecution(execution)
          )
        }
      : {})
  };
}

function normalizeReviewedNestedExecution(
  raw: ReviewedNestedExecutionFixture['execution']
): ReviewedNestedExecution {
  return {
    family: raw.family,
    reviewState: {
      requests: raw.review_state.requests.map((request) => normalizeReviewRequest(request)),
      acceptedGroups: raw.review_state.accepted_groups.map((group) =>
        normalizeProjectedChildReviewGroup(group)
      ),
      appliedDecisions: raw.review_state.applied_decisions.map((decision) =>
        normalizeReviewDecision(decision)
      ),
      diagnostics: raw.review_state.diagnostics.map((diagnostic) => normalizeDiagnostic(diagnostic))
    },
    appliedChildren: raw.applied_children.map((entry) => ({
      operationId: entry.operation_id,
      output: entry.output
    }))
  };
}

function reviewedNestedExecutionCallbacks(
  execution: ReviewedNestedExecution,
  expectedOutput: string
) {
  return {
    mergeParent: () => ({
      ok: true as const,
      diagnostics: [],
      output: `${execution.family}-merged-parent`,
      policies: []
    }),
    discoverOperations: () => ({
      ok: true as const,
      diagnostics: [],
      operations: execution.reviewState.acceptedGroups.map((group) => ({
        operationId: group.childOperationId,
        parentOperationId: group.parentOperationId,
        requestedStrategy: 'delegate_child_surface' as const,
        languageChain:
          execution.family === 'markdown' ? ['markdown', 'typescript'] : ['ruby', 'ruby'],
        surface: {
          surfaceKind: execution.family === 'markdown' ? 'fenced_code_block' : 'yard_example',
          effectiveLanguage: execution.family === 'markdown' ? 'typescript' : 'ruby',
          address: group.delegatedRuntimeSurfacePath,
          owner: {
            kind: 'owned_region' as const,
            address: execution.family === 'markdown' ? '/code_fence/0' : '/yard_example/1'
          },
          reconstructionStrategy: 'portable_write',
          metadata: { family: execution.family === 'markdown' ? 'typescript' : 'ruby' }
        }
      }))
    }),
    applyResolvedOutputs: (
      _mergedOutput: string,
      _operations: readonly DelegatedChildOperation[],
      _applyPlan: unknown,
      appliedChildren: readonly { operationId: string; output: string }[]
    ) => {
      expect(appliedChildren).toEqual(execution.appliedChildren);
      return {
        ok: true as const,
        diagnostics: [],
        output: expectedOutput,
        policies: []
      };
    }
  };
}

function normalizeSurfaceOwnerRef(raw: {
  kind: 'structural_owner' | 'owned_region' | 'parent_surface';
  address: string;
}): SurfaceOwnerRef {
  return {
    kind: raw.kind,
    address: raw.address
  };
}

function normalizeSurfaceSpan(raw?: {
  start_line: number;
  end_line: number;
}): SurfaceSpan | undefined {
  if (!raw) {
    return undefined;
  }

  return {
    startLine: raw.start_line,
    endLine: raw.end_line
  };
}

function normalizeDiscoveredSurface(raw: SurfaceOwnershipFixture['surface']): DiscoveredSurface {
  return {
    surfaceKind: raw.surface_kind,
    declaredLanguage: raw.declared_language,
    effectiveLanguage: raw.effective_language,
    address: raw.address,
    parentAddress: raw.parent_address,
    span: normalizeSurfaceSpan(raw.span),
    owner: normalizeSurfaceOwnerRef(raw.owner),
    reconstructionStrategy: raw.reconstruction_strategy,
    metadata: raw.metadata
  };
}

function normalizeDelegatedChildOperation(
  raw: DelegatedChildOperationFixture['operation']
): DelegatedChildOperation {
  return {
    operationId: raw.operation_id,
    parentOperationId: raw.parent_operation_id,
    requestedStrategy: raw.requested_strategy,
    languageChain: raw.language_chain,
    surface: normalizeDiscoveredSurface(raw.surface)
  };
}

function normalizeStructuredEditStructureProfile(
  raw: StructuredEditStructureProfileFixture['cases'][number]['profile']
): StructuredEditStructureProfile {
  return {
    ownerScope: raw.owner_scope,
    ownerSelector: raw.owner_selector,
    ownerSelectorFamily: raw.owner_selector_family,
    knownOwnerSelector: raw.known_owner_selector,
    supportedCommentRegions: raw.supported_comment_regions,
    metadata: raw.metadata
  };
}

function normalizeStructuredEditSelectionProfile(
  raw: StructuredEditSelectionProfileFixture['cases'][number]['profile']
): StructuredEditSelectionProfile {
  return {
    ownerScope: raw.owner_scope,
    ownerSelector: raw.owner_selector,
    ownerSelectorFamily: raw.owner_selector_family,
    selectorKind: raw.selector_kind,
    selectionIntent: raw.selection_intent,
    selectionIntentFamily: raw.selection_intent_family,
    knownSelectionIntent: raw.known_selection_intent,
    commentRegion: raw.comment_region ?? undefined,
    includeTrailingGap: raw.include_trailing_gap,
    commentAnchored: raw.comment_anchored,
    metadata: raw.metadata
  };
}

function normalizeStructuredEditMatchProfile(
  raw: StructuredEditMatchProfileFixture['cases'][number]['profile']
): StructuredEditMatchProfile {
  return {
    startBoundary: raw.start_boundary,
    startBoundaryFamily: raw.start_boundary_family,
    knownStartBoundary: raw.known_start_boundary,
    endBoundary: raw.end_boundary,
    endBoundaryFamily: raw.end_boundary_family,
    knownEndBoundary: raw.known_end_boundary,
    payloadKind: raw.payload_kind,
    payloadFamily: raw.payload_family,
    knownPayloadKind: raw.known_payload_kind,
    commentAnchored: raw.comment_anchored,
    trailingGapExtended: raw.trailing_gap_extended,
    metadata: raw.metadata
  };
}

function normalizeStructuredEditOperationProfile(
  raw: StructuredEditOperationProfileFixture['cases'][number]['profile']
): StructuredEditOperationProfile {
  return {
    operationKind: raw.operation_kind,
    operationFamily: raw.operation_family,
    knownOperationKind: raw.known_operation_kind,
    sourceRequirement: raw.source_requirement,
    destinationRequirement: raw.destination_requirement,
    replacementSource: raw.replacement_source,
    capturesSourceText: raw.captures_source_text,
    supportsIfMissing: raw.supports_if_missing,
    metadata: raw.metadata
  };
}

function normalizeStructuredEditDestinationProfile(
  raw: StructuredEditDestinationProfileFixture['cases'][number]['profile']
): StructuredEditDestinationProfile {
  return {
    resolutionKind: raw.resolution_kind,
    resolutionSource: raw.resolution_source,
    anchorBoundary: raw.anchor_boundary,
    resolutionFamily: raw.resolution_family,
    resolutionSourceFamily: raw.resolution_source_family,
    anchorBoundaryFamily: raw.anchor_boundary_family,
    knownResolutionKind: raw.known_resolution_kind,
    knownResolutionSource: raw.known_resolution_source,
    knownAnchorBoundary: raw.known_anchor_boundary,
    usedIfMissing: raw.used_if_missing,
    metadata: raw.metadata
  };
}

function normalizeStructuredEditRequest(
  raw: StructuredEditRequestFixture['cases'][number]['request']
): StructuredEditRequest {
  return {
    operationKind: raw.operation_kind,
    content: raw.content,
    sourceLabel: raw.source_label,
    targetSelector: raw.target_selector ?? undefined,
    targetSelectorFamily: raw.target_selector_family ?? undefined,
    destinationSelector: raw.destination_selector ?? undefined,
    destinationSelectorFamily: raw.destination_selector_family ?? undefined,
    payloadText: raw.payload_text ?? undefined,
    ifMissing: raw.if_missing ?? undefined,
    metadata: raw.metadata
  };
}

function normalizeStructuredEditResult(
  raw: StructuredEditResultFixture['cases'][number]['result']
): StructuredEditResult {
  return {
    operationKind: raw.operation_kind,
    updatedContent: raw.updated_content,
    changed: raw.changed,
    capturedText: raw.captured_text ?? undefined,
    matchCount: raw.match_count ?? undefined,
    operationProfile: normalizeStructuredEditOperationProfile(raw.operation_profile),
    destinationProfile: raw.destination_profile
      ? normalizeStructuredEditDestinationProfile(raw.destination_profile)
      : undefined,
    metadata: raw.metadata
  };
}

function normalizeStructuredEditApplication(
  raw: StructuredEditApplicationFixture['cases'][number]['application']
): StructuredEditApplication {
  return {
    request: normalizeStructuredEditRequest(raw.request),
    result: normalizeStructuredEditResult(raw.result),
    metadata: raw.metadata
  };
}

function normalizeStructuredEditApplicationEnvelope(
  raw: StructuredEditApplicationEnvelopeFixture['expected_envelope']
): StructuredEditApplicationEnvelope {
  return {
    kind: raw.kind,
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    application: normalizeStructuredEditApplication(raw.application)
  };
}

function normalizeStructuredEditExecutionReport(
  raw: StructuredEditExecutionReportFixture['cases'][number]['report']
): StructuredEditExecutionReport {
  return {
    application: normalizeStructuredEditApplication(raw.application),
    providerFamily: raw.provider_family,
    providerBackend: raw.provider_backend ?? undefined,
    diagnostics: raw.diagnostics.map((diagnostic) => normalizeDiagnostic(diagnostic)),
    metadata: raw.metadata
  };
}

function normalizeStructuredEditProviderExecutionRequest(
  raw: StructuredEditProviderExecutionRequestFixture['cases'][number]['execution_request']
): StructuredEditProviderExecutionRequest {
  return {
    request: normalizeStructuredEditRequest(raw.request),
    providerFamily: raw.provider_family,
    providerBackend: raw.provider_backend ?? undefined,
    metadata: raw.metadata
  };
}

function normalizeStructuredEditProviderExecutionApplication(
  raw: StructuredEditProviderExecutionApplicationFixture['cases'][number]['application']
): StructuredEditProviderExecutionApplication {
  return {
    executionRequest: normalizeStructuredEditProviderExecutionRequest(raw.execution_request),
    report: normalizeStructuredEditExecutionReport(raw.report),
    metadata: raw.metadata
  };
}

function normalizeStructuredEditProviderExecutionDispatch(
  raw: StructuredEditProviderExecutionDispatchFixture['cases'][number]['dispatch']
): StructuredEditProviderExecutionDispatch {
  return {
    executionRequest: normalizeStructuredEditProviderExecutionRequest(raw.execution_request),
    resolvedProviderFamily: raw.resolved_provider_family,
    resolvedProviderBackend: raw.resolved_provider_backend,
    executorLabel: raw.executor_label,
    metadata: raw.metadata
  };
}

function normalizeStructuredEditProviderExecutionDispatchEnvelope(
  raw: StructuredEditProviderExecutionDispatchEnvelopeFixture['expected_envelope']
): StructuredEditProviderExecutionDispatchEnvelope {
  return {
    kind: raw.kind,
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    providerExecutionDispatch: normalizeStructuredEditProviderExecutionDispatch(
      raw.provider_execution_dispatch
    )
  };
}

function normalizeStructuredEditProviderExecutionOutcome(
  raw: StructuredEditProviderExecutionOutcomeFixture['cases'][number]['outcome']
): StructuredEditProviderExecutionOutcome {
  return {
    dispatch: normalizeStructuredEditProviderExecutionDispatch(raw.dispatch),
    application: normalizeStructuredEditProviderExecutionApplication(raw.application),
    metadata: raw.metadata
  };
}

function normalizeStructuredEditProviderExecutionOutcomeEnvelope(
  raw: StructuredEditProviderExecutionOutcomeEnvelopeFixture['expected_envelope']
): StructuredEditProviderExecutionOutcomeEnvelope {
  return {
    kind: raw.kind,
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    providerExecutionOutcome: normalizeStructuredEditProviderExecutionOutcome(
      raw.provider_execution_outcome
    )
  };
}

function normalizeStructuredEditProviderBatchExecutionOutcome(
  raw: StructuredEditProviderBatchExecutionOutcomeFixture['cases'][number]['batch_outcome']
): StructuredEditProviderBatchExecutionOutcome {
  return {
    outcomes: raw.outcomes.map((entry) => normalizeStructuredEditProviderExecutionOutcome(entry)),
    metadata: raw.metadata
  };
}

function normalizeStructuredEditProviderBatchExecutionOutcomeEnvelope(
  raw: StructuredEditProviderBatchExecutionOutcomeEnvelopeFixture['expected_envelope']
): StructuredEditProviderBatchExecutionOutcomeEnvelope {
  return {
    kind: raw.kind,
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchOutcome: normalizeStructuredEditProviderBatchExecutionOutcome(raw.batch_outcome)
  };
}

function normalizeStructuredEditProviderExecutionProvenance(
  raw: StructuredEditProviderExecutionProvenanceFixture['cases'][number]['provenance']
): StructuredEditProviderExecutionProvenance {
  return {
    dispatch: normalizeStructuredEditProviderExecutionDispatch(raw.dispatch),
    outcome: normalizeStructuredEditProviderExecutionOutcome(raw.outcome),
    diagnostics: raw.diagnostics.map((entry) => normalizeDiagnostic(entry)),
    metadata: raw.metadata
  };
}

function normalizeStructuredEditProviderExecutionProvenanceEnvelope(
  raw: StructuredEditProviderExecutionProvenanceEnvelopeFixture['expected_envelope']
): StructuredEditProviderExecutionProvenanceEnvelope {
  return {
    kind: raw.kind,
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    provenance: normalizeStructuredEditProviderExecutionProvenance(raw.provenance)
  };
}

function normalizeStructuredEditProviderBatchExecutionProvenance(
  raw: StructuredEditProviderBatchExecutionProvenanceFixture['cases'][number]['batch_provenance']
): StructuredEditProviderBatchExecutionProvenance {
  return {
    provenances: raw.provenances.map((entry) =>
      normalizeStructuredEditProviderExecutionProvenance(entry)
    ),
    metadata: raw.metadata
  };
}

function normalizeStructuredEditProviderBatchExecutionProvenanceEnvelope(
  raw: StructuredEditProviderBatchExecutionProvenanceEnvelopeFixture['expected_envelope']
): StructuredEditProviderBatchExecutionProvenanceEnvelope {
  return {
    kind: raw.kind,
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchProvenance: normalizeStructuredEditProviderBatchExecutionProvenance(raw.batch_provenance)
  };
}

function normalizeStructuredEditProviderExecutionReplayBundle(
  raw: StructuredEditProviderExecutionReplayBundleFixture['cases'][number]['replay_bundle']
): StructuredEditProviderExecutionReplayBundle {
  return {
    executionRequest: normalizeStructuredEditProviderExecutionRequest(raw.execution_request),
    provenance: normalizeStructuredEditProviderExecutionProvenance(raw.provenance),
    metadata: raw.metadata
  };
}

function normalizeStructuredEditProviderExecutionReplayBundleEnvelope(
  raw: StructuredEditProviderExecutionReplayBundleEnvelopeFixture['expected_envelope']
): StructuredEditProviderExecutionReplayBundleEnvelope {
  return {
    kind: raw.kind,
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    replayBundle: normalizeStructuredEditProviderExecutionReplayBundle(raw.replay_bundle)
  };
}

function normalizeStructuredEditProviderBatchExecutionReplayBundle(
  raw: StructuredEditProviderBatchExecutionReplayBundleFixture['cases'][number]['batch_replay_bundle']
): StructuredEditProviderBatchExecutionReplayBundle {
  return {
    replayBundles: raw.replay_bundles.map((entry) =>
      normalizeStructuredEditProviderExecutionReplayBundle(entry)
    ),
    metadata: raw.metadata
  };
}

function normalizeStructuredEditProviderBatchExecutionReplayBundleEnvelope(
  raw: StructuredEditProviderBatchExecutionReplayBundleEnvelopeFixture['expected_envelope']
): StructuredEditProviderBatchExecutionReplayBundleEnvelope {
  return {
    kind: raw.kind,
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchReplayBundle: normalizeStructuredEditProviderBatchExecutionReplayBundle(
      raw.batch_replay_bundle
    )
  };
}

function normalizeStructuredEditProviderExecutorProfile(
  raw: StructuredEditProviderExecutorProfileFixture['cases'][number]['executor_profile']
): StructuredEditProviderExecutorProfile {
  return {
    providerFamily: raw.provider_family,
    providerBackend: raw.provider_backend,
    executorLabel: raw.executor_label,
    structureProfile: normalizeStructuredEditStructureProfile(raw.structure_profile),
    selectionProfile: normalizeStructuredEditSelectionProfile(raw.selection_profile),
    matchProfile: normalizeStructuredEditMatchProfile(raw.match_profile),
    operationProfiles: raw.operation_profiles.map((entry) =>
      normalizeStructuredEditOperationProfile(entry)
    ),
    destinationProfile: normalizeStructuredEditDestinationProfile(raw.destination_profile),
    metadata: raw.metadata
  };
}

function normalizeStructuredEditProviderExecutorProfileEnvelope(
  raw: StructuredEditProviderExecutorProfileEnvelopeFixture['expected_envelope']
): StructuredEditProviderExecutorProfileEnvelope {
  return {
    kind: raw.kind,
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    executorProfile: normalizeStructuredEditProviderExecutorProfile(raw.executor_profile)
  };
}

function normalizeStructuredEditProviderExecutorRegistry(
  raw: StructuredEditProviderExecutorRegistryFixture['cases'][number]['executor_registry']
): StructuredEditProviderExecutorRegistry {
  return {
    executorProfiles: raw.executor_profiles.map((entry) =>
      normalizeStructuredEditProviderExecutorProfile(entry)
    ),
    metadata: raw.metadata
  };
}

function normalizeStructuredEditProviderExecutorRegistryEnvelope(
  raw: StructuredEditProviderExecutorRegistryEnvelopeFixture['expected_envelope']
): StructuredEditProviderExecutorRegistryEnvelope {
  return {
    kind: raw.kind,
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    executorRegistry: normalizeStructuredEditProviderExecutorRegistry(raw.executor_registry)
  };
}

function normalizeStructuredEditProviderExecutorSelectionPolicy(
  raw: StructuredEditProviderExecutorSelectionPolicyFixture['cases'][number]['selection_policy']
): StructuredEditProviderExecutorSelectionPolicy {
  const selectionPolicy: StructuredEditProviderExecutorSelectionPolicy = {
    providerFamily: raw.provider_family,
    selectionMode: raw.selection_mode,
    allowRegistryFallback: raw.allow_registry_fallback
  };

  if (raw.provider_backend !== undefined) {
    selectionPolicy.providerBackend = raw.provider_backend;
  }

  if (raw.executor_label !== undefined) {
    selectionPolicy.executorLabel = raw.executor_label;
  }

  if (raw.metadata !== undefined) {
    selectionPolicy.metadata = raw.metadata;
  }

  return selectionPolicy;
}

function normalizeStructuredEditProviderExecutorSelectionPolicyEnvelope(
  raw: StructuredEditProviderExecutorSelectionPolicyEnvelopeFixture['expected_envelope']
): StructuredEditProviderExecutorSelectionPolicyEnvelope {
  return {
    kind: raw.kind,
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    selectionPolicy: normalizeStructuredEditProviderExecutorSelectionPolicy(raw.selection_policy)
  };
}

function normalizeStructuredEditProviderExecutorResolution(
  raw: StructuredEditProviderExecutorResolutionFixture['cases'][number]['executor_resolution']
): StructuredEditProviderExecutorResolution {
  return {
    executorRegistry: normalizeStructuredEditProviderExecutorRegistry(raw.executor_registry),
    selectionPolicy: normalizeStructuredEditProviderExecutorSelectionPolicy(raw.selection_policy),
    selectedExecutorProfile: normalizeStructuredEditProviderExecutorProfile(
      raw.selected_executor_profile
    ),
    metadata: raw.metadata
  };
}

function normalizeStructuredEditProviderExecutorResolutionEnvelope(
  raw: StructuredEditProviderExecutorResolutionEnvelopeFixture['expected_envelope']
): StructuredEditProviderExecutorResolutionEnvelope {
  return {
    kind: raw.kind,
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    executorResolution: normalizeStructuredEditProviderExecutorResolution(raw.executor_resolution)
  };
}

function normalizeStructuredEditProviderExecutionPlan(
  raw: StructuredEditProviderExecutionPlanFixture['cases'][number]['execution_plan']
): StructuredEditProviderExecutionPlan {
  return {
    executionRequest: normalizeStructuredEditProviderExecutionRequest(raw.execution_request),
    executorResolution: normalizeStructuredEditProviderExecutorResolution(raw.executor_resolution),
    metadata: raw.metadata
  };
}

function normalizeStructuredEditProviderExecutionHandoff(
  raw: StructuredEditProviderExecutionHandoffFixture['cases'][number]['execution_handoff']
): StructuredEditProviderExecutionHandoff {
  return {
    executionPlan: normalizeStructuredEditProviderExecutionPlan(raw.execution_plan),
    executionDispatch: normalizeStructuredEditProviderExecutionDispatch(raw.execution_dispatch),
    metadata: raw.metadata
  };
}

function normalizeStructuredEditProviderExecutionHandoffEnvelope(
  raw: StructuredEditProviderExecutionHandoffEnvelopeFixture['expected_envelope']
): StructuredEditProviderExecutionHandoffEnvelope {
  return {
    kind: raw.kind,
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    executionHandoff: normalizeStructuredEditProviderExecutionHandoff(raw.execution_handoff)
  };
}

function normalizeStructuredEditProviderBatchExecutionHandoff(
  raw: StructuredEditProviderBatchExecutionHandoffFixture['cases'][number]['batch_execution_handoff']
): StructuredEditProviderBatchExecutionHandoff {
  return {
    handoffs: raw.handoffs.map((handoff) =>
      normalizeStructuredEditProviderExecutionHandoff(handoff)
    ),
    metadata: raw.metadata
  };
}

function normalizeStructuredEditProviderBatchExecutionHandoffEnvelope(
  raw: StructuredEditProviderBatchExecutionHandoffEnvelopeFixture['expected_envelope']
): StructuredEditProviderBatchExecutionHandoffEnvelope {
  return {
    kind: raw.kind,
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchExecutionHandoff: normalizeStructuredEditProviderBatchExecutionHandoff(
      raw.batch_execution_handoff
    )
  };
}

function normalizeStructuredEditProviderExecutionPlanEnvelope(
  raw: StructuredEditProviderExecutionPlanEnvelopeFixture['expected_envelope']
): StructuredEditProviderExecutionPlanEnvelope {
  return {
    kind: raw.kind,
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    executionPlan: normalizeStructuredEditProviderExecutionPlan(raw.execution_plan)
  };
}

function normalizeStructuredEditProviderBatchExecutionPlan(
  raw: StructuredEditProviderBatchExecutionPlanFixture['cases'][number]['batch_execution_plan']
): StructuredEditProviderBatchExecutionPlan {
  return {
    plans: raw.plans.map((plan) => normalizeStructuredEditProviderExecutionPlan(plan)),
    metadata: raw.metadata
  };
}

function normalizeStructuredEditProviderBatchExecutionPlanEnvelope(
  raw: StructuredEditProviderBatchExecutionPlanEnvelopeFixture['expected_envelope']
): StructuredEditProviderBatchExecutionPlanEnvelope {
  return {
    kind: raw.kind,
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchExecutionPlan: normalizeStructuredEditProviderBatchExecutionPlan(raw.batch_execution_plan)
  };
}

function normalizeStructuredEditProviderExecutionApplicationEnvelope(
  raw: StructuredEditProviderExecutionApplicationEnvelopeFixture['expected_envelope']
): StructuredEditProviderExecutionApplicationEnvelope {
  return {
    kind: raw.kind,
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    providerExecutionApplication: normalizeStructuredEditProviderExecutionApplication(
      raw.provider_execution_application
    )
  };
}

function normalizeStructuredEditProviderExecutionRequestEnvelope(
  raw: StructuredEditProviderExecutionRequestEnvelopeFixture['expected_envelope']
): StructuredEditProviderExecutionRequestEnvelope {
  return {
    kind: raw.kind,
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    executionRequest: normalizeStructuredEditProviderExecutionRequest(raw.execution_request)
  };
}

function normalizeStructuredEditExecutionReportEnvelope(
  raw: StructuredEditExecutionReportEnvelopeFixture['expected_envelope']
): StructuredEditExecutionReportEnvelope {
  return {
    kind: raw.kind,
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    report: normalizeStructuredEditExecutionReport(raw.report)
  };
}

function normalizeStructuredEditBatchRequest(
  raw: StructuredEditBatchRequestFixture['cases'][number]['batch_request']
): StructuredEditBatchRequest {
  return {
    requests: raw.requests.map((request) => normalizeStructuredEditRequest(request)),
    metadata: raw.metadata
  };
}

function normalizeStructuredEditProviderBatchExecutionRequest(
  raw: StructuredEditProviderBatchExecutionRequestFixture['cases'][number]['batch_execution_request']
): StructuredEditProviderBatchExecutionRequest {
  return {
    requests: raw.requests.map((request) =>
      normalizeStructuredEditProviderExecutionRequest(request)
    ),
    metadata: raw.metadata
  };
}

function normalizeStructuredEditProviderBatchExecutionDispatch(
  raw: StructuredEditProviderBatchExecutionDispatchFixture['cases'][number]['batch_dispatch']
): StructuredEditProviderBatchExecutionDispatch {
  return {
    dispatches: raw.dispatches.map((dispatch) =>
      normalizeStructuredEditProviderExecutionDispatch(dispatch)
    ),
    metadata: raw.metadata
  };
}

function normalizeStructuredEditProviderBatchExecutionDispatchEnvelope(
  raw: StructuredEditProviderBatchExecutionDispatchEnvelopeFixture['expected_envelope']
): StructuredEditProviderBatchExecutionDispatchEnvelope {
  return {
    kind: raw.kind,
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchDispatch: normalizeStructuredEditProviderBatchExecutionDispatch(raw.batch_dispatch)
  };
}

function normalizeStructuredEditProviderBatchExecutionReport(
  raw: StructuredEditProviderBatchExecutionReportFixture['cases'][number]['batch_report']
): StructuredEditProviderBatchExecutionReport {
  return {
    applications: raw.applications.map((application) =>
      normalizeStructuredEditProviderExecutionApplication(application)
    ),
    diagnostics: raw.diagnostics.map((diagnostic) => normalizeDiagnostic(diagnostic)),
    metadata: raw.metadata
  };
}

function normalizeStructuredEditProviderBatchExecutionReportEnvelope(
  raw: StructuredEditProviderBatchExecutionReportEnvelopeFixture['expected_envelope']
): StructuredEditProviderBatchExecutionReportEnvelope {
  return {
    kind: raw.kind,
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchReport: normalizeStructuredEditProviderBatchExecutionReport(raw.batch_report)
  };
}

function normalizeStructuredEditProviderBatchExecutionRequestEnvelope(
  raw: StructuredEditProviderBatchExecutionRequestEnvelopeFixture['expected_envelope']
): StructuredEditProviderBatchExecutionRequestEnvelope {
  return {
    kind: raw.kind,
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchExecutionRequest: normalizeStructuredEditProviderBatchExecutionRequest(
      raw.batch_execution_request
    )
  };
}

function normalizeStructuredEditBatchReport(
  raw: StructuredEditBatchReportFixture['cases'][number]['batch_report']
): StructuredEditBatchReport {
  return {
    reports: raw.reports.map((report) => normalizeStructuredEditExecutionReport(report)),
    diagnostics: raw.diagnostics.map((diagnostic) => normalizeDiagnostic(diagnostic)),
    metadata: raw.metadata
  };
}

function normalizeStructuredEditBatchReportEnvelope(
  raw: StructuredEditBatchReportEnvelopeFixture['expected_envelope']
): StructuredEditBatchReportEnvelope {
  return {
    kind: raw.kind,
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchReport: normalizeStructuredEditBatchReport(raw.batch_report)
  };
}

function normalizeProjectedChildReviewCase(
  raw: ProjectedChildReviewCasesFixture['cases'][number]
): ProjectedChildReviewCase {
  return {
    caseId: raw.case_id,
    parentOperationId: raw.parent_operation_id,
    childOperationId: raw.child_operation_id,
    surfacePath: raw.surface_path,
    delegatedCaseId: raw.delegated_case_id,
    delegatedApplyGroup: raw.delegated_apply_group,
    delegatedRuntimeSurfacePath: raw.delegated_runtime_surface_path
  };
}

function normalizeProjectedChildReviewGroup(
  raw: ProjectedChildReviewGroupsFixture['expected_groups'][number]
): ProjectedChildReviewGroup {
  return {
    delegatedApplyGroup: raw.delegated_apply_group,
    parentOperationId: raw.parent_operation_id,
    childOperationId: raw.child_operation_id,
    delegatedRuntimeSurfacePath: raw.delegated_runtime_surface_path,
    caseIds: raw.case_ids,
    delegatedCaseIds: raw.delegated_case_ids
  };
}

function normalizeProjectedChildReviewGroupProgress(
  raw: ProjectedChildReviewGroupProgressFixture['expected_progress'][number]
): ProjectedChildReviewGroupProgress {
  return {
    delegatedApplyGroup: raw.delegated_apply_group,
    parentOperationId: raw.parent_operation_id,
    childOperationId: raw.child_operation_id,
    delegatedRuntimeSurfacePath: raw.delegated_runtime_surface_path,
    resolvedCaseIds: raw.resolved_case_ids,
    pendingCaseIds: raw.pending_case_ids,
    complete: raw.complete
  };
}

describe('ast-merge shared fixtures', () => {
  it('conforms to the slice-02 diagnostic vocabulary fixture', () => {
    const fixture = readFixture<DiagnosticFixture>(
      ...diagnosticsFixturePath('diagnostic_vocabulary')
    );

    const severities: DiagnosticSeverity[] = ['info', 'warning', 'error'];
    const categories: DiagnosticCategory[] = [
      'parse_error',
      'destination_parse_error',
      'unsupported_feature',
      'fallback_applied',
      'ambiguity',
      'assumed_default',
      'configuration_error',
      'replay_rejected'
    ];

    expect(severities).toEqual(fixture.severities);
    expect(categories).toEqual(fixture.categories);
  });

  it('conforms to the slice-17 policy vocabulary fixture', () => {
    const fixture = readFixture<PolicyFixture>(...diagnosticsFixturePath('policy_vocabulary'));

    const surfaces: PolicySurface[] = ['fallback', 'array'];
    const policies: PolicyReference[] = [
      {
        surface: 'fallback',
        name: 'trailing_comma_destination_fallback'
      },
      {
        surface: 'array',
        name: 'destination_wins_array'
      }
    ];

    expect(surfaces).toEqual(fixture.surfaces);
    expect(policies).toEqual(fixture.policies);
  });

  it('conforms to the slice-18 policy reporting fixture', () => {
    const fixture = readFixture<PolicyReportingFixture>(
      ...diagnosticsFixturePath('policy_reporting')
    );

    const mergePolicies: PolicyReference[] = [
      {
        surface: 'array',
        name: 'destination_wins_array'
      },
      {
        surface: 'fallback',
        name: 'trailing_comma_destination_fallback'
      }
    ];

    expect(mergePolicies).toEqual(fixture.merge_policies);
  });

  it('conforms to the slice-22 shared family feature profile fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const fixture = readFixture<FamilyFeatureProfileFixture>(
      ...((conformanceFixturePath(manifest, 'diagnostics', 'shared_family_feature_profile') ??
        []) as string[])
    );

    const featureProfile: FamilyFeatureProfile = {
      family: 'example',
      supportedDialects: ['alpha', 'beta'],
      supportedPolicies: [
        {
          surface: 'array',
          name: 'destination_wins_array'
        }
      ]
    };

    expect({
      family: featureProfile.family,
      supported_dialects: featureProfile.supportedDialects,
      supported_policies: featureProfile.supportedPolicies
    }).toEqual(fixture.feature_profile);
  });

  it('conforms to the template source path mapping fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const fixture = readFixture<TemplateSourcePathMappingFixture>(
      ...((conformanceFixturePath(manifest, 'diagnostics', 'template_source_path_mapping') ??
        []) as string[])
    );

    for (const testCase of fixture.cases) {
      expect(normalizeTemplateSourcePath(testCase.template_source_path)).toBe(
        testCase.expected_destination_path
      );
    }
  });

  it('conforms to the template target classification fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const fixture = readFixture<TemplateTargetClassificationFixture>(
      ...((conformanceFixturePath(manifest, 'diagnostics', 'template_target_classification') ??
        []) as string[])
    );

    for (const testCase of fixture.cases) {
      const actual = classifyTemplateTargetPath(testCase.destination_path);
      expect({
        destination_path: actual.destinationPath,
        file_type: actual.fileType,
        family: actual.family,
        dialect: actual.dialect
      }).toEqual(testCase.expected);
    }
  });

  it('conforms to the template destination mapping fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const fixture = readFixture<TemplateDestinationMappingFixture>(
      ...((conformanceFixturePath(manifest, 'diagnostics', 'template_destination_mapping') ??
        []) as string[])
    );

    for (const testCase of fixture.cases) {
      expect(
        resolveTemplateDestinationPath(testCase.logical_destination_path, {
          projectName: testCase.context.project_name
        })
      ).toBe(testCase.expected_destination_path ?? undefined);
    }
  });

  it('conforms to the template strategy selection fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const fixture = readFixture<TemplateStrategySelectionFixture>(
      ...((conformanceFixturePath(manifest, 'diagnostics', 'template_strategy_selection') ??
        []) as string[])
    );

    for (const testCase of fixture.cases) {
      expect(
        selectTemplateStrategy(
          testCase.destination_path,
          testCase.default_strategy,
          testCase.overrides
        )
      ).toBe(testCase.expected_strategy);
    }
  });

  it('conforms to the template token keys fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const fixture = readFixture<TemplateTokenKeysFixture>(
      ...((conformanceFixturePath(manifest, 'diagnostics', 'template_token_keys') ??
        []) as string[])
    );

    for (const testCase of fixture.cases) {
      const config = testCase.config
        ? ({
            pre: testCase.config.pre,
            post: testCase.config.post,
            separators: testCase.config.separators,
            minSegments: testCase.config.min_segments,
            maxSegments: testCase.config.max_segments,
            segmentPattern: testCase.config.segment_pattern
          } satisfies TemplateTokenConfig)
        : undefined;
      expect(templateTokenKeys(testCase.content, config)).toEqual(testCase.expected_token_keys);
    }
  });

  it('conforms to the template entry plan fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const fixture = readFixture<TemplateEntryPlanFixture>(
      ...((conformanceFixturePath(manifest, 'diagnostics', 'template_entry_plan') ??
        []) as string[])
    );

    const actual = planTemplateEntries(
      fixture.template_source_paths,
      { projectName: fixture.context.project_name },
      fixture.default_strategy,
      fixture.overrides
    );

    expect(
      actual.map((entry) => ({
        template_source_path: entry.templateSourcePath,
        logical_destination_path: entry.logicalDestinationPath,
        destination_path: entry.destinationPath ?? null,
        classification: {
          destination_path: entry.classification.destinationPath,
          file_type: entry.classification.fileType,
          family: entry.classification.family,
          dialect: entry.classification.dialect
        },
        strategy: entry.strategy,
        action: entry.action
      }))
    ).toEqual(fixture.expected_entries);
  });

  it('conforms to the template entry token state fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const fixture = readFixture<TemplateEntryTokenStateFixture>(
      ...((conformanceFixturePath(manifest, 'diagnostics', 'template_entry_token_state') ??
        []) as string[])
    );

    const actual = enrichTemplatePlanEntriesWithTokenState(
      fixture.planned_entries.map((entry) => ({
        templateSourcePath: entry.template_source_path,
        logicalDestinationPath: entry.logical_destination_path,
        destinationPath: entry.destination_path ?? undefined,
        classification: {
          destinationPath: entry.classification.destination_path,
          fileType: entry.classification.file_type,
          family: entry.classification.family,
          dialect: entry.classification.dialect
        },
        strategy: entry.strategy,
        action: entry.action,
        destinationExists: entry.destination_exists,
        writeAction: entry.write_action
      })),
      fixture.template_contents,
      fixture.replacements
    );

    expect(
      actual.map((entry) => ({
        template_source_path: entry.templateSourcePath,
        logical_destination_path: entry.logicalDestinationPath,
        destination_path: entry.destinationPath ?? null,
        classification: {
          destination_path: entry.classification.destinationPath,
          file_type: entry.classification.fileType,
          family: entry.classification.family,
          dialect: entry.classification.dialect
        },
        strategy: entry.strategy,
        action: entry.action,
        destination_exists: entry.destinationExists,
        write_action: entry.writeAction,
        token_keys: entry.tokenKeys,
        unresolved_token_keys: entry.unresolvedTokenKeys,
        token_resolution_required: entry.tokenResolutionRequired,
        blocked: entry.blocked,
        block_reason: entry.blockReason ?? null
      }))
    ).toEqual(fixture.expected_entries);
  });

  it('conforms to the template entry prepared content fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const fixture = readFixture<TemplateEntryPreparedContentFixture>(
      ...((conformanceFixturePath(manifest, 'diagnostics', 'template_entry_prepared_content') ??
        []) as string[])
    );

    const actual = prepareTemplateEntries(
      fixture.planned_entries.map((entry) => ({
        templateSourcePath: entry.template_source_path,
        logicalDestinationPath: entry.logical_destination_path,
        destinationPath: entry.destination_path ?? undefined,
        classification: {
          destinationPath: entry.classification.destination_path,
          fileType: entry.classification.file_type,
          family: entry.classification.family,
          dialect: entry.classification.dialect
        },
        strategy: entry.strategy,
        action: entry.action,
        destinationExists: entry.destination_exists,
        writeAction: entry.write_action,
        tokenKeys: entry.token_keys,
        unresolvedTokenKeys: entry.unresolved_token_keys,
        tokenResolutionRequired: entry.token_resolution_required,
        blocked: entry.blocked,
        blockReason: entry.block_reason ?? undefined
      })),
      fixture.template_contents,
      fixture.replacements
    );

    expect(
      actual.map((entry) => ({
        template_source_path: entry.templateSourcePath,
        logical_destination_path: entry.logicalDestinationPath,
        destination_path: entry.destinationPath ?? null,
        classification: {
          destination_path: entry.classification.destinationPath,
          file_type: entry.classification.fileType,
          family: entry.classification.family,
          dialect: entry.classification.dialect
        },
        strategy: entry.strategy,
        action: entry.action,
        destination_exists: entry.destinationExists,
        write_action: entry.writeAction,
        token_keys: entry.tokenKeys,
        unresolved_token_keys: entry.unresolvedTokenKeys,
        token_resolution_required: entry.tokenResolutionRequired,
        blocked: entry.blocked,
        block_reason: entry.blockReason ?? null,
        template_content: entry.templateContent,
        prepared_template_content: entry.preparedTemplateContent ?? null,
        preparation_action: entry.preparationAction
      }))
    ).toEqual(fixture.expected_entries);
  });

  it('conforms to the template execution plan fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const fixture = readFixture<TemplateExecutionPlanFixture>(
      ...((conformanceFixturePath(manifest, 'diagnostics', 'template_execution_plan') ??
        []) as string[])
    );

    const actual = planTemplateExecution(
      fixture.prepared_entries.map((entry) => ({
        templateSourcePath: entry.template_source_path,
        logicalDestinationPath: entry.logical_destination_path,
        destinationPath: entry.destination_path ?? undefined,
        classification: {
          destinationPath: entry.classification.destination_path,
          fileType: entry.classification.file_type,
          family: entry.classification.family,
          dialect: entry.classification.dialect
        },
        strategy: entry.strategy,
        action: entry.action,
        destinationExists: entry.destination_exists,
        writeAction: entry.write_action,
        tokenKeys: entry.token_keys,
        unresolvedTokenKeys: entry.unresolved_token_keys,
        tokenResolutionRequired: entry.token_resolution_required,
        blocked: entry.blocked,
        blockReason: entry.block_reason ?? undefined,
        templateContent: entry.template_content,
        preparedTemplateContent: entry.prepared_template_content ?? undefined,
        preparationAction: entry.preparation_action
      })),
      fixture.destination_contents
    );

    expect(
      actual.map((entry) => ({
        template_source_path: entry.templateSourcePath,
        logical_destination_path: entry.logicalDestinationPath,
        destination_path: entry.destinationPath ?? null,
        classification: {
          destination_path: entry.classification.destinationPath,
          file_type: entry.classification.fileType,
          family: entry.classification.family,
          dialect: entry.classification.dialect
        },
        strategy: entry.strategy,
        action: entry.action,
        destination_exists: entry.destinationExists,
        write_action: entry.writeAction,
        token_keys: entry.tokenKeys,
        unresolved_token_keys: entry.unresolvedTokenKeys,
        token_resolution_required: entry.tokenResolutionRequired,
        blocked: entry.blocked,
        block_reason: entry.blockReason ?? null,
        template_content: entry.templateContent,
        prepared_template_content: entry.preparedTemplateContent ?? null,
        preparation_action: entry.preparationAction,
        execution_action: entry.executionAction,
        ready: entry.ready,
        destination_content: entry.destinationContent ?? null
      }))
    ).toEqual(fixture.expected_entries);
  });

  it('conforms to the mini template tree plan fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const fixturePath = (conformanceFixturePath(
      manifest,
      'diagnostics',
      'mini_template_tree_plan'
    ) ?? []) as string[];
    const fixture = readFixture<MiniTemplateTreePlanFixture>(...fixturePath);
    const fixtureDir = path.resolve(process.cwd(), '..', 'fixtures', ...fixturePath.slice(0, -1));
    const templateContents = readRelativeFileTree(path.join(fixtureDir, 'template'));
    const destinationContents = readRelativeFileTree(path.join(fixtureDir, 'destination'));
    const templateSourcePaths = Object.keys(templateContents).sort();
    const existingDestinationPaths = Object.keys(destinationContents).sort();

    const actual = planTemplateTreeExecution(
      templateSourcePaths,
      templateContents,
      existingDestinationPaths,
      destinationContents,
      { projectName: fixture.context.project_name },
      fixture.default_strategy,
      fixture.overrides,
      fixture.replacements
    );

    expect(
      actual.map((entry) => ({
        template_source_path: entry.templateSourcePath,
        logical_destination_path: entry.logicalDestinationPath,
        destination_path: entry.destinationPath ?? null,
        classification: {
          destination_path: entry.classification.destinationPath,
          file_type: entry.classification.fileType,
          family: entry.classification.family,
          dialect: entry.classification.dialect
        },
        strategy: entry.strategy,
        action: entry.action,
        destination_exists: entry.destinationExists,
        write_action: entry.writeAction,
        token_keys: entry.tokenKeys,
        unresolved_token_keys: entry.unresolvedTokenKeys,
        token_resolution_required: entry.tokenResolutionRequired,
        blocked: entry.blocked,
        block_reason: entry.blockReason ?? null,
        template_content: entry.templateContent,
        prepared_template_content: entry.preparedTemplateContent ?? null,
        preparation_action: entry.preparationAction,
        execution_action: entry.executionAction,
        ready: entry.ready,
        destination_content: entry.destinationContent ?? null
      }))
    ).toEqual(fixture.expected_entries);
  });

  it('conforms to the mini template tree preview fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const planFixturePath = (conformanceFixturePath(
      manifest,
      'diagnostics',
      'mini_template_tree_plan'
    ) ?? []) as string[];
    const previewFixturePath = (conformanceFixturePath(
      manifest,
      'diagnostics',
      'mini_template_tree_preview'
    ) ?? []) as string[];
    const planFixture = readFixture<MiniTemplateTreePlanFixture>(...planFixturePath);
    const previewFixture = readFixture<MiniTemplateTreePreviewFixture>(...previewFixturePath);
    const fixtureDir = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      ...planFixturePath.slice(0, -1)
    );
    const templateContents = readRelativeFileTree(path.join(fixtureDir, 'template'));
    const destinationContents = readRelativeFileTree(path.join(fixtureDir, 'destination'));
    const templateSourcePaths = Object.keys(templateContents).sort();
    const existingDestinationPaths = Object.keys(destinationContents).sort();

    const executionPlan = planTemplateTreeExecution(
      templateSourcePaths,
      templateContents,
      existingDestinationPaths,
      destinationContents,
      { projectName: planFixture.context.project_name },
      planFixture.default_strategy,
      planFixture.overrides,
      planFixture.replacements
    );
    const preview = previewTemplateExecution(executionPlan);

    expect({
      result_files: preview.resultFiles,
      created_paths: preview.createdPaths,
      updated_paths: preview.updatedPaths,
      kept_paths: preview.keptPaths,
      blocked_paths: preview.blockedPaths,
      omitted_paths: preview.omittedPaths
    }).toEqual(previewFixture.expected_preview);
  });

  it('conforms to the mini template tree apply fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const planFixturePath = (conformanceFixturePath(
      manifest,
      'diagnostics',
      'mini_template_tree_plan'
    ) ?? []) as string[];
    const applyFixturePath = (conformanceFixturePath(
      manifest,
      'diagnostics',
      'mini_template_tree_apply'
    ) ?? []) as string[];
    const planFixture = readFixture<MiniTemplateTreePlanFixture>(...planFixturePath);
    const applyFixture = readFixture<MiniTemplateTreeApplyFixture>(...applyFixturePath);
    const fixtureDir = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      ...planFixturePath.slice(0, -1)
    );
    const templateContents = readRelativeFileTree(path.join(fixtureDir, 'template'));
    const destinationContents = readRelativeFileTree(path.join(fixtureDir, 'destination'));
    const templateSourcePaths = Object.keys(templateContents).sort();
    const existingDestinationPaths = Object.keys(destinationContents).sort();

    const executionPlan = planTemplateTreeExecution(
      templateSourcePaths,
      templateContents,
      existingDestinationPaths,
      destinationContents,
      { projectName: planFixture.context.project_name },
      planFixture.default_strategy,
      planFixture.overrides,
      planFixture.replacements
    );

    const actual = applyTemplateExecution(executionPlan, (entry) => {
      const fixtureResult = applyFixture.merge_results[entry.destinationPath ?? ''];
      return {
        ok: fixtureResult.ok,
        diagnostics: fixtureResult.diagnostics.map((diagnostic) => normalizeDiagnostic(diagnostic)),
        output: fixtureResult.output ?? undefined,
        policies: fixtureResult.policies
      };
    });

    expect({
      result_files: actual.resultFiles,
      created_paths: actual.createdPaths,
      updated_paths: actual.updatedPaths,
      kept_paths: actual.keptPaths,
      blocked_paths: actual.blockedPaths,
      omitted_paths: actual.omittedPaths,
      diagnostics: actual.diagnostics
    }).toEqual({
      result_files: applyFixture.expected_result.result_files,
      created_paths: applyFixture.expected_result.created_paths,
      updated_paths: applyFixture.expected_result.updated_paths,
      kept_paths: applyFixture.expected_result.kept_paths,
      blocked_paths: applyFixture.expected_result.blocked_paths,
      omitted_paths: applyFixture.expected_result.omitted_paths,
      diagnostics: applyFixture.expected_result.diagnostics.map((diagnostic) =>
        normalizeDiagnostic(diagnostic)
      )
    });
  });

  it('conforms to the mini template tree convergence fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const planFixturePath = (conformanceFixturePath(
      manifest,
      'diagnostics',
      'mini_template_tree_plan'
    ) ?? []) as string[];
    const applyFixturePath = (conformanceFixturePath(
      manifest,
      'diagnostics',
      'mini_template_tree_apply'
    ) ?? []) as string[];
    const convergenceFixturePath = (conformanceFixturePath(
      manifest,
      'diagnostics',
      'mini_template_tree_convergence'
    ) ?? []) as string[];
    const planFixture = readFixture<MiniTemplateTreePlanFixture>(...planFixturePath);
    const applyFixture = readFixture<MiniTemplateTreeApplyFixture>(...applyFixturePath);
    const convergenceFixture = readFixture<MiniTemplateTreeConvergenceFixture>(
      ...convergenceFixturePath
    );
    const fixtureDir = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      ...planFixturePath.slice(0, -1)
    );
    const templateContents = readRelativeFileTree(path.join(fixtureDir, 'template'));
    const destinationContents = readRelativeFileTree(path.join(fixtureDir, 'destination'));
    const templateSourcePaths = Object.keys(templateContents).sort();
    const existingDestinationPaths = Object.keys(destinationContents).sort();

    const executionPlan = planTemplateTreeExecution(
      templateSourcePaths,
      templateContents,
      existingDestinationPaths,
      destinationContents,
      { projectName: planFixture.context.project_name },
      planFixture.default_strategy,
      planFixture.overrides,
      planFixture.replacements
    );
    const applyResult = applyTemplateExecution(executionPlan, (entry) => {
      const fixtureResult = applyFixture.merge_results[entry.destinationPath ?? ''];
      return {
        ok: fixtureResult.ok,
        diagnostics: fixtureResult.diagnostics.map((diagnostic) => normalizeDiagnostic(diagnostic)),
        output: fixtureResult.output ?? undefined,
        policies: fixtureResult.policies
      };
    });

    expect(
      evaluateTemplateTreeConvergence(
        templateSourcePaths,
        templateContents,
        applyResult.resultFiles,
        { projectName: planFixture.context.project_name },
        planFixture.default_strategy,
        planFixture.overrides,
        convergenceFixture.replacements
      )
    ).toEqual({
      converged: convergenceFixture.expected.converged,
      pendingPaths: convergenceFixture.expected.pending_paths
    });
  });

  it('conforms to the mini template tree run fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const planFixturePath = (conformanceFixturePath(
      manifest,
      'diagnostics',
      'mini_template_tree_plan'
    ) ?? []) as string[];
    const runFixturePath = (conformanceFixturePath(
      manifest,
      'diagnostics',
      'mini_template_tree_run'
    ) ?? []) as string[];
    const planFixture = readFixture<MiniTemplateTreePlanFixture>(...planFixturePath);
    const runFixture = readFixture<MiniTemplateTreeRunFixture>(...runFixturePath);
    const fixtureDir = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      ...planFixturePath.slice(0, -1)
    );
    const templateContents = readRelativeFileTree(path.join(fixtureDir, 'template'));
    const destinationContents = readRelativeFileTree(path.join(fixtureDir, 'destination'));
    const templateSourcePaths = Object.keys(templateContents).sort();

    const actual: TemplateTreeRunResult = runTemplateTreeExecution(
      templateSourcePaths,
      templateContents,
      destinationContents,
      { projectName: planFixture.context.project_name },
      planFixture.default_strategy,
      planFixture.overrides,
      planFixture.replacements,
      (entry) => {
        const fixtureResult = runFixture.merge_results[entry.destinationPath ?? ''];
        return {
          ok: fixtureResult.ok,
          diagnostics: fixtureResult.diagnostics.map((diagnostic) =>
            normalizeDiagnostic(diagnostic)
          ),
          output: fixtureResult.output ?? undefined,
          policies: fixtureResult.policies
        };
      }
    );

    expect({
      execution_plan: actual.executionPlan.map((entry) => ({
        template_source_path: entry.templateSourcePath,
        logical_destination_path: entry.logicalDestinationPath,
        destination_path: entry.destinationPath ?? null,
        classification: {
          destination_path: entry.classification.destinationPath,
          file_type: entry.classification.fileType,
          family: entry.classification.family,
          dialect: entry.classification.dialect
        },
        strategy: entry.strategy,
        action: entry.action,
        destination_exists: entry.destinationExists,
        write_action: entry.writeAction,
        token_keys: entry.tokenKeys,
        unresolved_token_keys: entry.unresolvedTokenKeys,
        token_resolution_required: entry.tokenResolutionRequired,
        blocked: entry.blocked,
        block_reason: entry.blockReason ?? null,
        template_content: entry.templateContent,
        prepared_template_content: entry.preparedTemplateContent ?? null,
        preparation_action: entry.preparationAction,
        execution_action: entry.executionAction,
        ready: entry.ready,
        destination_content: entry.destinationContent ?? null
      })),
      apply_result: {
        result_files: actual.applyResult.resultFiles,
        created_paths: actual.applyResult.createdPaths,
        updated_paths: actual.applyResult.updatedPaths,
        kept_paths: actual.applyResult.keptPaths,
        blocked_paths: actual.applyResult.blockedPaths,
        omitted_paths: actual.applyResult.omittedPaths,
        diagnostics: actual.applyResult.diagnostics
      }
    }).toEqual({
      execution_plan: runFixture.expected.execution_plan,
      apply_result: {
        ...runFixture.expected.apply_result,
        diagnostics: runFixture.expected.apply_result.diagnostics.map((diagnostic) =>
          normalizeDiagnostic(diagnostic)
        )
      }
    });
  });

  it('conforms to the mini template tree run report fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const planFixturePath = (conformanceFixturePath(
      manifest,
      'diagnostics',
      'mini_template_tree_plan'
    ) ?? []) as string[];
    const runFixturePath = (conformanceFixturePath(
      manifest,
      'diagnostics',
      'mini_template_tree_run'
    ) ?? []) as string[];
    const reportFixturePath = (conformanceFixturePath(
      manifest,
      'diagnostics',
      'mini_template_tree_run_report'
    ) ?? []) as string[];
    const planFixture = readFixture<MiniTemplateTreePlanFixture>(...planFixturePath);
    const runFixture = readFixture<MiniTemplateTreeRunFixture>(...runFixturePath);
    const reportFixture = readFixture<MiniTemplateTreeRunReportFixture>(...reportFixturePath);
    const fixtureDir = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      ...planFixturePath.slice(0, -1)
    );
    const templateContents = readRelativeFileTree(path.join(fixtureDir, 'template'));
    const destinationContents = readRelativeFileTree(path.join(fixtureDir, 'destination'));
    const templateSourcePaths = Object.keys(templateContents).sort();

    const runResult: TemplateTreeRunResult = runTemplateTreeExecution(
      templateSourcePaths,
      templateContents,
      destinationContents,
      { projectName: planFixture.context.project_name },
      planFixture.default_strategy,
      planFixture.overrides,
      planFixture.replacements,
      (entry) => {
        const fixtureResult = runFixture.merge_results[entry.destinationPath ?? ''];
        return {
          ok: fixtureResult.ok,
          diagnostics: fixtureResult.diagnostics.map((diagnostic) =>
            normalizeDiagnostic(diagnostic)
          ),
          output: fixtureResult.output ?? undefined,
          policies: fixtureResult.policies
        };
      }
    );

    const actual: TemplateTreeRunReport = reportTemplateTreeRun(runResult);
    expect({
      entries: actual.entries.map((entry) => ({
        template_source_path: entry.templateSourcePath,
        logical_destination_path: entry.logicalDestinationPath,
        destination_path: entry.destinationPath ?? null,
        execution_action: entry.executionAction,
        status: entry.status
      })),
      summary: actual.summary
    }).toEqual(reportFixture.expected);
  });

  it('conforms to the mini template tree family merge callback fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const fixturePath = (conformanceFixturePath(
      manifest,
      'diagnostics',
      'mini_template_tree_family_merge_callback'
    ) ?? []) as string[];
    const fixture = readFixture<MiniTemplateTreeFamilyMergeCallbackFixture>(...fixturePath);
    const fixtureDir = path.resolve(process.cwd(), '..', 'fixtures', ...fixturePath.slice(0, -1));
    const templateContents = readRelativeFileTree(path.join(fixtureDir, 'template'));
    const destinationContents = readRelativeFileTree(path.join(fixtureDir, 'destination'));
    const templateSourcePaths = Object.keys(templateContents).sort();

    const actual = runTemplateTreeExecution(
      templateSourcePaths,
      templateContents,
      destinationContents,
      { projectName: fixture.context.project_name },
      fixture.default_strategy,
      fixture.overrides,
      fixture.replacements,
      (entry) => {
        if (entry.classification.family === 'markdown') {
          return mergeMarkdown(
            entry.preparedTemplateContent ?? '',
            entry.destinationContent ?? '',
            'markdown'
          );
        }

        return {
          ok: false,
          diagnostics: [
            normalizeDiagnostic({
              severity: 'error',
              category: 'configuration_error',
              message: `missing family merge adapter for ${entry.classification.family}`
            })
          ],
          policies: []
        };
      }
    );

    expect({
      execution_plan: actual.executionPlan.map((entry) => ({
        template_source_path: entry.templateSourcePath,
        logical_destination_path: entry.logicalDestinationPath,
        destination_path: entry.destinationPath ?? null,
        classification: {
          destination_path: entry.classification.destinationPath,
          file_type: entry.classification.fileType,
          family: entry.classification.family,
          dialect: entry.classification.dialect
        },
        strategy: entry.strategy,
        action: entry.action,
        destination_exists: entry.destinationExists,
        write_action: entry.writeAction,
        token_keys: entry.tokenKeys,
        unresolved_token_keys: entry.unresolvedTokenKeys,
        token_resolution_required: entry.tokenResolutionRequired,
        blocked: entry.blocked,
        block_reason: entry.blockReason ?? null,
        template_content: entry.templateContent,
        prepared_template_content: entry.preparedTemplateContent ?? null,
        preparation_action: entry.preparationAction,
        execution_action: entry.executionAction,
        ready: entry.ready,
        destination_content: entry.destinationContent ?? null
      })),
      apply_result: {
        result_files: actual.applyResult.resultFiles,
        created_paths: actual.applyResult.createdPaths,
        updated_paths: actual.applyResult.updatedPaths,
        kept_paths: actual.applyResult.keptPaths,
        blocked_paths: actual.applyResult.blockedPaths,
        omitted_paths: actual.applyResult.omittedPaths,
        diagnostics: actual.applyResult.diagnostics
      }
    }).toEqual({
      execution_plan: fixture.expected.execution_plan,
      apply_result: {
        ...fixture.expected.apply_result,
        diagnostics: fixture.expected.apply_result.diagnostics.map((diagnostic) =>
          normalizeDiagnostic(diagnostic)
        )
      }
    });
  });

  it('conforms to the mini template tree multi-family merge callback fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const fixturePath = (conformanceFixturePath(
      manifest,
      'diagnostics',
      'mini_template_tree_multi_family_merge_callback'
    ) ?? []) as string[];
    const fixture = readFixture<MiniTemplateTreeMultiFamilyMergeCallbackFixture>(...fixturePath);
    const fixtureDir = path.resolve(process.cwd(), '..', 'fixtures', ...fixturePath.slice(0, -1));
    const templateContents = readRelativeFileTree(path.join(fixtureDir, 'template'));
    const destinationContents = readRelativeFileTree(path.join(fixtureDir, 'destination'));
    const templateSourcePaths = Object.keys(templateContents).sort();

    const actual = runTemplateTreeExecution(
      templateSourcePaths,
      templateContents,
      destinationContents,
      { projectName: fixture.context.project_name },
      fixture.default_strategy,
      fixture.overrides,
      fixture.replacements,
      (entry) => {
        switch (entry.classification.family) {
          case 'markdown':
            return mergeMarkdown(
              entry.preparedTemplateContent ?? '',
              entry.destinationContent ?? '',
              'markdown'
            );
          case 'toml':
            return mergeToml(
              entry.preparedTemplateContent ?? '',
              entry.destinationContent ?? '',
              'toml'
            );
          case 'ruby':
            return mergeRuby(
              entry.preparedTemplateContent ?? '',
              entry.destinationContent ?? '',
              'ruby'
            );
          default:
            return {
              ok: false,
              diagnostics: [
                normalizeDiagnostic({
                  severity: 'error',
                  category: 'configuration_error',
                  message: `missing family merge adapter for ${entry.classification.family}`
                })
              ],
              policies: []
            };
        }
      }
    );

    expect({
      execution_plan: actual.executionPlan.map((entry) => ({
        template_source_path: entry.templateSourcePath,
        logical_destination_path: entry.logicalDestinationPath,
        destination_path: entry.destinationPath ?? null,
        classification: {
          destination_path: entry.classification.destinationPath,
          file_type: entry.classification.fileType,
          family: entry.classification.family,
          dialect: entry.classification.dialect
        },
        strategy: entry.strategy,
        action: entry.action,
        destination_exists: entry.destinationExists,
        write_action: entry.writeAction,
        token_keys: entry.tokenKeys,
        unresolved_token_keys: entry.unresolvedTokenKeys,
        token_resolution_required: entry.tokenResolutionRequired,
        blocked: entry.blocked,
        block_reason: entry.blockReason ?? null,
        template_content: entry.templateContent,
        prepared_template_content: entry.preparedTemplateContent ?? null,
        preparation_action: entry.preparationAction,
        execution_action: entry.executionAction,
        ready: entry.ready,
        destination_content: entry.destinationContent ?? null
      })),
      apply_result: {
        result_files: actual.applyResult.resultFiles,
        created_paths: actual.applyResult.createdPaths,
        updated_paths: actual.applyResult.updatedPaths,
        kept_paths: actual.applyResult.keptPaths,
        blocked_paths: actual.applyResult.blockedPaths,
        omitted_paths: actual.applyResult.omittedPaths,
        diagnostics: actual.applyResult.diagnostics
      }
    }).toEqual({
      execution_plan: fixture.expected.execution_plan,
      apply_result: {
        ...fixture.expected.apply_result,
        diagnostics: fixture.expected.apply_result.diagnostics.map((diagnostic) =>
          normalizeDiagnostic(diagnostic)
        )
      }
    });
  });

  it('conforms to the mini template tree multi-family run report fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const fixturePath = (conformanceFixturePath(
      manifest,
      'diagnostics',
      'mini_template_tree_multi_family_merge_callback'
    ) ?? []) as string[];
    const reportFixturePath = (conformanceFixturePath(
      manifest,
      'diagnostics',
      'mini_template_tree_multi_family_run_report'
    ) ?? []) as string[];
    const fixture = readFixture<MiniTemplateTreeMultiFamilyMergeCallbackFixture>(...fixturePath);
    const reportFixture = readFixture<MiniTemplateTreeMultiFamilyRunReportFixture>(
      ...reportFixturePath
    );
    const fixtureDir = path.resolve(process.cwd(), '..', 'fixtures', ...fixturePath.slice(0, -1));
    const templateContents = readRelativeFileTree(path.join(fixtureDir, 'template'));
    const destinationContents = readRelativeFileTree(path.join(fixtureDir, 'destination'));
    const templateSourcePaths = Object.keys(templateContents).sort();

    const runResult = runTemplateTreeExecution(
      templateSourcePaths,
      templateContents,
      destinationContents,
      { projectName: fixture.context.project_name },
      fixture.default_strategy,
      fixture.overrides,
      fixture.replacements,
      multiFamilyMergeCallback
    );

    const actual = reportTemplateTreeRun(runResult);
    expect({
      entries: actual.entries.map((entry) => ({
        template_source_path: entry.templateSourcePath,
        logical_destination_path: entry.logicalDestinationPath,
        destination_path: entry.destinationPath ?? null,
        execution_action: entry.executionAction,
        status: entry.status
      })),
      summary: actual.summary
    }).toEqual(reportFixture.expected);
  });

  it('conforms to the mini template tree directory run report fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const fixturePath = (conformanceFixturePath(
      manifest,
      'diagnostics',
      'mini_template_tree_directory_run_report'
    ) ?? []) as string[];
    const fixture = readFixture<MiniTemplateTreeRunReportFixture>(...fixturePath);
    const fixtureDir = path.resolve(process.cwd(), '..', 'fixtures', ...fixturePath.slice(0, -1));

    const runResult = runTemplateTreeExecutionFromDirectories(
      path.join(fixtureDir, 'template'),
      path.join(fixtureDir, 'destination'),
      { projectName: fixture.context.project_name },
      fixture.default_strategy,
      fixture.overrides,
      fixture.replacements,
      multiFamilyMergeCallback
    );

    const actual = reportTemplateTreeRun(runResult);
    expect({
      entries: actual.entries.map((entry) => ({
        template_source_path: entry.templateSourcePath,
        logical_destination_path: entry.logicalDestinationPath,
        destination_path: entry.destinationPath ?? null,
        execution_action: entry.executionAction,
        status: entry.status
      })),
      summary: actual.summary
    }).toEqual(fixture.expected);
  });

  it('conforms to the mini template tree directory apply convergence fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const fixturePath = (conformanceFixturePath(
      manifest,
      'diagnostics',
      'mini_template_tree_directory_apply_convergence'
    ) ?? []) as string[];
    const fixture = readFixture<MiniTemplateTreeDirectoryApplyConvergenceFixture>(...fixturePath);
    const fixtureDir = path.resolve(process.cwd(), '..', 'fixtures', ...fixturePath.slice(0, -1));
    const tempRoot = repoTempDir();
    const destinationRoot = path.join(tempRoot, 'destination');

    try {
      writeRelativeFileTreeFromLibrary(
        destinationRoot,
        readRelativeFileTree(path.join(fixtureDir, 'destination'))
      );

      const firstRun = applyTemplateTreeExecutionToDirectory(
        path.join(fixtureDir, 'template'),
        destinationRoot,
        { projectName: fixture.context.project_name },
        fixture.default_strategy,
        fixture.overrides,
        fixture.replacements,
        multiFamilyMergeCallback
      );
      const firstActual = reportTemplateTreeRun(firstRun);
      expect({
        entries: firstActual.entries.map((entry) => ({
          template_source_path: entry.templateSourcePath,
          logical_destination_path: entry.logicalDestinationPath,
          destination_path: entry.destinationPath ?? null,
          execution_action: entry.executionAction,
          status: entry.status
        })),
        summary: firstActual.summary
      }).toEqual(fixture.expected_first_report);

      expect(readRelativeFileTreeFromLibrary(destinationRoot)).toEqual(
        fixture.expected_destination_files
      );

      const secondRun = applyTemplateTreeExecutionToDirectory(
        path.join(fixtureDir, 'template'),
        destinationRoot,
        { projectName: fixture.context.project_name },
        fixture.default_strategy,
        fixture.overrides,
        fixture.replacements,
        multiFamilyMergeCallback
      );
      const secondActual = reportTemplateTreeRun(secondRun);
      expect({
        entries: secondActual.entries.map((entry) => ({
          template_source_path: entry.templateSourcePath,
          logical_destination_path: entry.logicalDestinationPath,
          destination_path: entry.destinationPath ?? null,
          execution_action: entry.executionAction,
          status: entry.status
        })),
        summary: secondActual.summary
      }).toEqual(fixture.expected_second_report);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('conforms to the mini template tree directory apply report fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const fixturePath = (conformanceFixturePath(
      manifest,
      'diagnostics',
      'mini_template_tree_directory_apply_report'
    ) ?? []) as string[];
    const fixture = readFixture<MiniTemplateTreeDirectoryApplyReportFixture>(...fixturePath);
    const fixtureDir = path.resolve(process.cwd(), '..', 'fixtures', ...fixturePath.slice(0, -1));
    const tempRoot = repoTempDir();
    const destinationRoot = path.join(tempRoot, 'destination');

    try {
      writeRelativeFileTreeFromLibrary(
        destinationRoot,
        readRelativeFileTree(path.join(fixtureDir, 'destination'))
      );

      const firstRun = applyTemplateTreeExecutionToDirectory(
        path.join(fixtureDir, 'template'),
        destinationRoot,
        { projectName: fixture.context.project_name },
        fixture.default_strategy,
        fixture.overrides,
        fixture.replacements,
        multiFamilyMergeCallback
      );
      const firstActual = reportTemplateDirectoryApply(firstRun);
      expect({
        entries: firstActual.entries.map((entry) => ({
          template_source_path: entry.templateSourcePath,
          logical_destination_path: entry.logicalDestinationPath,
          destination_path: entry.destinationPath ?? null,
          execution_action: entry.executionAction,
          status: entry.status,
          written: entry.written
        })),
        summary: firstActual.summary
      }).toEqual(fixture.expected_first_report);

      const secondRun = applyTemplateTreeExecutionToDirectory(
        path.join(fixtureDir, 'template'),
        destinationRoot,
        { projectName: fixture.context.project_name },
        fixture.default_strategy,
        fixture.overrides,
        fixture.replacements,
        multiFamilyMergeCallback
      );
      const secondActual = reportTemplateDirectoryApply(secondRun);
      expect({
        entries: secondActual.entries.map((entry) => ({
          template_source_path: entry.templateSourcePath,
          logical_destination_path: entry.logicalDestinationPath,
          destination_path: entry.destinationPath ?? null,
          execution_action: entry.executionAction,
          status: entry.status,
          written: entry.written
        })),
        summary: secondActual.summary
      }).toEqual(fixture.expected_second_report);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('conforms to the mini template tree directory plan report fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const fixturePath = (conformanceFixturePath(
      manifest,
      'diagnostics',
      'mini_template_tree_directory_plan_report'
    ) ?? []) as string[];
    const fixture = readFixture<MiniTemplateTreeDirectoryPlanReportFixture>(...fixturePath);
    const fixtureDir = path.resolve(process.cwd(), '..', 'fixtures', ...fixturePath.slice(0, -1));

    const executionPlan = planTemplateTreeExecutionFromDirectories(
      path.join(fixtureDir, 'template'),
      path.join(fixtureDir, 'destination'),
      { projectName: fixture.context.project_name },
      fixture.default_strategy,
      fixture.overrides,
      fixture.replacements
    );
    const actual = reportTemplateDirectoryPlan(executionPlan);
    expect({
      entries: actual.entries.map((entry) => ({
        template_source_path: entry.templateSourcePath,
        logical_destination_path: entry.logicalDestinationPath,
        destination_path: entry.destinationPath ?? null,
        execution_action: entry.executionAction,
        write_action: entry.writeAction,
        status: entry.status,
        previewable: entry.previewable
      })),
      summary: actual.summary
    }).toEqual(fixture.expected);
  });

  it('conforms to the mini template tree directory runner report fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const fixturePath = (conformanceFixturePath(
      manifest,
      'diagnostics',
      'mini_template_tree_directory_runner_report'
    ) ?? []) as string[];
    const fixture = readFixture<MiniTemplateTreeDirectoryRunnerReportFixture>(...fixturePath);
    const fixtureDir = path.resolve(process.cwd(), '..', 'fixtures', ...fixturePath.slice(0, -1));

    const dryRunPlan = planTemplateTreeExecutionFromDirectories(
      path.join(fixtureDir, 'dry-run', 'template'),
      path.join(fixtureDir, 'dry-run', 'destination'),
      { projectName: fixture.dry_run.context.project_name },
      fixture.dry_run.default_strategy,
      fixture.dry_run.overrides,
      fixture.dry_run.replacements
    );
    const dryRunActual = reportTemplateDirectoryRunner(dryRunPlan);
    expect({
      plan_report: {
        entries: dryRunActual.planReport.entries.map((entry) => ({
          template_source_path: entry.templateSourcePath,
          logical_destination_path: entry.logicalDestinationPath,
          destination_path: entry.destinationPath ?? null,
          execution_action: entry.executionAction,
          write_action: entry.writeAction,
          status: entry.status,
          previewable: entry.previewable
        })),
        summary: dryRunActual.planReport.summary
      },
      preview: {
        result_files: dryRunActual.preview?.resultFiles ?? {},
        created_paths: [...(dryRunActual.preview?.createdPaths ?? [])],
        updated_paths: [...(dryRunActual.preview?.updatedPaths ?? [])],
        kept_paths: [...(dryRunActual.preview?.keptPaths ?? [])],
        blocked_paths: [...(dryRunActual.preview?.blockedPaths ?? [])],
        omitted_paths: [...(dryRunActual.preview?.omittedPaths ?? [])]
      },
      run_report: null,
      apply_report: null
    }).toEqual(fixture.dry_run.expected);

    const tempRoot = repoTempDir();
    const destinationRoot = path.join(tempRoot, 'destination');
    try {
      writeRelativeFileTreeFromLibrary(
        destinationRoot,
        readRelativeFileTree(path.join(fixtureDir, 'apply-run', 'destination'))
      );
      const applyPlan = planTemplateTreeExecutionFromDirectories(
        path.join(fixtureDir, 'apply-run', 'template'),
        destinationRoot,
        { projectName: fixture.apply_run.context.project_name },
        fixture.apply_run.default_strategy,
        fixture.apply_run.overrides,
        fixture.apply_run.replacements
      );
      const applyRun = applyTemplateTreeExecutionToDirectory(
        path.join(fixtureDir, 'apply-run', 'template'),
        destinationRoot,
        { projectName: fixture.apply_run.context.project_name },
        fixture.apply_run.default_strategy,
        fixture.apply_run.overrides,
        fixture.apply_run.replacements,
        multiFamilyMergeCallback
      );
      const applyActual = reportTemplateDirectoryRunner(applyPlan, applyRun);
      expect({
        plan_report: {
          entries: applyActual.planReport.entries.map((entry) => ({
            template_source_path: entry.templateSourcePath,
            logical_destination_path: entry.logicalDestinationPath,
            destination_path: entry.destinationPath ?? null,
            execution_action: entry.executionAction,
            write_action: entry.writeAction,
            status: entry.status,
            previewable: entry.previewable
          })),
          summary: applyActual.planReport.summary
        },
        preview: {
          result_files: applyActual.preview?.resultFiles ?? {},
          created_paths: [...(applyActual.preview?.createdPaths ?? [])],
          updated_paths: [...(applyActual.preview?.updatedPaths ?? [])],
          kept_paths: [...(applyActual.preview?.keptPaths ?? [])],
          blocked_paths: [...(applyActual.preview?.blockedPaths ?? [])],
          omitted_paths: [...(applyActual.preview?.omittedPaths ?? [])]
        },
        run_report: {
          entries:
            applyActual.runReport?.entries.map((entry) => ({
              template_source_path: entry.templateSourcePath,
              logical_destination_path: entry.logicalDestinationPath,
              destination_path: entry.destinationPath ?? null,
              execution_action: entry.executionAction,
              status: entry.status
            })) ?? [],
          summary: applyActual.runReport?.summary
        },
        apply_report: {
          entries:
            applyActual.applyReport?.entries.map((entry) => ({
              template_source_path: entry.templateSourcePath,
              logical_destination_path: entry.logicalDestinationPath,
              destination_path: entry.destinationPath ?? null,
              execution_action: entry.executionAction,
              status: entry.status,
              written: entry.written
            })) ?? [],
          summary: applyActual.applyReport?.summary
        }
      }).toEqual(fixture.apply_run.expected);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('conforms to the template entry plan state fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const fixture = readFixture<TemplateEntryPlanStateFixture>(
      ...((conformanceFixturePath(manifest, 'diagnostics', 'template_entry_plan_state') ??
        []) as string[])
    );

    const actual = enrichTemplatePlanEntries(
      fixture.planned_entries.map((entry) => ({
        templateSourcePath: entry.template_source_path,
        logicalDestinationPath: entry.logical_destination_path,
        destinationPath: entry.destination_path ?? undefined,
        classification: {
          destinationPath: entry.classification.destination_path,
          fileType: entry.classification.file_type,
          family: entry.classification.family,
          dialect: entry.classification.dialect
        },
        strategy: entry.strategy,
        action: entry.action
      })),
      fixture.existing_destination_paths
    );

    expect(
      actual.map((entry) => ({
        template_source_path: entry.templateSourcePath,
        logical_destination_path: entry.logicalDestinationPath,
        destination_path: entry.destinationPath ?? null,
        classification: {
          destination_path: entry.classification.destinationPath,
          file_type: entry.classification.fileType,
          family: entry.classification.family,
          dialect: entry.classification.dialect
        },
        strategy: entry.strategy,
        action: entry.action,
        destination_exists: entry.destinationExists,
        write_action: entry.writeAction
      }))
    ).toEqual(fixture.expected_entries);
  });

  it('conforms to the slice-28 conformance runner shape fixture', () => {
    const fixture = readFixture<ConformanceRunnerFixture>(
      ...diagnosticsFixturePath('runner_shape')
    );

    const caseRef: ConformanceCaseRef = {
      family: 'json',
      role: 'tree_sitter_adapter',
      case: 'valid_strict_json'
    };
    const result: ConformanceCaseResult = {
      ref: caseRef,
      outcome: 'passed',
      messages: []
    };

    expect(caseRef).toEqual(fixture.case_ref);
    expect(result).toEqual(fixture.result);
  });

  it('conforms to the slice-30 normalized manifest contract', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(conformanceFamilyFeatureProfilePath(manifest, 'json')).toEqual([
      'diagnostics',
      'slice-21-family-feature-profile',
      'json-feature-profile.json'
    ]);
    expect(conformanceFixturePath(manifest, 'text', 'analysis')).toEqual([
      'text',
      'slice-03-analysis',
      'whitespace-and-blocks.json'
    ]);
    expect(conformanceFixturePath(manifest, 'diagnostics', 'runner_shape')).toEqual([
      'diagnostics',
      'slice-28-conformance-runner',
      'runner-shape.json'
    ]);
  });

  it('conforms to the slice-32 conformance suite summary fixture', () => {
    const fixture = readFixture<ConformanceSummaryFixture>(
      ...diagnosticsFixturePath('runner_summary')
    );

    expect(summarizeConformanceResults(fixture.results)).toEqual(fixture.summary);
  });

  it('conforms to the slice-33 capability-aware selection fixture', () => {
    const fixture = readFixture<ConformanceSelectionFixture>(
      ...diagnosticsFixturePath('capability_selection')
    );

    for (const testCase of fixture.cases) {
      const selection = selectConformanceCase(
        testCase.ref,
        testCase.requirements,
        {
          family: testCase.family_profile.family,
          supportedDialects: testCase.family_profile.supported_dialects,
          supportedPolicies: testCase.family_profile.supported_policies
        },
        {
          backend: testCase.feature_profile.backend,
          supportsDialects: testCase.feature_profile.supports_dialects,
          supportedPolicies: testCase.feature_profile.supported_policies
        }
      );

      expect(selection.ref).toEqual(testCase.ref);
      expect({
        status: selection.status,
        messages: selection.messages
      }).toEqual(testCase.expected);
    }
  });

  it('conforms to the slice-119 backend-aware selection fixture', () => {
    const fixture = readFixture<ConformanceSelectionFixture>(
      ...diagnosticsFixturePath('backend_selection')
    );

    for (const testCase of fixture.cases) {
      const selection = selectConformanceCase(
        testCase.ref,
        testCase.requirements,
        {
          family: testCase.family_profile.family,
          supportedDialects: testCase.family_profile.supported_dialects,
          supportedPolicies: testCase.family_profile.supported_policies
        },
        {
          backend: testCase.feature_profile.backend,
          supportsDialects: testCase.feature_profile.supports_dialects,
          supportedPolicies: testCase.feature_profile.supported_policies
        }
      );

      expect(selection.ref).toEqual(testCase.ref);
      expect({
        status: selection.status,
        messages: selection.messages
      }).toEqual(testCase.expected);
    }
  });

  it('conforms to the slice-34 conformance case runner fixture', () => {
    const fixture = readFixture<ConformanceCaseRunnerFixture>(
      ...diagnosticsFixturePath('case_runner')
    );

    for (const testCase of fixture.cases) {
      const run: ConformanceCaseRun = {
        ref: testCase.run.ref,
        requirements: testCase.run.requirements,
        familyProfile: {
          family: testCase.run.family_profile.family,
          supportedDialects: testCase.run.family_profile.supported_dialects,
          supportedPolicies: testCase.run.family_profile.supported_policies
        },
        ...(testCase.run.feature_profile
          ? {
              featureProfile: {
                backend: testCase.run.feature_profile.backend,
                supportsDialects: testCase.run.feature_profile.supports_dialects,
                supportedPolicies: testCase.run.feature_profile.supported_policies
              }
            }
          : {})
      };

      expect(runConformanceCase(run, () => testCase.execution)).toEqual(testCase.expected);
    }
  });

  it('conforms to the slice-35 conformance suite runner fixture', () => {
    const fixture = readFixture<ConformanceSuiteRunnerFixture>(
      ...diagnosticsFixturePath('suite_runner')
    );

    const runs: ConformanceCaseRun[] = fixture.cases.map((testCase) => ({
      ref: testCase.ref,
      requirements: testCase.requirements,
      familyProfile: {
        family: testCase.family_profile.family,
        supportedDialects: testCase.family_profile.supported_dialects,
        supportedPolicies: testCase.family_profile.supported_policies
      },
      ...(testCase.feature_profile
        ? {
            featureProfile: {
              backend: testCase.feature_profile.backend,
              supportsDialects: testCase.feature_profile.supports_dialects,
              supportedPolicies: testCase.feature_profile.supported_policies
            }
          }
        : {})
    }));

    expect(
      runConformanceSuite(runs, (run) => {
        const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
        return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
      })
    ).toEqual(fixture.expected_results);
  });

  it('conforms to the slice-36 conformance suite report fixture', () => {
    const fixture = readFixture<{
      results: ConformanceCaseResult[];
      report: ConformanceSuiteReport;
    }>(...diagnosticsFixturePath('suite_report'));

    expect(reportConformanceSuite(fixture.results)).toEqual(fixture.report);
  });

  it('conforms to the slice-39 conformance suite-plan fixture', () => {
    const fixture = readFixture<ConformanceSuitePlanFixture>(
      ...diagnosticsFixturePath('suite_plan')
    );
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    const plan = planConformanceSuite(
      manifest,
      fixture.family,
      fixture.roles,
      {
        family: fixture.family_profile.family,
        supportedDialects: fixture.family_profile.supported_dialects,
        supportedPolicies: fixture.family_profile.supported_policies
      },
      fixture.feature_profile
        ? {
            backend: fixture.feature_profile.backend,
            supportsDialects: fixture.feature_profile.supports_dialects,
            supportedPolicies: fixture.feature_profile.supported_policies
          }
        : undefined
    );

    const expected: ConformanceSuitePlan = {
      family: fixture.expected.family,
      entries: fixture.expected.entries.map((entry) => ({
        ref: entry.ref,
        path: entry.path,
        run: {
          ref: entry.run.ref,
          requirements: entry.run.requirements,
          familyProfile: {
            family: entry.run.family_profile.family,
            supportedDialects: entry.run.family_profile.supported_dialects,
            supportedPolicies: entry.run.family_profile.supported_policies
          },
          featureProfile: entry.run.feature_profile
            ? {
                backend: entry.run.feature_profile.backend,
                supportsDialects: entry.run.feature_profile.supports_dialects,
                supportedPolicies: entry.run.feature_profile.supported_policies
              }
            : undefined
        }
      })),
      missingRoles: fixture.expected.missing_roles
    };

    expect(plan).toEqual(expected);
  });

  it('conforms to the slice-40 planned conformance suite-runner fixture', () => {
    const fixture = readFixture<PlannedConformanceSuiteRunnerFixture>(
      ...diagnosticsFixturePath('planned_suite_runner')
    );

    const plan: ConformanceSuitePlan = {
      family: fixture.plan.family,
      entries: fixture.plan.entries.map((entry) => ({
        ref: entry.ref,
        path: entry.path,
        run: {
          ref: entry.run.ref,
          requirements: entry.run.requirements,
          familyProfile: {
            family: entry.run.family_profile.family,
            supportedDialects: entry.run.family_profile.supported_dialects,
            supportedPolicies: entry.run.family_profile.supported_policies
          },
          featureProfile: entry.run.feature_profile
            ? {
                backend: entry.run.feature_profile.backend,
                supportsDialects: entry.run.feature_profile.supports_dialects,
                supportedPolicies: entry.run.feature_profile.supported_policies
              }
            : undefined
        }
      })),
      missingRoles: fixture.plan.missing_roles
    };

    expect(
      runPlannedConformanceSuite(plan, (run) => {
        const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
        return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
      })
    ).toEqual(fixture.expected_results);
  });

  it('conforms to the slice-41 planned conformance suite-report fixture', () => {
    const fixture = readFixture<PlannedConformanceSuiteReportFixture>(
      ...diagnosticsFixturePath('planned_suite_report')
    );

    const plan: ConformanceSuitePlan = {
      family: fixture.plan.family,
      entries: fixture.plan.entries.map((entry) => ({
        ref: entry.ref,
        path: entry.path,
        run: {
          ref: entry.run.ref,
          requirements: entry.run.requirements,
          familyProfile: {
            family: entry.run.family_profile.family,
            supportedDialects: entry.run.family_profile.supported_dialects,
            supportedPolicies: entry.run.family_profile.supported_policies
          },
          featureProfile: entry.run.feature_profile
            ? {
                backend: entry.run.feature_profile.backend,
                supportsDialects: entry.run.feature_profile.supports_dialects,
                supportedPolicies: entry.run.feature_profile.supported_policies
              }
            : undefined
        }
      })),
      missingRoles: fixture.plan.missing_roles
    };

    expect(
      reportPlannedConformanceSuite(plan, (run) => {
        const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
        return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
      })
    ).toEqual(fixture.expected_report);
  });

  it('conforms to the slice-42 manifest case-requirements fixture', () => {
    const fixture = readFixture<ManifestRequirementsFixture>(
      ...diagnosticsFixturePath('manifest_requirements')
    );
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    const plan = planConformanceSuite(manifest, fixture.family, fixture.roles, {
      family: fixture.family_profile.family,
      supportedDialects: fixture.family_profile.supported_dialects,
      supportedPolicies: fixture.family_profile.supported_policies
    });

    expect(
      Object.fromEntries(plan.entries.map((entry) => [entry.ref.role, entry.run.requirements]))
    ).toEqual(fixture.expected_requirements);
  });

  it('conforms to the slice-120 manifest backend-requirements fixture', () => {
    const fixture = readFixture<ManifestBackendRequirementsFixture>(
      ...diagnosticsFixturePath('manifest_backend_requirements')
    );
    const expected: ConformanceSuitePlan = {
      family: fixture.expected.family,
      entries: fixture.expected.entries.map((entry) => ({
        ref: entry.ref,
        path: entry.path,
        run: {
          ref: entry.run.ref,
          requirements: entry.run.requirements,
          familyProfile: {
            family: entry.run.family_profile.family,
            supportedDialects: entry.run.family_profile.supported_dialects,
            supportedPolicies: entry.run.family_profile.supported_policies
          },
          featureProfile: entry.run.feature_profile
            ? {
                backend: entry.run.feature_profile.backend,
                supportsDialects: entry.run.feature_profile.supports_dialects,
                supportedPolicies: entry.run.feature_profile.supported_policies
              }
            : undefined
        }
      })),
      missingRoles: fixture.expected.missing_roles
    };

    expect(
      planConformanceSuite(
        fixture.manifest,
        fixture.family,
        fixture.roles,
        {
          family: fixture.family_profile.family,
          supportedDialects: fixture.family_profile.supported_dialects,
          supportedPolicies: fixture.family_profile.supported_policies
        },
        {
          backend: fixture.feature_profile.backend,
          supportsDialects: fixture.feature_profile.supports_dialects,
          supportedPolicies: fixture.feature_profile.supported_policies
        }
      )
    ).toEqual(expected);
  });

  it('conforms to the slice-121 manifest backend-report fixture', () => {
    const fixture = readFixture<ManifestBackendReportFixture>(
      ...diagnosticsFixturePath('manifest_backend_report')
    );

    expect(
      reportPlannedConformanceSuite(
        planConformanceSuite(
          fixture.manifest,
          fixture.family,
          fixture.roles,
          {
            family: fixture.family_profile.family,
            supportedDialects: fixture.family_profile.supported_dialects,
            supportedPolicies: fixture.family_profile.supported_policies
          },
          {
            backend: fixture.feature_profile.backend,
            supportsDialects: fixture.feature_profile.supports_dialects,
            supportedPolicies: fixture.feature_profile.supported_policies
          }
        ),
        () => ({ outcome: 'failed', messages: ['unexpected execution'] })
      )
    ).toEqual(fixture.expected_report);
  });

  it('conforms to the slice-43 conformance suite-definitions fixture', () => {
    const fixture = readFixture<SuiteDefinitionsFixture>(
      ...diagnosticsFixturePath('suite_definitions')
    );
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(conformanceSuiteDefinition(manifest, fixture.suite_selector)).toEqual(fixture.expected);
    expect(
      planNamedConformanceSuite(manifest, fixture.suite_selector, {
        family: 'json',
        supportedDialects: ['json', 'jsonc'],
        supportedPolicies: [
          { surface: 'array', name: 'destination_wins_array' },
          { surface: 'fallback', name: 'trailing_comma_destination_fallback' }
        ]
      })
    ).toEqual(
      planConformanceSuite(manifest, fixture.expected.subject.grammar, fixture.expected.roles, {
        family: 'json',
        supportedDialects: ['json', 'jsonc'],
        supportedPolicies: [
          { surface: 'array', name: 'destination_wins_array' },
          { surface: 'fallback', name: 'trailing_comma_destination_fallback' }
        ]
      })
    );
  });

  it('conforms to the slice-125 source-family suite-definitions fixture', () => {
    const fixture = readFixture<{
      manifest: ConformanceManifest;
      suite_selectors: ConformanceSuiteSelector[];
      suite_definitions: ConformanceSuiteDefinition[];
    }>('diagnostics', 'slice-125-source-family-suite-definitions', 'source-suite-definitions.json');

    expect(conformanceSuiteSelectors(fixture.manifest)).toEqual(fixture.suite_selectors);
    expect(
      fixture.suite_selectors.map((selector) =>
        conformanceSuiteDefinition(fixture.manifest, selector)
      )
    ).toEqual(fixture.suite_definitions);
  });

  it('conforms to the slice-44 named conformance suite-report fixture', () => {
    const fixture = readFixture<NamedSuiteReportFixture>(
      ...diagnosticsFixturePath('named_suite_report')
    );
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(
      reportNamedConformanceSuite(
        manifest,
        fixture.suite_selector,
        {
          family: fixture.family_profile.family,
          supportedDialects: fixture.family_profile.supported_dialects,
          supportedPolicies: fixture.family_profile.supported_policies
        },
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        },
        {
          backend: 'kreuzberg-language-pack',
          supportsDialects: false,
          supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
        }
      )
    ).toEqual(fixture.expected_report);
  });

  it('conforms to the slice-45 named conformance suite-runner fixture', () => {
    const fixture = readFixture<NamedSuiteRunnerFixture>(
      ...diagnosticsFixturePath('named_suite_runner')
    );
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(
      runNamedConformanceSuite(
        manifest,
        fixture.suite_selector,
        {
          family: fixture.family_profile.family,
          supportedDialects: fixture.family_profile.supported_dialects,
          supportedPolicies: fixture.family_profile.supported_policies
        },
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        },
        {
          backend: 'kreuzberg-language-pack',
          supportsDialects: false,
          supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
        }
      )
    ).toEqual(fixture.expected_results);
  });

  it('conforms to the slice-46 conformance suite-names fixture', () => {
    const fixture = readFixture<SuiteNamesFixture>(...diagnosticsFixturePath('suite_names'));
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(conformanceSuiteSelectors(manifest)).toEqual(fixture.suite_selectors);
  });

  it('conforms to the slice-47 named conformance suite-entry fixture', () => {
    const fixture = readFixture<NamedSuiteEntryFixture>(
      ...diagnosticsFixturePath('named_suite_entry')
    );
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(
      reportNamedConformanceSuiteEntry(
        manifest,
        fixture.suite_selector,
        {
          family: fixture.family_profile.family,
          supportedDialects: fixture.family_profile.supported_dialects,
          supportedPolicies: fixture.family_profile.supported_policies
        },
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        },
        {
          backend: 'kreuzberg-language-pack',
          supportsDialects: false,
          supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
        }
      )
    ).toEqual(fixture.expected_entry);
  });

  it('conforms to the slice-48 named conformance suite plan-entry fixture', () => {
    const fixture = readFixture<NamedSuitePlanEntryFixture>(
      ...diagnosticsFixturePath('named_suite_plan_entry')
    );
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(
      planNamedConformanceSuiteEntry(
        manifest,
        fixture.suite_selector,
        normalizeFamilyPlanContext(fixture.context as never)
      )
    ).toEqual(normalizeSuitePlan(fixture.expected_entry as never));
  });

  it('conforms to the slice-49 conformance family plan-context fixture', () => {
    const fixture = readFixture<FamilyPlanContextFixture>(
      ...diagnosticsFixturePath('family_plan_context')
    );

    expect(normalizeFamilyPlanContext(fixture.context as never)).toEqual({
      familyProfile: {
        family: 'json',
        supportedDialects: ['json', 'jsonc'],
        supportedPolicies: [
          { surface: 'array', name: 'destination_wins_array' },
          { surface: 'fallback', name: 'trailing_comma_destination_fallback' }
        ]
      },
      featureProfile: {
        backend: 'kreuzberg-language-pack',
        supportsDialects: false,
        supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
      }
    });
  });

  it('conforms to the slice-50 named conformance suite-plans fixture', () => {
    const fixture = readFixture<NamedSuitePlansFixture>(
      ...diagnosticsFixturePath('named_suite_plans')
    );
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(
      planNamedConformanceSuites(
        manifest,
        Object.fromEntries(
          Object.entries(fixture.contexts).map(([family, context]) => [
            family,
            normalizeFamilyPlanContext(context as never)
          ])
        )
      )
    ).toEqual(fixture.expected_entries.map((entry) => normalizeSuitePlan(entry as never)));
  });

  it('conforms to the slice-126 source-family named suite-plans fixture', () => {
    const fixture = readFixture<{
      manifest: ConformanceManifest;
      contexts: Record<string, ConformanceFamilyPlanContext>;
      expected_entries: NamedConformanceSuitePlan[];
    }>('diagnostics', 'slice-126-source-family-named-suite-plans', 'source-named-suite-plans.json');

    expect(
      planNamedConformanceSuites(
        fixture.manifest,
        Object.fromEntries(
          Object.entries(fixture.contexts).map(([family, context]) => [
            family,
            normalizeFamilyPlanContext(context as never)
          ])
        )
      )
    ).toEqual(fixture.expected_entries.map((entry) => normalizeSuitePlan(entry as never)));
  });

  it('conforms to the slice-127 source-family native named suite-plans fixture', () => {
    const fixture = readFixture<{
      manifest: ConformanceManifest;
      contexts: Record<string, ConformanceFamilyPlanContext>;
      expected_entries: NamedConformanceSuitePlan[];
    }>(
      'diagnostics',
      'slice-127-source-family-native-suite-plans',
      'source-native-named-suite-plans.json'
    );

    expect(
      planNamedConformanceSuites(
        fixture.manifest,
        Object.fromEntries(
          Object.entries(fixture.contexts).map(([family, context]) => [
            family,
            normalizeFamilyPlanContext(context as never)
          ])
        )
      )
    ).toEqual(fixture.expected_entries.map((entry) => normalizeSuitePlan(entry as never)));
  });

  it('conforms to the slice-138 TOML family suite-definitions fixture', () => {
    const fixture = readFixture<{
      manifest: ConformanceManifest;
      suite_selectors: ConformanceSuiteSelector[];
      suite_definitions: ConformanceSuiteDefinition[];
    }>('diagnostics', 'slice-138-toml-family-suite-definitions', 'toml-suite-definitions.json');

    expect(conformanceSuiteSelectors(fixture.manifest)).toEqual(fixture.suite_selectors);
    expect(
      fixture.suite_selectors.map((selector) =>
        conformanceSuiteDefinition(fixture.manifest, selector)
      )
    ).toEqual(fixture.suite_definitions);
  });

  it('conforms to the slice-139 TOML family named suite-plans fixture', () => {
    const fixture = readFixture<{
      manifest: ConformanceManifest;
      contexts: Record<string, ConformanceFamilyPlanContext>;
      expected_entries: NamedConformanceSuitePlan[];
    }>(
      'diagnostics',
      'slice-139-toml-family-named-suite-plans',
      'typescript-toml-named-suite-plans.json'
    );

    expect(
      planNamedConformanceSuites(
        fixture.manifest,
        Object.fromEntries(
          Object.entries(fixture.contexts).map(([family, context]) => [
            family,
            normalizeFamilyPlanContext(context as never)
          ])
        )
      )
    ).toEqual(fixture.expected_entries.map((entry) => normalizeSuitePlan(entry as never)));
  });

  it('conforms to the slice-51 named conformance suite-results fixture', () => {
    const fixture = readFixture<NamedSuiteResultsFixture>(
      ...diagnosticsFixturePath('named_suite_results')
    );
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(
      runNamedConformanceSuiteEntry(
        manifest,
        fixture.suite_selector,
        {
          family: fixture.family_profile.family,
          supportedDialects: fixture.family_profile.supported_dialects,
          supportedPolicies: fixture.family_profile.supported_policies
        },
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        },
        {
          backend: 'kreuzberg-language-pack',
          supportsDialects: false,
          supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
        }
      )
    ).toEqual(normalizeSuiteResults(fixture.expected_entry as never));
  });

  it('conforms to the slice-52 planned named conformance suite-runner fixture', () => {
    const fixture = readFixture<NamedSuiteRunnerEntriesFixture>(
      ...diagnosticsFixturePath('named_suite_runner_entries')
    );
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const plans = planNamedConformanceSuites(
      manifest,
      Object.fromEntries(
        Object.entries(fixture.contexts).map(([family, context]) => [
          family,
          normalizeFamilyPlanContext(context as never)
        ])
      )
    );

    expect(
      runPlannedNamedConformanceSuites(plans, (run) => {
        const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
        return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
      })
    ).toEqual(fixture.expected_entries.map((entry) => normalizeSuiteResults(entry as never)));
  });

  it('conforms to the slice-53 planned named conformance suite-reports fixture', () => {
    const fixture = readFixture<NamedSuiteReportEntriesFixture>(
      ...diagnosticsFixturePath('named_suite_report_entries')
    );
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const plans = planNamedConformanceSuites(
      manifest,
      Object.fromEntries(
        Object.entries(fixture.contexts).map(([family, context]) => [
          family,
          normalizeFamilyPlanContext(context as never)
        ])
      )
    );

    expect(
      reportPlannedNamedConformanceSuites(plans, (run) => {
        const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
        return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
      })
    ).toEqual(fixture.expected_entries);
  });

  it('conforms to the slice-54 named conformance suite-summary fixture', () => {
    const fixture = readFixture<NamedSuiteSummaryFixture>(
      ...diagnosticsFixturePath('named_suite_summary')
    );

    expect(summarizeNamedConformanceSuiteReports(fixture.entries)).toEqual(
      fixture.expected_summary
    );
  });

  it('conforms to the slice-55 named conformance suite-report envelope fixture', () => {
    const fixture = readFixture<NamedSuiteReportEnvelopeFixture>(
      ...diagnosticsFixturePath('named_suite_report_envelope')
    );

    expect(reportNamedConformanceSuiteEnvelope(fixture.entries)).toEqual(
      normalizeSuiteReportEnvelope(fixture.expected_report)
    );
  });

  it('conforms to the slice-56 named conformance suite-report manifest fixture', () => {
    const fixture = readFixture<NamedSuiteReportManifestFixture>(
      ...diagnosticsFixturePath('named_suite_report_manifest')
    );
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(
      reportNamedConformanceSuiteManifest(
        manifest,
        Object.fromEntries(
          Object.entries(fixture.contexts).map(([family, context]) => [
            family,
            normalizeFamilyPlanContext(context as never)
          ])
        ),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        }
      )
    ).toEqual(normalizeSuiteReportEnvelope(fixture.expected_report));
  });

  it('conforms to the slice-57 default family context fixture', () => {
    const fixture = readFixture<DefaultFamilyContextFixture>(
      ...diagnosticsFixturePath('default_family_context')
    );

    expect(
      defaultConformanceFamilyContext({
        family: fixture.family_profile.family,
        supportedDialects: fixture.family_profile.supported_dialects,
        supportedPolicies: fixture.family_profile.supported_policies
      })
    ).toEqual(normalizeFamilyPlanContext(fixture.expected_context as never));

    expect(
      resolveConformanceFamilyContext(fixture.family, {
        familyProfiles: {
          [fixture.family]: {
            family: fixture.family_profile.family,
            supportedDialects: fixture.family_profile.supported_dialects,
            supportedPolicies: fixture.family_profile.supported_policies
          }
        }
      }).diagnostics
    ).toEqual([normalizeDiagnostic(fixture.expected_diagnostic)]);
  });

  it('conforms to the slice-58 explicit family context mode fixture', () => {
    const fixture = readFixture<ExplicitFamilyContextModeFixture>(
      ...diagnosticsFixturePath('explicit_family_context_mode')
    );

    expect(
      resolveConformanceFamilyContext(
        'text',
        normalizeManifestPlanningOptions(fixture.options as never)
      ).diagnostics
    ).toEqual([normalizeDiagnostic(fixture.expected_diagnostic)]);
  });

  it('conforms to the slice-59 missing suite roles fixture', () => {
    const fixture = readFixture<MissingSuiteRolesFixture>(
      ...diagnosticsFixturePath('missing_suite_roles')
    );

    expect(
      planNamedConformanceSuitesWithDiagnostics(
        fixture.manifest,
        normalizeManifestPlanningOptions(fixture.options as never)
      ).diagnostics
    ).toContainEqual(normalizeDiagnostic(fixture.expected_diagnostic));
  });

  it('conforms to the slice-60 conformance manifest diagnostics fixture', () => {
    const fixture = readFixture<ConformanceManifestReportFixture>(
      ...diagnosticsFixturePath('conformance_manifest_report')
    );

    expect(
      reportConformanceManifest(
        fixture.manifest,
        normalizeManifestPlanningOptions(fixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        }
      )
    ).toEqual(normalizeManifestReport(fixture.expected_report as never));
  });

  it('conforms to the slice-128 source-family manifest report fixture', () => {
    const fixture = readFixture<ConformanceManifestReportFixture>(
      'diagnostics',
      'slice-128-source-family-manifest-report',
      'source-manifest-report.json'
    );

    expect(
      reportConformanceManifest(
        fixture.manifest,
        normalizeManifestPlanningOptions(fixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        }
      )
    ).toEqual(normalizeManifestReport(fixture.expected_report as never));
  });

  it('conforms to the slice-140 TOML family manifest report fixture', () => {
    const fixture = readFixture<ConformanceManifestReportFixture>(
      'diagnostics',
      'slice-140-toml-family-manifest-report',
      'typescript-toml-manifest-report.json'
    );

    expect(
      reportConformanceManifest(
        fixture.manifest,
        normalizeManifestPlanningOptions(fixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        }
      )
    ).toEqual(normalizeManifestReport(fixture.expected_report as never));
  });

  it('conforms to the slice-144 YAML family suite-definitions fixture', () => {
    const fixture = readFixture<{
      manifest: ConformanceManifest;
      suite_selectors: ConformanceSuiteSelector[];
      suite_definitions: ConformanceSuiteDefinition[];
    }>('diagnostics', 'slice-144-yaml-family-suite-definitions', 'yaml-suite-definitions.json');

    expect(conformanceSuiteSelectors(fixture.manifest)).toEqual(fixture.suite_selectors);
    expect(
      fixture.suite_selectors.map((selector) =>
        conformanceSuiteDefinition(fixture.manifest, selector)
      )
    ).toEqual(fixture.suite_definitions);
  });

  it('conforms to the slice-145 YAML family named suite-plans fixture', () => {
    const fixture = readFixture<{
      manifest: ConformanceManifest;
      contexts: Record<string, ConformanceFamilyPlanContext>;
      expected_entries: NamedConformanceSuitePlan[];
    }>(
      'diagnostics',
      'slice-145-yaml-family-named-suite-plans',
      'typescript-yaml-named-suite-plans.json'
    );

    expect(
      planNamedConformanceSuites(
        fixture.manifest,
        Object.fromEntries(
          Object.entries(fixture.contexts).map(([family, context]) => [
            family,
            normalizeFamilyPlanContext(context as never)
          ])
        )
      )
    ).toEqual(fixture.expected_entries.map((entry) => normalizeSuitePlan(entry as never)));
  });

  it('conforms to the slice-146 YAML family manifest report fixture', () => {
    const fixture = readFixture<ConformanceManifestReportFixture>(
      'diagnostics',
      'slice-146-yaml-family-manifest-report',
      'typescript-yaml-manifest-report.json'
    );

    expect(
      reportConformanceManifest(
        fixture.manifest,
        normalizeManifestPlanningOptions(fixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        }
      )
    ).toEqual(normalizeManifestReport(fixture.expected_report as never));
  });

  it('conforms to the slice-200 Markdown family suite-definitions fixture', () => {
    const fixture = readFixture<{
      manifest: ConformanceManifest;
      suite_selectors: ConformanceSuiteSelector[];
      suite_definitions: ConformanceSuiteDefinition[];
    }>(
      'diagnostics',
      'slice-200-markdown-family-suite-definitions',
      'markdown-suite-definitions.json'
    );

    expect(conformanceSuiteSelectors(fixture.manifest)).toEqual(fixture.suite_selectors);
    expect(
      fixture.suite_selectors.map((selector) =>
        conformanceSuiteDefinition(fixture.manifest, selector)
      )
    ).toEqual(fixture.suite_definitions);
  });

  it('conforms to the slice-201 Markdown family named suite-plans fixture', () => {
    const fixture = readFixture<{
      manifest: ConformanceManifest;
      contexts: Record<string, ConformanceFamilyPlanContext>;
      expected_entries: NamedConformanceSuitePlan[];
    }>(
      'diagnostics',
      'slice-201-markdown-family-named-suite-plans',
      'typescript-markdown-named-suite-plans.json'
    );

    expect(
      planNamedConformanceSuites(
        fixture.manifest,
        Object.fromEntries(
          Object.entries(fixture.contexts).map(([family, context]) => [
            family,
            normalizeFamilyPlanContext(context as never)
          ])
        )
      )
    ).toEqual(fixture.expected_entries.map((entry) => normalizeSuitePlan(entry as never)));
  });

  it('conforms to the slice-202 Markdown family manifest report fixture', () => {
    const fixture = readFixture<ConformanceManifestReportFixture>(
      'diagnostics',
      'slice-202-markdown-family-manifest-report',
      'typescript-markdown-manifest-report.json'
    );

    expect(
      reportConformanceManifest(
        fixture.manifest,
        normalizeManifestPlanningOptions(fixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        }
      )
    ).toEqual(normalizeManifestReport(fixture.expected_report as never));
  });

  it('conforms to the slice-246 Markdown nested suite-definitions fixture', () => {
    const fixture = readFixture<{
      manifest: ConformanceManifest;
      suite_selectors: ConformanceSuiteSelector[];
      suite_definitions: ConformanceSuiteDefinition[];
    }>(
      'diagnostics',
      'slice-246-markdown-nested-suite-definitions',
      'markdown-nested-suite-definitions.json'
    );

    expect(conformanceSuiteSelectors(fixture.manifest)).toEqual(fixture.suite_selectors);
    expect(
      fixture.suite_selectors.map((selector) =>
        conformanceSuiteDefinition(fixture.manifest, selector)
      )
    ).toEqual(fixture.suite_definitions);
  });

  it('conforms to the slice-247 Markdown nested named suite-plans fixture', () => {
    const fixture = readFixture<{
      manifest: ConformanceManifest;
      contexts: Record<string, ConformanceFamilyPlanContext>;
      expected_entries: NamedConformanceSuitePlan[];
    }>(
      'diagnostics',
      'slice-247-markdown-nested-named-suite-plans',
      'markdown-nested-named-suite-plans.json'
    );

    expect(
      planNamedConformanceSuites(
        fixture.manifest,
        Object.fromEntries(
          Object.entries(fixture.contexts).map(([family, context]) => [
            family,
            normalizeFamilyPlanContext(context as never)
          ])
        )
      )
    ).toEqual(fixture.expected_entries.map((entry) => normalizeSuitePlan(entry as never)));
  });

  it('conforms to the slice-248 Markdown nested manifest report fixture', () => {
    const fixture = readFixture<ConformanceManifestReportFixture>(
      'diagnostics',
      'slice-248-markdown-nested-manifest-report',
      'markdown-nested-manifest-report.json'
    );

    expect(
      reportConformanceManifest(
        fixture.manifest,
        normalizeManifestPlanningOptions(fixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        }
      )
    ).toEqual(normalizeManifestReport(fixture.expected_report as never));
  });

  it('conforms to the slice-249 Ruby nested suite-definitions fixture', () => {
    const fixture = readFixture<{
      manifest: ConformanceManifest;
      suite_selectors: ConformanceSuiteSelector[];
      suite_definitions: ConformanceSuiteDefinition[];
    }>(
      'diagnostics',
      'slice-249-ruby-nested-suite-definitions',
      'ruby-nested-suite-definitions.json'
    );

    expect(conformanceSuiteSelectors(fixture.manifest)).toEqual(fixture.suite_selectors);
    expect(
      fixture.suite_selectors.map((selector) =>
        conformanceSuiteDefinition(fixture.manifest, selector)
      )
    ).toEqual(fixture.suite_definitions);
  });

  it('conforms to the slice-250 Ruby nested named suite-plans fixture', () => {
    const fixture = readFixture<{
      manifest: ConformanceManifest;
      contexts: Record<string, ConformanceFamilyPlanContext>;
      expected_entries: NamedConformanceSuitePlan[];
    }>(
      'diagnostics',
      'slice-250-ruby-nested-named-suite-plans',
      'ruby-nested-named-suite-plans.json'
    );

    expect(
      planNamedConformanceSuites(
        fixture.manifest,
        Object.fromEntries(
          Object.entries(fixture.contexts).map(([family, context]) => [
            family,
            normalizeFamilyPlanContext(context as never)
          ])
        )
      )
    ).toEqual(fixture.expected_entries.map((entry) => normalizeSuitePlan(entry as never)));
  });

  it('conforms to the slice-251 Ruby nested manifest report fixture', () => {
    const fixture = readFixture<ConformanceManifestReportFixture>(
      'diagnostics',
      'slice-251-ruby-nested-manifest-report',
      'ruby-nested-manifest-report.json'
    );

    expect(
      reportConformanceManifest(
        fixture.manifest,
        normalizeManifestPlanningOptions(fixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        }
      )
    ).toEqual(normalizeManifestReport(fixture.expected_report as never));
  });

  it('conforms to the slice-173 YAML family backend named suite-plans fixture', () => {
    const fixture = readFixture<{
      manifest: ConformanceManifest;
      contexts: Record<string, ConformanceFamilyPlanContext>;
      expected_entries: NamedConformanceSuitePlan[];
    }>(
      'diagnostics',
      'slice-173-yaml-family-backend-named-suite-plans',
      'typescript-yaml-backend-named-suite-plans.json'
    );

    expect(
      planNamedConformanceSuites(
        fixture.manifest,
        Object.fromEntries(
          Object.entries(fixture.contexts).map(([family, context]) => [
            family,
            normalizeFamilyPlanContext(context as never)
          ])
        )
      )
    ).toEqual(fixture.expected_entries.map((entry) => normalizeSuitePlan(entry as never)));
  });

  it('conforms to the slice-174 YAML family backend manifest report fixture', () => {
    const fixture = readFixture<ConformanceManifestReportFixture>(
      'diagnostics',
      'slice-174-yaml-family-backend-manifest-report',
      'typescript-yaml-backend-manifest-report.json'
    );

    expect(
      reportConformanceManifest(
        fixture.manifest,
        normalizeManifestPlanningOptions(fixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        }
      )
    ).toEqual(normalizeManifestReport(fixture.expected_report as never));
  });

  it('conforms to the slice-185 YAML family polyglot backend named suite-plans fixture', () => {
    const fixture = readFixture<{
      manifest: ConformanceManifest;
      contexts: Record<string, ConformanceFamilyPlanContext>;
      expected_entries: NamedConformanceSuitePlan[];
    }>(
      'diagnostics',
      'slice-185-yaml-family-polyglot-backend-named-suite-plans',
      'typescript-yaml-polyglot-named-suite-plans.json'
    );

    expect(
      planNamedConformanceSuites(
        fixture.manifest,
        Object.fromEntries(
          Object.entries(fixture.contexts).map(([family, context]) => [
            family,
            normalizeFamilyPlanContext(context as never)
          ])
        )
      )
    ).toEqual(fixture.expected_entries.map((entry) => normalizeSuitePlan(entry as never)));
  });

  it('conforms to the slice-186 YAML family polyglot backend manifest report fixture', () => {
    const fixture = readFixture<ConformanceManifestReportFixture>(
      'diagnostics',
      'slice-186-yaml-family-polyglot-backend-manifest-report',
      'typescript-yaml-polyglot-manifest-report.json'
    );

    expect(
      reportConformanceManifest(
        fixture.manifest,
        normalizeManifestPlanningOptions(fixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        }
      )
    ).toEqual(normalizeManifestReport(fixture.expected_report as never));
  });

  it('conforms to the slice-148 config-family aggregate manifest fixture', () => {
    const fixture = readFixture<{
      manifest: ConformanceManifest;
      suite_selectors: ConformanceSuiteSelector[];
      suite_definitions: ConformanceSuiteDefinition[];
    }>('diagnostics', 'slice-148-config-family-aggregate-manifest', 'config-family-aggregate.json');

    expect(conformanceSuiteSelectors(fixture.manifest)).toEqual(fixture.suite_selectors);
    expect(
      fixture.suite_selectors.map((selector) =>
        conformanceSuiteDefinition(fixture.manifest, selector)
      )
    ).toEqual(fixture.suite_definitions);
  });

  it('conforms to the slice-149 config-family aggregate suite-plans fixture', () => {
    const fixture = readFixture<{
      manifest: ConformanceManifest;
      contexts: Record<string, ConformanceFamilyPlanContext>;
      expected_entries: NamedConformanceSuitePlan[];
    }>(
      'diagnostics',
      'slice-149-config-family-aggregate-suite-plans',
      'config-family-aggregate-suite-plans.json'
    );

    expect(
      planNamedConformanceSuites(
        fixture.manifest,
        Object.fromEntries(
          Object.entries(fixture.contexts).map(([family, context]) => [
            family,
            normalizeFamilyPlanContext(context as never)
          ])
        )
      )
    ).toEqual(fixture.expected_entries.map((entry) => normalizeSuitePlan(entry as never)));
  });

  it('conforms to the slice-150 config-family aggregate manifest report fixture', () => {
    const fixture = readFixture<ConformanceManifestReportFixture>(
      'diagnostics',
      'slice-150-config-family-aggregate-manifest-report',
      'config-family-aggregate-manifest-report.json'
    );

    expect(
      reportConformanceManifest(
        fixture.manifest,
        normalizeManifestPlanningOptions(fixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        }
      )
    ).toEqual(normalizeManifestReport(fixture.expected_report as never));
  });

  it('conforms to the aggregate config-family review-state fixtures', () => {
    const reviewStateFixture = readFixture<ConformanceManifestReviewStateFixture>(
      'diagnostics',
      'slice-151-config-family-aggregate-review-state',
      'config-family-aggregate-review-state.json'
    );
    const reviewedDefaultFixture = readFixture<ConformanceManifestReviewStateFixture>(
      'diagnostics',
      'slice-152-config-family-aggregate-reviewed-default',
      'config-family-aggregate-reviewed-default.json'
    );
    const replayFixture = readFixture<ConformanceManifestReviewStateFixture>(
      'diagnostics',
      'slice-153-config-family-aggregate-replay-application',
      'config-family-aggregate-replay-application.json'
    );

    expect(
      reviewConformanceManifest(
        reviewStateFixture.manifest,
        normalizeManifestReviewOptions(reviewStateFixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return (
            reviewStateFixture.executions[key] ?? {
              outcome: 'failed',
              messages: ['missing execution']
            }
          );
        }
      )
    ).toEqual(normalizeManifestReviewState(reviewStateFixture.expected_state as never));

    expect(
      reviewConformanceManifest(
        reviewedDefaultFixture.manifest,
        normalizeManifestReviewOptions(reviewedDefaultFixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return (
            reviewedDefaultFixture.executions[key] ?? {
              outcome: 'failed',
              messages: ['missing execution']
            }
          );
        }
      )
    ).toEqual(normalizeManifestReviewState(reviewedDefaultFixture.expected_state as never));

    expect(
      reviewConformanceManifest(
        replayFixture.manifest,
        normalizeManifestReviewOptions(replayFixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return (
            replayFixture.executions[key] ?? {
              outcome: 'failed',
              messages: ['missing execution']
            }
          );
        }
      )
    ).toEqual(normalizeManifestReviewState(replayFixture.expected_state as never));
  });

  it('conforms to the canonical stable-suite planning and review fixtures', () => {
    const plansFixture = readFixture<{
      manifest: ConformanceManifest;
      contexts: Record<string, ConformanceFamilyPlanContext>;
      expected_entries: NamedConformanceSuitePlan[];
    }>(
      'diagnostics',
      'slice-155-canonical-stable-suite-plans',
      'canonical-stable-suite-plans.json'
    );
    const reportFixture = readFixture<ConformanceManifestReportFixture>(
      'diagnostics',
      'slice-156-canonical-stable-suite-report',
      'canonical-stable-suite-report.json'
    );
    const reviewFixture = readFixture<ConformanceManifestReviewStateFixture>(
      'diagnostics',
      'slice-157-canonical-stable-suite-review-state',
      'canonical-stable-suite-review-state.json'
    );

    expect(
      planNamedConformanceSuites(
        plansFixture.manifest,
        Object.fromEntries(
          Object.entries(plansFixture.contexts).map(([family, context]) => [
            family,
            normalizeFamilyPlanContext(context as never)
          ])
        )
      )
    ).toEqual(plansFixture.expected_entries.map((entry) => normalizeSuitePlan(entry as never)));

    expect(
      reportConformanceManifest(
        reportFixture.manifest,
        normalizeManifestPlanningOptions(reportFixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return (
            reportFixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] }
          );
        }
      )
    ).toEqual(normalizeManifestReport(reportFixture.expected_report as never));

    expect(
      reviewConformanceManifest(
        reviewFixture.manifest,
        normalizeManifestReviewOptions(reviewFixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return (
            reviewFixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] }
          );
        }
      )
    ).toEqual(normalizeManifestReviewState(reviewFixture.expected_state as never));
  });

  it('conforms to the canonical stable-suite backend fixtures', () => {
    const plansFixture = readFixture<{
      manifest: ConformanceManifest;
      contexts: Record<string, ConformanceFamilyPlanContext>;
      expected_entries: NamedConformanceSuitePlan[];
    }>(
      'diagnostics',
      'slice-175-canonical-stable-suite-backend-plans',
      'typescript-canonical-stable-suite-backend-plans.json'
    );
    const reportFixture = readFixture<ConformanceManifestReportFixture>(
      'diagnostics',
      'slice-176-canonical-stable-suite-backend-report',
      'typescript-canonical-stable-suite-backend-report.json'
    );
    const reviewFixture = readFixture<ConformanceManifestReviewStateFixture>(
      'diagnostics',
      'slice-177-canonical-stable-suite-backend-review-state',
      'typescript-canonical-stable-suite-backend-review-state.json'
    );

    expect(
      planNamedConformanceSuites(
        plansFixture.manifest,
        Object.fromEntries(
          Object.entries(plansFixture.contexts).map(([family, context]) => [
            family,
            normalizeFamilyPlanContext(context as never)
          ])
        )
      )
    ).toEqual(plansFixture.expected_entries.map((entry) => normalizeSuitePlan(entry as never)));

    expect(
      reportConformanceManifest(
        reportFixture.manifest,
        normalizeManifestPlanningOptions(reportFixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return (
            reportFixture.executions[key] ?? {
              outcome: 'failed',
              messages: ['missing execution']
            }
          );
        }
      )
    ).toEqual(normalizeManifestReport(reportFixture.expected_report as never));

    expect(
      reviewConformanceManifest(
        reviewFixture.manifest,
        normalizeManifestReviewOptions(reviewFixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return (
            reviewFixture.executions[key] ?? {
              outcome: 'failed',
              messages: ['missing execution']
            }
          );
        }
      )
    ).toEqual(normalizeManifestReviewState(reviewFixture.expected_state as never));
  });

  it('conforms to the slice-129 source-family backend-restricted plans fixture', () => {
    const fixture = readFixture<{
      manifest: ConformanceManifest;
      contexts: Record<string, ConformanceFamilyPlanContext>;
      expected_entries: NamedConformanceSuitePlan[];
    }>(
      'diagnostics',
      'slice-129-source-family-backend-restricted-plans',
      'source-backend-restricted-plans.json'
    );

    expect(
      planNamedConformanceSuites(
        fixture.manifest,
        Object.fromEntries(
          Object.entries(fixture.contexts).map(([family, context]) => [
            family,
            normalizeFamilyPlanContext(context as never)
          ])
        )
      )
    ).toEqual(fixture.expected_entries.map((entry) => normalizeSuitePlan(entry as never)));
  });

  it('conforms to the slice-130 source-family backend-restricted report fixture', () => {
    const fixture = readFixture<ConformanceManifestReportFixture>(
      'diagnostics',
      'slice-130-source-family-backend-restricted-report',
      'source-backend-restricted-report.json'
    );

    expect(
      reportConformanceManifest(
        fixture.manifest,
        normalizeManifestPlanningOptions(fixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        }
      )
    ).toEqual(normalizeManifestReport(fixture.expected_report as never));
  });

  it('conforms to the slice-131 canonical manifest source-family paths', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(conformanceFamilyFeatureProfilePath(manifest, 'typescript')).toEqual([
      'diagnostics',
      'slice-101-typescript-family-feature-profile',
      'typescript-feature-profile.json'
    ]);
    expect(conformanceFamilyFeatureProfilePath(manifest, 'rust')).toEqual([
      'diagnostics',
      'slice-105-rust-family-feature-profile',
      'rust-feature-profile.json'
    ]);
    expect(conformanceFamilyFeatureProfilePath(manifest, 'go')).toEqual([
      'diagnostics',
      'slice-109-go-family-feature-profile',
      'go-feature-profile.json'
    ]);
    expect(conformanceFixturePath(manifest, 'typescript', 'analysis')).toEqual([
      'typescript',
      'slice-102-analysis',
      'module-owners.json'
    ]);
    expect(conformanceFixturePath(manifest, 'rust', 'matching')).toEqual([
      'rust',
      'slice-107-matching',
      'path-equality.json'
    ]);
    expect(conformanceFixturePath(manifest, 'go', 'merge')).toEqual([
      'go',
      'slice-112-merge',
      'module-merge.json'
    ]);
  });

  it('conforms to the source-family review-state fixtures', () => {
    const fixtures = [
      readFixture<ConformanceManifestReviewStateFixture>(
        'diagnostics',
        'slice-158-source-family-review-state',
        'source-family-review-state.json'
      ),
      readFixture<ConformanceManifestReviewStateFixture>(
        'diagnostics',
        'slice-159-source-family-reviewed-default',
        'source-family-reviewed-default.json'
      ),
      readFixture<ConformanceManifestReviewStateFixture>(
        'diagnostics',
        'slice-160-source-family-replay-application',
        'source-family-replay-application.json'
      )
    ];

    for (const fixture of fixtures) {
      expect(
        reviewConformanceManifest(
          fixture.manifest,
          normalizeManifestReviewOptions(fixture.options as never),
          (run) => {
            const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
            return (
              fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] }
            );
          }
        )
      ).toEqual(normalizeManifestReviewState(fixture.expected_state as never));
    }
  });

  it('conforms to the canonical widened-suite fixtures', () => {
    const plansFixture = readFixture<{
      manifest: ConformanceManifest;
      contexts: Record<string, ConformanceFamilyPlanContext>;
      expected_entries: readonly NamedConformanceSuitePlan[];
    }>(
      'diagnostics',
      'slice-162-canonical-widened-suite-plans',
      'canonical-widened-suite-plans.json'
    );

    expect(
      planNamedConformanceSuites(
        plansFixture.manifest,
        Object.fromEntries(
          Object.entries(plansFixture.contexts).map(([family, context]) => [
            family,
            normalizeFamilyPlanContext(context as never)
          ])
        )
      )
    ).toEqual(plansFixture.expected_entries.map((entry) => normalizeSuitePlan(entry as never)));

    const reportFixture = readFixture<ConformanceManifestReportFixture>(
      'diagnostics',
      'slice-163-canonical-widened-suite-report',
      'canonical-widened-suite-report.json'
    );

    expect(
      reportConformanceManifest(
        reportFixture.manifest,
        normalizeManifestPlanningOptions(reportFixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return (
            reportFixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] }
          );
        }
      )
    ).toEqual(normalizeManifestReport(reportFixture.expected_report as never));

    const reviewFixtures = [
      readFixture<ConformanceManifestReviewStateFixture>(
        'diagnostics',
        'slice-164-canonical-widened-suite-review-state',
        'canonical-widened-suite-review-state.json'
      ),
      readFixture<ConformanceManifestReviewStateFixture>(
        'diagnostics',
        'slice-165-canonical-widened-suite-reviewed-default',
        'canonical-widened-suite-reviewed-default.json'
      ),
      readFixture<ConformanceManifestReviewStateFixture>(
        'diagnostics',
        'slice-166-canonical-widened-suite-replay-application',
        'canonical-widened-suite-replay-application.json'
      )
    ];

    for (const fixture of reviewFixtures) {
      expect(
        reviewConformanceManifest(
          fixture.manifest,
          normalizeManifestReviewOptions(fixture.options as never),
          (run) => {
            const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
            return (
              fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] }
            );
          }
        )
      ).toEqual(normalizeManifestReviewState(fixture.expected_state as never));
    }
  });

  it('conforms to the canonical widened-suite backend fixtures', () => {
    for (const [plansSlice, plansFile, reportSlice, reportFile, reviewFixtures] of [
      [
        'slice-178-canonical-widened-suite-backend-plans',
        'typescript-canonical-widened-suite-backend-plans.json',
        'slice-179-canonical-widened-suite-backend-report',
        'typescript-canonical-widened-suite-backend-report.json',
        [
          [
            'slice-180-canonical-widened-suite-backend-review-state',
            'typescript-canonical-widened-suite-backend-review-state.json'
          ],
          [
            'slice-181-canonical-widened-suite-backend-reviewed-default',
            'typescript-canonical-widened-suite-backend-reviewed-default.json'
          ],
          [
            'slice-182-canonical-widened-suite-backend-replay-application',
            'typescript-canonical-widened-suite-backend-replay-application.json'
          ]
        ]
      ],
      [
        'slice-187-canonical-widened-suite-polyglot-backend-plans',
        'typescript-canonical-widened-suite-polyglot-backend-plans.json',
        'slice-188-canonical-widened-suite-polyglot-backend-report',
        'typescript-canonical-widened-suite-polyglot-backend-report.json',
        [
          [
            'slice-189-canonical-widened-suite-polyglot-backend-review-state',
            'typescript-canonical-widened-suite-polyglot-backend-review-state.json'
          ],
          [
            'slice-190-canonical-widened-suite-polyglot-backend-reviewed-default',
            'typescript-canonical-widened-suite-polyglot-backend-reviewed-default.json'
          ],
          [
            'slice-191-canonical-widened-suite-polyglot-backend-replay-application',
            'typescript-canonical-widened-suite-polyglot-backend-replay-application.json'
          ]
        ]
      ]
    ] as const) {
      const plansFixture = readFixture<{
        manifest: ConformanceManifest;
        contexts: Record<string, ConformanceFamilyPlanContext>;
        expected_entries: NamedConformanceSuitePlan[];
      }>('diagnostics', plansSlice, plansFile);
      const reportFixture = readFixture<ConformanceManifestReportFixture>(
        'diagnostics',
        reportSlice,
        reportFile
      );

      expect(
        planNamedConformanceSuites(
          plansFixture.manifest,
          Object.fromEntries(
            Object.entries(plansFixture.contexts).map(([family, context]) => [
              family,
              normalizeFamilyPlanContext(context as never)
            ])
          )
        )
      ).toEqual(plansFixture.expected_entries.map((entry) => normalizeSuitePlan(entry as never)));

      expect(
        reportConformanceManifest(
          reportFixture.manifest,
          normalizeManifestPlanningOptions(reportFixture.options as never),
          (run) => {
            const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
            return (
              reportFixture.executions[key] ?? {
                outcome: 'failed',
                messages: ['missing execution']
              }
            );
          }
        )
      ).toEqual(normalizeManifestReport(reportFixture.expected_report as never));

      for (const [reviewSlice, reviewFile] of reviewFixtures) {
        const fixture = readFixture<ConformanceManifestReviewStateFixture>(
          'diagnostics',
          reviewSlice,
          reviewFile
        );

        expect(
          reviewConformanceManifest(
            fixture.manifest,
            normalizeManifestReviewOptions(fixture.options as never),
            (run) => {
              const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
              return (
                fixture.executions[key] ?? {
                  outcome: 'failed',
                  messages: ['missing execution']
                }
              );
            }
          )
        ).toEqual(normalizeManifestReviewState(fixture.expected_state as never));
      }
    }
  });

  it('conforms to the backend-sensitive aggregate fixtures', () => {
    const plansFixture = readFixture<{
      manifest: ConformanceManifest;
      contexts: Record<string, ConformanceFamilyPlanContext>;
      expected_entries: readonly NamedConformanceSuitePlan[];
    }>(
      'diagnostics',
      'slice-167-backend-sensitive-aggregate-suite-plans',
      'backend-sensitive-aggregate-suite-plans.json'
    );

    expect(
      planNamedConformanceSuites(
        plansFixture.manifest,
        Object.fromEntries(
          Object.entries(plansFixture.contexts).map(([family, context]) => [
            family,
            normalizeFamilyPlanContext(context as never)
          ])
        )
      )
    ).toEqual(plansFixture.expected_entries.map((entry) => normalizeSuitePlan(entry as never)));

    const reportFixtures = [
      readFixture<ConformanceManifestReportFixture>(
        'diagnostics',
        'slice-168-backend-sensitive-aggregate-tree-sitter-report',
        'backend-sensitive-aggregate-tree-sitter-report.json'
      ),
      readFixture<ConformanceManifestReportFixture>(
        'diagnostics',
        'slice-169-backend-sensitive-aggregate-native-report',
        'backend-sensitive-aggregate-native-report.json'
      )
    ];

    for (const fixture of reportFixtures) {
      expect(
        reportConformanceManifest(
          fixture.manifest,
          normalizeManifestPlanningOptions(fixture.options as never),
          (run) => {
            const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
            return (
              fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] }
            );
          }
        )
      ).toEqual(normalizeManifestReport(fixture.expected_report as never));
    }

    const reviewFixtures = [
      readFixture<ConformanceManifestReviewStateFixture>(
        'diagnostics',
        'slice-192-backend-sensitive-aggregate-tree-sitter-review-state',
        'backend-sensitive-aggregate-tree-sitter-review-state.json'
      ),
      readFixture<ConformanceManifestReviewStateFixture>(
        'diagnostics',
        'slice-193-backend-sensitive-aggregate-native-review-state',
        'backend-sensitive-aggregate-native-review-state.json'
      )
    ];

    for (const fixture of reviewFixtures) {
      expect(
        reviewConformanceManifest(
          fixture.manifest,
          normalizeManifestReviewOptions(fixture.options as never),
          (run) => {
            const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
            return (
              fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] }
            );
          }
        )
      ).toEqual(normalizeManifestReviewState(fixture.expected_state as never));
    }
  });

  it('conforms to the slice-61 review host hints fixture', () => {
    const fixture = readFixture<ReviewHostHintsFixture>(
      ...diagnosticsFixturePath('review_host_hints')
    );

    expect(
      conformanceReviewHostHints(normalizeManifestReviewOptions(fixture.options as never))
    ).toEqual(normalizeReviewHostHints(fixture.expected_hints));
  });

  it('conforms to the slice-62 family-context review request fixture', () => {
    const fixture = readFixture<FamilyContextReviewRequestFixture>(
      ...diagnosticsFixturePath('family_context_review_request')
    );

    const reviewed = reviewConformanceFamilyContext(
      fixture.family,
      normalizeManifestReviewOptions(fixture.options as never)
    );

    expect(reviewRequestIdForFamilyContext(fixture.family)).toEqual(fixture.expected_request.id);
    expect(reviewed.diagnostics).toEqual([normalizeDiagnostic(fixture.expected_diagnostic)]);
    expect(reviewed.requests).toEqual([normalizeReviewRequest(fixture.expected_request)]);
  });

  it('conforms to the slice-77 family-context review proposal fixture', () => {
    const fixture = readFixture<FamilyContextReviewRequestFixture>(
      ...diagnosticsFixturePath('family_context_review_proposal')
    );

    const reviewed = reviewConformanceFamilyContext(
      fixture.family,
      normalizeManifestReviewOptions(fixture.options as never)
    );

    expect(reviewed.requests).toEqual([normalizeReviewRequest(fixture.expected_request)]);
  });

  it('conforms to the slice-78 family-context explicit review decision fixture', () => {
    const fixture = readFixture<FamilyContextExplicitReviewDecisionFixture>(
      ...diagnosticsFixturePath('family_context_explicit_review_decision')
    );

    const reviewed = reviewConformanceFamilyContext(
      fixture.family,
      normalizeManifestReviewOptions(fixture.options as never)
    );

    expect(reviewed.context).toEqual(normalizeFamilyPlanContext(fixture.expected_context));
    expect(reviewed.appliedDecisions).toEqual(
      fixture.expected_applied_decisions.map((decision) => normalizeReviewDecision(decision))
    );
    expect(reviewed.diagnostics).toEqual([]);
    expect(reviewed.requests).toEqual([]);
  });

  it('conforms to the slice-63 conformance manifest review-state fixture', () => {
    const fixture = readFixture<ConformanceManifestReviewStateFixture>(
      ...diagnosticsFixturePath('conformance_manifest_review_state')
    );

    expect(
      reviewConformanceManifest(
        fixture.manifest,
        normalizeManifestReviewOptions(fixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        }
      )
    ).toEqual(normalizeManifestReviewState(fixture.expected_state as never));

    expect(
      conformanceManifestReplayContext(
        fixture.manifest,
        normalizeManifestReviewOptions(fixture.options as never)
      )
    ).toEqual(normalizeReviewReplayContext(fixture.expected_state.replay_context));
  });

  it('conforms to the slice-64 reviewed default-context fixture', () => {
    const fixture = readFixture<ConformanceManifestReviewStateFixture>(
      ...diagnosticsFixturePath('reviewed_default_context')
    );

    expect(
      reviewConformanceManifest(
        fixture.manifest,
        normalizeManifestReviewOptions(fixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        }
      )
    ).toEqual(normalizeManifestReviewState(fixture.expected_state as never));
  });

  it('conforms to the slice-65 review replay compatibility fixture', () => {
    const fixture = readFixture<ReviewReplayCompatibilityFixture>(
      ...diagnosticsFixturePath('review_replay_compatibility')
    );
    const current = normalizeReviewReplayContext(fixture.current_context);

    expect(
      reviewReplayContextCompatible(
        current,
        normalizeReviewReplayContext(fixture.compatible_context)
      )
    ).toBe(true);
    expect(
      reviewReplayContextCompatible(
        current,
        normalizeReviewReplayContext(fixture.incompatible_context)
      )
    ).toBe(false);
    expect(reviewReplayContextCompatible(current, undefined)).toBe(false);
  });

  it('conforms to the slice-66 review replay rejection fixture', () => {
    const fixture = readFixture<ConformanceManifestReviewStateFixture>(
      ...diagnosticsFixturePath('review_replay_rejection')
    );

    expect(
      reviewConformanceManifest(
        fixture.manifest,
        normalizeManifestReviewOptions(fixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        }
      )
    ).toEqual(normalizeManifestReviewState(fixture.expected_state as never));
  });

  it('conforms to the slice-67 review request ids fixture', () => {
    const fixture = readFixture<ReviewRequestIdsFixture>(
      ...diagnosticsFixturePath('review_request_ids')
    );

    expect(
      conformanceManifestReviewRequestIds(
        fixture.manifest,
        normalizeManifestReviewOptions(fixture.options as never)
      )
    ).toEqual(fixture.expected_request_ids);
  });

  it('conforms to the slice-68 stale review decision fixture', () => {
    const fixture = readFixture<ConformanceManifestReviewStateFixture>(
      ...diagnosticsFixturePath('stale_review_decision')
    );

    expect(
      reviewConformanceManifest(
        fixture.manifest,
        normalizeManifestReviewOptions(fixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        }
      )
    ).toEqual(normalizeManifestReviewState(fixture.expected_state as never));
  });

  it('conforms to the slice-69 review replay bundle fixture', () => {
    const fixture = readFixture<ReviewReplayBundleFixture>(
      ...diagnosticsFixturePath('review_replay_bundle')
    );

    expect(
      reviewReplayBundleInputs(
        normalizeManifestReviewOptions({
          review_replay_bundle: fixture.replay_bundle
        })
      )
    ).toEqual({
      replayContext: normalizeReviewReplayContext(fixture.replay_bundle.replay_context),
      decisions: fixture.replay_bundle.decisions.map((decision) =>
        normalizeReviewDecision(decision)
      ),
      reviewedNestedExecutions: []
    });
  });

  it('conforms to the slice-305 review replay bundle reviewed nested executions fixture', () => {
    const fixture = readFixture<ReviewReplayBundleFixture>(
      ...diagnosticsFixturePath('review_replay_bundle_reviewed_nested_executions')
    );

    expect(
      reviewReplayBundleInputs(
        normalizeManifestReviewOptions({
          review_replay_bundle: fixture.replay_bundle
        })
      )
    ).toEqual({
      replayContext: normalizeReviewReplayContext(fixture.replay_bundle.replay_context),
      decisions: fixture.replay_bundle.decisions.map((decision) =>
        normalizeReviewDecision(decision)
      ),
      reviewedNestedExecutions: (fixture.replay_bundle.reviewed_nested_executions ?? []).map(
        (execution) => normalizeReviewedNestedExecution(execution)
      )
    });
  });

  it('conforms to the slice-70 review replay bundle application fixture', () => {
    const fixture = readFixture<ConformanceManifestReviewStateFixture>(
      ...diagnosticsFixturePath('review_replay_bundle_application')
    );

    expect(
      reviewConformanceManifest(
        fixture.manifest,
        normalizeManifestReviewOptions(fixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        }
      )
    ).toEqual(normalizeManifestReviewState(fixture.expected_state as never));
  });

  it('conforms to the slice-209 surface-ownership fixture', () => {
    const surfaceFixture = readFixture<SurfaceOwnershipFixture>(
      ...diagnosticsFixturePath('surface_ownership')
    );

    expect(JSON.parse(JSON.stringify(normalizeDiscoveredSurface(surfaceFixture.surface)))).toEqual(
      normalizeDiscoveredSurface(surfaceFixture.surface)
    );
  });

  it('conforms to the slice-210 delegated child-operation fixture', () => {
    const childOperationFixture = readFixture<DelegatedChildOperationFixture>(
      ...diagnosticsFixturePath('delegated_child_operation')
    );

    expect(
      JSON.parse(JSON.stringify(normalizeDelegatedChildOperation(childOperationFixture.operation)))
    ).toEqual(normalizeDelegatedChildOperation(childOperationFixture.operation));
  });

  it('conforms to the slice-419 structured-edit structure-profile fixture', () => {
    const fixture = readFixture<StructuredEditStructureProfileFixture>(
      ...diagnosticsFixturePath('structured_edit_structure_profile')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          fixture.cases.map((entry) => ({
            label: entry.label,
            profile: normalizeStructuredEditStructureProfile(entry.profile)
          }))
        )
      )
    ).toEqual(
      fixture.cases.map((entry) => ({
        label: entry.label,
        profile: normalizeStructuredEditStructureProfile(entry.profile)
      }))
    );
  });

  it('conforms to the slice-420 structured-edit selection-profile fixture', () => {
    const fixture = readFixture<StructuredEditSelectionProfileFixture>(
      ...diagnosticsFixturePath('structured_edit_selection_profile')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          fixture.cases.map((entry) => ({
            label: entry.label,
            profile: normalizeStructuredEditSelectionProfile(entry.profile)
          }))
        )
      )
    ).toEqual(
      fixture.cases.map((entry) => ({
        label: entry.label,
        profile: normalizeStructuredEditSelectionProfile(entry.profile)
      }))
    );
  });

  it('conforms to the slice-421 structured-edit match-profile fixture', () => {
    const fixture = readFixture<StructuredEditMatchProfileFixture>(
      ...diagnosticsFixturePath('structured_edit_match_profile')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          fixture.cases.map((entry) => ({
            label: entry.label,
            profile: normalizeStructuredEditMatchProfile(entry.profile)
          }))
        )
      )
    ).toEqual(
      fixture.cases.map((entry) => ({
        label: entry.label,
        profile: normalizeStructuredEditMatchProfile(entry.profile)
      }))
    );
  });

  it('conforms to the slice-422 structured-edit operation-profile fixture', () => {
    const fixture = readFixture<StructuredEditOperationProfileFixture>(
      ...diagnosticsFixturePath('structured_edit_operation_profile')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          fixture.cases.map((entry) => ({
            label: entry.label,
            profile: normalizeStructuredEditOperationProfile(entry.profile)
          }))
        )
      )
    ).toEqual(
      fixture.cases.map((entry) => ({
        label: entry.label,
        profile: normalizeStructuredEditOperationProfile(entry.profile)
      }))
    );
  });

  it('conforms to the slice-423 structured-edit destination-profile fixture', () => {
    const fixture = readFixture<StructuredEditDestinationProfileFixture>(
      ...diagnosticsFixturePath('structured_edit_destination_profile')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          fixture.cases.map((entry) => ({
            label: entry.label,
            profile: normalizeStructuredEditDestinationProfile(entry.profile)
          }))
        )
      )
    ).toEqual(
      fixture.cases.map((entry) => ({
        label: entry.label,
        profile: normalizeStructuredEditDestinationProfile(entry.profile)
      }))
    );
  });

  it('conforms to the slice-426 structured-edit request fixture', () => {
    const fixture = readFixture<StructuredEditRequestFixture>(
      ...diagnosticsFixturePath('structured_edit_request')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          fixture.cases.map((entry) => ({
            label: entry.label,
            request: normalizeStructuredEditRequest(entry.request)
          }))
        )
      )
    ).toEqual(
      fixture.cases.map((entry) => ({
        label: entry.label,
        request: normalizeStructuredEditRequest(entry.request)
      }))
    );
  });

  it('conforms to the slice-427 structured-edit result fixture', () => {
    const fixture = readFixture<StructuredEditResultFixture>(
      ...diagnosticsFixturePath('structured_edit_result')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          fixture.cases.map((entry) => ({
            label: entry.label,
            result: normalizeStructuredEditResult(entry.result)
          }))
        )
      )
    ).toEqual(
      fixture.cases.map((entry) => ({
        label: entry.label,
        result: normalizeStructuredEditResult(entry.result)
      }))
    );
  });

  it('conforms to the slice-432 structured-edit application fixture', () => {
    const fixture = readFixture<StructuredEditApplicationFixture>(
      ...diagnosticsFixturePath('structured_edit_application')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          fixture.cases.map((entry) => ({
            label: entry.label,
            application: normalizeStructuredEditApplication(entry.application)
          }))
        )
      )
    ).toEqual(
      fixture.cases.map((entry) => ({
        label: entry.label,
        application: normalizeStructuredEditApplication(entry.application)
      }))
    );
  });

  it('conforms to the slice-435 structured-edit transport envelope fixture', () => {
    const fixture = readFixture<StructuredEditApplicationEnvelopeFixture>(
      ...diagnosticsFixturePath('structured_edit_application_envelope')
    );
    const application = normalizeStructuredEditApplication(fixture.structured_edit_application);
    const expected = normalizeStructuredEditApplicationEnvelope(fixture.expected_envelope);

    expect(structuredEditApplicationEnvelope(application)).toEqual(expected);
    expect(importStructuredEditApplicationEnvelope(expected)).toEqual({ application });
  });

  it('conforms to the slice-436 structured-edit transport rejection fixture', () => {
    const fixture = readFixture<StructuredEditApplicationEnvelopeRejectionFixture>(
      ...diagnosticsFixturePath('structured_edit_application_envelope_rejection')
    );

    for (const rejectionCase of fixture.cases) {
      expect(importStructuredEditApplicationEnvelope(rejectionCase.envelope)).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-437 structured-edit envelope application fixture', () => {
    const fixture = readFixture<StructuredEditApplicationEnvelopeApplicationFixture>(
      ...diagnosticsFixturePath('structured_edit_application_envelope_application')
    );

    expect(
      importStructuredEditApplicationEnvelope(
        normalizeStructuredEditApplicationEnvelope(fixture.structured_edit_application_envelope)
      )
    ).toEqual({
      application: normalizeStructuredEditApplication(fixture.expected_application)
    });

    for (const rejectionCase of fixture.cases) {
      expect(importStructuredEditApplicationEnvelope(rejectionCase.envelope)).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-438 structured-edit execution report fixture', () => {
    const fixture = readFixture<StructuredEditExecutionReportFixture>(
      ...diagnosticsFixturePath('structured_edit_execution_report')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          fixture.cases.map((entry) => ({
            label: entry.label,
            report: normalizeStructuredEditExecutionReport(entry.report)
          }))
        )
      )
    ).toEqual(
      fixture.cases.map((entry) => ({
        label: entry.label,
        report: normalizeStructuredEditExecutionReport(entry.report)
      }))
    );
  });

  it('conforms to the slice-453 structured-edit provider execution request fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionRequestFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_request')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          fixture.cases.map((entry) => ({
            label: entry.label,
            executionRequest: normalizeStructuredEditProviderExecutionRequest(
              entry.execution_request
            )
          }))
        )
      )
    ).toEqual(
      fixture.cases.map((entry) => ({
        label: entry.label,
        executionRequest: normalizeStructuredEditProviderExecutionRequest(entry.execution_request)
      }))
    );
  });

  it('conforms to the slice-454 structured-edit provider execution request transport envelope fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionRequestEnvelopeFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_request_envelope')
    );
    const executionRequest = normalizeStructuredEditProviderExecutionRequest(
      fixture.structured_edit_provider_execution_request
    );
    const expected = normalizeStructuredEditProviderExecutionRequestEnvelope(
      fixture.expected_envelope
    );

    expect(structuredEditProviderExecutionRequestEnvelope(executionRequest)).toEqual(expected);
    expect(importStructuredEditProviderExecutionRequestEnvelope(expected)).toEqual({
      executionRequest
    });
  });

  it('conforms to the slice-455 structured-edit provider execution request transport rejection fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionRequestEnvelopeRejectionFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_request_envelope_rejection')
    );

    for (const rejectionCase of fixture.cases) {
      expect(importStructuredEditProviderExecutionRequestEnvelope(rejectionCase.envelope)).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-456 structured-edit provider execution request envelope application fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionRequestEnvelopeApplicationFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_request_envelope_application')
    );

    expect(
      importStructuredEditProviderExecutionRequestEnvelope(
        normalizeStructuredEditProviderExecutionRequestEnvelope(
          fixture.structured_edit_provider_execution_request_envelope
        )
      )
    ).toEqual({
      executionRequest: normalizeStructuredEditProviderExecutionRequest(
        fixture.expected_execution_request
      )
    });

    for (const rejectionCase of fixture.cases) {
      expect(importStructuredEditProviderExecutionRequestEnvelope(rejectionCase.envelope)).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-461 structured-edit provider execution application fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionApplicationFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_application')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          fixture.cases.map((entry) => ({
            label: entry.label,
            application: normalizeStructuredEditProviderExecutionApplication(entry.application)
          }))
        )
      )
    ).toEqual(
      fixture.cases.map((entry) => ({
        label: entry.label,
        application: normalizeStructuredEditProviderExecutionApplication(entry.application)
      }))
    );
  });

  it('conforms to the slice-469 structured-edit provider execution dispatch fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionDispatchFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_dispatch')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          fixture.cases.map((entry) => ({
            label: entry.label,
            dispatch: normalizeStructuredEditProviderExecutionDispatch(entry.dispatch)
          }))
        )
      )
    ).toEqual(
      fixture.cases.map((entry) => ({
        label: entry.label,
        dispatch: normalizeStructuredEditProviderExecutionDispatch(entry.dispatch)
      }))
    );
  });

  it('conforms to the slice-470 structured-edit provider execution dispatch transport envelope fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionDispatchEnvelopeFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_dispatch_envelope')
    );
    const dispatch = normalizeStructuredEditProviderExecutionDispatch(
      fixture.structured_edit_provider_execution_dispatch
    );
    const expected = normalizeStructuredEditProviderExecutionDispatchEnvelope(
      fixture.expected_envelope
    );

    expect(structuredEditProviderExecutionDispatchEnvelope(dispatch)).toEqual(expected);
    expect(importStructuredEditProviderExecutionDispatchEnvelope(expected)).toEqual({
      providerExecutionDispatch: dispatch
    });
  });

  it('conforms to the slice-471 structured-edit provider execution dispatch transport rejection fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionDispatchEnvelopeRejectionFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_dispatch_envelope_rejection')
    );

    for (const rejectionCase of fixture.cases) {
      expect(importStructuredEditProviderExecutionDispatchEnvelope(rejectionCase.envelope)).toEqual(
        {
          error: rejectionCase.expected_error
        }
      );
    }
  });

  it('conforms to the slice-472 structured-edit provider execution dispatch envelope application fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionDispatchEnvelopeApplicationFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_dispatch_envelope_application')
    );

    expect(
      importStructuredEditProviderExecutionDispatchEnvelope(
        normalizeStructuredEditProviderExecutionDispatchEnvelope(
          fixture.structured_edit_provider_execution_dispatch_envelope
        )
      )
    ).toEqual({
      providerExecutionDispatch: normalizeStructuredEditProviderExecutionDispatch(
        fixture.expected_dispatch
      )
    });

    for (const rejectionCase of fixture.cases) {
      expect(importStructuredEditProviderExecutionDispatchEnvelope(rejectionCase.envelope)).toEqual(
        {
          error: rejectionCase.expected_error
        }
      );
    }
  });

  it('conforms to the slice-477 structured-edit provider execution outcome fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionOutcomeFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_outcome')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          fixture.cases.map((entry) => ({
            label: entry.label,
            outcome: normalizeStructuredEditProviderExecutionOutcome(entry.outcome)
          }))
        )
      )
    ).toEqual(
      fixture.cases.map((entry) => ({
        label: entry.label,
        outcome: normalizeStructuredEditProviderExecutionOutcome(entry.outcome)
      }))
    );
  });

  it('conforms to the slice-478 structured-edit provider execution outcome transport envelope fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionOutcomeEnvelopeFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_outcome_envelope')
    );
    const outcome = normalizeStructuredEditProviderExecutionOutcome(
      fixture.structured_edit_provider_execution_outcome
    );
    const expected = normalizeStructuredEditProviderExecutionOutcomeEnvelope(
      fixture.expected_envelope
    );

    expect(structuredEditProviderExecutionOutcomeEnvelope(outcome)).toEqual(expected);
    expect(importStructuredEditProviderExecutionOutcomeEnvelope(expected)).toEqual({
      providerExecutionOutcome: outcome
    });
  });

  it('conforms to the slice-479 structured-edit provider execution outcome transport rejection fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionOutcomeEnvelopeRejectionFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_outcome_envelope_rejection')
    );

    for (const rejectionCase of fixture.cases) {
      expect(importStructuredEditProviderExecutionOutcomeEnvelope(rejectionCase.envelope)).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-480 structured-edit provider execution outcome envelope application fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionOutcomeEnvelopeApplicationFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_outcome_envelope_application')
    );

    expect(
      importStructuredEditProviderExecutionOutcomeEnvelope(
        normalizeStructuredEditProviderExecutionOutcomeEnvelope(
          fixture.structured_edit_provider_execution_outcome_envelope
        )
      )
    ).toEqual({
      providerExecutionOutcome: normalizeStructuredEditProviderExecutionOutcome(
        fixture.expected_outcome
      )
    });

    for (const rejectionCase of fixture.cases) {
      expect(importStructuredEditProviderExecutionOutcomeEnvelope(rejectionCase.envelope)).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-481 structured-edit provider batch execution outcome fixture', () => {
    const fixture = readFixture<StructuredEditProviderBatchExecutionOutcomeFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_batch_execution_outcome')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          fixture.cases.map((entry) => ({
            label: entry.label,
            batchOutcome: normalizeStructuredEditProviderBatchExecutionOutcome(entry.batch_outcome)
          }))
        )
      )
    ).toEqual(
      fixture.cases.map((entry) => ({
        label: entry.label,
        batchOutcome: normalizeStructuredEditProviderBatchExecutionOutcome(entry.batch_outcome)
      }))
    );
  });

  it('conforms to the slice-482 structured-edit provider batch execution outcome transport envelope fixture', () => {
    const fixture = readFixture<StructuredEditProviderBatchExecutionOutcomeEnvelopeFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_batch_execution_outcome_envelope')
    );
    const batchOutcome = normalizeStructuredEditProviderBatchExecutionOutcome(
      fixture.structured_edit_provider_batch_execution_outcome
    );
    const expected = normalizeStructuredEditProviderBatchExecutionOutcomeEnvelope(
      fixture.expected_envelope
    );

    expect(structuredEditProviderBatchExecutionOutcomeEnvelope(batchOutcome)).toEqual(expected);
    expect(importStructuredEditProviderBatchExecutionOutcomeEnvelope(expected)).toEqual({
      batchOutcome
    });
  });

  it('conforms to the slice-483 structured-edit provider batch execution outcome transport rejection fixture', () => {
    const fixture =
      readFixture<StructuredEditProviderBatchExecutionOutcomeEnvelopeRejectionFixture>(
        ...diagnosticsFixturePath(
          'structured_edit_provider_batch_execution_outcome_envelope_rejection'
        )
      );

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderBatchExecutionOutcomeEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-484 structured-edit provider batch execution outcome envelope application fixture', () => {
    const fixture =
      readFixture<StructuredEditProviderBatchExecutionOutcomeEnvelopeApplicationFixture>(
        ...diagnosticsFixturePath(
          'structured_edit_provider_batch_execution_outcome_envelope_application'
        )
      );

    expect(
      importStructuredEditProviderBatchExecutionOutcomeEnvelope(
        normalizeStructuredEditProviderBatchExecutionOutcomeEnvelope(
          fixture.structured_edit_provider_batch_execution_outcome_envelope
        )
      )
    ).toEqual({
      batchOutcome: normalizeStructuredEditProviderBatchExecutionOutcome(
        fixture.expected_batch_outcome
      )
    });

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderBatchExecutionOutcomeEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-485 structured-edit provider execution provenance fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionProvenanceFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_provenance')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          fixture.cases.map((entry) => ({
            label: entry.label,
            provenance: normalizeStructuredEditProviderExecutionProvenance(entry.provenance)
          }))
        )
      )
    ).toEqual(
      fixture.cases.map((entry) => ({
        label: entry.label,
        provenance: normalizeStructuredEditProviderExecutionProvenance(entry.provenance)
      }))
    );
  });

  it('conforms to the slice-486 structured-edit provider execution provenance transport envelope fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionProvenanceEnvelopeFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_provenance_envelope')
    );
    const provenance = normalizeStructuredEditProviderExecutionProvenance(
      fixture.structured_edit_provider_execution_provenance
    );
    const expected = normalizeStructuredEditProviderExecutionProvenanceEnvelope(
      fixture.expected_envelope
    );

    expect(structuredEditProviderExecutionProvenanceEnvelope(provenance)).toEqual(expected);
    expect(importStructuredEditProviderExecutionProvenanceEnvelope(expected)).toEqual({
      provenance
    });
  });

  it('conforms to the slice-487 structured-edit provider execution provenance transport rejection fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionProvenanceEnvelopeRejectionFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_provenance_envelope_rejection')
    );

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderExecutionProvenanceEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-488 structured-edit provider execution provenance envelope application fixture', () => {
    const fixture =
      readFixture<StructuredEditProviderExecutionProvenanceEnvelopeApplicationFixture>(
        ...diagnosticsFixturePath(
          'structured_edit_provider_execution_provenance_envelope_application'
        )
      );

    expect(
      importStructuredEditProviderExecutionProvenanceEnvelope(
        normalizeStructuredEditProviderExecutionProvenanceEnvelope(
          fixture.structured_edit_provider_execution_provenance_envelope
        )
      )
    ).toEqual({
      provenance: normalizeStructuredEditProviderExecutionProvenance(fixture.expected_provenance)
    });

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderExecutionProvenanceEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-489 structured-edit provider batch execution provenance fixture', () => {
    const fixture = readFixture<StructuredEditProviderBatchExecutionProvenanceFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_batch_execution_provenance')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          fixture.cases.map((entry) => ({
            label: entry.label,
            batchProvenance: normalizeStructuredEditProviderBatchExecutionProvenance(
              entry.batch_provenance
            )
          }))
        )
      )
    ).toEqual(
      fixture.cases.map((entry) => ({
        label: entry.label,
        batchProvenance: normalizeStructuredEditProviderBatchExecutionProvenance(
          entry.batch_provenance
        )
      }))
    );
  });

  it('conforms to the slice-490 structured-edit provider batch execution provenance transport envelope fixture', () => {
    const fixture = readFixture<StructuredEditProviderBatchExecutionProvenanceEnvelopeFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_batch_execution_provenance_envelope')
    );
    const batchProvenance = normalizeStructuredEditProviderBatchExecutionProvenance(
      fixture.structured_edit_provider_batch_execution_provenance
    );
    const expected = normalizeStructuredEditProviderBatchExecutionProvenanceEnvelope(
      fixture.expected_envelope
    );

    expect(structuredEditProviderBatchExecutionProvenanceEnvelope(batchProvenance)).toEqual(
      expected
    );
    expect(importStructuredEditProviderBatchExecutionProvenanceEnvelope(expected)).toEqual({
      batchProvenance
    });
  });

  it('conforms to the slice-491 structured-edit provider batch execution provenance transport rejection fixture', () => {
    const fixture =
      readFixture<StructuredEditProviderBatchExecutionProvenanceEnvelopeRejectionFixture>(
        ...diagnosticsFixturePath(
          'structured_edit_provider_batch_execution_provenance_envelope_rejection'
        )
      );

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderBatchExecutionProvenanceEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-492 structured-edit provider batch execution provenance envelope application fixture', () => {
    const fixture =
      readFixture<StructuredEditProviderBatchExecutionProvenanceEnvelopeApplicationFixture>(
        ...diagnosticsFixturePath(
          'structured_edit_provider_batch_execution_provenance_envelope_application'
        )
      );

    expect(
      importStructuredEditProviderBatchExecutionProvenanceEnvelope(
        normalizeStructuredEditProviderBatchExecutionProvenanceEnvelope(
          fixture.structured_edit_provider_batch_execution_provenance_envelope
        )
      )
    ).toEqual({
      batchProvenance: normalizeStructuredEditProviderBatchExecutionProvenance(
        fixture.expected_batch_provenance
      )
    });

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderBatchExecutionProvenanceEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-493 structured-edit provider execution replay bundle fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionReplayBundleFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_replay_bundle')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          fixture.cases.map((entry) => ({
            label: entry.label,
            replayBundle: normalizeStructuredEditProviderExecutionReplayBundle(entry.replay_bundle)
          }))
        )
      )
    ).toEqual(
      fixture.cases.map((entry) => ({
        label: entry.label,
        replayBundle: normalizeStructuredEditProviderExecutionReplayBundle(entry.replay_bundle)
      }))
    );
  });

  it('conforms to the slice-494 structured-edit provider execution replay bundle transport envelope fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionReplayBundleEnvelopeFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_replay_bundle_envelope')
    );
    const replayBundle = normalizeStructuredEditProviderExecutionReplayBundle(
      fixture.structured_edit_provider_execution_replay_bundle
    );
    const expected = normalizeStructuredEditProviderExecutionReplayBundleEnvelope(
      fixture.expected_envelope
    );

    expect(structuredEditProviderExecutionReplayBundleEnvelope(replayBundle)).toEqual(expected);
    expect(importStructuredEditProviderExecutionReplayBundleEnvelope(expected)).toEqual({
      replayBundle
    });
  });

  it('conforms to the slice-495 structured-edit provider execution replay bundle transport rejection fixture', () => {
    const fixture =
      readFixture<StructuredEditProviderExecutionReplayBundleEnvelopeRejectionFixture>(
        ...diagnosticsFixturePath(
          'structured_edit_provider_execution_replay_bundle_envelope_rejection'
        )
      );

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderExecutionReplayBundleEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-496 structured-edit provider execution replay bundle envelope application fixture', () => {
    const fixture =
      readFixture<StructuredEditProviderExecutionReplayBundleEnvelopeApplicationFixture>(
        ...diagnosticsFixturePath(
          'structured_edit_provider_execution_replay_bundle_envelope_application'
        )
      );

    expect(
      importStructuredEditProviderExecutionReplayBundleEnvelope(
        normalizeStructuredEditProviderExecutionReplayBundleEnvelope(
          fixture.structured_edit_provider_execution_replay_bundle_envelope
        )
      )
    ).toEqual({
      replayBundle: normalizeStructuredEditProviderExecutionReplayBundle(
        fixture.expected_replay_bundle
      )
    });

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderExecutionReplayBundleEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-497 structured-edit provider batch execution replay bundle fixture', () => {
    const fixture = readFixture<StructuredEditProviderBatchExecutionReplayBundleFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_batch_execution_replay_bundle')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          fixture.cases.map((entry) => ({
            label: entry.label,
            batchReplayBundle: normalizeStructuredEditProviderBatchExecutionReplayBundle(
              entry.batch_replay_bundle
            )
          }))
        )
      )
    ).toEqual(
      fixture.cases.map((entry) => ({
        label: entry.label,
        batchReplayBundle: normalizeStructuredEditProviderBatchExecutionReplayBundle(
          entry.batch_replay_bundle
        )
      }))
    );
  });

  it('conforms to the slice-498 structured-edit provider batch execution replay bundle transport envelope fixture', () => {
    const fixture = readFixture<StructuredEditProviderBatchExecutionReplayBundleEnvelopeFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_batch_execution_replay_bundle_envelope')
    );
    const batchReplayBundle = normalizeStructuredEditProviderBatchExecutionReplayBundle(
      fixture.structured_edit_provider_batch_execution_replay_bundle
    );
    const expected = normalizeStructuredEditProviderBatchExecutionReplayBundleEnvelope(
      fixture.expected_envelope
    );

    expect(structuredEditProviderBatchExecutionReplayBundleEnvelope(batchReplayBundle)).toEqual(
      expected
    );
    expect(importStructuredEditProviderBatchExecutionReplayBundleEnvelope(expected)).toEqual({
      batchReplayBundle
    });
  });

  it('conforms to the slice-499 structured-edit provider batch execution replay bundle transport rejection fixture', () => {
    const fixture =
      readFixture<StructuredEditProviderBatchExecutionReplayBundleEnvelopeRejectionFixture>(
        ...diagnosticsFixturePath(
          'structured_edit_provider_batch_execution_replay_bundle_envelope_rejection'
        )
      );

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderBatchExecutionReplayBundleEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-500 structured-edit provider batch execution replay bundle envelope application fixture', () => {
    const fixture =
      readFixture<StructuredEditProviderBatchExecutionReplayBundleEnvelopeApplicationFixture>(
        ...diagnosticsFixturePath(
          'structured_edit_provider_batch_execution_replay_bundle_envelope_application'
        )
      );

    expect(
      importStructuredEditProviderBatchExecutionReplayBundleEnvelope(
        normalizeStructuredEditProviderBatchExecutionReplayBundleEnvelope(
          fixture.structured_edit_provider_batch_execution_replay_bundle_envelope
        )
      )
    ).toEqual({
      batchReplayBundle: normalizeStructuredEditProviderBatchExecutionReplayBundle(
        fixture.expected_batch_replay_bundle
      )
    });

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderBatchExecutionReplayBundleEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-501 structured-edit provider executor profile fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutorProfileFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_executor_profile')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          fixture.cases.map((entry) => ({
            label: entry.label,
            executorProfile: normalizeStructuredEditProviderExecutorProfile(entry.executor_profile)
          }))
        )
      )
    ).toEqual(
      fixture.cases.map((entry) => ({
        label: entry.label,
        executorProfile: normalizeStructuredEditProviderExecutorProfile(entry.executor_profile)
      }))
    );
  });

  it('conforms to the slice-502 structured-edit provider executor profile transport envelope fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutorProfileEnvelopeFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_executor_profile_envelope')
    );
    const executorProfile = normalizeStructuredEditProviderExecutorProfile(
      fixture.structured_edit_provider_executor_profile
    );
    const expected = normalizeStructuredEditProviderExecutorProfileEnvelope(
      fixture.expected_envelope
    );

    expect(structuredEditProviderExecutorProfileEnvelope(executorProfile)).toEqual(expected);
    expect(importStructuredEditProviderExecutorProfileEnvelope(expected)).toEqual({
      executorProfile
    });
  });

  it('conforms to the slice-503 structured-edit provider executor profile transport rejection fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutorProfileEnvelopeRejectionFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_executor_profile_envelope_rejection')
    );

    for (const rejectionCase of fixture.cases) {
      expect(importStructuredEditProviderExecutorProfileEnvelope(rejectionCase.envelope)).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-504 structured-edit provider executor profile envelope application fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutorProfileEnvelopeApplicationFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_executor_profile_envelope_application')
    );

    expect(
      importStructuredEditProviderExecutorProfileEnvelope(
        normalizeStructuredEditProviderExecutorProfileEnvelope(
          fixture.structured_edit_provider_executor_profile_envelope
        )
      )
    ).toEqual({
      executorProfile: normalizeStructuredEditProviderExecutorProfile(
        fixture.expected_executor_profile
      )
    });

    for (const rejectionCase of fixture.cases) {
      expect(importStructuredEditProviderExecutorProfileEnvelope(rejectionCase.envelope)).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-505 structured-edit provider executor registry fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutorRegistryFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_executor_registry')
    );

    for (const entry of fixture.cases) {
      expect(
        JSON.parse(
          JSON.stringify({
            executorRegistry: normalizeStructuredEditProviderExecutorRegistry(
              entry.executor_registry
            )
          })
        )
      ).toEqual({
        executorRegistry: normalizeStructuredEditProviderExecutorRegistry(entry.executor_registry)
      });
    }
  });

  it('conforms to the slice-506 structured-edit provider executor registry transport envelope fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutorRegistryEnvelopeFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_executor_registry_envelope')
    );
    const executorRegistry = normalizeStructuredEditProviderExecutorRegistry(
      fixture.structured_edit_provider_executor_registry
    );
    const expected = normalizeStructuredEditProviderExecutorRegistryEnvelope(
      fixture.expected_envelope
    );

    expect(structuredEditProviderExecutorRegistryEnvelope(executorRegistry)).toEqual(expected);
    expect(importStructuredEditProviderExecutorRegistryEnvelope(expected)).toEqual({
      executorRegistry
    });
  });

  it('conforms to the slice-507 structured-edit provider executor registry transport rejection fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutorRegistryEnvelopeRejectionFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_executor_registry_envelope_rejection')
    );

    for (const rejectionCase of fixture.cases) {
      expect(importStructuredEditProviderExecutorRegistryEnvelope(rejectionCase.envelope)).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-508 structured-edit provider executor registry envelope application fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutorRegistryEnvelopeApplicationFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_executor_registry_envelope_application')
    );

    expect(
      importStructuredEditProviderExecutorRegistryEnvelope(
        normalizeStructuredEditProviderExecutorRegistryEnvelope(
          fixture.structured_edit_provider_executor_registry_envelope
        )
      )
    ).toEqual({
      executorRegistry: normalizeStructuredEditProviderExecutorRegistry(
        fixture.expected_executor_registry
      )
    });

    for (const rejectionCase of fixture.cases) {
      expect(importStructuredEditProviderExecutorRegistryEnvelope(rejectionCase.envelope)).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-509 structured-edit provider executor selection policy fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutorSelectionPolicyFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_executor_selection_policy')
    );

    for (const entry of fixture.cases) {
      expect(
        JSON.parse(
          JSON.stringify({
            selectionPolicy: normalizeStructuredEditProviderExecutorSelectionPolicy(
              entry.selection_policy
            )
          })
        )
      ).toEqual({
        selectionPolicy: normalizeStructuredEditProviderExecutorSelectionPolicy(
          entry.selection_policy
        )
      });
    }
  });

  it('conforms to the slice-510 structured-edit provider executor selection policy transport envelope fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutorSelectionPolicyEnvelopeFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_executor_selection_policy_envelope')
    );
    const selectionPolicy = normalizeStructuredEditProviderExecutorSelectionPolicy(
      fixture.structured_edit_provider_executor_selection_policy
    );
    const expected = normalizeStructuredEditProviderExecutorSelectionPolicyEnvelope(
      fixture.expected_envelope
    );

    expect(structuredEditProviderExecutorSelectionPolicyEnvelope(selectionPolicy)).toEqual(
      expected
    );
    expect(importStructuredEditProviderExecutorSelectionPolicyEnvelope(expected)).toEqual({
      selectionPolicy
    });
  });

  it('conforms to the slice-511 structured-edit provider executor selection policy transport rejection fixture', () => {
    const fixture =
      readFixture<StructuredEditProviderExecutorSelectionPolicyEnvelopeRejectionFixture>(
        ...diagnosticsFixturePath(
          'structured_edit_provider_executor_selection_policy_envelope_rejection'
        )
      );

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderExecutorSelectionPolicyEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-512 structured-edit provider executor selection policy envelope application fixture', () => {
    const fixture =
      readFixture<StructuredEditProviderExecutorSelectionPolicyEnvelopeApplicationFixture>(
        ...diagnosticsFixturePath(
          'structured_edit_provider_executor_selection_policy_envelope_application'
        )
      );

    expect(
      importStructuredEditProviderExecutorSelectionPolicyEnvelope(
        normalizeStructuredEditProviderExecutorSelectionPolicyEnvelope(
          fixture.structured_edit_provider_executor_selection_policy_envelope
        )
      )
    ).toEqual({
      selectionPolicy: normalizeStructuredEditProviderExecutorSelectionPolicy(
        fixture.expected_selection_policy
      )
    });

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderExecutorSelectionPolicyEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-513 structured-edit provider executor resolution fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutorResolutionFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_executor_resolution')
    );

    for (const entry of fixture.cases) {
      expect(
        JSON.parse(
          JSON.stringify({
            executorResolution: normalizeStructuredEditProviderExecutorResolution(
              entry.executor_resolution
            )
          })
        )
      ).toEqual({
        executorResolution: normalizeStructuredEditProviderExecutorResolution(
          entry.executor_resolution
        )
      });
    }
  });

  it('conforms to the slice-514 structured-edit provider executor resolution transport envelope fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutorResolutionEnvelopeFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_executor_resolution_envelope')
    );
    const executorResolution = normalizeStructuredEditProviderExecutorResolution(
      fixture.structured_edit_provider_executor_resolution
    );
    const expected = normalizeStructuredEditProviderExecutorResolutionEnvelope(
      fixture.expected_envelope
    );

    expect(structuredEditProviderExecutorResolutionEnvelope(executorResolution)).toEqual(expected);
    expect(importStructuredEditProviderExecutorResolutionEnvelope(expected)).toEqual({
      executorResolution
    });
  });

  it('conforms to the slice-515 structured-edit provider executor resolution transport rejection fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutorResolutionEnvelopeRejectionFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_executor_resolution_envelope_rejection')
    );

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderExecutorResolutionEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-516 structured-edit provider executor resolution envelope application fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutorResolutionEnvelopeApplicationFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_executor_resolution_envelope_application')
    );

    expect(
      importStructuredEditProviderExecutorResolutionEnvelope(
        normalizeStructuredEditProviderExecutorResolutionEnvelope(
          fixture.structured_edit_provider_executor_resolution_envelope
        )
      )
    ).toEqual({
      executorResolution: normalizeStructuredEditProviderExecutorResolution(
        fixture.expected_executor_resolution
      )
    });

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderExecutorResolutionEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-517 structured-edit provider execution plan fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionPlanFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_plan')
    );

    for (const entry of fixture.cases) {
      expect(
        JSON.parse(
          JSON.stringify({
            executionPlan: normalizeStructuredEditProviderExecutionPlan(entry.execution_plan)
          })
        )
      ).toEqual({
        executionPlan: normalizeStructuredEditProviderExecutionPlan(entry.execution_plan)
      });
    }
  });

  it('conforms to the slice-525 structured-edit provider execution handoff fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionHandoffFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_handoff')
    );

    for (const entry of fixture.cases) {
      expect(
        JSON.parse(
          JSON.stringify({
            executionHandoff: normalizeStructuredEditProviderExecutionHandoff(
              entry.execution_handoff
            )
          })
        )
      ).toEqual({
        executionHandoff: normalizeStructuredEditProviderExecutionHandoff(entry.execution_handoff)
      });
    }
  });

  it('conforms to the slice-526 structured-edit provider execution handoff transport envelope fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionHandoffEnvelopeFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_handoff_envelope')
    );
    const executionHandoff = normalizeStructuredEditProviderExecutionHandoff(
      fixture.structured_edit_provider_execution_handoff
    );
    const expected = normalizeStructuredEditProviderExecutionHandoffEnvelope(
      fixture.expected_envelope
    );

    expect(structuredEditProviderExecutionHandoffEnvelope(executionHandoff)).toEqual(expected);
    expect(importStructuredEditProviderExecutionHandoffEnvelope(expected)).toEqual({
      executionHandoff
    });
  });

  it('conforms to the slice-527 structured-edit provider execution handoff transport rejection fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionHandoffEnvelopeRejectionFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_handoff_envelope_rejection')
    );

    for (const rejectionCase of fixture.cases) {
      expect(importStructuredEditProviderExecutionHandoffEnvelope(rejectionCase.envelope)).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-528 structured-edit provider execution handoff envelope application fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionHandoffEnvelopeApplicationFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_handoff_envelope_application')
    );

    expect(
      importStructuredEditProviderExecutionHandoffEnvelope(
        normalizeStructuredEditProviderExecutionHandoffEnvelope(
          fixture.structured_edit_provider_execution_handoff_envelope
        )
      )
    ).toEqual({
      executionHandoff: normalizeStructuredEditProviderExecutionHandoff(
        fixture.expected_execution_handoff
      )
    });

    for (const rejectionCase of fixture.cases) {
      expect(importStructuredEditProviderExecutionHandoffEnvelope(rejectionCase.envelope)).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-529 structured-edit provider batch execution handoff fixture', () => {
    const fixture = readFixture<StructuredEditProviderBatchExecutionHandoffFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_batch_execution_handoff')
    );

    for (const entry of fixture.cases) {
      expect(
        JSON.parse(
          JSON.stringify({
            batchExecutionHandoff: normalizeStructuredEditProviderBatchExecutionHandoff(
              entry.batch_execution_handoff
            )
          })
        )
      ).toEqual({
        batchExecutionHandoff: normalizeStructuredEditProviderBatchExecutionHandoff(
          entry.batch_execution_handoff
        )
      });
    }
  });

  it('conforms to the slice-530 structured-edit provider batch execution handoff transport envelope fixture', () => {
    const fixture = readFixture<StructuredEditProviderBatchExecutionHandoffEnvelopeFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_batch_execution_handoff_envelope')
    );
    const batchExecutionHandoff = normalizeStructuredEditProviderBatchExecutionHandoff(
      fixture.structured_edit_provider_batch_execution_handoff
    );
    const expected = normalizeStructuredEditProviderBatchExecutionHandoffEnvelope(
      fixture.expected_envelope
    );

    expect(structuredEditProviderBatchExecutionHandoffEnvelope(batchExecutionHandoff)).toEqual(
      expected
    );
    expect(importStructuredEditProviderBatchExecutionHandoffEnvelope(expected)).toEqual({
      batchExecutionHandoff
    });
  });

  it('conforms to the slice-531 structured-edit provider batch execution handoff transport rejection fixture', () => {
    const fixture =
      readFixture<StructuredEditProviderBatchExecutionHandoffEnvelopeRejectionFixture>(
        ...diagnosticsFixturePath(
          'structured_edit_provider_batch_execution_handoff_envelope_rejection'
        )
      );

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderBatchExecutionHandoffEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-532 structured-edit provider batch execution handoff envelope application fixture', () => {
    const fixture =
      readFixture<StructuredEditProviderBatchExecutionHandoffEnvelopeApplicationFixture>(
        ...diagnosticsFixturePath(
          'structured_edit_provider_batch_execution_handoff_envelope_application'
        )
      );

    expect(
      importStructuredEditProviderBatchExecutionHandoffEnvelope(
        normalizeStructuredEditProviderBatchExecutionHandoffEnvelope(
          fixture.structured_edit_provider_batch_execution_handoff_envelope
        )
      )
    ).toEqual({
      batchExecutionHandoff: normalizeStructuredEditProviderBatchExecutionHandoff(
        fixture.expected_batch_execution_handoff
      )
    });

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderBatchExecutionHandoffEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-518 structured-edit provider execution plan transport envelope fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionPlanEnvelopeFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_plan_envelope')
    );
    const executionPlan = normalizeStructuredEditProviderExecutionPlan(
      fixture.structured_edit_provider_execution_plan
    );
    const expected = normalizeStructuredEditProviderExecutionPlanEnvelope(
      fixture.expected_envelope
    );

    expect(structuredEditProviderExecutionPlanEnvelope(executionPlan)).toEqual(expected);
    expect(importStructuredEditProviderExecutionPlanEnvelope(expected)).toEqual({
      executionPlan
    });
  });

  it('conforms to the slice-519 structured-edit provider execution plan transport rejection fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionPlanEnvelopeRejectionFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_plan_envelope_rejection')
    );

    for (const rejectionCase of fixture.cases) {
      expect(importStructuredEditProviderExecutionPlanEnvelope(rejectionCase.envelope)).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-520 structured-edit provider execution plan envelope application fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionPlanEnvelopeApplicationFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_plan_envelope_application')
    );

    expect(
      importStructuredEditProviderExecutionPlanEnvelope(
        normalizeStructuredEditProviderExecutionPlanEnvelope(
          fixture.structured_edit_provider_execution_plan_envelope
        )
      )
    ).toEqual({
      executionPlan: normalizeStructuredEditProviderExecutionPlan(fixture.expected_execution_plan)
    });

    for (const rejectionCase of fixture.cases) {
      expect(importStructuredEditProviderExecutionPlanEnvelope(rejectionCase.envelope)).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-521 structured-edit provider batch execution plan fixture', () => {
    const fixture = readFixture<StructuredEditProviderBatchExecutionPlanFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_batch_execution_plan')
    );

    for (const testCase of fixture.cases) {
      const batchExecutionPlan = normalizeStructuredEditProviderBatchExecutionPlan(
        testCase.batch_execution_plan
      );

      expect(
        JSON.parse(JSON.stringify(batchExecutionPlan)) as StructuredEditProviderBatchExecutionPlan
      ).toEqual(batchExecutionPlan);
    }
  });

  it('conforms to the slice-522 structured-edit provider batch execution plan transport envelope fixture', () => {
    const fixture = readFixture<StructuredEditProviderBatchExecutionPlanEnvelopeFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_batch_execution_plan_envelope')
    );
    const batchExecutionPlan = normalizeStructuredEditProviderBatchExecutionPlan(
      fixture.structured_edit_provider_batch_execution_plan
    );
    const expected = normalizeStructuredEditProviderBatchExecutionPlanEnvelope(
      fixture.expected_envelope
    );

    expect(structuredEditProviderBatchExecutionPlanEnvelope(batchExecutionPlan)).toEqual(expected);
    expect(importStructuredEditProviderBatchExecutionPlanEnvelope(expected)).toEqual({
      batchExecutionPlan
    });
  });

  it('conforms to the slice-523 structured-edit provider batch execution plan transport rejection fixture', () => {
    const fixture = readFixture<StructuredEditProviderBatchExecutionPlanEnvelopeRejectionFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_batch_execution_plan_envelope_rejection')
    );

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderBatchExecutionPlanEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-524 structured-edit provider batch execution plan envelope application fixture', () => {
    const fixture = readFixture<StructuredEditProviderBatchExecutionPlanEnvelopeApplicationFixture>(
      ...diagnosticsFixturePath(
        'structured_edit_provider_batch_execution_plan_envelope_application'
      )
    );

    expect(
      importStructuredEditProviderBatchExecutionPlanEnvelope(
        normalizeStructuredEditProviderBatchExecutionPlanEnvelope(
          fixture.structured_edit_provider_batch_execution_plan_envelope
        )
      )
    ).toEqual({
      batchExecutionPlan: normalizeStructuredEditProviderBatchExecutionPlan(
        fixture.expected_batch_execution_plan
      )
    });

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderBatchExecutionPlanEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-462 structured-edit provider execution application transport envelope fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionApplicationEnvelopeFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_application_envelope')
    );
    const application = normalizeStructuredEditProviderExecutionApplication(
      fixture.structured_edit_provider_execution_application
    );
    const expected = normalizeStructuredEditProviderExecutionApplicationEnvelope(
      fixture.expected_envelope
    );

    expect(structuredEditProviderExecutionApplicationEnvelope(application)).toEqual(expected);
    expect(importStructuredEditProviderExecutionApplicationEnvelope(expected)).toEqual({
      providerExecutionApplication: application
    });
  });

  it('conforms to the slice-463 structured-edit provider execution application transport rejection fixture', () => {
    const fixture = readFixture<StructuredEditProviderExecutionApplicationEnvelopeRejectionFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_execution_application_envelope_rejection')
    );

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderExecutionApplicationEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-464 structured-edit provider execution application envelope application fixture', () => {
    const fixture =
      readFixture<StructuredEditProviderExecutionApplicationEnvelopeApplicationFixture>(
        ...diagnosticsFixturePath(
          'structured_edit_provider_execution_application_envelope_application'
        )
      );

    expect(
      importStructuredEditProviderExecutionApplicationEnvelope(
        normalizeStructuredEditProviderExecutionApplicationEnvelope(
          fixture.structured_edit_provider_execution_application_envelope
        )
      )
    ).toEqual({
      providerExecutionApplication: normalizeStructuredEditProviderExecutionApplication(
        fixture.expected_application
      )
    });

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderExecutionApplicationEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-439 structured-edit execution report transport envelope fixture', () => {
    const fixture = readFixture<StructuredEditExecutionReportEnvelopeFixture>(
      ...diagnosticsFixturePath('structured_edit_execution_report_envelope')
    );
    const report = normalizeStructuredEditExecutionReport(fixture.structured_edit_execution_report);
    const expected = normalizeStructuredEditExecutionReportEnvelope(fixture.expected_envelope);

    expect(structuredEditExecutionReportEnvelope(report)).toEqual(expected);
    expect(importStructuredEditExecutionReportEnvelope(expected)).toEqual({ report });
  });

  it('conforms to the slice-440 structured-edit execution report transport rejection fixture', () => {
    const fixture = readFixture<StructuredEditExecutionReportEnvelopeRejectionFixture>(
      ...diagnosticsFixturePath('structured_edit_execution_report_envelope_rejection')
    );

    for (const rejectionCase of fixture.cases) {
      expect(importStructuredEditExecutionReportEnvelope(rejectionCase.envelope)).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-441 structured-edit execution report envelope application fixture', () => {
    const fixture = readFixture<StructuredEditExecutionReportEnvelopeApplicationFixture>(
      ...diagnosticsFixturePath('structured_edit_execution_report_envelope_application')
    );

    expect(
      importStructuredEditExecutionReportEnvelope(
        normalizeStructuredEditExecutionReportEnvelope(
          fixture.structured_edit_execution_report_envelope
        )
      )
    ).toEqual({
      report: normalizeStructuredEditExecutionReport(fixture.expected_report)
    });

    for (const rejectionCase of fixture.cases) {
      expect(importStructuredEditExecutionReportEnvelope(rejectionCase.envelope)).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-442 structured-edit batch request fixture', () => {
    const fixture = readFixture<StructuredEditBatchRequestFixture>(
      ...diagnosticsFixturePath('structured_edit_batch_request')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          fixture.cases.map((entry) => ({
            label: entry.label,
            batchRequest: normalizeStructuredEditBatchRequest(entry.batch_request)
          }))
        )
      )
    ).toEqual(
      fixture.cases.map((entry) => ({
        label: entry.label,
        batchRequest: normalizeStructuredEditBatchRequest(entry.batch_request)
      }))
    );
  });

  it('conforms to the slice-457 structured-edit provider batch execution request fixture', () => {
    const fixture = readFixture<StructuredEditProviderBatchExecutionRequestFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_batch_execution_request')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          fixture.cases.map((entry) => ({
            label: entry.label,
            batchExecutionRequest: normalizeStructuredEditProviderBatchExecutionRequest(
              entry.batch_execution_request
            )
          }))
        )
      )
    ).toEqual(
      fixture.cases.map((entry) => ({
        label: entry.label,
        batchExecutionRequest: normalizeStructuredEditProviderBatchExecutionRequest(
          entry.batch_execution_request
        )
      }))
    );
  });

  it('conforms to the slice-458 structured-edit provider batch execution request transport envelope fixture', () => {
    const fixture = readFixture<StructuredEditProviderBatchExecutionRequestEnvelopeFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_batch_execution_request_envelope')
    );
    const batchExecutionRequest = normalizeStructuredEditProviderBatchExecutionRequest(
      fixture.structured_edit_provider_batch_execution_request
    );
    const expected = normalizeStructuredEditProviderBatchExecutionRequestEnvelope(
      fixture.expected_envelope
    );

    expect(structuredEditProviderBatchExecutionRequestEnvelope(batchExecutionRequest)).toEqual(
      expected
    );
    expect(importStructuredEditProviderBatchExecutionRequestEnvelope(expected)).toEqual({
      batchExecutionRequest
    });
  });

  it('conforms to the slice-459 structured-edit provider batch execution request transport rejection fixture', () => {
    const fixture =
      readFixture<StructuredEditProviderBatchExecutionRequestEnvelopeRejectionFixture>(
        ...diagnosticsFixturePath(
          'structured_edit_provider_batch_execution_request_envelope_rejection'
        )
      );

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderBatchExecutionRequestEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-460 structured-edit provider batch execution request envelope application fixture', () => {
    const fixture =
      readFixture<StructuredEditProviderBatchExecutionRequestEnvelopeApplicationFixture>(
        ...diagnosticsFixturePath(
          'structured_edit_provider_batch_execution_request_envelope_application'
        )
      );

    expect(
      importStructuredEditProviderBatchExecutionRequestEnvelope(
        normalizeStructuredEditProviderBatchExecutionRequestEnvelope(
          fixture.structured_edit_provider_batch_execution_request_envelope
        )
      )
    ).toEqual({
      batchExecutionRequest: normalizeStructuredEditProviderBatchExecutionRequest(
        fixture.expected_batch_execution_request
      )
    });

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderBatchExecutionRequestEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-473 structured-edit provider batch execution dispatch fixture', () => {
    const fixture = readFixture<StructuredEditProviderBatchExecutionDispatchFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_batch_execution_dispatch')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          fixture.cases.map((entry) => ({
            label: entry.label,
            batchDispatch: normalizeStructuredEditProviderBatchExecutionDispatch(
              entry.batch_dispatch
            )
          }))
        )
      )
    ).toEqual(
      fixture.cases.map((entry) => ({
        label: entry.label,
        batchDispatch: normalizeStructuredEditProviderBatchExecutionDispatch(entry.batch_dispatch)
      }))
    );
  });

  it('conforms to the slice-474 structured-edit provider batch execution dispatch transport envelope fixture', () => {
    const fixture = readFixture<StructuredEditProviderBatchExecutionDispatchEnvelopeFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_batch_execution_dispatch_envelope')
    );
    const batchDispatch = normalizeStructuredEditProviderBatchExecutionDispatch(
      fixture.structured_edit_provider_batch_execution_dispatch
    );
    const expected = normalizeStructuredEditProviderBatchExecutionDispatchEnvelope(
      fixture.expected_envelope
    );

    expect(structuredEditProviderBatchExecutionDispatchEnvelope(batchDispatch)).toEqual(expected);
    expect(importStructuredEditProviderBatchExecutionDispatchEnvelope(expected)).toEqual({
      batchDispatch
    });
  });

  it('conforms to the slice-475 structured-edit provider batch execution dispatch transport rejection fixture', () => {
    const fixture =
      readFixture<StructuredEditProviderBatchExecutionDispatchEnvelopeRejectionFixture>(
        ...diagnosticsFixturePath(
          'structured_edit_provider_batch_execution_dispatch_envelope_rejection'
        )
      );

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderBatchExecutionDispatchEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-476 structured-edit provider batch execution dispatch envelope application fixture', () => {
    const fixture =
      readFixture<StructuredEditProviderBatchExecutionDispatchEnvelopeApplicationFixture>(
        ...diagnosticsFixturePath(
          'structured_edit_provider_batch_execution_dispatch_envelope_application'
        )
      );

    expect(
      importStructuredEditProviderBatchExecutionDispatchEnvelope(
        normalizeStructuredEditProviderBatchExecutionDispatchEnvelope(
          fixture.structured_edit_provider_batch_execution_dispatch_envelope
        )
      )
    ).toEqual({
      batchDispatch: normalizeStructuredEditProviderBatchExecutionDispatch(
        fixture.expected_batch_dispatch
      )
    });

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderBatchExecutionDispatchEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-465 structured-edit provider batch execution report fixture', () => {
    const fixture = readFixture<StructuredEditProviderBatchExecutionReportFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_batch_execution_report')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          fixture.cases.map((entry) => ({
            label: entry.label,
            batchReport: normalizeStructuredEditProviderBatchExecutionReport(entry.batch_report)
          }))
        )
      )
    ).toEqual(
      fixture.cases.map((entry) => ({
        label: entry.label,
        batchReport: normalizeStructuredEditProviderBatchExecutionReport(entry.batch_report)
      }))
    );
  });

  it('conforms to the slice-466 structured-edit provider batch execution report transport envelope fixture', () => {
    const fixture = readFixture<StructuredEditProviderBatchExecutionReportEnvelopeFixture>(
      ...diagnosticsFixturePath('structured_edit_provider_batch_execution_report_envelope')
    );
    const batchReport = normalizeStructuredEditProviderBatchExecutionReport(
      fixture.structured_edit_provider_batch_execution_report
    );
    const expected = normalizeStructuredEditProviderBatchExecutionReportEnvelope(
      fixture.expected_envelope
    );

    expect(structuredEditProviderBatchExecutionReportEnvelope(batchReport)).toEqual(expected);
    expect(importStructuredEditProviderBatchExecutionReportEnvelope(expected)).toEqual({
      batchReport
    });
  });

  it('conforms to the slice-467 structured-edit provider batch execution report transport rejection fixture', () => {
    const fixture = readFixture<StructuredEditProviderBatchExecutionReportEnvelopeRejectionFixture>(
      ...diagnosticsFixturePath(
        'structured_edit_provider_batch_execution_report_envelope_rejection'
      )
    );

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderBatchExecutionReportEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-468 structured-edit provider batch execution report envelope application fixture', () => {
    const fixture =
      readFixture<StructuredEditProviderBatchExecutionReportEnvelopeApplicationFixture>(
        ...diagnosticsFixturePath(
          'structured_edit_provider_batch_execution_report_envelope_application'
        )
      );

    expect(
      importStructuredEditProviderBatchExecutionReportEnvelope(
        normalizeStructuredEditProviderBatchExecutionReportEnvelope(
          fixture.structured_edit_provider_batch_execution_report_envelope
        )
      )
    ).toEqual({
      batchReport: normalizeStructuredEditProviderBatchExecutionReport(
        fixture.expected_batch_report
      )
    });

    for (const rejectionCase of fixture.cases) {
      expect(
        importStructuredEditProviderBatchExecutionReportEnvelope(rejectionCase.envelope)
      ).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-443 structured-edit batch report fixture', () => {
    const fixture = readFixture<StructuredEditBatchReportFixture>(
      ...diagnosticsFixturePath('structured_edit_batch_report')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          fixture.cases.map((entry) => ({
            label: entry.label,
            batchReport: normalizeStructuredEditBatchReport(entry.batch_report)
          }))
        )
      )
    ).toEqual(
      fixture.cases.map((entry) => ({
        label: entry.label,
        batchReport: normalizeStructuredEditBatchReport(entry.batch_report)
      }))
    );
  });

  it('conforms to the slice-444 structured-edit batch report transport envelope fixture', () => {
    const fixture = readFixture<StructuredEditBatchReportEnvelopeFixture>(
      ...diagnosticsFixturePath('structured_edit_batch_report_envelope')
    );
    const batchReport = normalizeStructuredEditBatchReport(fixture.structured_edit_batch_report);
    const expected = normalizeStructuredEditBatchReportEnvelope(fixture.expected_envelope);

    expect(structuredEditBatchReportEnvelope(batchReport)).toEqual(expected);
    expect(importStructuredEditBatchReportEnvelope(expected)).toEqual({ batchReport });
  });

  it('conforms to the slice-445 structured-edit batch report transport rejection fixture', () => {
    const fixture = readFixture<StructuredEditBatchReportEnvelopeRejectionFixture>(
      ...diagnosticsFixturePath('structured_edit_batch_report_envelope_rejection')
    );

    for (const rejectionCase of fixture.cases) {
      expect(importStructuredEditBatchReportEnvelope(rejectionCase.envelope)).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-446 structured-edit batch report envelope application fixture', () => {
    const fixture = readFixture<StructuredEditBatchReportEnvelopeApplicationFixture>(
      ...diagnosticsFixturePath('structured_edit_batch_report_envelope_application')
    );

    expect(
      importStructuredEditBatchReportEnvelope(
        normalizeStructuredEditBatchReportEnvelope(fixture.structured_edit_batch_report_envelope)
      )
    ).toEqual({
      batchReport: normalizeStructuredEditBatchReport(fixture.expected_batch_report)
    });

    for (const rejectionCase of fixture.cases) {
      expect(importStructuredEditBatchReportEnvelope(rejectionCase.envelope)).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-211 projected child-review cases fixture', () => {
    const projectedCasesFixture = readFixture<ProjectedChildReviewCasesFixture>(
      ...diagnosticsFixturePath('projected_child_review_cases')
    );

    expect(
      JSON.parse(
        JSON.stringify(
          projectedCasesFixture.cases.map((entry) => normalizeProjectedChildReviewCase(entry))
        )
      )
    ).toEqual(projectedCasesFixture.cases.map((entry) => normalizeProjectedChildReviewCase(entry)));
  });

  it('conforms to the slice-227 projected child-review groups fixture', () => {
    const fixture = readFixture<ProjectedChildReviewGroupsFixture>(
      'diagnostics',
      'slice-227-projected-child-review-groups',
      'projected-child-review-groups.json'
    );

    expect(
      groupProjectedChildReviewCases(
        fixture.cases.map((entry) => normalizeProjectedChildReviewCase(entry))
      )
    ).toEqual(fixture.expected_groups.map((entry) => normalizeProjectedChildReviewGroup(entry)));
  });

  it('conforms to the slice-230 projected child-review group progress fixture', () => {
    const fixture = readFixture<ProjectedChildReviewGroupProgressFixture>(
      'diagnostics',
      'slice-230-projected-child-review-group-progress',
      'projected-child-review-group-progress.json'
    );

    expect(
      summarizeProjectedChildReviewGroupProgress(
        fixture.groups.map((entry) => normalizeProjectedChildReviewGroup(entry)),
        fixture.resolved_case_ids
      )
    ).toEqual(
      fixture.expected_progress.map((entry) => normalizeProjectedChildReviewGroupProgress(entry))
    );
  });

  it('conforms to the slice-233 projected child-review groups ready-for-apply fixture', () => {
    const fixture = readFixture<ProjectedChildReviewGroupsReadyForApplyFixture>(
      'diagnostics',
      'slice-233-projected-child-review-groups-ready-for-apply',
      'projected-child-review-groups-ready-for-apply.json'
    );

    expect(
      selectProjectedChildReviewGroupsReadyForApply(
        fixture.groups.map((entry) => normalizeProjectedChildReviewGroup(entry)),
        fixture.resolved_case_ids
      )
    ).toEqual(
      fixture.expected_ready_groups.map((entry) => normalizeProjectedChildReviewGroup(entry))
    );
  });

  it('conforms to the slice-236 delegated child group review request fixture', () => {
    const fixture = readFixture<ProjectedChildGroupReviewRequestFixture>(
      'diagnostics',
      'slice-236-delegated-child-group-review-request',
      'delegated-child-group-review-request.json'
    );

    const group = normalizeProjectedChildReviewGroup(fixture.group);
    expect(reviewRequestIdForProjectedChildGroup(group)).toBe(fixture.expected_request.id);
    expect(projectedChildGroupReviewRequest(group, fixture.family)).toEqual(
      normalizeReviewRequest(fixture.expected_request)
    );
  });

  it('conforms to the slice-237 delegated child groups accepted-for-apply fixture', () => {
    const fixture = readFixture<ProjectedChildGroupsAcceptedForApplyFixture>(
      'diagnostics',
      'slice-237-delegated-child-group-accepted-for-apply',
      'delegated-child-groups-accepted-for-apply.json'
    );

    expect(
      selectProjectedChildReviewGroupsAcceptedForApply(
        fixture.groups.map((entry) => normalizeProjectedChildReviewGroup(entry)),
        fixture.family,
        fixture.decisions.map((entry) => normalizeReviewDecision(entry))
      )
    ).toEqual(
      fixture.expected_accepted_groups.map((entry) => normalizeProjectedChildReviewGroup(entry))
    );
  });

  it('conforms to the slice-240 delegated child group review-state fixture', () => {
    const fixture = readFixture<DelegatedChildGroupReviewStateFixture>(
      'diagnostics',
      'slice-240-delegated-child-group-review-state',
      'delegated-child-group-review-state.json'
    );

    expect(
      reviewProjectedChildGroups(
        fixture.groups.map((entry) => normalizeProjectedChildReviewGroup(entry)),
        fixture.family,
        fixture.decisions.map((entry) => normalizeReviewDecision(entry))
      )
    ).toEqual({
      requests: fixture.expected_state.requests.map((entry) => normalizeReviewRequest(entry)),
      acceptedGroups: fixture.expected_state.accepted_groups.map((entry) =>
        normalizeProjectedChildReviewGroup(entry)
      ),
      appliedDecisions: fixture.expected_state.applied_decisions.map((entry) =>
        normalizeReviewDecision(entry)
      ),
      diagnostics: fixture.expected_state.diagnostics.map((entry) => normalizeDiagnostic(entry))
    });
  });

  it('conforms to the slice-243 delegated child apply-plan fixture', () => {
    const fixture = readFixture<DelegatedChildApplyPlanFixture>(
      'diagnostics',
      'slice-243-delegated-child-apply-plan',
      'delegated-child-apply-plan.json'
    );

    expect(
      delegatedChildApplyPlan(
        {
          requests: fixture.review_state.requests.map((entry) => normalizeReviewRequest(entry)),
          acceptedGroups: fixture.review_state.accepted_groups.map((entry) =>
            normalizeProjectedChildReviewGroup(entry)
          ),
          appliedDecisions: fixture.review_state.applied_decisions.map((entry) =>
            normalizeReviewDecision(entry)
          ),
          diagnostics: fixture.review_state.diagnostics.map((entry) => normalizeDiagnostic(entry))
        },
        fixture.family
      )
    ).toEqual({
      entries: fixture.expected_plan.entries.map((entry) => ({
        requestId: entry.request_id,
        family: entry.family,
        delegatedGroup: normalizeProjectedChildReviewGroup(entry.delegated_group),
        decision: normalizeReviewDecision(entry.decision)
      }))
    });
  });

  it('conforms to the slice-292 delegated child nested-output resolution fixture', () => {
    const fixture = readFixture<DelegatedChildNestedOutputResolutionFixture>(
      ...diagnosticsFixturePath('delegated_child_nested_output_resolution')
    );

    const result = resolveDelegatedChildOutputs(
      fixture.operations.map((entry) => normalizeDelegatedChildOperation(entry)),
      fixture.nested_outputs.map(
        (entry): DelegatedChildSurfaceOutput => ({
          surfaceAddress: entry.surface_address,
          output: entry.output
        })
      ),
      {
        defaultFamily: fixture.default_family,
        requestIdPrefix: fixture.request_id_prefix
      }
    );

    expect(result).toEqual({
      ok: true,
      diagnostics: [],
      applyPlan: {
        entries: fixture.expected.apply_plan!.entries.map((entry) => ({
          requestId: entry.request_id,
          family: entry.family,
          delegatedGroup: normalizeProjectedChildReviewGroup(entry.delegated_group),
          decision: normalizeReviewDecision(entry.decision)
        }))
      },
      appliedChildren: fixture.expected.applied_children!.map((entry) => ({
        operationId: entry.operation_id,
        output: entry.output
      }))
    } satisfies DelegatedChildOutputResolution);
  });

  it('conforms to the slice-293 delegated child nested-output rejection fixture', () => {
    const fixture = readFixture<DelegatedChildNestedOutputResolutionFixture>(
      ...diagnosticsFixturePath('delegated_child_nested_output_rejection')
    );

    const result = resolveDelegatedChildOutputs(
      fixture.operations.map((entry) => normalizeDelegatedChildOperation(entry)),
      fixture.nested_outputs.map(
        (entry): DelegatedChildSurfaceOutput => ({
          surfaceAddress: entry.surface_address,
          output: entry.output
        })
      ),
      {
        defaultFamily: fixture.default_family,
        requestIdPrefix: fixture.request_id_prefix
      }
    );

    expect(result).toEqual({
      ok: false,
      diagnostics: fixture.expected.diagnostics.map((entry) => normalizeDiagnostic(entry))
    } satisfies DelegatedChildOutputResolution);
  });

  it('conforms to the slice-71 review state JSON roundtrip fixture', () => {
    const fixture = readFixture<ReviewStateJsonRoundtripFixture>(
      ...diagnosticsFixturePath('review_state_json_roundtrip')
    );
    const state = normalizeManifestReviewState(fixture.state as never);

    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it('conforms to the slice-72 review replay bundle JSON roundtrip fixture', () => {
    const fixture = readFixture<ReviewReplayBundleFixture>(
      ...diagnosticsFixturePath('review_replay_bundle_json_roundtrip')
    );
    const bundle = {
      replayContext: normalizeReviewReplayContext(fixture.replay_bundle.replay_context),
      decisions: fixture.replay_bundle.decisions.map((decision) =>
        normalizeReviewDecision(decision)
      )
    };

    expect(JSON.parse(JSON.stringify(bundle))).toEqual(bundle);
  });

  it('conforms to the slice-73 review state transport envelope fixture', () => {
    const fixture = readFixture<ReviewStateEnvelopeFixture>(
      ...diagnosticsFixturePath('review_state_envelope')
    );
    const state = normalizeManifestReviewState(fixture.state as never);
    const expected: ConformanceManifestReviewStateEnvelope = {
      kind: fixture.expected_envelope.kind,
      version: REVIEW_TRANSPORT_VERSION,
      state: normalizeManifestReviewState(fixture.expected_envelope.state as never)
    };

    expect(conformanceManifestReviewStateEnvelope(state)).toEqual(expected);
    expect(importConformanceManifestReviewStateEnvelope(expected)).toEqual({ state });
  });

  it('conforms to the slice-74 review replay bundle transport envelope fixture', () => {
    const fixture = readFixture<ReviewReplayBundleEnvelopeFixture>(
      ...diagnosticsFixturePath('review_replay_bundle_envelope')
    );
    const bundle = {
      replayContext: normalizeReviewReplayContext(fixture.replay_bundle.replay_context),
      decisions: fixture.replay_bundle.decisions.map((decision) =>
        normalizeReviewDecision(decision)
      )
    };
    const expected: ReviewReplayBundleEnvelope = {
      kind: fixture.expected_envelope.kind,
      version: REVIEW_TRANSPORT_VERSION,
      replayBundle: {
        replayContext: normalizeReviewReplayContext(
          fixture.expected_envelope.replay_bundle.replay_context
        ),
        decisions: fixture.expected_envelope.replay_bundle.decisions.map((decision) =>
          normalizeReviewDecision(decision)
        )
      }
    };

    expect(reviewReplayBundleEnvelope(bundle)).toEqual(expected);
    expect(importReviewReplayBundleEnvelope(expected)).toEqual({ replayBundle: bundle });
  });

  it('conforms to the slice-75 review state transport rejection fixture', () => {
    const fixture = readFixture<ReviewTransportRejectionFixture>(
      ...diagnosticsFixturePath('review_state_envelope_rejection')
    );

    for (const rejectionCase of fixture.cases) {
      expect(importConformanceManifestReviewStateEnvelope(rejectionCase.envelope)).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-76 review replay bundle transport rejection fixture', () => {
    const fixture = readFixture<ReviewTransportRejectionFixture>(
      ...diagnosticsFixturePath('review_replay_bundle_envelope_rejection')
    );

    for (const rejectionCase of fixture.cases) {
      expect(importReviewReplayBundleEnvelope(rejectionCase.envelope)).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-300 reviewed nested execution JSON roundtrip fixture', () => {
    const fixture = readFixture<ReviewedNestedExecutionFixture>(
      ...diagnosticsFixturePath('reviewed_nested_execution_json_roundtrip')
    );
    const execution = normalizeReviewedNestedExecution(fixture.execution);

    expect(JSON.parse(JSON.stringify(execution))).toEqual(execution);
  });

  it('conforms to the slice-301 reviewed nested execution transport envelope fixture', () => {
    const fixture = readFixture<ReviewedNestedExecutionEnvelopeFixture>(
      ...diagnosticsFixturePath('reviewed_nested_execution_envelope')
    );
    const execution = normalizeReviewedNestedExecution(fixture.execution);
    const expected: ReviewedNestedExecutionEnvelope = {
      kind: fixture.expected_envelope.kind,
      version: REVIEW_TRANSPORT_VERSION,
      execution: normalizeReviewedNestedExecution(fixture.expected_envelope.execution)
    };

    expect(reviewedNestedExecutionEnvelope(execution)).toEqual(expected);
    expect(importReviewedNestedExecutionEnvelope(expected)).toEqual({ execution });
  });

  it('conforms to the slice-302 reviewed nested execution transport rejection fixture', () => {
    const fixture = readFixture<ReviewTransportRejectionFixture>(
      ...diagnosticsFixturePath('reviewed_nested_execution_envelope_rejection')
    );

    for (const rejectionCase of fixture.cases) {
      expect(importReviewedNestedExecutionEnvelope(rejectionCase.envelope)).toEqual({
        error: rejectionCase.expected_error
      });
    }
  });

  it('conforms to the slice-303 reviewed nested execution payload fixture', () => {
    const fixture = readFixture<ReviewedNestedExecutionPayloadFixture>(
      ...diagnosticsFixturePath('reviewed_nested_execution_payload')
    );
    const source = normalizeReviewedNestedExecution({
      family: fixture.family,
      review_state: fixture.review_state,
      applied_children: fixture.applied_children
    });

    expect(
      reviewedNestedExecution(source.family, source.reviewState, source.appliedChildren)
    ).toEqual(normalizeReviewedNestedExecution(fixture.expected_execution));
  });

  it('conforms to the slice-79 explicit review replay bundle application fixture', () => {
    const fixture = readFixture<ConformanceManifestReviewStateFixture>(
      ...diagnosticsFixturePath('explicit_review_replay_bundle_application')
    );

    expect(
      reviewConformanceManifest(
        fixture.manifest,
        normalizeManifestReviewOptions(fixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        }
      )
    ).toEqual(normalizeManifestReviewState(fixture.expected_state as never));
  });

  it('conforms to the slice-317 review replay bundle envelope application fixture', () => {
    const fixture = readFixture<
      ConformanceManifestReviewStateFixture & { review_replay_bundle_envelope: unknown }
    >(...diagnosticsFixturePath('review_replay_bundle_envelope_application'));

    expect(
      reviewConformanceManifestWithReplayBundleEnvelope(
        fixture.manifest,
        normalizeManifestReviewOptions(fixture.options as never),
        normalizeReviewReplayBundleEnvelope(fixture.review_replay_bundle_envelope as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        }
      )
    ).toEqual(normalizeManifestReviewState(fixture.expected_state as never));
  });

  it('conforms to the slice-318 explicit review replay bundle envelope application fixture', () => {
    const fixture = readFixture<
      ConformanceManifestReviewStateFixture & { review_replay_bundle_envelope: unknown }
    >(...diagnosticsFixturePath('explicit_review_replay_bundle_envelope_application'));

    expect(
      reviewConformanceManifestWithReplayBundleEnvelope(
        fixture.manifest,
        normalizeManifestReviewOptions(fixture.options as never),
        normalizeReviewReplayBundleEnvelope(fixture.review_replay_bundle_envelope as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        }
      )
    ).toEqual(normalizeManifestReviewState(fixture.expected_state as never));
  });

  it('conforms to the slice-319 review replay bundle envelope rejection fixture', () => {
    const fixture = readFixture<{
      manifest: ConformanceManifest;
      options: unknown;
      executions: Record<string, ConformanceCaseExecution>;
      cases: Array<{
        review_replay_bundle_envelope: unknown;
        expected_state: unknown;
      }>;
    }>(...diagnosticsFixturePath('review_replay_bundle_envelope_review_rejection'));

    for (const fixtureCase of fixture.cases) {
      expect(
        reviewConformanceManifestWithReplayBundleEnvelope(
          fixture.manifest,
          normalizeManifestReviewOptions(fixture.options as never),
          normalizeReviewReplayBundleEnvelope(fixtureCase.review_replay_bundle_envelope as never),
          (run) => {
            const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
            return (
              fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] }
            );
          }
        )
      ).toEqual(normalizeManifestReviewState(fixtureCase.expected_state as never));
    }
  });

  it('conforms to the slice-306 review state reviewed nested executions fixture', () => {
    const fixture = readFixture<ConformanceManifestReviewStateFixture>(
      ...diagnosticsFixturePath('review_state_reviewed_nested_executions')
    );

    expect(
      reviewConformanceManifest(
        fixture.manifest,
        normalizeManifestReviewOptions(fixture.options as never),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        }
      )
    ).toEqual(normalizeManifestReviewState(fixture.expected_state as never));
  });

  it('conforms to the slice-307 review replay bundle reviewed nested execution application fixture', () => {
    const fixture = readFixture<ReviewedNestedExecutionApplicationFixture>(
      ...diagnosticsFixturePath('review_replay_bundle_reviewed_nested_execution_application')
    );
    const replayBundle = fixture.replay_bundle
      ? {
          replayContext: normalizeReviewReplayContext(fixture.replay_bundle.replay_context),
          decisions: fixture.replay_bundle.decisions.map((decision) =>
            normalizeReviewDecision(decision)
          ),
          reviewedNestedExecutions: fixture.replay_bundle.reviewed_nested_executions.map(
            (execution) => normalizeReviewedNestedExecution(execution)
          )
        }
      : undefined;

    expect(replayBundle).toBeDefined();
    expect(
      executeReviewReplayBundleReviewedNestedExecutions(replayBundle!, (execution, index) =>
        reviewedNestedExecutionCallbacks(execution, fixture.expected_results[index]!.result.output!)
      ).map((run) => ({
        execution_family: run.execution.family,
        result: run.result
      }))
    ).toEqual(
      fixture.expected_results.map((entry) => ({
        execution_family: entry.execution_family,
        result: {
          ok: entry.result.ok,
          diagnostics: entry.result.diagnostics.map((diagnostic) =>
            normalizeDiagnostic(diagnostic)
          ),
          output: entry.result.output,
          policies: entry.result.policies
        }
      }))
    );
  });

  it('conforms to the slice-308 review state reviewed nested execution application fixture', () => {
    const fixture = readFixture<ReviewedNestedExecutionApplicationFixture>(
      ...diagnosticsFixturePath('review_state_reviewed_nested_execution_application')
    );
    const reviewState = normalizeManifestReviewState(fixture.review_state as never);

    expect(
      executeReviewStateReviewedNestedExecutions(reviewState, (execution, index) =>
        reviewedNestedExecutionCallbacks(execution, fixture.expected_results[index]!.result.output!)
      ).map((run) => ({
        execution_family: run.execution.family,
        result: run.result
      }))
    ).toEqual(
      fixture.expected_results.map((entry) => ({
        execution_family: entry.execution_family,
        result: {
          ok: entry.result.ok,
          diagnostics: entry.result.diagnostics.map((diagnostic) =>
            normalizeDiagnostic(diagnostic)
          ),
          output: entry.result.output,
          policies: entry.result.policies
        }
      }))
    );
  });

  it('conforms to the slice-320 review replay bundle envelope reviewed nested execution application fixture', () => {
    const fixture = readFixture<ReviewedNestedExecutionEnvelopeApplicationFixture>(
      ...diagnosticsFixturePath(
        'review_replay_bundle_envelope_reviewed_nested_execution_application'
      )
    );

    const application = executeReviewReplayBundleEnvelopeReviewedNestedExecutions(
      normalizeReviewReplayBundleEnvelope(fixture.replay_bundle_envelope as never),
      (execution, index) =>
        reviewedNestedExecutionCallbacks(
          execution,
          fixture.expected_application.results[index]!.result.output!
        )
    );

    expect({
      diagnostics: application.diagnostics,
      results: application.results.map((run) => ({
        execution_family: run.execution.family,
        result: run.result
      }))
    }).toEqual({
      diagnostics: fixture.expected_application.diagnostics.map((entry) =>
        normalizeDiagnostic(entry)
      ),
      results: fixture.expected_application.results.map((entry) => ({
        execution_family: entry.execution_family,
        result: {
          ok: entry.result.ok,
          diagnostics: entry.result.diagnostics.map((diagnostic) =>
            normalizeDiagnostic(diagnostic)
          ),
          output: entry.result.output,
          policies: entry.result.policies
        }
      }))
    } satisfies ReviewedNestedExecutionApplication<string> & {
      results: Array<{ execution_family: string; result: MergeResult<string> }>;
    });
  });

  it('conforms to the slice-321 review state envelope reviewed nested execution application fixture', () => {
    const fixture = readFixture<ReviewedNestedExecutionEnvelopeApplicationFixture>(
      ...diagnosticsFixturePath('review_state_envelope_reviewed_nested_execution_application')
    );

    const application = executeReviewStateEnvelopeReviewedNestedExecutions(
      normalizeReviewStateEnvelope(fixture.review_state_envelope as never),
      (execution, index) =>
        reviewedNestedExecutionCallbacks(
          execution,
          fixture.expected_application.results[index]!.result.output!
        )
    );

    expect({
      diagnostics: application.diagnostics,
      results: application.results.map((run) => ({
        execution_family: run.execution.family,
        result: run.result
      }))
    }).toEqual({
      diagnostics: fixture.expected_application.diagnostics.map((entry) =>
        normalizeDiagnostic(entry)
      ),
      results: fixture.expected_application.results.map((entry) => ({
        execution_family: entry.execution_family,
        result: {
          ok: entry.result.ok,
          diagnostics: entry.result.diagnostics.map((diagnostic) =>
            normalizeDiagnostic(diagnostic)
          ),
          output: entry.result.output,
          policies: entry.result.policies
        }
      }))
    } satisfies ReviewedNestedExecutionApplication<string> & {
      results: Array<{ execution_family: string; result: MergeResult<string> }>;
    });
  });

  it('conforms to the slice-322 review replay bundle envelope reviewed nested execution rejection fixture', () => {
    const fixture = readFixture<{
      cases: Array<{
        replay_bundle_envelope: unknown;
        expected_application: ReviewedNestedExecutionEnvelopeApplicationFixture['expected_application'];
      }>;
    }>(
      ...diagnosticsFixturePath('review_replay_bundle_envelope_reviewed_nested_execution_rejection')
    );

    for (const fixtureCase of fixture.cases) {
      expect(
        executeReviewReplayBundleEnvelopeReviewedNestedExecutions(
          normalizeReviewReplayBundleEnvelope(fixtureCase.replay_bundle_envelope as never),
          () => {
            throw new Error('callbacks should not run for rejected replay bundle envelopes');
          }
        )
      ).toEqual({
        diagnostics: fixtureCase.expected_application.diagnostics.map((entry) =>
          normalizeDiagnostic(entry)
        ),
        results: []
      });
    }
  });

  it('conforms to the slice-323 review state envelope reviewed nested execution rejection fixture', () => {
    const fixture = readFixture<{
      cases: Array<{
        review_state_envelope: unknown;
        expected_application: ReviewedNestedExecutionEnvelopeApplicationFixture['expected_application'];
      }>;
    }>(...diagnosticsFixturePath('review_state_envelope_reviewed_nested_execution_rejection'));

    for (const fixtureCase of fixture.cases) {
      expect(
        executeReviewStateEnvelopeReviewedNestedExecutions(
          normalizeReviewStateEnvelope(fixtureCase.review_state_envelope as never),
          () => {
            throw new Error('callbacks should not run for rejected review state envelopes');
          }
        )
      ).toEqual({
        diagnostics: fixtureCase.expected_application.diagnostics.map((entry) =>
          normalizeDiagnostic(entry)
        ),
        results: []
      });
    }
  });

  it('conforms to the slice-324 review replay bundle envelope reviewed nested manifest application fixture', () => {
    const fixture = readFixture<ReviewedNestedManifestApplicationFixture>(
      ...diagnosticsFixturePath(
        'review_replay_bundle_envelope_reviewed_nested_manifest_application'
      )
    );

    const application = reviewAndExecuteConformanceManifestWithReplayBundleEnvelope(
      fixture.manifest,
      normalizeManifestReviewOptions(fixture.options as never),
      normalizeReviewReplayBundleEnvelope(fixture.review_replay_bundle_envelope as never),
      (run) => {
        const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
        return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
      },
      (execution, index) =>
        reviewedNestedExecutionCallbacks(
          execution,
          fixture.expected_application!.results[index]!.result.output!
        )
    );

    expect({
      state: application.state,
      results: application.results.map((run) => ({
        execution_family: run.execution.family,
        result: run.result
      }))
    }).toEqual({
      state: normalizeManifestReviewState(fixture.expected_state as never),
      results: fixture.expected_application!.results.map((entry) => ({
        execution_family: entry.execution_family,
        result: {
          ok: entry.result.ok,
          diagnostics: entry.result.diagnostics.map((diagnostic) =>
            normalizeDiagnostic(diagnostic)
          ),
          output: entry.result.output,
          policies: entry.result.policies
        }
      }))
    } satisfies ConformanceManifestReviewedNestedApplication<string> & {
      results: Array<{ execution_family: string; result: MergeResult<string> }>;
    });
  });

  it('conforms to the slice-325 review replay bundle envelope reviewed nested manifest rejection fixture', () => {
    const fixture = readFixture<ReviewedNestedManifestApplicationFixture>(
      ...diagnosticsFixturePath('review_replay_bundle_envelope_reviewed_nested_manifest_rejection')
    );

    for (const fixtureCase of fixture.cases!) {
      expect(
        reviewAndExecuteConformanceManifestWithReplayBundleEnvelope(
          fixture.manifest,
          normalizeManifestReviewOptions(fixture.options as never),
          normalizeReviewReplayBundleEnvelope(fixtureCase.review_replay_bundle_envelope as never),
          (run) => {
            const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
            return (
              fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] }
            );
          },
          () => {
            throw new Error('callbacks should not run for rejected replay bundle envelopes');
          }
        )
      ).toEqual({
        state: normalizeManifestReviewState(fixtureCase.expected_state as never),
        results: fixtureCase.expected_application.results.map((entry) => ({
          execution: {
            family: entry.execution_family,
            reviewState: {
              requests: [],
              acceptedGroups: [],
              appliedDecisions: [],
              diagnostics: []
            },
            appliedChildren: []
          },
          result: {
            ok: entry.result.ok,
            diagnostics: entry.result.diagnostics.map((diagnostic) =>
              normalizeDiagnostic(diagnostic)
            ),
            output: entry.result.output,
            policies: entry.result.policies
          }
        }))
      });
    }
  });

  it('conforms to the slice-80 explicit review decision payload validation fixture', () => {
    const fixture = readFixture<FamilyContextReviewRequestFixture>(
      ...diagnosticsFixturePath('explicit_review_decision_missing_context')
    );

    const reviewed = reviewConformanceFamilyContext(
      fixture.family,
      normalizeManifestReviewOptions(fixture.options as never)
    );

    expect(reviewed.diagnostics).toEqual([normalizeDiagnostic(fixture.expected_diagnostic)]);
    expect(reviewed.requests).toEqual([normalizeReviewRequest(fixture.expected_request)]);
    expect(reviewed.context).toBeUndefined();
  });

  it('conforms to the slice-81 explicit review decision family validation fixture', () => {
    const fixture = readFixture<FamilyContextReviewRequestFixture>(
      ...diagnosticsFixturePath('explicit_review_decision_family_mismatch')
    );

    const reviewed = reviewConformanceFamilyContext(
      fixture.family,
      normalizeManifestReviewOptions(fixture.options as never)
    );

    expect(reviewed.diagnostics).toEqual([normalizeDiagnostic(fixture.expected_diagnostic)]);
    expect(reviewed.requests).toEqual([normalizeReviewRequest(fixture.expected_request)]);
    expect(reviewed.context).toBeUndefined();
  });
});
