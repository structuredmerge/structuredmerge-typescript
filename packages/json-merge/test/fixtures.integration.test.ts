import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  conformanceFamilyFeatureProfilePath,
  conformanceFixturePath,
  selectConformanceCase,
  type ConformanceManifest
} from '@structuredmerge/ast-merge';
import { languagePackAdapterInfo } from '@structuredmerge/tree-haver';
import {
  jsonFeatureProfile,
  matchJsonOwners,
  mergeJson,
  parseJson,
  parseJsonWithLanguagePack
} from '../src/index';

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
    ok?: boolean;
    output?: string;
    diagnostics?: Array<{
      severity: 'info' | 'warning' | 'error';
      category:
        | 'parse_error'
        | 'destination_parse_error'
        | 'unsupported_feature'
        | 'fallback_applied'
        | 'ambiguity';
    }>;
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

interface JsonFeatureProfileFixture {
  feature_profile: {
    family: 'json';
    supported_dialects: Array<'json' | 'jsonc'>;
    supported_policies: Array<{
      surface: 'fallback' | 'array';
      name: string;
    }>;
  };
}

interface TreeSitterAdapterFixture {
  name: string;
  cases: Array<{
    name: string;
    dialect: 'json' | 'jsonc';
    source: string;
    expected: {
      ok: boolean;
      root_kind?: 'object' | 'array' | 'scalar';
      owners?: Array<{
        path: string;
        owner_kind: 'member' | 'element';
        match_key?: string;
      }>;
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
  }>;
}

function readFixture<T>(...segments: string[]): T {
  const fixturePath = path.resolve(process.cwd(), '..', 'fixtures', ...segments);

  return JSON.parse(readFileSync(fixturePath, 'utf8')) as T;
}

function familyFeatureProfileFixturePath(family: string): string[] {
  const manifest = readFixture<ConformanceManifest>(
    'conformance',
    'slice-24-manifest',
    'family-feature-profiles.json'
  );
  const entry = conformanceFamilyFeatureProfilePath(manifest, family);

  if (!entry) {
    throw new Error(`missing family feature profile entry for ${family}`);
  }

  return [...entry];
}

function jsonFixturePath(role: string): string[] {
  const manifest = readFixture<ConformanceManifest>(
    'conformance',
    'slice-24-manifest',
    'family-feature-profiles.json'
  );
  const entry = conformanceFixturePath(manifest, 'json', role);

  if (!entry) {
    throw new Error(`missing json fixture entry for ${role}`);
  }

  return [...entry];
}

describe('json-merge shared fixtures', () => {
  it('conforms to the jsonc comments-accepted fixture', () => {
    const fixture = readFixture<JsoncParseFixture>(...jsonFixturePath('parse_comments'));

    const result = parseJson(fixture.source, fixture.dialect);

    expect(result.ok).toBe(fixture.expected.ok);
    expect(result.analysis?.allowsComments).toBe(fixture.expected.allows_comments);
    expect(result.diagnostics).toEqual(fixture.expected.diagnostics);
  });

  it('conforms to the slice-07 structure fixtures', () => {
    const objectFixture = readFixture<JsonStructureFixture>(...jsonFixturePath('structure_json'));
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

    const jsoncFixture = readFixture<JsonStructureFixture>(...jsonFixturePath('structure_jsonc'));
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
    const fixture = readFixture<JsonMatchFixture>(...jsonFixturePath('matching'));
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
    const fixture = readFixture<JsonMergeFixture>(...jsonFixturePath('merge_object'));

    const result = mergeJson(fixture.template, fixture.destination, 'json');

    expect(result.ok).toBe(true);
    expect(result.output).toBe(fixture.expected.output);
  });

  it('conforms to the slice-09 invalid merge fixtures', () => {
    const invalidTemplateFixture = readFixture<JsonMergeFixture>(
      ...jsonFixturePath('merge_invalid_template')
    );
    const invalidTemplateResult = mergeJson(
      invalidTemplateFixture.template,
      invalidTemplateFixture.destination,
      'json'
    );

    expect(invalidTemplateResult.ok).toBe(invalidTemplateFixture.expected.ok);
    expect(invalidTemplateResult.output).toBeUndefined();
    expect(
      invalidTemplateResult.diagnostics.map(({ severity, category }) => ({ severity, category }))
    ).toEqual(invalidTemplateFixture.expected.diagnostics);

    const invalidDestinationFixture = readFixture<JsonMergeFixture>(
      ...jsonFixturePath('merge_invalid_destination')
    );
    const invalidDestinationResult = mergeJson(
      invalidDestinationFixture.template,
      invalidDestinationFixture.destination,
      'json'
    );

    expect(invalidDestinationResult.ok).toBe(invalidDestinationFixture.expected.ok);
    expect(invalidDestinationResult.output).toBeUndefined();
    expect(
      invalidDestinationResult.diagnostics.map(({ severity, category }) => ({
        severity,
        category
      }))
    ).toEqual(invalidDestinationFixture.expected.diagnostics);
  });

  it('conforms to the slice-14 fallback fixture', () => {
    const fixture = readFixture<JsonMergeFixture>(...jsonFixturePath('fallback'));

    const result = mergeJson(fixture.template, fixture.destination, 'json');

    expect(result.ok).toBe(fixture.expected.ok);
    expect(result.diagnostics.map(({ severity, category }) => ({ severity, category }))).toEqual(
      fixture.expected.diagnostics
    );
    expect(result.policies).toEqual([
      {
        surface: 'array',
        name: 'destination_wins_array'
      },
      {
        surface: 'fallback',
        name: 'trailing_comma_destination_fallback'
      }
    ]);
    expect(result.output).toBe(fixture.expected.output);
  });

  it('conforms to the slice-15 fallback boundary fixtures', () => {
    const templateFixture = readFixture<JsonMergeFixture>(
      ...jsonFixturePath('fallback_boundary_template')
    );
    const templateResult = mergeJson(templateFixture.template, templateFixture.destination, 'json');

    expect(templateResult.ok).toBe(templateFixture.expected.ok);
    expect(
      templateResult.diagnostics.map(({ severity, category }) => ({ severity, category }))
    ).toEqual(templateFixture.expected.diagnostics);
    expect(templateResult.output).toBeUndefined();

    const commentsFixture = readFixture<JsonMergeFixture>(
      ...jsonFixturePath('fallback_boundary_comments')
    );
    const commentsResult = mergeJson(commentsFixture.template, commentsFixture.destination, 'json');

    expect(commentsResult.ok).toBe(commentsFixture.expected.ok);
    expect(
      commentsResult.diagnostics.map(({ severity, category }) => ({ severity, category }))
    ).toEqual(commentsFixture.expected.diagnostics);
    expect(commentsResult.output).toBeUndefined();
  });

  it('conforms to the slice-16 array policy fixture', () => {
    const fixture = readFixture<JsonMergeFixture>(...jsonFixturePath('array_policy'));

    const result = mergeJson(fixture.template, fixture.destination, 'json');

    expect(result.ok).toBe(fixture.expected.ok);
    expect(result.policies).toEqual([
      {
        surface: 'array',
        name: 'destination_wins_array'
      }
    ]);
    expect(result.output).toBe(fixture.expected.output);
    expect(result.diagnostics).toEqual([]);
  });

  it('conforms to the slice-21 family feature profile fixture via the conformance manifest', () => {
    const fixture = readFixture<JsonFeatureProfileFixture>(
      ...familyFeatureProfileFixturePath('json')
    );

    const profile = jsonFeatureProfile();

    expect({
      family: profile.family,
      supported_dialects: profile.supportedDialects,
      supported_policies: profile.supportedPolicies
    }).toEqual(fixture.feature_profile);
  });

  it('conforms to the slice-26 tree-sitter adapter fixture', () => {
    const fixture = readFixture<TreeSitterAdapterFixture>(
      ...jsonFixturePath('tree_sitter_adapter')
    );

    for (const testCase of fixture.cases) {
      const result = parseJsonWithLanguagePack(testCase.source, testCase.dialect);

      expect(result.ok).toBe(testCase.expected.ok);
      expect(result.diagnostics).toEqual(testCase.expected.diagnostics);

      if (testCase.expected.ok) {
        expect(result.analysis?.rootKind).toBe(testCase.expected.root_kind);
        expect(
          result.analysis?.owners.map((owner) => ({
            path: owner.path,
            owner_kind: owner.ownerKind,
            ...(owner.matchKey ? { match_key: owner.matchKey } : {})
          }))
        ).toEqual(testCase.expected.owners);
      } else {
        expect(result.analysis).toBeUndefined();
      }
    }
  });

  it('selects backend-limited tree-sitter cases through the slice-33 capability contract', () => {
    const selectedCase = selectConformanceCase(
      {
        family: 'json',
        role: 'tree_sitter_adapter',
        case: 'valid_strict_json'
      },
      {
        dialect: 'json'
      },
      jsonFeatureProfile(),
      languagePackAdapterInfo
    );

    expect(selectedCase).toEqual({
      ref: {
        family: 'json',
        role: 'tree_sitter_adapter',
        case: 'valid_strict_json'
      },
      status: 'selected',
      messages: []
    });

    const skippedCase = selectConformanceCase(
      {
        family: 'json',
        role: 'tree_sitter_adapter',
        case: 'jsonc_unsupported'
      },
      {
        dialect: 'jsonc'
      },
      jsonFeatureProfile(),
      languagePackAdapterInfo
    );

    expect(skippedCase).toEqual({
      ref: {
        family: 'json',
        role: 'tree_sitter_adapter',
        case: 'jsonc_unsupported'
      },
      status: 'skipped',
      messages: ['backend kreuzberg-language-pack does not support dialect jsonc for family json.']
    });
  });
});
