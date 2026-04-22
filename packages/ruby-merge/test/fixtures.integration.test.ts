import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { registeredBackends } from '@structuredmerge/tree-haver';
import {
  conformanceFamilyFeatureProfilePath,
  conformanceFixturePath,
  delegatedChildApplyPlan,
  groupProjectedChildReviewCases,
  projectedChildGroupReviewRequest,
  reviewProjectedChildGroups,
  selectProjectedChildReviewGroupsAcceptedForApply,
  selectProjectedChildReviewGroupsReadyForApply,
  summarizeProjectedChildReviewGroupProgress,
  type ConformanceManifest,
  type Diagnostic
} from '@structuredmerge/ast-merge';
import {
  applyRubyDelegatedChildOutputs,
  availableRubyBackends,
  matchRubyOwners,
  mergeRuby,
  mergeRubyWithReviewedNestedOutputs,
  mergeRubyWithReviewedNestedOutputsFromReplayBundle,
  mergeRubyWithReviewedNestedOutputsFromReviewState,
  mergeRubyWithNestedOutputs,
  parseRuby,
  rubyBackendFeatureProfile,
  rubyDelegatedChildOperations,
  rubyDiscoveredSurfaces,
  rubyFeatureProfile,
  rubyPlanContext
} from '../src/index';

interface FixtureSurfaceOwner {
  readonly kind: 'owned_region';
  readonly address: string;
}

interface FixtureSurfaceSpan {
  readonly start_line: number;
  readonly end_line: number;
}

interface FixtureSurface {
  readonly surface_kind: string;
  readonly declared_language?: string;
  readonly effective_language: string;
  readonly address: string;
  readonly parent_address?: string;
  readonly owner: FixtureSurfaceOwner;
  readonly span?: FixtureSurfaceSpan;
  readonly reconstruction_strategy: string;
  readonly metadata?: Record<string, unknown>;
}

interface FixtureChildOperation {
  readonly operation_id: string;
  readonly parent_operation_id: string;
  readonly requested_strategy: 'delegate_child_surface';
  readonly language_chain: string[];
  readonly surface: FixtureSurface;
}

interface RubyDelegatedChildApplyPlanFixture {
  readonly family: string;
  readonly review_state: {
    readonly requests: Array<{
      readonly id: string;
      readonly kind: 'delegated_child_group';
      readonly family: string;
      readonly message: string;
      readonly blocking: boolean;
      readonly delegated_group: FixtureProjectedChildGroup;
      readonly action_offers: Array<{
        readonly action: 'apply_delegated_child_group';
        readonly requires_context: boolean;
      }>;
      readonly default_action: 'apply_delegated_child_group';
    }>;
    readonly accepted_groups: FixtureProjectedChildGroup[];
    readonly applied_decisions: Array<{
      readonly request_id: string;
      readonly action: 'apply_delegated_child_group';
    }>;
    readonly diagnostics: Array<{
      readonly severity: string;
      readonly category: string;
      readonly message: string;
    }>;
  };
  readonly expected_plan: {
    readonly entries: Array<{
      readonly request_id: string;
      readonly family: string;
      readonly delegated_group: FixtureProjectedChildGroup;
      readonly decision: {
        readonly request_id: string;
        readonly action: 'apply_delegated_child_group';
      };
    }>;
  };
}

interface RubyDelegatedChildApplyOutputFixture {
  readonly source: string;
  readonly delegated_operations: FixtureChildOperation[];
  readonly apply_plan: {
    readonly entries: Array<{
      readonly request_id: string;
      readonly family: string;
      readonly delegated_group: FixtureProjectedChildGroup;
      readonly decision: {
        readonly request_id: string;
        readonly action: 'apply_delegated_child_group';
      };
    }>;
  };
  readonly applied_children: Array<{
    readonly operation_id: string;
    readonly output: string;
  }>;
  readonly expected: {
    readonly ok: boolean;
    readonly output: string;
  };
}

interface RubyNestedMergeFixture {
  readonly template: string;
  readonly destination: string;
  readonly nested_outputs: Array<{
    readonly surface_address: string;
    readonly output: string;
  }>;
  readonly expected: {
    readonly ok: boolean;
    readonly output: string;
  };
}

function normalizeDiagnosticEntry(entry: {
  readonly severity: string;
  readonly category: string;
  readonly message: string;
}): Diagnostic {
  return {
    severity: entry.severity as Diagnostic['severity'],
    category: entry.category as Diagnostic['category'],
    message: entry.message
  };
}

function readFixture<T>(...segments: string[]): T {
  const fixturePath = path.resolve(process.cwd(), '..', 'fixtures', ...segments);
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as T;
}

function normalizeSurface(surface: FixtureSurface) {
  return {
    surfaceKind: surface.surface_kind,
    ...(surface.declared_language ? { declaredLanguage: surface.declared_language } : {}),
    effectiveLanguage: surface.effective_language,
    address: surface.address,
    ...(surface.parent_address ? { parentAddress: surface.parent_address } : {}),
    owner: surface.owner,
    ...(surface.span
      ? { span: { startLine: surface.span.start_line, endLine: surface.span.end_line } }
      : {}),
    reconstructionStrategy: surface.reconstruction_strategy,
    ...(surface.metadata ? { metadata: surface.metadata } : {})
  };
}

function normalizeChildOperation(operation: FixtureChildOperation) {
  return {
    operationId: operation.operation_id,
    parentOperationId: operation.parent_operation_id,
    requestedStrategy: operation.requested_strategy,
    languageChain: operation.language_chain,
    surface: normalizeSurface(operation.surface)
  };
}

interface FixtureProjectedChildGroup {
  delegated_apply_group: string;
  parent_operation_id: string;
  child_operation_id: string;
  delegated_runtime_surface_path: string;
  case_ids: string[];
  delegated_case_ids: string[];
}

interface RubyDelegatedChildReviewTransportFixture {
  family: string;
  group: FixtureProjectedChildGroup;
  expected_request: {
    id: string;
    kind: 'delegated_child_group';
    family: string;
    message: string;
    blocking: boolean;
    delegated_group: FixtureProjectedChildGroup;
    action_offers: Array<{
      action: 'apply_delegated_child_group';
      requires_context: boolean;
    }>;
    default_action: 'apply_delegated_child_group';
  };
  groups: FixtureProjectedChildGroup[];
  decisions: Array<{
    request_id: string;
    action: 'apply_delegated_child_group';
  }>;
  expected_accepted_groups: FixtureProjectedChildGroup[];
}

interface RubyDelegatedChildReviewStateFixture {
  family: string;
  groups: FixtureProjectedChildGroup[];
  decisions: Array<{
    request_id: string;
    action: 'apply_delegated_child_group';
  }>;
  expected_state: {
    requests: Array<{
      id: string;
      kind: 'delegated_child_group';
      family: string;
      message: string;
      blocking: boolean;
      delegated_group: FixtureProjectedChildGroup;
      action_offers: Array<{
        action: 'apply_delegated_child_group';
        requires_context: boolean;
      }>;
      default_action: 'apply_delegated_child_group';
    }>;
    accepted_groups: FixtureProjectedChildGroup[];
    applied_decisions: Array<{
      request_id: string;
      action: 'apply_delegated_child_group';
    }>;
    diagnostics: Array<{
      severity: string;
      category: string;
      message: string;
    }>;
  };
}

describe('ruby-merge shared fixtures', () => {
  it('conforms to the Ruby family fixtures', () => {
    const profileFixture = readFixture<{
      feature_profile: {
        family: 'ruby';
        supported_dialects: ['ruby'];
        supported_policies: Array<{ surface: 'array'; name: string }>;
      };
    }>('diagnostics', 'slice-214-ruby-family-feature-profile', 'ruby-feature-profile.json');
    expect(rubyFeatureProfile()).toEqual({
      family: profileFixture.feature_profile.family,
      supportedDialects: profileFixture.feature_profile.supported_dialects,
      supportedPolicies: profileFixture.feature_profile.supported_policies
    });

    const analysisFixture = readFixture<{
      dialect: 'ruby';
      source: string;
      expected: { owners: Array<{ path: string; owner_kind: string; match_key?: string }> };
    }>('ruby', 'slice-218-analysis', 'module-owners.json');
    const analysis = parseRuby(analysisFixture.source, analysisFixture.dialect);
    expect(analysis.ok).toBe(true);
    expect(
      analysis.analysis?.owners.map((owner) => ({
        path: owner.path,
        owner_kind: owner.ownerKind,
        ...(owner.matchKey ? { match_key: owner.matchKey } : {})
      }))
    ).toEqual(analysisFixture.expected.owners);

    const matchingFixture = readFixture<{
      template: string;
      destination: string;
      expected: {
        matched: Array<[string, string]>;
        unmatched_template: string[];
        unmatched_destination: string[];
      };
    }>('ruby', 'slice-219-matching', 'path-equality.json');
    const template = parseRuby(matchingFixture.template, 'ruby');
    const destination = parseRuby(matchingFixture.destination, 'ruby');
    const matched = matchRubyOwners(template.analysis!, destination.analysis!);
    expect(
      matched.matched.map(({ templatePath, destinationPath }) => [templatePath, destinationPath])
    ).toEqual(matchingFixture.expected.matched);
    expect(matched.unmatchedTemplate).toEqual(matchingFixture.expected.unmatched_template);
    expect(matched.unmatchedDestination).toEqual(matchingFixture.expected.unmatched_destination);

    const mergeFixture = readFixture<{
      template: string;
      destination: string;
      expected: { ok: true; output: string };
    }>('ruby', 'slice-287-merge', 'module-merge.json');
    const mergeResult = mergeRuby(mergeFixture.template, mergeFixture.destination, 'ruby');
    expect(mergeResult.ok).toBe(mergeFixture.expected.ok);
    expect(mergeResult.output).toBe(mergeFixture.expected.output);

    const invalidTemplateFixture = readFixture<{
      template: string;
      destination: string;
      expected: { ok: false; diagnostics: Array<{ category: string }> };
    }>('ruby', 'slice-287-merge', 'invalid-template.json');
    const invalidTemplateResult = mergeRuby(
      invalidTemplateFixture.template,
      invalidTemplateFixture.destination,
      'ruby'
    );
    expect(invalidTemplateResult.ok).toBe(false);
    expect(invalidTemplateResult.diagnostics.map((diagnostic) => diagnostic.category)).toEqual(
      invalidTemplateFixture.expected.diagnostics.map((diagnostic) => diagnostic.category)
    );

    const invalidDestinationFixture = readFixture<{
      template: string;
      destination: string;
      expected: { ok: false; diagnostics: Array<{ category: string }> };
    }>('ruby', 'slice-287-merge', 'invalid-destination.json');
    const invalidDestinationResult = mergeRuby(
      invalidDestinationFixture.template,
      invalidDestinationFixture.destination,
      'ruby'
    );
    expect(invalidDestinationResult.ok).toBe(false);
    expect(
      invalidDestinationResult.diagnostics.map((diagnostic) => diagnostic.category)
    ).toEqual(
      invalidDestinationFixture.expected.diagnostics.map((diagnostic) => diagnostic.category)
    );

    const surfacesFixture = readFixture<{
      source: string;
      expected: FixtureSurface[];
    }>('ruby', 'slice-220-discovered-surfaces', 'doc-comment-surfaces.json');
    const surfaceAnalysis = parseRuby(surfacesFixture.source, 'ruby');
    expect(rubyDiscoveredSurfaces(surfaceAnalysis.analysis!)).toEqual(
      surfacesFixture.expected.map((surface) => normalizeSurface(surface))
    );

    const childFixture = readFixture<{
      source: string;
      parent_operation_id: string;
      expected: FixtureChildOperation[];
    }>('ruby', 'slice-221-delegated-child-operations', 'yard-example-child-operations.json');
    const childAnalysis = parseRuby(childFixture.source, 'ruby');
    expect(
      rubyDelegatedChildOperations(childAnalysis.analysis!, childFixture.parent_operation_id)
    ).toEqual(childFixture.expected.map((operation) => normalizeChildOperation(operation)));

    const groupedFixture = readFixture<{
      cases: Array<{
        case_id: string;
        parent_operation_id: string;
        child_operation_id: string;
        surface_path: string;
        delegated_case_id: string;
        delegated_apply_group: string;
        delegated_runtime_surface_path: string;
      }>;
      expected_groups: Array<{
        delegated_apply_group: string;
        parent_operation_id: string;
        child_operation_id: string;
        delegated_runtime_surface_path: string;
        case_ids: string[];
        delegated_case_ids: string[];
      }>;
    }>('ruby', 'slice-229-projected-child-review-groups', 'yard-example-review-groups.json');

    expect(
      groupProjectedChildReviewCases(
        groupedFixture.cases.map((entry) => ({
          caseId: entry.case_id,
          parentOperationId: entry.parent_operation_id,
          childOperationId: entry.child_operation_id,
          surfacePath: entry.surface_path,
          delegatedCaseId: entry.delegated_case_id,
          delegatedApplyGroup: entry.delegated_apply_group,
          delegatedRuntimeSurfacePath: entry.delegated_runtime_surface_path
        }))
      )
    ).toEqual(
      groupedFixture.expected_groups.map((entry) => ({
        delegatedApplyGroup: entry.delegated_apply_group,
        parentOperationId: entry.parent_operation_id,
        childOperationId: entry.child_operation_id,
        delegatedRuntimeSurfacePath: entry.delegated_runtime_surface_path,
        caseIds: entry.case_ids,
        delegatedCaseIds: entry.delegated_case_ids
      }))
    );

    const progressFixture = readFixture<{
      groups: Array<{
        delegated_apply_group: string;
        parent_operation_id: string;
        child_operation_id: string;
        delegated_runtime_surface_path: string;
        case_ids: string[];
        delegated_case_ids: string[];
      }>;
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
    }>(
      'ruby',
      'slice-232-projected-child-review-group-progress',
      'yard-example-review-progress.json'
    );

    expect(
      summarizeProjectedChildReviewGroupProgress(
        progressFixture.groups.map((entry) => ({
          delegatedApplyGroup: entry.delegated_apply_group,
          parentOperationId: entry.parent_operation_id,
          childOperationId: entry.child_operation_id,
          delegatedRuntimeSurfacePath: entry.delegated_runtime_surface_path,
          caseIds: entry.case_ids,
          delegatedCaseIds: entry.delegated_case_ids
        })),
        progressFixture.resolved_case_ids
      )
    ).toEqual(
      progressFixture.expected_progress.map((entry) => ({
        delegatedApplyGroup: entry.delegated_apply_group,
        parentOperationId: entry.parent_operation_id,
        childOperationId: entry.child_operation_id,
        delegatedRuntimeSurfacePath: entry.delegated_runtime_surface_path,
        resolvedCaseIds: entry.resolved_case_ids,
        pendingCaseIds: entry.pending_case_ids,
        complete: entry.complete
      }))
    );

    const readyFixture = readFixture<{
      groups: Array<{
        delegated_apply_group: string;
        parent_operation_id: string;
        child_operation_id: string;
        delegated_runtime_surface_path: string;
        case_ids: string[];
        delegated_case_ids: string[];
      }>;
      resolved_case_ids: string[];
      expected_ready_groups: Array<{
        delegated_apply_group: string;
        parent_operation_id: string;
        child_operation_id: string;
        delegated_runtime_surface_path: string;
        case_ids: string[];
        delegated_case_ids: string[];
      }>;
    }>(
      'ruby',
      'slice-235-projected-child-review-groups-ready-for-apply',
      'yard-example-ready-groups.json'
    );

    expect(
      selectProjectedChildReviewGroupsReadyForApply(
        readyFixture.groups.map((entry) => ({
          delegatedApplyGroup: entry.delegated_apply_group,
          parentOperationId: entry.parent_operation_id,
          childOperationId: entry.child_operation_id,
          delegatedRuntimeSurfacePath: entry.delegated_runtime_surface_path,
          caseIds: entry.case_ids,
          delegatedCaseIds: entry.delegated_case_ids
        })),
        readyFixture.resolved_case_ids
      )
    ).toEqual(
      readyFixture.expected_ready_groups.map((entry) => ({
        delegatedApplyGroup: entry.delegated_apply_group,
        parentOperationId: entry.parent_operation_id,
        childOperationId: entry.child_operation_id,
        delegatedRuntimeSurfacePath: entry.delegated_runtime_surface_path,
        caseIds: entry.case_ids,
        delegatedCaseIds: entry.delegated_case_ids
      }))
    );

    const transportFixture = readFixture<RubyDelegatedChildReviewTransportFixture>(
      'ruby',
      'slice-239-delegated-child-review-transport',
      'yard-example-review-transport.json'
    );
    const transportGroup = {
      delegatedApplyGroup: transportFixture.group.delegated_apply_group,
      parentOperationId: transportFixture.group.parent_operation_id,
      childOperationId: transportFixture.group.child_operation_id,
      delegatedRuntimeSurfacePath: transportFixture.group.delegated_runtime_surface_path,
      caseIds: transportFixture.group.case_ids,
      delegatedCaseIds: transportFixture.group.delegated_case_ids
    };
    expect(projectedChildGroupReviewRequest(transportGroup, transportFixture.family)).toEqual({
      id: transportFixture.expected_request.id,
      kind: transportFixture.expected_request.kind,
      family: transportFixture.expected_request.family,
      message: transportFixture.expected_request.message,
      blocking: transportFixture.expected_request.blocking,
      delegatedGroup: {
        delegatedApplyGroup:
          transportFixture.expected_request.delegated_group.delegated_apply_group,
        parentOperationId: transportFixture.expected_request.delegated_group.parent_operation_id,
        childOperationId: transportFixture.expected_request.delegated_group.child_operation_id,
        delegatedRuntimeSurfacePath:
          transportFixture.expected_request.delegated_group.delegated_runtime_surface_path,
        caseIds: transportFixture.expected_request.delegated_group.case_ids,
        delegatedCaseIds: transportFixture.expected_request.delegated_group.delegated_case_ids
      },
      actionOffers: [{ action: 'apply_delegated_child_group', requiresContext: false }],
      defaultAction: 'apply_delegated_child_group'
    });

    expect(
      selectProjectedChildReviewGroupsAcceptedForApply(
        transportFixture.groups.map((entry) => ({
          delegatedApplyGroup: entry.delegated_apply_group,
          parentOperationId: entry.parent_operation_id,
          childOperationId: entry.child_operation_id,
          delegatedRuntimeSurfacePath: entry.delegated_runtime_surface_path,
          caseIds: entry.case_ids,
          delegatedCaseIds: entry.delegated_case_ids
        })),
        transportFixture.family,
        transportFixture.decisions.map((entry) => ({
          requestId: entry.request_id,
          action: entry.action
        }))
      )
    ).toEqual(
      transportFixture.expected_accepted_groups.map((entry) => ({
        delegatedApplyGroup: entry.delegated_apply_group,
        parentOperationId: entry.parent_operation_id,
        childOperationId: entry.child_operation_id,
        delegatedRuntimeSurfacePath: entry.delegated_runtime_surface_path,
        caseIds: entry.case_ids,
        delegatedCaseIds: entry.delegated_case_ids
      }))
    );

    const stateFixture = readFixture<RubyDelegatedChildReviewStateFixture>(
      'ruby',
      'slice-242-delegated-child-review-state',
      'yard-example-review-state.json'
    );
    expect(
      reviewProjectedChildGroups(
        stateFixture.groups.map((entry) => ({
          delegatedApplyGroup: entry.delegated_apply_group,
          parentOperationId: entry.parent_operation_id,
          childOperationId: entry.child_operation_id,
          delegatedRuntimeSurfacePath: entry.delegated_runtime_surface_path,
          caseIds: entry.case_ids,
          delegatedCaseIds: entry.delegated_case_ids
        })),
        stateFixture.family,
        stateFixture.decisions.map((entry) => ({
          requestId: entry.request_id,
          action: entry.action
        }))
      )
    ).toEqual({
      requests: stateFixture.expected_state.requests.map((entry) => ({
        id: entry.id,
        kind: entry.kind,
        family: entry.family,
        message: entry.message,
        blocking: entry.blocking,
        delegatedGroup: {
          delegatedApplyGroup: entry.delegated_group.delegated_apply_group,
          parentOperationId: entry.delegated_group.parent_operation_id,
          childOperationId: entry.delegated_group.child_operation_id,
          delegatedRuntimeSurfacePath: entry.delegated_group.delegated_runtime_surface_path,
          caseIds: entry.delegated_group.case_ids,
          delegatedCaseIds: entry.delegated_group.delegated_case_ids
        },
        actionOffers: [{ action: 'apply_delegated_child_group', requiresContext: false }],
        defaultAction: 'apply_delegated_child_group'
      })),
      acceptedGroups: stateFixture.expected_state.accepted_groups.map((entry) => ({
        delegatedApplyGroup: entry.delegated_apply_group,
        parentOperationId: entry.parent_operation_id,
        childOperationId: entry.child_operation_id,
        delegatedRuntimeSurfacePath: entry.delegated_runtime_surface_path,
        caseIds: entry.case_ids,
        delegatedCaseIds: entry.delegated_case_ids
      })),
      appliedDecisions: stateFixture.expected_state.applied_decisions.map((entry) => ({
        requestId: entry.request_id,
        action: entry.action
      })),
      diagnostics: stateFixture.expected_state.diagnostics
    });

    const applyPlanFixture = readFixture<RubyDelegatedChildApplyPlanFixture>(
      'ruby',
      'slice-245-delegated-child-apply-plan',
      'yard-example-apply-plan.json'
    );

    expect(
      delegatedChildApplyPlan(
        {
          requests: applyPlanFixture.review_state.requests.map((entry) => ({
            id: entry.id,
            kind: entry.kind,
            family: entry.family,
            message: entry.message,
            blocking: entry.blocking,
            delegatedGroup: {
              delegatedApplyGroup: entry.delegated_group.delegated_apply_group,
              parentOperationId: entry.delegated_group.parent_operation_id,
              childOperationId: entry.delegated_group.child_operation_id,
              delegatedRuntimeSurfacePath: entry.delegated_group.delegated_runtime_surface_path,
              caseIds: entry.delegated_group.case_ids,
              delegatedCaseIds: entry.delegated_group.delegated_case_ids
            },
            actionOffers: [{ action: 'apply_delegated_child_group', requiresContext: false }],
            defaultAction: 'apply_delegated_child_group'
          })),
          acceptedGroups: applyPlanFixture.review_state.accepted_groups.map((entry) => ({
            delegatedApplyGroup: entry.delegated_apply_group,
            parentOperationId: entry.parent_operation_id,
            childOperationId: entry.child_operation_id,
            delegatedRuntimeSurfacePath: entry.delegated_runtime_surface_path,
            caseIds: entry.case_ids,
            delegatedCaseIds: entry.delegated_case_ids
          })),
          appliedDecisions: applyPlanFixture.review_state.applied_decisions.map((entry) => ({
            requestId: entry.request_id,
            action: entry.action
          })),
          diagnostics: applyPlanFixture.review_state.diagnostics.map(normalizeDiagnosticEntry)
        },
        applyPlanFixture.family
      )
    ).toEqual({
      entries: applyPlanFixture.expected_plan.entries.map((entry) => ({
        requestId: entry.request_id,
        family: entry.family,
        delegatedGroup: {
          delegatedApplyGroup: entry.delegated_group.delegated_apply_group,
          parentOperationId: entry.delegated_group.parent_operation_id,
          childOperationId: entry.delegated_group.child_operation_id,
          delegatedRuntimeSurfacePath: entry.delegated_group.delegated_runtime_surface_path,
          caseIds: entry.delegated_group.case_ids,
          delegatedCaseIds: entry.delegated_group.delegated_case_ids
        },
        decision: {
          requestId: entry.decision.request_id,
          action: entry.decision.action
        }
      }))
    });

    const applyOutputFixture = readFixture<RubyDelegatedChildApplyOutputFixture>(
      'ruby',
      'slice-289-delegated-child-apply-output',
      'yard-example-applied-output.json'
    );

    const applyOutputResult = applyRubyDelegatedChildOutputs(
      applyOutputFixture.source,
      applyOutputFixture.delegated_operations.map((entry) => ({
        operationId: entry.operation_id,
        parentOperationId: entry.parent_operation_id,
        requestedStrategy: 'delegate_child_surface',
        languageChain: entry.language_chain,
        surface: {
          surfaceKind: entry.surface.surface_kind,
          declaredLanguage: entry.surface.declared_language,
          effectiveLanguage: entry.surface.effective_language,
          address: entry.surface.address,
          parentAddress: entry.surface.parent_address,
          owner: entry.surface.owner,
          span: entry.surface.span
            ? {
                startLine: entry.surface.span.start_line,
                endLine: entry.surface.span.end_line
              }
            : undefined,
          reconstructionStrategy: entry.surface.reconstruction_strategy,
          metadata: entry.surface.metadata
        }
      })),
      {
        entries: applyOutputFixture.apply_plan.entries.map((entry) => ({
          requestId: entry.request_id,
          family: entry.family,
          delegatedGroup: {
            delegatedApplyGroup: entry.delegated_group.delegated_apply_group,
            parentOperationId: entry.delegated_group.parent_operation_id,
            childOperationId: entry.delegated_group.child_operation_id,
            delegatedRuntimeSurfacePath: entry.delegated_group.delegated_runtime_surface_path,
            caseIds: entry.delegated_group.case_ids,
            delegatedCaseIds: entry.delegated_group.delegated_case_ids
          },
          decision: {
            requestId: entry.decision.request_id,
            action: entry.decision.action
          }
        }))
      },
      applyOutputFixture.applied_children.map((entry) => ({
        operationId: entry.operation_id,
        output: entry.output
      }))
    );

    expect(applyOutputResult.ok).toBe(applyOutputFixture.expected.ok);
    expect(applyOutputResult.output).toBe(applyOutputFixture.expected.output);
  });

  it('conforms to the slice-291 nested merge fixture', () => {
    const fixture = readFixture<RubyNestedMergeFixture>(
      'ruby',
      'slice-291-nested-merge',
      'yard-example-nested-merge.json'
    );

    const result = mergeRubyWithNestedOutputs(
      fixture.template,
      fixture.destination,
      'ruby',
      fixture.nested_outputs.map((entry) => ({
        surfaceAddress: entry.surface_address,
        output: entry.output
      }))
    );

    expect(result.ok).toBe(fixture.expected.ok);
    expect(result.output).toBe(fixture.expected.output);
  });

  it('conforms to the slice-299 reviewed nested merge fixture', () => {
    const fixture = readFixture<{
      template: string;
      destination: string;
      review_state: {
        requests: Array<{
          id: string;
          kind: 'delegated_child_group';
          family: string;
          message: string;
          blocking: boolean;
          delegated_group: {
            delegated_apply_group: string;
            parent_operation_id: string;
            child_operation_id: string;
            delegated_runtime_surface_path: string;
            case_ids: string[];
            delegated_case_ids: string[];
          };
          action_offers: Array<{ action: 'apply_delegated_child_group'; requires_context: boolean }>;
          default_action: 'apply_delegated_child_group';
        }>;
        accepted_groups: Array<{
          delegated_apply_group: string;
          parent_operation_id: string;
          child_operation_id: string;
          delegated_runtime_surface_path: string;
          case_ids: string[];
          delegated_case_ids: string[];
        }>;
        applied_decisions: Array<{ request_id: string; action: 'apply_delegated_child_group' }>;
        diagnostics: [];
      };
      applied_children: Array<{ operation_id: string; output: string }>;
      expected: { ok: boolean; output: string };
    }>('ruby', 'slice-299-reviewed-nested-merge', 'yard-example-reviewed-nested-merge.json');

    const reviewState = {
      requests: fixture.review_state.requests.map((request) => ({
        id: request.id,
        kind: request.kind,
        family: request.family,
        message: request.message,
        blocking: request.blocking,
        delegatedGroup: {
          delegatedApplyGroup: request.delegated_group.delegated_apply_group,
          parentOperationId: request.delegated_group.parent_operation_id,
          childOperationId: request.delegated_group.child_operation_id,
          delegatedRuntimeSurfacePath: request.delegated_group.delegated_runtime_surface_path,
          caseIds: request.delegated_group.case_ids,
          delegatedCaseIds: request.delegated_group.delegated_case_ids
        },
        actionOffers: request.action_offers.map((offer) => ({
          action: offer.action,
          requiresContext: offer.requires_context
        })),
        defaultAction: request.default_action
      })),
      acceptedGroups: fixture.review_state.accepted_groups.map((group) => ({
        delegatedApplyGroup: group.delegated_apply_group,
        parentOperationId: group.parent_operation_id,
        childOperationId: group.child_operation_id,
        delegatedRuntimeSurfacePath: group.delegated_runtime_surface_path,
        caseIds: group.case_ids,
        delegatedCaseIds: group.delegated_case_ids
      })),
      appliedDecisions: fixture.review_state.applied_decisions.map((decision) => ({
        requestId: decision.request_id,
        action: decision.action
      })),
      diagnostics: fixture.review_state.diagnostics
    };

    const result = mergeRubyWithReviewedNestedOutputs(
      fixture.template,
      fixture.destination,
      'ruby',
      reviewState,
      fixture.applied_children.map((entry) => ({
        operationId: entry.operation_id,
        output: entry.output
      }))
    );

    expect(result.ok).toBe(fixture.expected.ok);
    expect(result.output).toBe(fixture.expected.output);
  });

  it('conforms to the slice-310 reviewed nested review artifact application fixture', () => {
    const fixture = readFixture<{
      template: string;
      destination: string;
      replay_bundle: {
        replay_context: { surface: 'conformance_manifest'; families: string[]; require_explicit_contexts: boolean };
        decisions: [];
        reviewed_nested_executions: Array<{
          family: string;
          review_state: {
            requests: [];
            accepted_groups: Array<{
              delegated_apply_group: string;
              parent_operation_id: string;
              child_operation_id: string;
              delegated_runtime_surface_path: string;
              case_ids: string[];
              delegated_case_ids: string[];
            }>;
            applied_decisions: Array<{ request_id: string; action: 'apply_delegated_child_group' }>;
            diagnostics: [];
          };
          applied_children: Array<{ operation_id: string; output: string }>;
        }>;
      };
      review_state: {
        report: { entries: []; summary: { total: 0; passed: 0; failed: 0; skipped: 0 } };
        diagnostics: [];
        requests: [];
        applied_decisions: [];
        host_hints: { interactive: boolean; require_explicit_contexts: boolean };
        replay_context: { surface: 'conformance_manifest'; families: string[]; require_explicit_contexts: boolean };
        reviewed_nested_executions: Array<{
          family: string;
          review_state: {
            requests: [];
            accepted_groups: Array<{
              delegated_apply_group: string;
              parent_operation_id: string;
              child_operation_id: string;
              delegated_runtime_surface_path: string;
              case_ids: string[];
              delegated_case_ids: string[];
            }>;
            applied_decisions: Array<{ request_id: string; action: 'apply_delegated_child_group' }>;
            diagnostics: [];
          };
          applied_children: Array<{ operation_id: string; output: string }>;
        }>;
      };
      expected: { ok: boolean; output: string };
    }>(
      'ruby',
      'slice-310-reviewed-nested-review-artifact-application',
      'yard-example-reviewed-nested-review-artifact-application.json'
    );

    const replayResult = mergeRubyWithReviewedNestedOutputsFromReplayBundle(
      fixture.template,
      fixture.destination,
      'ruby',
      {
        replayContext: {
          surface: fixture.replay_bundle.replay_context.surface,
          families: fixture.replay_bundle.replay_context.families,
          requireExplicitContexts: fixture.replay_bundle.replay_context.require_explicit_contexts
        },
        decisions: fixture.replay_bundle.decisions,
        reviewedNestedExecutions: fixture.replay_bundle.reviewed_nested_executions.map((execution) => ({
          family: execution.family,
          reviewState: {
            requests: execution.review_state.requests,
            acceptedGroups: execution.review_state.accepted_groups.map((group) => ({
              delegatedApplyGroup: group.delegated_apply_group,
              parentOperationId: group.parent_operation_id,
              childOperationId: group.child_operation_id,
              delegatedRuntimeSurfacePath: group.delegated_runtime_surface_path,
              caseIds: group.case_ids,
              delegatedCaseIds: group.delegated_case_ids
            })),
            appliedDecisions: execution.review_state.applied_decisions.map((decision) => ({
              requestId: decision.request_id,
              action: decision.action
            })),
            diagnostics: execution.review_state.diagnostics
          },
          appliedChildren: execution.applied_children.map((entry) => ({
            operationId: entry.operation_id,
            output: entry.output
          }))
        }))
      }
    );

    const reviewStateResult = mergeRubyWithReviewedNestedOutputsFromReviewState(
      fixture.template,
      fixture.destination,
      'ruby',
      {
        report: fixture.review_state.report,
        diagnostics: fixture.review_state.diagnostics,
        requests: fixture.review_state.requests,
        appliedDecisions: fixture.review_state.applied_decisions,
        hostHints: {
          interactive: fixture.review_state.host_hints.interactive,
          requireExplicitContexts: fixture.review_state.host_hints.require_explicit_contexts
        },
        replayContext: {
          surface: fixture.review_state.replay_context.surface,
          families: fixture.review_state.replay_context.families,
          requireExplicitContexts: fixture.review_state.replay_context.require_explicit_contexts
        },
        reviewedNestedExecutions: fixture.review_state.reviewed_nested_executions.map((execution) => ({
          family: execution.family,
          reviewState: {
            requests: execution.review_state.requests,
            acceptedGroups: execution.review_state.accepted_groups.map((group) => ({
              delegatedApplyGroup: group.delegated_apply_group,
              parentOperationId: group.parent_operation_id,
              childOperationId: group.child_operation_id,
              delegatedRuntimeSurfacePath: group.delegated_runtime_surface_path,
              caseIds: group.case_ids,
              delegatedCaseIds: group.delegated_case_ids
            })),
            appliedDecisions: execution.review_state.applied_decisions.map((decision) => ({
              requestId: decision.request_id,
              action: decision.action
            })),
            diagnostics: execution.review_state.diagnostics
          },
          appliedChildren: execution.applied_children.map((entry) => ({
            operationId: entry.operation_id,
            output: entry.output
          }))
        }))
      }
    );

    expect(replayResult.ok).toBe(fixture.expected.ok);
    expect(replayResult.output).toBe(fixture.expected.output);
    expect(reviewStateResult.ok).toBe(fixture.expected.ok);
    expect(reviewStateResult.output).toBe(fixture.expected.output);
  });

  it('conforms to the slice-312 reviewed nested review artifact rejection fixture', () => {
    const fixture = readFixture<{
      template: string;
      destination: string;
      replay_bundle: unknown;
      review_state: unknown;
      expected: { ok: boolean; diagnostics: Diagnostic[] };
      expected_review_state: { ok: boolean; diagnostics: Diagnostic[] };
    }>(
      'ruby',
      'slice-312-reviewed-nested-review-artifact-rejection',
      'yard-example-reviewed-nested-review-artifact-rejection.json'
    );

    expect(
      mergeRubyWithReviewedNestedOutputsFromReplayBundle(
        fixture.template,
        fixture.destination,
        'ruby',
        fixture.replay_bundle as never
      )
    ).toEqual({ ok: fixture.expected.ok, diagnostics: fixture.expected.diagnostics, policies: [] });

    expect(
      mergeRubyWithReviewedNestedOutputsFromReviewState(
        fixture.template,
        fixture.destination,
        'ruby',
        fixture.review_state as never
      )
    ).toEqual({
      ok: fixture.expected_review_state.ok,
      diagnostics: fixture.expected_review_state.diagnostics,
      policies: []
    });
  });

  it('conforms to the Ruby family backend and plan-context fixtures', () => {
    const backendFixture = readFixture<{
      tree_sitter: {
        backend: 'kreuzberg-language-pack';
        backend_ref: { id: 'kreuzberg-language-pack'; family: 'tree-sitter' };
        supported_policies: Array<{ surface: 'array'; name: string }>;
      };
    }>(
      'diagnostics',
      'slice-215-ruby-family-backend-feature-profiles',
      'ruby-ruby-backend-feature-profiles.json'
    );
    const planFixture = readFixture<{
      tree_sitter: {
        family_profile: {
          family: 'ruby';
          supported_dialects: ['ruby'];
          supported_policies: Array<{ surface: 'array'; name: string }>;
        };
        feature_profile: {
          backend: 'kreuzberg-language-pack';
          supports_dialects: true;
          supported_policies: Array<{ surface: 'array'; name: string }>;
        };
      };
    }>(
      'diagnostics',
      'slice-216-ruby-family-plan-contexts',
      'ruby-ruby-plan-contexts.json'
    );

    expect(availableRubyBackends()).toEqual(['kreuzberg-language-pack']);
    expect(registeredBackends()).toContainEqual({
      id: 'kreuzberg-language-pack',
      family: 'tree-sitter'
    });
    expect(rubyBackendFeatureProfile()).toEqual({
      family: 'ruby',
      supportedDialects: ['ruby'],
      supportedPolicies: backendFixture.tree_sitter.supported_policies,
      backend: backendFixture.tree_sitter.backend,
      backendRef: backendFixture.tree_sitter.backend_ref,
      supportsDialects: true
    });
    expect(rubyPlanContext()).toEqual({
      familyProfile: {
        family: planFixture.tree_sitter.family_profile.family,
        supportedDialects: planFixture.tree_sitter.family_profile.supported_dialects,
        supportedPolicies: planFixture.tree_sitter.family_profile.supported_policies
      },
      featureProfile: {
        backend: planFixture.tree_sitter.feature_profile.backend,
        supportsDialects: planFixture.tree_sitter.feature_profile.supports_dialects,
        supportedPolicies: planFixture.tree_sitter.feature_profile.supported_policies
      }
    });

    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-217-ruby-family-manifest',
      'ruby-family-manifest.json'
    );
    expect(conformanceFamilyFeatureProfilePath(manifest, 'ruby')).toEqual([
      'diagnostics',
      'slice-214-ruby-family-feature-profile',
      'ruby-feature-profile.json'
    ]);
    expect(conformanceFixturePath(manifest, 'ruby', 'analysis')).toEqual([
      'ruby',
      'slice-218-analysis',
      'module-owners.json'
    ]);
    expect(conformanceFixturePath(manifest, 'ruby', 'matching')).toEqual([
      'ruby',
      'slice-219-matching',
      'path-equality.json'
    ]);
    expect(conformanceFixturePath(manifest, 'ruby', 'merge')).toEqual([
      'ruby',
      'slice-287-merge',
      'module-merge.json'
    ]);
  });
});
