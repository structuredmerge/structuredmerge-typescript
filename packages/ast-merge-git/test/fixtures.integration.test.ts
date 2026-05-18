import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { merge3, mergeCommentDelta, type Merge3Request } from '../src/index';

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
      readonly render_report?: {
        readonly strategy: string;
        readonly backend_id?: string;
        readonly parser_identity?: string;
      };
      readonly formatting_preservation?: {
        readonly line_diff_score: number;
        readonly character_diff_score: number;
      };
      readonly secondary_formatting_metrics?: {
        readonly unchanged_line_churn: number;
        readonly output_diff_size: number;
        readonly source_fragment_retention: number;
        readonly weighted: boolean;
        readonly diagnostics: readonly string[];
      };
      readonly reparse_after_render: boolean | null;
    };
  }[];
}

function readFixture(...parts: readonly string[]): Fixture {
  const source = readFileSync(path.join('..', 'fixtures', ...parts), 'utf8');
  return JSON.parse(source) as Fixture;
}

interface CommentDeltaFixture {
  readonly contract: {
    readonly package: string;
    readonly operation: string;
  };
  readonly owner: {
    readonly path: string;
  };
  readonly cases: readonly {
    readonly case_id: string;
    readonly base_comment: string | null;
    readonly ours_comment: string | null;
    readonly theirs_comment: string | null;
    readonly expected: {
      readonly ok: boolean;
      readonly merged_comment?: string | null;
      readonly conflict_count: number;
      readonly conflict_categories?: readonly string[];
      readonly comment_owner_path?: string;
    };
  }[];
}

function readCommentDeltaFixture(...parts: readonly string[]): CommentDeltaFixture {
  const source = readFileSync(path.join('..', 'fixtures', ...parts), 'utf8');
  return JSON.parse(source) as CommentDeltaFixture;
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
      if (testCase.expected.render_report !== undefined) {
        expect(result.render_report, testCase.case_id).toEqual(testCase.expected.render_report);
      }
      if (testCase.expected.formatting_preservation !== undefined) {
        expect(result.formatting_preservation, testCase.case_id).toEqual(
          testCase.expected.formatting_preservation
        );
      }
      if (testCase.expected.secondary_formatting_metrics !== undefined) {
        expect(result.secondary_formatting_metrics, testCase.case_id).toEqual(
          testCase.expected.secondary_formatting_metrics
        );
      }
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

  it('conforms to the git comment delta semantics fixture', () => {
    const fixture = readCommentDeltaFixture(
      'diagnostics',
      'slice-953-git-comment-delta-semantics',
      'git-comment-delta-semantics.json'
    );
    expect(fixture.contract.package).toBe('ast-merge-git');
    expect(fixture.contract.operation).toBe('comment_delta_semantics');

    for (const testCase of fixture.cases) {
      const result = mergeCommentDelta(
        testCase.base_comment,
        testCase.ours_comment,
        testCase.theirs_comment,
        fixture.owner.path
      );
      expect(result.ok, testCase.case_id).toBe(testCase.expected.ok);
      expect(result.conflicts, testCase.case_id).toHaveLength(testCase.expected.conflict_count);
      if ('merged_comment' in testCase.expected) {
        expect(result.merged_comment, testCase.case_id).toBe(testCase.expected.merged_comment);
      }
      if (testCase.expected.conflict_categories !== undefined) {
        expect(
          result.conflicts.map((conflict) => conflict.category),
          testCase.case_id
        ).toEqual(testCase.expected.conflict_categories);
      }
      if (testCase.expected.comment_owner_path !== undefined) {
        expect(fixture.owner.path, testCase.case_id).toBe(testCase.expected.comment_owner_path);
      }
    }
  });
});
