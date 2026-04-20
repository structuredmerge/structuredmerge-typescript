import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { tomlFeatureProfile, parseToml, matchTomlOwners, mergeToml } from '../src/index';

function readFixture<T>(...segments: string[]): T {
  const fixturePath = path.resolve(process.cwd(), '..', 'fixtures', ...segments);
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as T;
}

describe('toml-merge shared fixtures', () => {
  it('conforms to the slice-90 TOML feature profile fixture', () => {
    const fixture = readFixture<{
      feature_profile: {
        family: 'toml';
        supported_dialects: ['toml'];
        supported_policies: Array<{ surface: 'array'; name: string }>;
      };
    }>('diagnostics', 'slice-90-toml-family-feature-profile', 'toml-feature-profile.json');

    expect(tomlFeatureProfile()).toEqual({
      family: fixture.feature_profile.family,
      supportedDialects: fixture.feature_profile.supported_dialects,
      supportedPolicies: fixture.feature_profile.supported_policies
    });
  });

  it('conforms to the slice-91 TOML parse fixtures', () => {
    const validFixture = readFixture<{
      dialect: 'toml';
      source: string;
      expected: { ok: boolean; root_kind: 'table'; diagnostics: [] };
    }>('toml', 'slice-91-parse', 'valid-document.json');
    const validResult = parseToml(validFixture.source, validFixture.dialect);
    expect(validResult.ok).toBe(validFixture.expected.ok);
    expect(validResult.analysis?.rootKind).toBe(validFixture.expected.root_kind);
    expect(validResult.diagnostics).toEqual(validFixture.expected.diagnostics);

    const invalidFixture = readFixture<{
      dialect: 'toml';
      source: string;
      expected: { ok: boolean; diagnostics: Array<{ severity: 'error'; category: 'parse_error' }> };
    }>('toml', 'slice-91-parse', 'invalid-document.json');
    const invalidResult = parseToml(invalidFixture.source, invalidFixture.dialect);
    expect(invalidResult.ok).toBe(invalidFixture.expected.ok);
    expect(
      invalidResult.diagnostics.map(({ severity, category }) => ({ severity, category }))
    ).toEqual(invalidFixture.expected.diagnostics);
  });

  it('conforms to the slice-92 TOML structure fixture', () => {
    const fixture = readFixture<{
      dialect: 'toml';
      source: string;
      expected: {
        root_kind: 'table';
        owners: Array<{ path: string; owner_kind: string; match_key?: string }>;
      };
    }>('toml', 'slice-92-structure', 'table-and-array.json');

    const result = parseToml(fixture.source, fixture.dialect);
    expect(result.ok).toBe(true);
    expect(result.analysis?.rootKind).toBe(fixture.expected.root_kind);
    expect(
      result.analysis?.owners.map((owner) => ({
        path: owner.path,
        owner_kind: owner.ownerKind,
        ...(owner.matchKey ? { match_key: owner.matchKey } : {})
      }))
    ).toEqual(fixture.expected.owners);
  });

  it('conforms to the slice-93 TOML matching fixture', () => {
    const fixture = readFixture<{
      template: string;
      destination: string;
      expected: {
        matched: Array<[string, string]>;
        unmatched_template: string[];
        unmatched_destination: string[];
      };
    }>('toml', 'slice-93-matching', 'path-equality.json');

    const template = parseToml(fixture.template, 'toml');
    const destination = parseToml(fixture.destination, 'toml');
    const result = matchTomlOwners(template.analysis!, destination.analysis!);

    expect(
      result.matched.map(({ templatePath, destinationPath }) => [templatePath, destinationPath])
    ).toEqual(fixture.expected.matched);
    expect(result.unmatchedTemplate).toEqual(fixture.expected.unmatched_template);
    expect(result.unmatchedDestination).toEqual(fixture.expected.unmatched_destination);
  });

  it('conforms to the slice-94 TOML merge fixtures', () => {
    const mergeFixture = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; output: string };
    }>('toml', 'slice-94-merge', 'table-merge.json');
    const mergeResult = mergeToml(mergeFixture.template, mergeFixture.destination, 'toml');
    expect(mergeResult.ok).toBe(mergeFixture.expected.ok);
    expect(mergeResult.output).toBe(mergeFixture.expected.output);

    const invalidTemplateFixture = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; diagnostics: Array<{ severity: 'error'; category: 'parse_error' }> };
    }>('toml', 'slice-94-merge', 'invalid-template.json');
    const invalidTemplateResult = mergeToml(
      invalidTemplateFixture.template,
      invalidTemplateFixture.destination,
      'toml'
    );
    expect(invalidTemplateResult.ok).toBe(invalidTemplateFixture.expected.ok);
    expect(
      invalidTemplateResult.diagnostics.map(({ severity, category }) => ({ severity, category }))
    ).toEqual(invalidTemplateFixture.expected.diagnostics);

    const invalidDestinationFixture = readFixture<{
      template: string;
      destination: string;
      expected: {
        ok: boolean;
        diagnostics: Array<{ severity: 'error'; category: 'destination_parse_error' }>;
      };
    }>('toml', 'slice-94-merge', 'invalid-destination.json');
    const invalidDestinationResult = mergeToml(
      invalidDestinationFixture.template,
      invalidDestinationFixture.destination,
      'toml'
    );
    expect(invalidDestinationResult.ok).toBe(invalidDestinationFixture.expected.ok);
    expect(
      invalidDestinationResult.diagnostics.map(({ severity, category }) => ({ severity, category }))
    ).toEqual(invalidDestinationFixture.expected.diagnostics);
  });
});
