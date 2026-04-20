import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { matchYamlOwners, mergeYaml, parseYaml, yamlFeatureProfile } from '../src/index';

function readFixture<T>(...segments: string[]): T {
  const fixturePath = path.resolve(process.cwd(), '..', 'fixtures', ...segments);
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as T;
}

describe('yaml-merge shared fixtures', () => {
  it('conforms to the slice-95 YAML feature profile fixture', () => {
    const fixture = readFixture<{
      feature_profile: {
        family: 'yaml';
        supported_dialects: ['yaml'];
        supported_policies: Array<{ surface: 'array'; name: string }>;
      };
    }>('diagnostics', 'slice-95-yaml-family-feature-profile', 'yaml-feature-profile.json');

    expect(yamlFeatureProfile()).toEqual({
      family: fixture.feature_profile.family,
      supportedDialects: fixture.feature_profile.supported_dialects,
      supportedPolicies: fixture.feature_profile.supported_policies
    });
  });

  it('conforms to the slice-96 YAML parse fixtures', () => {
    const validFixture = readFixture<{
      dialect: 'yaml';
      source: string;
      expected: { ok: boolean; root_kind: 'mapping'; diagnostics: [] };
    }>('yaml', 'slice-96-parse', 'valid-document.json');
    const validResult = parseYaml(validFixture.source, validFixture.dialect);
    expect(validResult.ok).toBe(validFixture.expected.ok);
    expect(validResult.analysis?.rootKind).toBe(validFixture.expected.root_kind);
    expect(validResult.diagnostics).toEqual(validFixture.expected.diagnostics);

    const invalidFixture = readFixture<{
      dialect: 'yaml';
      source: string;
      expected: { ok: boolean; diagnostics: Array<{ severity: 'error'; category: 'parse_error' }> };
    }>('yaml', 'slice-96-parse', 'invalid-document.json');
    const invalidResult = parseYaml(invalidFixture.source, invalidFixture.dialect);
    expect(invalidResult.ok).toBe(invalidFixture.expected.ok);
    expect(
      invalidResult.diagnostics.map(({ severity, category }) => ({ severity, category }))
    ).toEqual(invalidFixture.expected.diagnostics);
  });

  it('conforms to the slice-97 YAML structure fixture', () => {
    const fixture = readFixture<{
      dialect: 'yaml';
      source: string;
      expected: {
        root_kind: 'mapping';
        owners: Array<{ path: string; owner_kind: string; match_key?: string }>;
      };
    }>('yaml', 'slice-97-structure', 'mapping-and-sequence.json');

    const result = parseYaml(fixture.source, fixture.dialect);
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

  it('conforms to the slice-98 YAML matching fixture', () => {
    const fixture = readFixture<{
      template: string;
      destination: string;
      expected: {
        matched: Array<[string, string]>;
        unmatched_template: string[];
        unmatched_destination: string[];
      };
    }>('yaml', 'slice-98-matching', 'path-equality.json');

    const template = parseYaml(fixture.template, 'yaml');
    const destination = parseYaml(fixture.destination, 'yaml');
    const result = matchYamlOwners(template.analysis!, destination.analysis!);

    expect(
      result.matched.map(({ templatePath, destinationPath }) => [templatePath, destinationPath])
    ).toEqual(fixture.expected.matched);
    expect(result.unmatchedTemplate).toEqual(fixture.expected.unmatched_template);
    expect(result.unmatchedDestination).toEqual(fixture.expected.unmatched_destination);
  });

  it('conforms to the slice-99 YAML merge fixtures', () => {
    const mergeFixture = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; output: string };
    }>('yaml', 'slice-99-merge', 'mapping-merge.json');
    const mergeResult = mergeYaml(mergeFixture.template, mergeFixture.destination, 'yaml');
    expect(mergeResult.ok).toBe(mergeFixture.expected.ok);
    expect(mergeResult.output).toBe(mergeFixture.expected.output);

    const invalidTemplateFixture = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; diagnostics: Array<{ severity: 'error'; category: 'parse_error' }> };
    }>('yaml', 'slice-99-merge', 'invalid-template.json');
    const invalidTemplateResult = mergeYaml(
      invalidTemplateFixture.template,
      invalidTemplateFixture.destination,
      'yaml'
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
    }>('yaml', 'slice-99-merge', 'invalid-destination.json');
    const invalidDestinationResult = mergeYaml(
      invalidDestinationFixture.template,
      invalidDestinationFixture.destination,
      'yaml'
    );
    expect(invalidDestinationResult.ok).toBe(invalidDestinationFixture.expected.ok);
    expect(
      invalidDestinationResult.diagnostics.map(({ severity, category }) => ({ severity, category }))
    ).toEqual(invalidDestinationFixture.expected.diagnostics);
  });
});
