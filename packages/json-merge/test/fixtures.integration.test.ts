import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { mergeJson, parseJson } from '../src/index';

interface JsoncParseFixture {
  name: string;
  dialect: 'json' | 'jsonc';
  source: string;
  expected: {
    ok: boolean;
    allows_comments: boolean;
    diagnostics: Array<{
      severity: 'info' | 'warning' | 'error';
      category:
        | 'parse_error'
        | 'destination_parse_error'
        | 'unsupported_feature'
        | 'fallback_applied'
        | 'ambiguity';
      message?: string;
    }>;
  };
}

interface JsonMergeFixture {
  name: string;
  template: string;
  destination: string;
  expected: {
    output: string;
  };
}

function readFixture<T>(...segments: string[]): T {
  const fixturePath = path.resolve(process.cwd(), '..', 'fixtures', ...segments);

  return JSON.parse(readFileSync(fixturePath, 'utf8')) as T;
}

describe('json-merge shared fixtures', () => {
  it('conforms to the jsonc comments-accepted fixture', () => {
    const fixture = readFixture<JsoncParseFixture>(
      'jsonc',
      'slice-04-parse',
      'comments-accepted.json'
    );

    const result = parseJson(fixture.source, fixture.dialect);

    expect(result.ok).toBe(fixture.expected.ok);
    expect(result.analysis?.allowsComments).toBe(fixture.expected.allows_comments);
    expect(result.diagnostics).toEqual(fixture.expected.diagnostics);
  });

  it('conforms to the slice-09 object merge fixture', () => {
    const fixture = readFixture<JsonMergeFixture>('json', 'slice-09-merge', 'object-merge.json');

    const result = mergeJson(fixture.template, fixture.destination, 'json');

    expect(result.ok).toBe(true);
    expect(result.output).toBe(fixture.expected.output);
  });
});
