import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { matchJsonOwners, mergeJson, parseJson } from '../src/index';

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

interface JsonStructureFixture {
  name: string;
  dialect: 'json' | 'jsonc';
  source: string;
  expected: {
    root_kind: 'object' | 'array' | 'scalar';
    owners: Array<{
      path: string;
      owner_kind: 'member' | 'element';
      match_key?: string;
    }>;
  };
}

interface JsonMatchFixture {
  name: string;
  template: string;
  destination: string;
  expected: {
    matched: Array<[string, string]>;
    unmatched_template: string[];
    unmatched_destination: string[];
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

  it('conforms to the slice-07 structure fixtures', () => {
    const objectFixture = readFixture<JsonStructureFixture>(
      'json',
      'slice-07-structure',
      'object-and-array.json'
    );
    const objectResult = parseJson(objectFixture.source, objectFixture.dialect);

    expect(objectResult.ok).toBe(true);
    expect(objectResult.analysis?.rootKind).toBe(objectFixture.expected.root_kind);
    expect(
      objectResult.analysis?.owners.map((owner) => ({
        path: owner.path,
        owner_kind: owner.ownerKind,
        ...(owner.matchKey ? { match_key: owner.matchKey } : {})
      }))
    ).toEqual(objectFixture.expected.owners);

    const jsoncFixture = readFixture<JsonStructureFixture>(
      'jsonc',
      'slice-07-structure',
      'commented-object.json'
    );
    const jsoncResult = parseJson(jsoncFixture.source, jsoncFixture.dialect);

    expect(jsoncResult.ok).toBe(true);
    expect(jsoncResult.analysis?.rootKind).toBe(jsoncFixture.expected.root_kind);
    expect(
      jsoncResult.analysis?.owners.map((owner) => ({
        path: owner.path,
        owner_kind: owner.ownerKind,
        ...(owner.matchKey ? { match_key: owner.matchKey } : {})
      }))
    ).toEqual(jsoncFixture.expected.owners);
  });

  it('conforms to the slice-08 owner matching fixture', () => {
    const fixture = readFixture<JsonMatchFixture>(
      'json',
      'slice-08-matching',
      'path-equality.json'
    );
    const template = parseJson(fixture.template, 'json');
    const destination = parseJson(fixture.destination, 'json');

    expect(template.ok).toBe(true);
    expect(destination.ok).toBe(true);

    const result = matchJsonOwners(template.analysis!, destination.analysis!);

    expect(
      result.matched.map(({ templatePath, destinationPath }) => [templatePath, destinationPath])
    ).toEqual(fixture.expected.matched);
    expect(result.unmatchedTemplate).toEqual(fixture.expected.unmatched_template);
    expect(result.unmatchedDestination).toEqual(fixture.expected.unmatched_destination);
  });

  it('conforms to the slice-09 object merge fixture', () => {
    const fixture = readFixture<JsonMergeFixture>('json', 'slice-09-merge', 'object-merge.json');

    const result = mergeJson(fixture.template, fixture.destination, 'json');

    expect(result.ok).toBe(true);
    expect(result.output).toBe(fixture.expected.output);
  });
});
