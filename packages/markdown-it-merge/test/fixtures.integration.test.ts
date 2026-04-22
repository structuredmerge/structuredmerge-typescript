import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  planNamedConformanceSuites,
  reportNamedConformanceSuiteEnvelope,
  reportPlannedNamedConformanceSuites,
  type ConformanceManifest,
  type ConformanceCaseExecution
} from '@structuredmerge/ast-merge';
import {
  availableMarkdownBackends,
  markdownEmbeddedFamilies,
  markdownBackendFeatureProfile,
  markdownFeatureProfile,
  markdownPlanContext,
  matchMarkdownOwners,
  mergeMarkdown,
  mergeMarkdownWithReviewedNestedOutputs,
  mergeMarkdownWithReviewedNestedOutputsFromReplayBundle,
  mergeMarkdownWithReviewedNestedOutputsFromReviewState,
  parseMarkdown
} from '../src/index';

function readFixture(...parts: string[]): Record<string, unknown> {
  return JSON.parse(
    readFileSync(resolve(__dirname, '..', '..', '..', '..', 'fixtures', ...parts), 'utf8')
  ) as Record<string, unknown>;
}

describe('markdown-it-merge shared fixtures', () => {
  it('conforms to the provider feature-profile fixture', () => {
    const familyFixture = readFixture(
      'diagnostics',
      'slice-194-markdown-family-feature-profile',
      'markdown-feature-profile.json'
    );
    const fixture = readFixture(
      'diagnostics',
      'slice-204-markdown-provider-feature-profiles',
      'typescript-markdown-provider-feature-profiles.json'
    );
    const familyProfile = familyFixture.feature_profile as Record<string, unknown>;
    expect(markdownFeatureProfile()).toEqual({
      family: familyProfile.family,
      supportedDialects: familyProfile.supported_dialects,
      supportedPolicies: familyProfile.supported_policies
    });
    expect(availableMarkdownBackends()).toEqual(['markdown-it']);
    const providerProfile = (
      (fixture.providers as Record<string, Record<string, Record<string, unknown>>>)[
        'markdown-it'
      ] as Record<string, Record<string, unknown>>
    ).feature_profile;
    expect(markdownBackendFeatureProfile()).toEqual({
      family: providerProfile.family,
      supportedDialects: providerProfile.supported_dialects,
      supportedPolicies: providerProfile.supported_policies,
      backend: providerProfile.backend,
      backendRef: (providerProfile.backendRef ??
        providerProfile.backend_ref) as Record<string, unknown> | undefined
    });
  });

  it('conforms to the provider plan-context fixture', () => {
    const fixture = readFixture(
      'diagnostics',
      'slice-205-markdown-provider-plan-contexts',
      'typescript-markdown-provider-plan-contexts.json'
    );
    const providerContext = (fixture.providers as Record<string, Record<string, unknown>>)[
      'markdown-it'
    ];
    expect(markdownPlanContext()).toEqual({
      familyProfile: {
        family: (providerContext.family_profile as Record<string, unknown>).family,
        supportedDialects: (providerContext.family_profile as Record<string, unknown>)
          .supported_dialects,
        supportedPolicies: (providerContext.family_profile as Record<string, unknown>)
          .supported_policies
      },
      featureProfile: {
        backend: (providerContext.feature_profile as Record<string, unknown>).backend,
        supportsDialects: (providerContext.feature_profile as Record<string, unknown>)
          .supports_dialects,
        supportedPolicies: (providerContext.feature_profile as Record<string, unknown>)
          .supported_policies
      }
    });
  });

  it('conforms to the shared Markdown analysis and matching fixtures', () => {
    const analysisFixture = readFixture(
      'markdown',
      'slice-198-analysis',
      'headings-and-code-fences.json'
    );
    const matchingFixture = readFixture('markdown', 'slice-199-matching', 'path-equality.json');

    const analysis = parseMarkdown(
      analysisFixture.source as string,
      analysisFixture.dialect as 'markdown'
    );
    expect(analysis.ok).toBe(true);
    expect(analysis.analysis?.rootKind).toBe('document');

    const template = parseMarkdown(
      matchingFixture.template as string,
      matchingFixture.dialect as 'markdown'
    );
    const destination = parseMarkdown(
      matchingFixture.destination as string,
      matchingFixture.dialect as 'markdown'
    );
    expect(template.ok).toBe(true);
    expect(destination.ok).toBe(true);

    const result = matchMarkdownOwners(template.analysis!, destination.analysis!);
    expect(result.matched.map((match) => [match.templatePath, match.destinationPath])).toEqual(
      (matchingFixture.expected as Record<string, unknown>).matched as string[][]
    );
    expect(result.unmatchedTemplate).toEqual(
      (matchingFixture.expected as Record<string, unknown>).unmatched_template as string[]
    );
    expect(result.unmatchedDestination).toEqual(
      (matchingFixture.expected as Record<string, unknown>).unmatched_destination as string[]
    );

    const mergeFixture = readFixture('markdown', 'slice-286-merge', 'section-merge.json');
    const mergeResult = mergeMarkdown(
      mergeFixture.template as string,
      mergeFixture.destination as string,
      'markdown'
    );
    expect(mergeResult.ok).toBe((mergeFixture.expected as Record<string, unknown>).ok as boolean);
    expect(mergeResult.output).toBe((mergeFixture.expected as Record<string, unknown>).output);
  });

  it('conforms to the slice-208 embedded-family fixture', () => {
    const fixture = readFixture(
      'markdown',
      'slice-208-embedded-families',
      'code-fence-families.json'
    );
    const analysis = parseMarkdown(fixture.source as string, 'markdown');
    expect(analysis.ok).toBe(true);
    expect(markdownEmbeddedFamilies(analysis.analysis!)).toEqual(fixture.expected);
  });

  it('conforms to the slice-298 reviewed nested merge fixture', () => {
    const fixture = readFixture(
      'markdown',
      'slice-298-reviewed-nested-merge',
      'fenced-code-reviewed-nested-merge.json'
    );

    const reviewState = {
      requests: ((fixture.review_state as Record<string, unknown>).requests as Array<Record<string, unknown>>).map(
        (request) => ({
          id: request.id as string,
          kind: request.kind as 'delegated_child_group',
          family: request.family as string,
          message: request.message as string,
          blocking: request.blocking as boolean,
          delegatedGroup: {
            delegatedApplyGroup: (request.delegated_group as Record<string, unknown>)
              .delegated_apply_group as string,
            parentOperationId: (request.delegated_group as Record<string, unknown>)
              .parent_operation_id as string,
            childOperationId: (request.delegated_group as Record<string, unknown>)
              .child_operation_id as string,
            delegatedRuntimeSurfacePath: (request.delegated_group as Record<string, unknown>)
              .delegated_runtime_surface_path as string,
            caseIds: (request.delegated_group as Record<string, unknown>).case_ids as string[],
            delegatedCaseIds: (request.delegated_group as Record<string, unknown>)
              .delegated_case_ids as string[]
          },
          actionOffers: (request.action_offers as Array<Record<string, unknown>>).map((offer) => ({
            action: offer.action as 'apply_delegated_child_group',
            requiresContext: offer.requires_context as boolean
          })),
          defaultAction: request.default_action as 'apply_delegated_child_group'
        })
      ),
      acceptedGroups: ((fixture.review_state as Record<string, unknown>).accepted_groups as Array<Record<string, unknown>>).map(
        (group) => ({
          delegatedApplyGroup: group.delegated_apply_group as string,
          parentOperationId: group.parent_operation_id as string,
          childOperationId: group.child_operation_id as string,
          delegatedRuntimeSurfacePath: group.delegated_runtime_surface_path as string,
          caseIds: group.case_ids as string[],
          delegatedCaseIds: group.delegated_case_ids as string[]
        })
      ),
      appliedDecisions: ((fixture.review_state as Record<string, unknown>).applied_decisions as Array<Record<string, unknown>>).map(
        (decision) => ({
          requestId: decision.request_id as string,
          action: decision.action as 'apply_delegated_child_group'
        })
      ),
      diagnostics: ((fixture.review_state as Record<string, unknown>).diagnostics ?? []) as []
    };

    const result = mergeMarkdownWithReviewedNestedOutputs(
      fixture.template as string,
      fixture.destination as string,
      'markdown',
      reviewState,
      (fixture.applied_children as Array<Record<string, unknown>>).map((entry) => ({
        operationId: entry.operation_id as string,
        output: entry.output as string
      }))
    );

    expect(result.ok).toBe((fixture.expected as Record<string, unknown>).ok as boolean);
    expect(result.output).toBe((fixture.expected as Record<string, unknown>).output);
  });

  it('conforms to the slice-309 reviewed nested review artifact application fixture', () => {
    const fixture = readFixture(
      'markdown',
      'slice-309-reviewed-nested-review-artifact-application',
      'fenced-code-reviewed-nested-review-artifact-application.json'
    );

    const replayBundle = {
      replayContext: {
        surface: ((fixture.replay_bundle as Record<string, unknown>).replay_context as Record<string, unknown>)
          .surface as 'conformance_manifest',
        families: ((fixture.replay_bundle as Record<string, unknown>).replay_context as Record<string, unknown>)
          .families as string[],
        requireExplicitContexts: ((fixture.replay_bundle as Record<string, unknown>).replay_context as Record<string, unknown>)
          .require_explicit_contexts as boolean
      },
      decisions: ((fixture.replay_bundle as Record<string, unknown>).decisions as Array<Record<string, unknown>>).map(
        (decision) => ({
          requestId: decision.request_id as string,
          action: decision.action as 'accept_default_context' | 'apply_delegated_child_group'
        })
      ),
      reviewedNestedExecutions: ((fixture.replay_bundle as Record<string, unknown>).reviewed_nested_executions as Array<Record<string, unknown>>).map(
        (execution) => ({
          family: execution.family as string,
          reviewState: {
            requests: ((execution.review_state as Record<string, unknown>).requests as Array<Record<string, unknown>>).map(
              (request) => ({
                id: request.id as string,
                kind: request.kind as 'delegated_child_group',
                family: request.family as string,
                message: request.message as string,
                blocking: request.blocking as boolean,
                delegatedGroup: {
                  delegatedApplyGroup: (request.delegated_group as Record<string, unknown>).delegated_apply_group as string,
                  parentOperationId: (request.delegated_group as Record<string, unknown>).parent_operation_id as string,
                  childOperationId: (request.delegated_group as Record<string, unknown>).child_operation_id as string,
                  delegatedRuntimeSurfacePath: (request.delegated_group as Record<string, unknown>).delegated_runtime_surface_path as string,
                  caseIds: (request.delegated_group as Record<string, unknown>).case_ids as string[],
                  delegatedCaseIds: (request.delegated_group as Record<string, unknown>).delegated_case_ids as string[]
                },
                actionOffers: (request.action_offers as Array<Record<string, unknown>>).map((offer) => ({
                  action: offer.action as 'apply_delegated_child_group',
                  requiresContext: offer.requires_context as boolean
                })),
                defaultAction: request.default_action as 'apply_delegated_child_group'
              })
            ),
            acceptedGroups: ((execution.review_state as Record<string, unknown>).accepted_groups as Array<Record<string, unknown>>).map(
              (group) => ({
                delegatedApplyGroup: group.delegated_apply_group as string,
                parentOperationId: group.parent_operation_id as string,
                childOperationId: group.child_operation_id as string,
                delegatedRuntimeSurfacePath: group.delegated_runtime_surface_path as string,
                caseIds: group.case_ids as string[],
                delegatedCaseIds: group.delegated_case_ids as string[]
              })
            ),
            appliedDecisions: ((execution.review_state as Record<string, unknown>).applied_decisions as Array<Record<string, unknown>>).map(
              (decision) => ({
                requestId: decision.request_id as string,
                action: decision.action as 'apply_delegated_child_group'
              })
            ),
            diagnostics: ((execution.review_state as Record<string, unknown>).diagnostics ?? []) as []
          },
          appliedChildren: (execution.applied_children as Array<Record<string, unknown>>).map((entry) => ({
            operationId: entry.operation_id as string,
            output: entry.output as string
          }))
        })
      )
    };

    const reviewState = {
      report: (fixture.review_state as Record<string, unknown>).report as { entries: []; summary: { total: 0; passed: 0; failed: 0; skipped: 0 } },
      diagnostics: ((fixture.review_state as Record<string, unknown>).diagnostics ?? []) as [],
      requests: ((fixture.review_state as Record<string, unknown>).requests ?? []) as [],
      appliedDecisions: ((fixture.review_state as Record<string, unknown>).applied_decisions ?? []) as [],
      hostHints: {
        interactive: ((fixture.review_state as Record<string, unknown>).host_hints as Record<string, unknown>).interactive as boolean,
        requireExplicitContexts: ((fixture.review_state as Record<string, unknown>).host_hints as Record<string, unknown>).require_explicit_contexts as boolean
      },
      replayContext: {
        surface: ((fixture.review_state as Record<string, unknown>).replay_context as Record<string, unknown>).surface as 'conformance_manifest',
        families: ((fixture.review_state as Record<string, unknown>).replay_context as Record<string, unknown>).families as string[],
        requireExplicitContexts: ((fixture.review_state as Record<string, unknown>).replay_context as Record<string, unknown>).require_explicit_contexts as boolean
      },
      reviewedNestedExecutions: replayBundle.reviewedNestedExecutions
    };

    const replayResult = mergeMarkdownWithReviewedNestedOutputsFromReplayBundle(
      fixture.template as string,
      fixture.destination as string,
      'markdown',
      replayBundle
    );
    expect(replayResult.ok).toBe((fixture.expected as Record<string, unknown>).ok as boolean);
    expect(replayResult.output).toBe((fixture.expected as Record<string, unknown>).output);

    const stateResult = mergeMarkdownWithReviewedNestedOutputsFromReviewState(
      fixture.template as string,
      fixture.destination as string,
      'markdown',
      reviewState
    );
    expect(stateResult.ok).toBe((fixture.expected as Record<string, unknown>).ok as boolean);
    expect(stateResult.output).toBe((fixture.expected as Record<string, unknown>).output);
  });

  it('conforms to the slice-311 reviewed nested review artifact rejection fixture', () => {
    const fixture = readFixture(
      'markdown',
      'slice-311-reviewed-nested-review-artifact-rejection',
      'fenced-code-reviewed-nested-review-artifact-rejection.json'
    );

    expect(
      mergeMarkdownWithReviewedNestedOutputsFromReplayBundle(
        fixture.template as string,
        fixture.destination as string,
        'markdown',
        fixture.replay_bundle as never
      )
    ).toEqual({
      ok: (fixture.expected as Record<string, unknown>).ok,
      diagnostics: (fixture.expected as Record<string, unknown>).diagnostics,
      policies: []
    });

    expect(
      mergeMarkdownWithReviewedNestedOutputsFromReviewState(
        fixture.template as string,
        fixture.destination as string,
        'markdown',
        fixture.review_state as never
      )
    ).toEqual({
      ok: (fixture.expected_review_state as Record<string, unknown>).ok,
      diagnostics: (fixture.expected_review_state as Record<string, unknown>).diagnostics,
      policies: []
    });
  });

  it('conforms to the provider named-suite plan fixture', () => {
    const fixture = readFixture(
      'diagnostics',
      'slice-206-markdown-provider-named-suite-plans',
      'typescript-markdown-provider-named-suite-plans.json'
    );

    const actual = planNamedConformanceSuites(fixture.manifest as ConformanceManifest, {
      markdown: markdownPlanContext()
    }).map((entry) => ({
      suite: entry.suite,
      plan: {
        family: entry.plan.family,
        entries: entry.plan.entries.map((planEntry) => ({
          ref: planEntry.ref,
          path: [...planEntry.path],
          run: {
            ref: planEntry.run.ref,
            requirements: planEntry.run.requirements,
            family_profile: {
              family: planEntry.run.familyProfile.family,
              supported_dialects: [...planEntry.run.familyProfile.supportedDialects],
              supported_policies: [...(planEntry.run.familyProfile.supportedPolicies ?? [])]
            },
            feature_profile: {
              backend: planEntry.run.featureProfile?.backend,
              supports_dialects: planEntry.run.featureProfile?.supportsDialects,
              supported_policies: [...(planEntry.run.featureProfile?.supportedPolicies ?? [])]
            }
          }
        })),
        missing_roles: [...entry.plan.missingRoles]
      }
    }));

    expect(actual).toEqual(fixture.expected_entries);
  });

  it('conforms to the provider manifest-report fixture', () => {
    const fixture = readFixture(
      'diagnostics',
      'slice-207-markdown-provider-manifest-report',
      'typescript-markdown-provider-manifest-report.json'
    );

    const entries = reportPlannedNamedConformanceSuites(
      planNamedConformanceSuites(fixture.manifest as ConformanceManifest, {
        markdown: markdownPlanContext()
      }),
      (run) => {
        const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
        return (
          (fixture.executions as Record<string, ConformanceCaseExecution>)[key] ?? {
            outcome: 'failed',
            messages: ['missing execution']
          }
        );
      }
    );

    expect(reportNamedConformanceSuiteEnvelope(entries)).toEqual(fixture.expected_report);
  });
});
