import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { goFeatureProfile, matchGoOwners, mergeGo, parseGo } from '../src/index';

function readFixture<T>(...segments: string[]): T {
  const fixturePath = path.resolve(process.cwd(), '..', 'fixtures', ...segments);
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as T;
}

describe('go-merge shared fixtures', () => {
  it('conforms to the slice-109 feature profile fixture', () => {
    const fixture = readFixture<{
      feature_profile: {
        family: 'go';
        supported_dialects: ['go'];
        supported_policies: Array<{ surface: 'array'; name: string }>;
      };
    }>('diagnostics', 'slice-109-go-family-feature-profile', 'go-feature-profile.json');

    expect(goFeatureProfile()).toEqual({
      family: fixture.feature_profile.family,
      supportedDialects: fixture.feature_profile.supported_dialects,
      supportedPolicies: fixture.feature_profile.supported_policies
    });
  });

  it('conforms to the slice-110 module analysis fixture', () => {
    const fixture = readFixture<{
      dialect: 'go';
      source: string;
      expected: { owners: Array<{ path: string; owner_kind: string; match_key?: string }> };
    }>('go', 'slice-110-analysis', 'module-owners.json');

    const result = parseGo(fixture.source, fixture.dialect);
    expect(result.ok).toBe(true);
    expect(
      result.analysis?.owners.map((owner) => ({
        path: owner.path,
        owner_kind: owner.ownerKind,
        ...(owner.matchKey ? { match_key: owner.matchKey } : {})
      }))
    ).toEqual(fixture.expected.owners);
  });

  it('conforms to the slice-111 matching fixture', () => {
    const fixture = readFixture<{
      template: string;
      destination: string;
      expected: {
        matched: Array<[string, string]>;
        unmatched_template: string[];
        unmatched_destination: string[];
      };
    }>('go', 'slice-111-matching', 'path-equality.json');

    const template = parseGo(fixture.template, 'go');
    const destination = parseGo(fixture.destination, 'go');
    const result = matchGoOwners(template.analysis!, destination.analysis!);
    expect(
      result.matched.map(({ templatePath, destinationPath }) => [templatePath, destinationPath])
    ).toEqual(fixture.expected.matched);
    expect(result.unmatchedTemplate).toEqual(fixture.expected.unmatched_template);
    expect(result.unmatchedDestination).toEqual(fixture.expected.unmatched_destination);
  });

  it('conforms to the slice-112 merge fixtures', () => {
    const mergeFixture = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; output: string };
    }>('go', 'slice-112-merge', 'module-merge.json');
    const mergeResult = mergeGo(mergeFixture.template, mergeFixture.destination, 'go');
    expect(mergeResult.ok).toBe(mergeFixture.expected.ok);
    expect(mergeResult.output).toBe(mergeFixture.expected.output);

    const invalidTemplate = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; diagnostics: Array<{ severity: 'error'; category: 'parse_error' }> };
    }>('go', 'slice-112-merge', 'invalid-template.json');
    const invalidTemplateResult = mergeGo(
      invalidTemplate.template,
      invalidTemplate.destination,
      'go'
    );
    expect(invalidTemplateResult.ok).toBe(invalidTemplate.expected.ok);
    expect(
      invalidTemplateResult.diagnostics.map(({ severity, category }) => ({ severity, category }))
    ).toEqual(invalidTemplate.expected.diagnostics);

    const invalidDestination = readFixture<{
      template: string;
      destination: string;
      expected: {
        ok: boolean;
        diagnostics: Array<{ severity: 'error'; category: 'destination_parse_error' }>;
      };
    }>('go', 'slice-112-merge', 'invalid-destination.json');
    const invalidDestinationResult = mergeGo(
      invalidDestination.template,
      invalidDestination.destination,
      'go'
    );
    expect(invalidDestinationResult.ok).toBe(invalidDestination.expected.ok);
    expect(
      invalidDestinationResult.diagnostics.map(({ severity, category }) => ({ severity, category }))
    ).toEqual(invalidDestination.expected.diagnostics);
  });
});
