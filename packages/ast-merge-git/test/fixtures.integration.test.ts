import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { merge3, type Merge3Request } from '../src/index';

interface Fixture {
  readonly contract: {
    readonly package: string;
    readonly operation: string;
  };
  readonly cases: readonly {
    readonly case_id: string;
    readonly request: Merge3Request;
    readonly expected: {
      readonly ok: boolean;
      readonly merged_json: unknown | null;
      readonly conflict_count: number;
      readonly conflict_categories?: readonly string[];
      readonly conflict_paths?: readonly string[];
      readonly conflicted_source_contains?: readonly string[];
      readonly reparse_after_render: boolean | null;
    };
  }[];
}

function readFixture(...parts: readonly string[]): Fixture {
  const source = readFileSync(path.join('..', 'fixtures', ...parts), 'utf8');
  return JSON.parse(source) as Fixture;
}

describe('@structuredmerge/ast-merge-git', () => {
  it('conforms to the git merge3 contract fixture', () => {
    const fixture = readFixture(
      'diagnostics',
      'slice-950-git-merge3-contract',
      'git-merge3-contract.json'
    );
    expect(fixture.contract.package).toBe('ast-merge-git');
    expect(fixture.contract.operation).toBe('merge3');

    for (const testCase of fixture.cases) {
      const result = merge3(testCase.request);
      expect(result.ok, testCase.case_id).toBe(testCase.expected.ok);
      expect(result.conflicts, testCase.case_id).toHaveLength(testCase.expected.conflict_count);
      expect(result.reparse_after_render, testCase.case_id).toBe(
        testCase.expected.reparse_after_render
      );
      if (result.ok) {
        expect(JSON.parse(result.merged_source ?? ''), testCase.case_id).toEqual(
          testCase.expected.merged_json
        );
      } else {
        expect(
          result.conflicts.map((conflict) => conflict.category),
          testCase.case_id
        ).toEqual(testCase.expected.conflict_categories);
        expect(
          result.conflicts.map((conflict) => conflict.path),
          testCase.case_id
        ).toEqual(testCase.expected.conflict_paths);
        for (const needle of testCase.expected.conflicted_source_contains ?? []) {
          expect(result.conflicted_source, testCase.case_id).toContain(needle);
        }
      }
    }
  });
});
