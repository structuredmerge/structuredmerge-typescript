import { describe, expect, it } from 'vitest';
import {
  executeNestedMerge,
  type DelegatedChildOperation,
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
});
