import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
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
  type Diagnostic,
  type ConformanceManifest
} from '@structuredmerge/ast-merge';
import {
  applyMarkdownDelegatedChildOutputs,
  availableMarkdownBackends,
  markdownBackendFeatureProfile,
  markdownDelegatedChildOperations,
  markdownDiscoveredSurfaces,
  markdownEmbeddedFamilies,
  markdownFeatureProfile,
  markdownPlanContext,
  matchMarkdownOwners,
  mergeMarkdown,
  mergeMarkdownWithReviewedNestedOutputs,
  mergeMarkdownWithReviewedNestedOutputsFromReplayBundleEnvelope,
  mergeMarkdownWithReviewedNestedOutputsFromReplayBundle,
  mergeMarkdownWithReviewedNestedOutputsFromReviewStateEnvelope,
  mergeMarkdownWithReviewedNestedOutputsFromReviewState,
  mergeMarkdownWithNestedOutputs,
  parseMarkdown
} from '../src/index';

function readFixture<T>(...segments: string[]): T {
  const fixturePath = path.resolve(process.cwd(), '..', 'fixtures', ...segments);
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as T;
}

interface FixtureProjectedChildGroup {
  delegated_apply_group: string;
  parent_operation_id: string;
  child_operation_id: string;
  delegated_runtime_surface_path: string;
  case_ids: string[];
  delegated_case_ids: string[];
}

interface MarkdownDelegatedChildReviewTransportFixture {
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

interface MarkdownDelegatedChildReviewStateFixture {
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

interface FixtureChildOperation {
  readonly operation_id: string;
  readonly parent_operation_id: string;
  readonly requested_strategy: 'delegate_child_surface';
  readonly language_chain: string[];
  readonly surface: {
    readonly surface_kind: string;
    readonly declared_language?: string;
    readonly effective_language: string;
    readonly address: string;
    readonly parent_address?: string;
    readonly owner: {
      readonly kind: 'structural_owner';
      readonly address: string;
    };
    readonly reconstruction_strategy: string;
    readonly metadata?: Record<string, unknown>;
  };
}

interface MarkdownDelegatedChildApplyPlanFixture {
  family: string;
  review_state: MarkdownDelegatedChildReviewStateFixture['expected_state'];
  expected_plan: {
    entries: Array<{
      request_id: string;
      family: string;
      delegated_group: FixtureProjectedChildGroup;
      decision: {
        request_id: string;
        action: 'apply_delegated_child_group';
      };
    }>;
  };
}

interface MarkdownDelegatedChildApplyOutputFixture {
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

interface MarkdownNestedMergeFixture {
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
  severity: string;
  category: string;
  message: string;
}): Diagnostic {
  return {
    severity: entry.severity as Diagnostic['severity'],
    category: entry.category as Diagnostic['category'],
    message: entry.message
  };
}

describe('markdown-merge shared fixtures', () => {
  it('conforms to the slice-194 Markdown feature profile fixture', () => {
    const fixture = readFixture<{
      feature_profile: {
        family: 'markdown';
        supported_dialects: ['markdown'];
        supported_policies: [];
      };
    }>('diagnostics', 'slice-194-markdown-family-feature-profile', 'markdown-feature-profile.json');

    expect(markdownFeatureProfile()).toEqual({
      family: fixture.feature_profile.family,
      supportedDialects: fixture.feature_profile.supported_dialects,
      supportedPolicies: fixture.feature_profile.supported_policies
    });
  });

  it('conforms to the slice-195 Markdown backend feature profile fixture', () => {
    const fixture = readFixture<{
      tree_sitter: {
        backend: 'kreuzberg-language-pack';
        supported_policies: [];
        backend_ref: { id: 'kreuzberg-language-pack'; family: 'tree-sitter' };
      };
    }>(
      'diagnostics',
      'slice-195-markdown-family-backend-feature-profiles',
      'typescript-markdown-backend-feature-profiles.json'
    );

    expect(availableMarkdownBackends()).toEqual(['kreuzberg-language-pack']);
    expect(markdownBackendFeatureProfile('kreuzberg-language-pack')).toEqual({
      family: 'markdown',
      supportedDialects: ['markdown'],
      supportedPolicies: fixture.tree_sitter.supported_policies,
      backend: fixture.tree_sitter.backend,
      backendRef: fixture.tree_sitter.backend_ref
    });
  });

  it('conforms to the slice-196 Markdown plan-context fixture', () => {
    const fixture = readFixture<{
      tree_sitter: {
        family_profile: {
          family: 'markdown';
          supported_dialects: ['markdown'];
          supported_policies: [];
        };
        feature_profile: {
          backend: 'kreuzberg-language-pack';
          supports_dialects: false;
          supported_policies: [];
        };
      };
    }>(
      'diagnostics',
      'slice-196-markdown-family-plan-contexts',
      'typescript-markdown-plan-contexts.json'
    );

    expect(markdownPlanContext('kreuzberg-language-pack')).toEqual({
      familyProfile: {
        family: fixture.tree_sitter.family_profile.family,
        supportedDialects: fixture.tree_sitter.family_profile.supported_dialects,
        supportedPolicies: fixture.tree_sitter.family_profile.supported_policies
      },
      featureProfile: {
        backend: fixture.tree_sitter.feature_profile.backend,
        supportsDialects: fixture.tree_sitter.feature_profile.supports_dialects,
        supportedPolicies: fixture.tree_sitter.feature_profile.supported_policies
      }
    });
  });

  it('conforms to the slice-197 Markdown family manifest fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-197-markdown-family-manifest',
      'markdown-family-manifest.json'
    );

    expect(conformanceFamilyFeatureProfilePath(manifest, 'markdown')).toEqual([
      'diagnostics',
      'slice-194-markdown-family-feature-profile',
      'markdown-feature-profile.json'
    ]);
    expect(conformanceFixturePath(manifest, 'markdown', 'analysis')).toEqual([
      'markdown',
      'slice-198-analysis',
      'headings-and-code-fences.json'
    ]);
    expect(conformanceFixturePath(manifest, 'markdown', 'matching')).toEqual([
      'markdown',
      'slice-199-matching',
      'path-equality.json'
    ]);
    expect(conformanceFixturePath(manifest, 'markdown', 'merge')).toEqual([
      'markdown',
      'slice-286-merge',
      'section-merge.json'
    ]);
  });

  it('conforms to the slice-198 Markdown analysis fixture', () => {
    const fixture = readFixture<{
      source: string;
      dialect: 'markdown';
      expected: {
        ok: true;
        root_kind: 'document';
        owners: Array<{
          path: string;
          owner_kind: 'heading' | 'code_fence';
          match_key: string;
          level?: number;
          info_string?: string;
        }>;
      };
    }>('markdown', 'slice-198-analysis', 'headings-and-code-fences.json');

    for (const backend of availableMarkdownBackends()) {
      const result = parseMarkdown(fixture.source, fixture.dialect, backend);
      expect(result.ok).toBe(true);
      expect(result.analysis?.rootKind).toBe(fixture.expected.root_kind);
      expect(result.analysis?.owners).toEqual(
        fixture.expected.owners.map((owner) => ({
          path: owner.path,
          ownerKind: owner.owner_kind,
          matchKey: owner.match_key,
          ...(owner.level ? { level: owner.level } : {}),
          ...(owner.info_string ? { infoString: owner.info_string } : {})
        }))
      );
    }
  });

  it('conforms to the slice-199 Markdown matching fixture', () => {
    const fixture = readFixture<{
      template: string;
      destination: string;
      dialect: 'markdown';
      expected: {
        matched: Array<[string, string]>;
        unmatched_template: string[];
        unmatched_destination: string[];
      };
    }>('markdown', 'slice-199-matching', 'path-equality.json');

    for (const backend of availableMarkdownBackends()) {
      const template = parseMarkdown(fixture.template, fixture.dialect, backend);
      const destination = parseMarkdown(fixture.destination, fixture.dialect, backend);
      expect(template.ok).toBe(true);
      expect(destination.ok).toBe(true);
      expect(matchMarkdownOwners(template.analysis!, destination.analysis!)).toEqual({
        matched: fixture.expected.matched.map(([templatePath, destinationPath]) => ({
          templatePath,
          destinationPath
        })),
        unmatchedTemplate: fixture.expected.unmatched_template,
        unmatchedDestination: fixture.expected.unmatched_destination
      });
    }
  });

  it('conforms to the slice-286 Markdown merge fixture', () => {
    const fixture = readFixture<{
      template: string;
      destination: string;
      expected: {
        ok: true;
        output: string;
      };
    }>('markdown', 'slice-286-merge', 'section-merge.json');

    for (const backend of availableMarkdownBackends()) {
      const result = mergeMarkdown(fixture.template, fixture.destination, 'markdown', backend);
      expect(result.ok).toBe(fixture.expected.ok);
      expect(result.output).toBe(fixture.expected.output);
    }
  });

  it('conforms to the slice-208 embedded-family fixture', () => {
    const fixture = readFixture<{
      source: string;
      expected: Array<{
        path: string;
        language: string;
        family: 'typescript' | 'rust' | 'go' | 'json' | 'yaml' | 'toml';
        dialect: string;
      }>;
    }>('markdown', 'slice-208-embedded-families', 'code-fence-families.json');

    const analysis = parseMarkdown(fixture.source, 'markdown');
    expect(analysis.ok).toBe(true);
    expect(markdownEmbeddedFamilies(analysis.analysis!)).toEqual(fixture.expected);
  });

  it('conforms to the slice-212 discovered-surfaces fixture', () => {
    const fixture = readFixture<{
      source: string;
      expected: Array<{
        surface_kind: string;
        declared_language?: string;
        effective_language: string;
        address: string;
        parent_address?: string;
        owner: {
          kind: 'structural_owner' | 'owned_region' | 'parent_surface';
          address: string;
        };
        reconstruction_strategy: string;
        metadata?: Record<string, unknown>;
      }>;
    }>('markdown', 'slice-212-discovered-surfaces', 'fenced-code-surfaces.json');

    const analysis = parseMarkdown(fixture.source, 'markdown');
    expect(analysis.ok).toBe(true);
    expect(markdownDiscoveredSurfaces(analysis.analysis!)).toEqual(
      fixture.expected.map((surface) => ({
        surfaceKind: surface.surface_kind,
        declaredLanguage: surface.declared_language,
        effectiveLanguage: surface.effective_language,
        address: surface.address,
        parentAddress: surface.parent_address,
        owner: surface.owner,
        reconstructionStrategy: surface.reconstruction_strategy,
        metadata: surface.metadata
      }))
    );
  });

  it('conforms to the slice-213 delegated child-operations fixture', () => {
    const fixture = readFixture<{
      source: string;
      parent_operation_id: string;
      expected: Array<{
        operation_id: string;
        parent_operation_id: string;
        requested_strategy: 'delegate_child_surface';
        language_chain: string[];
        surface: {
          surface_kind: string;
          declared_language?: string;
          effective_language: string;
          address: string;
          parent_address?: string;
          owner: {
            kind: 'structural_owner' | 'owned_region' | 'parent_surface';
            address: string;
          };
          reconstruction_strategy: string;
          metadata?: Record<string, unknown>;
        };
      }>;
    }>('markdown', 'slice-213-delegated-child-operations', 'fenced-code-child-operations.json');

    const analysis = parseMarkdown(fixture.source, 'markdown');
    expect(analysis.ok).toBe(true);
    expect(
      markdownDelegatedChildOperations(analysis.analysis!, fixture.parent_operation_id)
    ).toEqual(
      fixture.expected.map((operation) => ({
        operationId: operation.operation_id,
        parentOperationId: operation.parent_operation_id,
        requestedStrategy: operation.requested_strategy,
        languageChain: operation.language_chain,
        surface: {
          surfaceKind: operation.surface.surface_kind,
          declaredLanguage: operation.surface.declared_language,
          effectiveLanguage: operation.surface.effective_language,
          address: operation.surface.address,
          parentAddress: operation.surface.parent_address,
          owner: operation.surface.owner,
          reconstructionStrategy: operation.surface.reconstruction_strategy,
          metadata: operation.surface.metadata
        }
      }))
    );
  });

  it('conforms to the slice-228 projected child-review groups fixture', () => {
    const fixture = readFixture<{
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
    }>('markdown', 'slice-228-projected-child-review-groups', 'fenced-code-review-groups.json');

    expect(
      groupProjectedChildReviewCases(
        fixture.cases.map((entry) => ({
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
      fixture.expected_groups.map((entry) => ({
        delegatedApplyGroup: entry.delegated_apply_group,
        parentOperationId: entry.parent_operation_id,
        childOperationId: entry.child_operation_id,
        delegatedRuntimeSurfacePath: entry.delegated_runtime_surface_path,
        caseIds: entry.case_ids,
        delegatedCaseIds: entry.delegated_case_ids
      }))
    );
  });

  it('conforms to the slice-231 projected child-review group progress fixture', () => {
    const fixture = readFixture<{
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
      'markdown',
      'slice-231-projected-child-review-group-progress',
      'fenced-code-review-progress.json'
    );

    expect(
      summarizeProjectedChildReviewGroupProgress(
        fixture.groups.map((entry) => ({
          delegatedApplyGroup: entry.delegated_apply_group,
          parentOperationId: entry.parent_operation_id,
          childOperationId: entry.child_operation_id,
          delegatedRuntimeSurfacePath: entry.delegated_runtime_surface_path,
          caseIds: entry.case_ids,
          delegatedCaseIds: entry.delegated_case_ids
        })),
        fixture.resolved_case_ids
      )
    ).toEqual(
      fixture.expected_progress.map((entry) => ({
        delegatedApplyGroup: entry.delegated_apply_group,
        parentOperationId: entry.parent_operation_id,
        childOperationId: entry.child_operation_id,
        delegatedRuntimeSurfacePath: entry.delegated_runtime_surface_path,
        resolvedCaseIds: entry.resolved_case_ids,
        pendingCaseIds: entry.pending_case_ids,
        complete: entry.complete
      }))
    );
  });

  it('conforms to the slice-234 projected child-review groups ready-for-apply fixture', () => {
    const fixture = readFixture<{
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
      'markdown',
      'slice-234-projected-child-review-groups-ready-for-apply',
      'fenced-code-ready-groups.json'
    );

    expect(
      selectProjectedChildReviewGroupsReadyForApply(
        fixture.groups.map((entry) => ({
          delegatedApplyGroup: entry.delegated_apply_group,
          parentOperationId: entry.parent_operation_id,
          childOperationId: entry.child_operation_id,
          delegatedRuntimeSurfacePath: entry.delegated_runtime_surface_path,
          caseIds: entry.case_ids,
          delegatedCaseIds: entry.delegated_case_ids
        })),
        fixture.resolved_case_ids
      )
    ).toEqual(
      fixture.expected_ready_groups.map((entry) => ({
        delegatedApplyGroup: entry.delegated_apply_group,
        parentOperationId: entry.parent_operation_id,
        childOperationId: entry.child_operation_id,
        delegatedRuntimeSurfacePath: entry.delegated_runtime_surface_path,
        caseIds: entry.case_ids,
        delegatedCaseIds: entry.delegated_case_ids
      }))
    );
  });

  it('conforms to the slice-238 delegated child review transport fixture', () => {
    const fixture = readFixture<MarkdownDelegatedChildReviewTransportFixture>(
      'markdown',
      'slice-238-delegated-child-review-transport',
      'fenced-code-review-transport.json'
    );

    const group = {
      delegatedApplyGroup: fixture.group.delegated_apply_group,
      parentOperationId: fixture.group.parent_operation_id,
      childOperationId: fixture.group.child_operation_id,
      delegatedRuntimeSurfacePath: fixture.group.delegated_runtime_surface_path,
      caseIds: fixture.group.case_ids,
      delegatedCaseIds: fixture.group.delegated_case_ids
    };

    expect(projectedChildGroupReviewRequest(group, fixture.family)).toEqual({
      id: fixture.expected_request.id,
      kind: fixture.expected_request.kind,
      family: fixture.expected_request.family,
      message: fixture.expected_request.message,
      blocking: fixture.expected_request.blocking,
      delegatedGroup: {
        delegatedApplyGroup: fixture.expected_request.delegated_group.delegated_apply_group,
        parentOperationId: fixture.expected_request.delegated_group.parent_operation_id,
        childOperationId: fixture.expected_request.delegated_group.child_operation_id,
        delegatedRuntimeSurfacePath:
          fixture.expected_request.delegated_group.delegated_runtime_surface_path,
        caseIds: fixture.expected_request.delegated_group.case_ids,
        delegatedCaseIds: fixture.expected_request.delegated_group.delegated_case_ids
      },
      actionOffers: [{ action: 'apply_delegated_child_group', requiresContext: false }],
      defaultAction: 'apply_delegated_child_group'
    });

    expect(
      selectProjectedChildReviewGroupsAcceptedForApply(
        fixture.groups.map((entry) => ({
          delegatedApplyGroup: entry.delegated_apply_group,
          parentOperationId: entry.parent_operation_id,
          childOperationId: entry.child_operation_id,
          delegatedRuntimeSurfacePath: entry.delegated_runtime_surface_path,
          caseIds: entry.case_ids,
          delegatedCaseIds: entry.delegated_case_ids
        })),
        fixture.family,
        fixture.decisions.map((entry) => ({
          requestId: entry.request_id,
          action: entry.action
        }))
      )
    ).toEqual(
      fixture.expected_accepted_groups.map((entry) => ({
        delegatedApplyGroup: entry.delegated_apply_group,
        parentOperationId: entry.parent_operation_id,
        childOperationId: entry.child_operation_id,
        delegatedRuntimeSurfacePath: entry.delegated_runtime_surface_path,
        caseIds: entry.case_ids,
        delegatedCaseIds: entry.delegated_case_ids
      }))
    );
  });

  it('conforms to the slice-241 delegated child review-state fixture', () => {
    const fixture = readFixture<MarkdownDelegatedChildReviewStateFixture>(
      'markdown',
      'slice-241-delegated-child-review-state',
      'fenced-code-review-state.json'
    );

    expect(
      reviewProjectedChildGroups(
        fixture.groups.map((entry) => ({
          delegatedApplyGroup: entry.delegated_apply_group,
          parentOperationId: entry.parent_operation_id,
          childOperationId: entry.child_operation_id,
          delegatedRuntimeSurfacePath: entry.delegated_runtime_surface_path,
          caseIds: entry.case_ids,
          delegatedCaseIds: entry.delegated_case_ids
        })),
        fixture.family,
        fixture.decisions.map((entry) => ({
          requestId: entry.request_id,
          action: entry.action
        }))
      )
    ).toEqual({
      requests: fixture.expected_state.requests.map((entry) => ({
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
      acceptedGroups: fixture.expected_state.accepted_groups.map((entry) => ({
        delegatedApplyGroup: entry.delegated_apply_group,
        parentOperationId: entry.parent_operation_id,
        childOperationId: entry.child_operation_id,
        delegatedRuntimeSurfacePath: entry.delegated_runtime_surface_path,
        caseIds: entry.case_ids,
        delegatedCaseIds: entry.delegated_case_ids
      })),
      appliedDecisions: fixture.expected_state.applied_decisions.map((entry) => ({
        requestId: entry.request_id,
        action: entry.action
      })),
      diagnostics: fixture.expected_state.diagnostics
    });
  });

  it('conforms to the slice-244 delegated child apply-plan fixture', () => {
    const fixture = readFixture<MarkdownDelegatedChildApplyPlanFixture>(
      'markdown',
      'slice-244-delegated-child-apply-plan',
      'fenced-code-apply-plan.json'
    );

    expect(
      delegatedChildApplyPlan(
        {
          requests: fixture.review_state.requests.map((entry) => ({
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
          acceptedGroups: fixture.review_state.accepted_groups.map((entry) => ({
            delegatedApplyGroup: entry.delegated_apply_group,
            parentOperationId: entry.parent_operation_id,
            childOperationId: entry.child_operation_id,
            delegatedRuntimeSurfacePath: entry.delegated_runtime_surface_path,
            caseIds: entry.case_ids,
            delegatedCaseIds: entry.delegated_case_ids
          })),
          appliedDecisions: fixture.review_state.applied_decisions.map((entry) => ({
            requestId: entry.request_id,
            action: entry.action
          })),
          diagnostics: fixture.review_state.diagnostics.map(normalizeDiagnosticEntry)
        },
        fixture.family
      )
    ).toEqual({
      entries: fixture.expected_plan.entries.map((entry) => ({
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
  });

  it('conforms to the slice-288 delegated child apply-output fixture', () => {
    const fixture = readFixture<MarkdownDelegatedChildApplyOutputFixture>(
      'markdown',
      'slice-288-delegated-child-apply-output',
      'fenced-code-applied-output.json'
    );

    const result = applyMarkdownDelegatedChildOutputs(
      fixture.source,
      fixture.delegated_operations.map((entry) => ({
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
          reconstructionStrategy: entry.surface.reconstruction_strategy,
          metadata: entry.surface.metadata
        }
      })),
      {
        entries: fixture.apply_plan.entries.map((entry) => ({
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
      fixture.applied_children.map((entry) => ({
        operationId: entry.operation_id,
        output: entry.output
      }))
    );

    expect(result.ok).toBe(fixture.expected.ok);
    expect(result.output).toBe(fixture.expected.output);
  });

  it('conforms to the slice-290 nested merge fixture', () => {
    const fixture = readFixture<MarkdownNestedMergeFixture>(
      'markdown',
      'slice-290-nested-merge',
      'fenced-code-nested-merge.json'
    );

    const result = mergeMarkdownWithNestedOutputs(
      fixture.template,
      fixture.destination,
      'markdown',
      fixture.nested_outputs.map((entry) => ({
        surfaceAddress: entry.surface_address,
        output: entry.output
      }))
    );

    expect(result.ok).toBe(fixture.expected.ok);
    expect(result.output).toBe(fixture.expected.output);
  });

  it('conforms to the slice-298 reviewed nested merge fixture', () => {
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
          action_offers: Array<{
            action: 'apply_delegated_child_group';
            requires_context: boolean;
          }>;
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
    }>('markdown', 'slice-298-reviewed-nested-merge', 'fenced-code-reviewed-nested-merge.json');

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

    const result = mergeMarkdownWithReviewedNestedOutputs(
      fixture.template,
      fixture.destination,
      'markdown',
      reviewState,
      fixture.applied_children.map((entry) => ({
        operationId: entry.operation_id,
        output: entry.output
      }))
    );

    expect(result.ok).toBe(fixture.expected.ok);
    expect(result.output).toBe(fixture.expected.output);
  });

  it('conforms to the slice-309 reviewed nested review artifact application fixture', () => {
    const fixture = readFixture<{
      template: string;
      destination: string;
      replay_bundle: {
        replay_context: {
          surface: 'conformance_manifest';
          families: string[];
          require_explicit_contexts: boolean;
        };
        decisions: Array<{
          request_id: string;
          action: 'accept_default_context' | 'apply_delegated_child_group';
        }>;
        reviewed_nested_executions: Array<{
          family: string;
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
              action_offers: Array<{
                action: 'apply_delegated_child_group';
                requires_context: boolean;
              }>;
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
        }>;
      };
      review_state: {
        report: { entries: []; summary: { total: 0; passed: 0; failed: 0; skipped: 0 } };
        diagnostics: [];
        requests: [];
        applied_decisions: [];
        host_hints: { interactive: boolean; require_explicit_contexts: boolean };
        replay_context: {
          surface: 'conformance_manifest';
          families: string[];
          require_explicit_contexts: boolean;
        };
        reviewed_nested_executions: Array<{
          family: string;
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
              action_offers: Array<{
                action: 'apply_delegated_child_group';
                requires_context: boolean;
              }>;
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
        }>;
      };
      expected: { ok: boolean; output: string };
    }>(
      'markdown',
      'slice-309-reviewed-nested-review-artifact-application',
      'fenced-code-reviewed-nested-review-artifact-application.json'
    );

    const replayResult = mergeMarkdownWithReviewedNestedOutputsFromReplayBundle(
      fixture.template,
      fixture.destination,
      'markdown',
      {
        replayContext: {
          surface: fixture.replay_bundle.replay_context.surface,
          families: fixture.replay_bundle.replay_context.families,
          requireExplicitContexts: fixture.replay_bundle.replay_context.require_explicit_contexts
        },
        decisions: fixture.replay_bundle.decisions.map((decision) => ({
          requestId: decision.request_id,
          action: decision.action
        })),
        reviewedNestedExecutions: fixture.replay_bundle.reviewed_nested_executions.map(
          (execution) => ({
            family: execution.family,
            reviewState: {
              requests: execution.review_state.requests.map((request) => ({
                id: request.id,
                kind: request.kind,
                family: request.family,
                message: request.message,
                blocking: request.blocking,
                delegatedGroup: {
                  delegatedApplyGroup: request.delegated_group.delegated_apply_group,
                  parentOperationId: request.delegated_group.parent_operation_id,
                  childOperationId: request.delegated_group.child_operation_id,
                  delegatedRuntimeSurfacePath:
                    request.delegated_group.delegated_runtime_surface_path,
                  caseIds: request.delegated_group.case_ids,
                  delegatedCaseIds: request.delegated_group.delegated_case_ids
                },
                actionOffers: request.action_offers.map((offer) => ({
                  action: offer.action,
                  requiresContext: offer.requires_context
                })),
                defaultAction: request.default_action
              })),
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
          })
        )
      }
    );

    const reviewStateResult = mergeMarkdownWithReviewedNestedOutputsFromReviewState(
      fixture.template,
      fixture.destination,
      'markdown',
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
        reviewedNestedExecutions: fixture.review_state.reviewed_nested_executions.map(
          (execution) => ({
            family: execution.family,
            reviewState: {
              requests: execution.review_state.requests.map((request) => ({
                id: request.id,
                kind: request.kind,
                family: request.family,
                message: request.message,
                blocking: request.blocking,
                delegatedGroup: {
                  delegatedApplyGroup: request.delegated_group.delegated_apply_group,
                  parentOperationId: request.delegated_group.parent_operation_id,
                  childOperationId: request.delegated_group.child_operation_id,
                  delegatedRuntimeSurfacePath:
                    request.delegated_group.delegated_runtime_surface_path,
                  caseIds: request.delegated_group.case_ids,
                  delegatedCaseIds: request.delegated_group.delegated_case_ids
                },
                actionOffers: request.action_offers.map((offer) => ({
                  action: offer.action,
                  requiresContext: offer.requires_context
                })),
                defaultAction: request.default_action
              })),
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
          })
        )
      }
    );

    expect(replayResult.ok).toBe(fixture.expected.ok);
    expect(replayResult.output).toBe(fixture.expected.output);
    expect(reviewStateResult.ok).toBe(fixture.expected.ok);
    expect(reviewStateResult.output).toBe(fixture.expected.output);
  });

  it('conforms to the slice-311 reviewed nested review artifact rejection fixture', () => {
    const fixture = readFixture<{
      template: string;
      destination: string;
      replay_bundle: unknown;
      review_state: unknown;
      expected: { ok: boolean; diagnostics: Diagnostic[] };
      expected_review_state: { ok: boolean; diagnostics: Diagnostic[] };
    }>(
      'markdown',
      'slice-311-reviewed-nested-review-artifact-rejection',
      'fenced-code-reviewed-nested-review-artifact-rejection.json'
    );

    expect(
      mergeMarkdownWithReviewedNestedOutputsFromReplayBundle(
        fixture.template,
        fixture.destination,
        'markdown',
        fixture.replay_bundle as never
      )
    ).toEqual({ ok: fixture.expected.ok, diagnostics: fixture.expected.diagnostics, policies: [] });

    expect(
      mergeMarkdownWithReviewedNestedOutputsFromReviewState(
        fixture.template,
        fixture.destination,
        'markdown',
        fixture.review_state as never
      )
    ).toEqual({
      ok: fixture.expected_review_state.ok,
      diagnostics: fixture.expected_review_state.diagnostics,
      policies: []
    });
  });

  it('conforms to the slice-313 reviewed nested review artifact envelope application fixture', () => {
    const fixture = readFixture<{
      template: string;
      destination: string;
      replay_bundle_envelope: {
        kind: 'review_replay_bundle';
        version: 1;
        replay_bundle: {
          replay_context: {
            surface: 'conformance_manifest';
            families: string[];
            require_explicit_contexts: boolean;
          };
          decisions: Array<{
            request_id: string;
            action: 'accept_default_context' | 'apply_delegated_child_group';
          }>;
          reviewed_nested_executions: Array<{
            family: string;
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
                action_offers: Array<{
                  action: 'apply_delegated_child_group';
                  requires_context: boolean;
                }>;
                default_action: 'apply_delegated_child_group';
              }>;
              accepted_groups: Array<FixtureProjectedChildGroup>;
              applied_decisions: Array<{
                request_id: string;
                action: 'apply_delegated_child_group';
              }>;
              diagnostics: [];
            };
            applied_children: Array<{ operation_id: string; output: string }>;
          }>;
        };
      };
      review_state_envelope: {
        kind: 'conformance_manifest_review_state';
        version: 1;
        state: {
          report: { entries: []; summary: { total: 0; passed: 0; failed: 0; skipped: 0 } };
          diagnostics: [];
          requests: [];
          applied_decisions: [];
          host_hints: { interactive: boolean; require_explicit_contexts: boolean };
          replay_context: {
            surface: 'conformance_manifest';
            families: string[];
            require_explicit_contexts: boolean;
          };
          reviewed_nested_executions: Array<{
            family: string;
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
                action_offers: Array<{
                  action: 'apply_delegated_child_group';
                  requires_context: boolean;
                }>;
                default_action: 'apply_delegated_child_group';
              }>;
              accepted_groups: Array<FixtureProjectedChildGroup>;
              applied_decisions: Array<{
                request_id: string;
                action: 'apply_delegated_child_group';
              }>;
              diagnostics: [];
            };
            applied_children: Array<{ operation_id: string; output: string }>;
          }>;
        };
      };
      expected: { ok: boolean; output: string };
    }>(
      'markdown',
      'slice-313-reviewed-nested-review-artifact-envelope-application',
      'fenced-code-reviewed-nested-review-artifact-envelope-application.json'
    );

    const replayBundleEnvelope = {
      kind: fixture.replay_bundle_envelope.kind,
      version: fixture.replay_bundle_envelope.version,
      replayBundle: {
        replayContext: {
          surface: fixture.replay_bundle_envelope.replay_bundle.replay_context.surface,
          families: fixture.replay_bundle_envelope.replay_bundle.replay_context.families,
          requireExplicitContexts:
            fixture.replay_bundle_envelope.replay_bundle.replay_context.require_explicit_contexts
        },
        decisions: fixture.replay_bundle_envelope.replay_bundle.decisions.map((decision) => ({
          requestId: decision.request_id,
          action: decision.action
        })),
        reviewedNestedExecutions:
          fixture.replay_bundle_envelope.replay_bundle.reviewed_nested_executions.map(
            (execution) => ({
              family: execution.family,
              reviewState: {
                requests: execution.review_state.requests.map((request) => ({
                  id: request.id,
                  kind: request.kind,
                  family: request.family,
                  message: request.message,
                  blocking: request.blocking,
                  delegatedGroup: {
                    delegatedApplyGroup: request.delegated_group.delegated_apply_group,
                    parentOperationId: request.delegated_group.parent_operation_id,
                    childOperationId: request.delegated_group.child_operation_id,
                    delegatedRuntimeSurfacePath:
                      request.delegated_group.delegated_runtime_surface_path,
                    caseIds: request.delegated_group.case_ids,
                    delegatedCaseIds: request.delegated_group.delegated_case_ids
                  },
                  actionOffers: request.action_offers.map((offer) => ({
                    action: offer.action,
                    requiresContext: offer.requires_context
                  })),
                  defaultAction: request.default_action
                })),
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
            })
          )
      }
    };

    const reviewStateEnvelope = {
      kind: fixture.review_state_envelope.kind,
      version: fixture.review_state_envelope.version,
      state: {
        report: fixture.review_state_envelope.state.report,
        diagnostics: fixture.review_state_envelope.state.diagnostics,
        requests: fixture.review_state_envelope.state.requests,
        appliedDecisions: fixture.review_state_envelope.state.applied_decisions,
        hostHints: {
          interactive: fixture.review_state_envelope.state.host_hints.interactive,
          requireExplicitContexts:
            fixture.review_state_envelope.state.host_hints.require_explicit_contexts
        },
        replayContext: {
          surface: fixture.review_state_envelope.state.replay_context.surface,
          families: fixture.review_state_envelope.state.replay_context.families,
          requireExplicitContexts:
            fixture.review_state_envelope.state.replay_context.require_explicit_contexts
        },
        reviewedNestedExecutions:
          fixture.review_state_envelope.state.reviewed_nested_executions.map((execution) => ({
            family: execution.family,
            reviewState: {
              requests: execution.review_state.requests.map((request) => ({
                id: request.id,
                kind: request.kind,
                family: request.family,
                message: request.message,
                blocking: request.blocking,
                delegatedGroup: {
                  delegatedApplyGroup: request.delegated_group.delegated_apply_group,
                  parentOperationId: request.delegated_group.parent_operation_id,
                  childOperationId: request.delegated_group.child_operation_id,
                  delegatedRuntimeSurfacePath:
                    request.delegated_group.delegated_runtime_surface_path,
                  caseIds: request.delegated_group.case_ids,
                  delegatedCaseIds: request.delegated_group.delegated_case_ids
                },
                actionOffers: request.action_offers.map((offer) => ({
                  action: offer.action,
                  requiresContext: offer.requires_context
                })),
                defaultAction: request.default_action
              })),
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
    };

    expect(
      mergeMarkdownWithReviewedNestedOutputsFromReplayBundleEnvelope(
        fixture.template,
        fixture.destination,
        'markdown',
        replayBundleEnvelope
      )
    ).toEqual({
      ok: fixture.expected.ok,
      output: fixture.expected.output,
      diagnostics: [],
      policies: []
    });

    expect(
      mergeMarkdownWithReviewedNestedOutputsFromReviewStateEnvelope(
        fixture.template,
        fixture.destination,
        'markdown',
        reviewStateEnvelope
      )
    ).toEqual({
      ok: fixture.expected.ok,
      output: fixture.expected.output,
      diagnostics: [],
      policies: []
    });
  });

  it('conforms to the slice-315 reviewed nested review artifact envelope rejection fixture', () => {
    const fixture = readFixture<{
      template: string;
      destination: string;
      replay_bundle_envelope: unknown;
      review_state_envelope: unknown;
      expected_replay_bundle: { ok: boolean; diagnostics: Diagnostic[] };
      expected_review_state: { ok: boolean; diagnostics: Diagnostic[] };
    }>(
      'markdown',
      'slice-315-reviewed-nested-review-artifact-envelope-rejection',
      'fenced-code-reviewed-nested-review-artifact-envelope-rejection.json'
    );

    expect(
      mergeMarkdownWithReviewedNestedOutputsFromReplayBundleEnvelope(
        fixture.template,
        fixture.destination,
        'markdown',
        fixture.replay_bundle_envelope as never
      )
    ).toEqual({
      ok: fixture.expected_replay_bundle.ok,
      diagnostics: fixture.expected_replay_bundle.diagnostics,
      policies: []
    });

    expect(
      mergeMarkdownWithReviewedNestedOutputsFromReviewStateEnvelope(
        fixture.template,
        fixture.destination,
        'markdown',
        fixture.review_state_envelope as never
      )
    ).toEqual({
      ok: fixture.expected_review_state.ok,
      diagnostics: fixture.expected_review_state.diagnostics,
      policies: []
    });
  });
});
