import { describe, expect, it } from 'vitest';
import {
  executeDelegatedChildApplyPlan,
  executeNestedMerge,
  executeReviewReplayBundleReviewedNestedExecutions,
  executeReviewStateReviewedNestedExecutions,
  executeReviewedNestedExecution,
  executeReviewedNestedExecutions,
  executeReviewedNestedMerge,
  reviewedNestedExecution,
  type DelegatedChildOperation,
  type DelegatedChildGroupReviewState,
  type DelegatedChildSurfaceOutput,
  type Diagnostic,
  type MergeResult
} from '../src/index';

function operation(address: string, family?: string): DelegatedChildOperation {
  return {
    operationId: `operation:${address}`,
    parentOperationId: 'parent:merge',
    requestedStrategy: 'delegate_child_surface',
    languageChain: ['markdown', 'typescript'],
    surface: {
      surfaceKind: 'fenced_code_block',
      effectiveLanguage: 'typescript',
      address,
      owner: {
        kind: 'owned_region',
        address: '/code_fence/0'
      },
      reconstructionStrategy: 'portable_write',
      ...(family ? { metadata: { family } } : {})
    }
  };
}

describe('executeNestedMerge', () => {
  it('orchestrates parent merge, discovery, resolution, and apply', () => {
    const nestedOutputs: readonly DelegatedChildSurfaceOutput[] = [
      {
        surfaceAddress: 'document[0] > fenced_code_block[/code_fence/0]',
        output: 'export const feature = true;\n'
      }
    ];
    const calls: string[] = [];

    const result = executeNestedMerge<string>(
      nestedOutputs,
      {
        defaultFamily: 'markdown',
        requestIdPrefix: 'nested_markdown_child'
      },
      {
        mergeParent: () => {
          calls.push('merge');
          return { ok: true, diagnostics: [], output: 'merged-parent', policies: [] };
        },
        discoverOperations: (mergedOutput) => {
          calls.push(`discover:${mergedOutput}`);
          return {
            ok: true,
            diagnostics: [],
            operations: [operation(nestedOutputs[0]!.surfaceAddress, 'typescript')]
          };
        },
        applyResolvedOutputs: (mergedOutput, operations, applyPlan, appliedChildren) => {
          calls.push(`apply:${mergedOutput}`);
          expect(operations).toEqual([operation(nestedOutputs[0]!.surfaceAddress, 'typescript')]);
          expect(applyPlan).toEqual({
            entries: [
              {
                requestId: 'nested_markdown_child:0',
                family: 'typescript',
                delegatedGroup: {
                  delegatedApplyGroup: 'nested_markdown_child:0',
                  parentOperationId: 'parent:merge',
                  childOperationId: `operation:${nestedOutputs[0]!.surfaceAddress}`,
                  delegatedRuntimeSurfacePath: nestedOutputs[0]!.surfaceAddress,
                  caseIds: [],
                  delegatedCaseIds: []
                },
                decision: {
                  requestId: 'nested_markdown_child:0',
                  action: 'apply_delegated_child_group'
                }
              }
            ]
          });
          expect(appliedChildren).toEqual([
            {
              operationId: `operation:${nestedOutputs[0]!.surfaceAddress}`,
              output: nestedOutputs[0]!.output
            }
          ]);
          return { ok: true, diagnostics: [], output: 'final-parent', policies: [] };
        }
      }
    );

    expect(result).toEqual<MergeResult<string>>({
      ok: true,
      diagnostics: [],
      output: 'final-parent',
      policies: []
    });
    expect(calls).toEqual(['merge', 'discover:merged-parent', 'apply:merged-parent']);
  });

  it('returns parent merge failure unchanged and skips later stages', () => {
    const failure: MergeResult<string> = {
      ok: false,
      diagnostics: [{ severity: 'error', category: 'parse_error', message: 'parent failed' }],
      policies: []
    };
    let called = false;

    const result = executeNestedMerge<string>(
      [],
      { defaultFamily: 'markdown', requestIdPrefix: 'nested' },
      {
        mergeParent: () => failure,
        discoverOperations: () => {
          called = true;
          return { ok: true, diagnostics: [], operations: [] };
        },
        applyResolvedOutputs: () => {
          called = true;
          return { ok: true, diagnostics: [], output: 'unused', policies: [] };
        }
      }
    );

    expect(result).toEqual(failure);
    expect(called).toBe(false);
  });

  it('returns discovery failure unchanged and skips apply', () => {
    const diagnostics: readonly Diagnostic[] = [
      { severity: 'error', category: 'configuration_error', message: 'discovery failed' }
    ];
    let applied = false;

    const result = executeNestedMerge<string>(
      [],
      { defaultFamily: 'markdown', requestIdPrefix: 'nested' },
      {
        mergeParent: () => ({ ok: true, diagnostics: [], output: 'merged-parent', policies: [] }),
        discoverOperations: () => ({ ok: false, diagnostics }),
        applyResolvedOutputs: () => {
          applied = true;
          return { ok: true, diagnostics: [], output: 'unused', policies: [] };
        }
      }
    );

    expect(result).toEqual<MergeResult<string>>({
      ok: false,
      diagnostics: [...diagnostics],
      policies: []
    });
    expect(applied).toBe(false);
  });

  it('executes delegated child apply plan through merge, discovery, and apply', () => {
    const address = 'document[0] > fenced_code_block[/code_fence/0]';
    const result = executeDelegatedChildApplyPlan<string>(
      {
        entries: [
          {
            requestId: 'projected_child_group:markdown:fence:typescript',
            family: 'markdown',
            delegatedGroup: {
              delegatedApplyGroup: 'markdown:fence:typescript',
              parentOperationId: 'parent:merge',
              childOperationId: `operation:${address}`,
              delegatedRuntimeSurfacePath: address,
              caseIds: [],
              delegatedCaseIds: []
            },
            decision: {
              requestId: 'projected_child_group:markdown:fence:typescript',
              action: 'apply_delegated_child_group'
            }
          }
        ]
      },
      [{ operationId: `operation:${address}`, output: 'child-output\n' }],
      {
        mergeParent: () => ({ ok: true, diagnostics: [], output: 'merged-parent', policies: [] }),
        discoverOperations: () => ({ ok: true, diagnostics: [], operations: [operation(address)] }),
        applyResolvedOutputs: (_mergedOutput, _operations, applyPlan, appliedChildren) => {
          expect(applyPlan.entries).toHaveLength(1);
          expect(appliedChildren).toEqual([
            { operationId: `operation:${address}`, output: 'child-output\n' }
          ]);
          return { ok: true, diagnostics: [], output: 'final-parent', policies: [] };
        }
      }
    );

    expect(result.output).toBe('final-parent');
  });

  it('executes reviewed nested merge from accepted review state', () => {
    const address = 'document[0] > fenced_code_block[/code_fence/0]';
    const reviewState: DelegatedChildGroupReviewState = {
      requests: [],
      acceptedGroups: [
        {
          delegatedApplyGroup: 'markdown:fence:typescript',
          parentOperationId: 'parent:merge',
          childOperationId: `operation:${address}`,
          delegatedRuntimeSurfacePath: address,
          caseIds: [],
          delegatedCaseIds: []
        }
      ],
      appliedDecisions: [
        {
          requestId: 'projected_child_group:markdown:fence:typescript',
          action: 'apply_delegated_child_group'
        }
      ],
      diagnostics: []
    };

    const result = executeReviewedNestedMerge<string>(
      reviewState,
      'markdown',
      [{ operationId: `operation:${address}`, output: 'child-output\n' }],
      {
        mergeParent: () => ({ ok: true, diagnostics: [], output: 'merged-parent', policies: [] }),
        discoverOperations: () => ({ ok: true, diagnostics: [], operations: [operation(address)] }),
        applyResolvedOutputs: (_mergedOutput, _operations, applyPlan) => {
          expect(applyPlan.entries[0]?.requestId).toBe(
            'projected_child_group:markdown:fence:typescript'
          );
          return { ok: true, diagnostics: [], output: 'final-parent', policies: [] };
        }
      }
    );

    expect(result.output).toBe('final-parent');
  });

  it('executes reviewed nested execution payload directly', () => {
    const address = 'document[0] > fenced_code_block[/code_fence/0]';
    const execution = reviewedNestedExecution(
      'markdown',
      {
        requests: [],
        acceptedGroups: [
          {
            delegatedApplyGroup: 'markdown:fence:typescript',
            parentOperationId: 'parent:merge',
            childOperationId: `operation:${address}`,
            delegatedRuntimeSurfacePath: address,
            caseIds: [],
            delegatedCaseIds: []
          }
        ],
        appliedDecisions: [
          {
            requestId: 'projected_child_group:markdown:fence:typescript',
            action: 'apply_delegated_child_group'
          }
        ],
        diagnostics: []
      },
      [{ operationId: `operation:${address}`, output: 'child-output\n' }]
    );

    const result = executeReviewedNestedExecution<string>(execution, {
      mergeParent: () => ({ ok: true, diagnostics: [], output: 'merged-parent', policies: [] }),
      discoverOperations: () => ({ ok: true, diagnostics: [], operations: [operation(address)] }),
      applyResolvedOutputs: (_mergedOutput, _operations, applyPlan, appliedChildren) => {
        expect(applyPlan.entries[0]?.requestId).toBe(
          'projected_child_group:markdown:fence:typescript'
        );
        expect(appliedChildren).toEqual([
          { operationId: `operation:${address}`, output: 'child-output\n' }
        ]);
        return { ok: true, diagnostics: [], output: 'final-parent', policies: [] };
      }
    });

    expect(result.output).toBe('final-parent');
  });

  it('executes reviewed nested executions in order', () => {
    const markdownAddress = 'document[0] > fenced_code_block[/code_fence/0]';
    const rubyAddress = 'document[0] > ruby_doc_comment[Greeter] > yard_example[1]';
    const executions = [
      reviewedNestedExecution(
        'markdown',
        {
          requests: [],
          acceptedGroups: [
            {
              delegatedApplyGroup: 'nested_markdown_child:0',
              parentOperationId: 'markdown-document-0',
              childOperationId: 'markdown-fence-0',
              delegatedRuntimeSurfacePath: markdownAddress,
              caseIds: [],
              delegatedCaseIds: []
            }
          ],
          appliedDecisions: [
            {
              requestId: 'projected_child_group:nested_markdown_child:0',
              action: 'apply_delegated_child_group'
            }
          ],
          diagnostics: []
        },
        [{ operationId: 'markdown-fence-0', output: 'child-output\n' }]
      ),
      reviewedNestedExecution(
        'ruby',
        {
          requests: [],
          acceptedGroups: [
            {
              delegatedApplyGroup: 'nested_ruby_child:0',
              parentOperationId: 'ruby-doc-comment-0',
              childOperationId: 'yard-example-0',
              delegatedRuntimeSurfacePath: rubyAddress,
              caseIds: [],
              delegatedCaseIds: []
            }
          ],
          appliedDecisions: [
            {
              requestId: 'projected_child_group:nested_ruby_child:0',
              action: 'apply_delegated_child_group'
            }
          ],
          diagnostics: []
        },
        [{ operationId: 'yard-example-0', output: 'Greeter.new.wave\n' }]
      )
    ] as const;

    const runs = executeReviewedNestedExecutions(executions, (execution) => ({
      mergeParent: () => ({
        ok: true,
        diagnostics: [],
        output: `${execution.family}-merged`,
        policies: []
      }),
      discoverOperations: () => ({
        ok: true,
        diagnostics: [],
        operations: [
          execution.family === 'markdown'
            ? operation(markdownAddress)
            : {
                operationId: 'yard-example-0',
                parentOperationId: 'ruby-doc-comment-0',
                requestedStrategy: 'delegate_child_surface',
                languageChain: ['ruby', 'ruby'],
                surface: {
                  surfaceKind: 'yard_example',
                  effectiveLanguage: 'ruby',
                  address: rubyAddress,
                  owner: { kind: 'owned_region', address: '/yard_example/1' },
                  reconstructionStrategy: 'portable_write',
                  metadata: { family: 'ruby' }
                }
              }
        ]
      }),
      applyResolvedOutputs: (_mergedOutput, _operations, _applyPlan, appliedChildren) => {
        expect(appliedChildren).toEqual(execution.appliedChildren);
        return {
          ok: true,
          diagnostics: [],
          output: `${execution.family}-final`,
          policies: []
        };
      }
    }));

    expect(runs.map((run) => run.execution.family)).toEqual(['markdown', 'ruby']);
    expect(runs.map((run) => run.result.output)).toEqual(['markdown-final', 'ruby-final']);
  });

  it('executes reviewed nested executions from replay bundle', () => {
    const execution = reviewedNestedExecution(
      'markdown',
      {
        requests: [],
        acceptedGroups: [
          {
            delegatedApplyGroup: 'nested_markdown_child:0',
            parentOperationId: 'markdown-document-0',
            childOperationId: 'markdown-fence-0',
            delegatedRuntimeSurfacePath: 'document[0] > fenced_code_block[/code_fence/0]',
            caseIds: [],
            delegatedCaseIds: []
          }
        ],
        appliedDecisions: [
          {
            requestId: 'projected_child_group:nested_markdown_child:0',
            action: 'apply_delegated_child_group'
          }
        ],
        diagnostics: []
      },
      [{ operationId: 'markdown-fence-0', output: 'child-output\n' }]
    );

    const runs = executeReviewReplayBundleReviewedNestedExecutions(
      {
        replayContext: {
          surface: 'conformance_manifest',
          families: ['text'],
          requireExplicitContexts: true
        },
        decisions: [{ requestId: 'family_context:text', action: 'accept_default_context' }],
        reviewedNestedExecutions: [execution]
      },
      () => ({
        mergeParent: () => ({ ok: true, diagnostics: [], output: 'merged-parent', policies: [] }),
        discoverOperations: () => ({
          ok: true,
          diagnostics: [],
          operations: [operation('document[0] > fenced_code_block[/code_fence/0]')]
        }),
        applyResolvedOutputs: () => ({
          ok: true,
          diagnostics: [],
          output: 'final-parent',
          policies: []
        })
      })
    );

    expect(runs).toHaveLength(1);
    expect(runs[0]?.execution.family).toBe('markdown');
    expect(runs[0]?.result.output).toBe('final-parent');
  });

  it('executes reviewed nested executions from review state', () => {
    const execution = reviewedNestedExecution(
      'markdown',
      {
        requests: [],
        acceptedGroups: [
          {
            delegatedApplyGroup: 'nested_markdown_child:0',
            parentOperationId: 'markdown-document-0',
            childOperationId: 'markdown-fence-0',
            delegatedRuntimeSurfacePath: 'document[0] > fenced_code_block[/code_fence/0]',
            caseIds: [],
            delegatedCaseIds: []
          }
        ],
        appliedDecisions: [
          {
            requestId: 'projected_child_group:nested_markdown_child:0',
            action: 'apply_delegated_child_group'
          }
        ],
        diagnostics: []
      },
      [{ operationId: 'markdown-fence-0', output: 'child-output\n' }]
    );

    const runs = executeReviewStateReviewedNestedExecutions(
      {
        report: { entries: [], summary: { total: 0, passed: 0, failed: 0, skipped: 0 } },
        diagnostics: [],
        requests: [],
        appliedDecisions: [],
        hostHints: { interactive: false, requireExplicitContexts: false },
        replayContext: {
          surface: 'conformance_manifest',
          families: [],
          requireExplicitContexts: false
        },
        reviewedNestedExecutions: [execution]
      },
      () => ({
        mergeParent: () => ({ ok: true, diagnostics: [], output: 'merged-parent', policies: [] }),
        discoverOperations: () => ({
          ok: true,
          diagnostics: [],
          operations: [operation('document[0] > fenced_code_block[/code_fence/0]')]
        }),
        applyResolvedOutputs: () => ({
          ok: true,
          diagnostics: [],
          output: 'final-parent',
          policies: []
        })
      })
    );

    expect(runs).toHaveLength(1);
    expect(runs[0]?.execution.family).toBe('markdown');
    expect(runs[0]?.result.output).toBe('final-parent');
  });
});
