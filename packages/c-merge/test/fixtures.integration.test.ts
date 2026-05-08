import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { registeredBackends } from '@structuredmerge/tree-haver';
import {
  cBackendFeatureProfile,
  cBackends,
  cFeatureProfile,
  cPlanContext,
  matchCOwners,
  mergeC,
  parseC
} from '../src/index';

function readFixture<T>(...segments: string[]): T {
  const fixtureRoot = [
    path.resolve(process.cwd(), '..', 'fixtures'),
    path.resolve(process.cwd(), '..', 'structuredmerge-fixtures')
  ].find((candidate) => existsSync(candidate));
  if (!fixtureRoot) {
    throw new Error('fixtures directory was not found');
  }
  const fixturePath = path.resolve(fixtureRoot, ...segments);
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as T;
}

describe('c-merge shared fixtures', () => {
  it('conforms to the c feature profile fixture', () => {
    const fixture = readFixture<{
      feature_profile: {
        family: 'c';
        supported_dialects: ['c'];
        supported_policies: Array<{ surface: 'array'; name: string }>;
      };
    }>('diagnostics', 'slice-203-c-family-feature-profile', 'c-feature-profile.json');

    expect(cFeatureProfile()).toEqual({
      family: fixture.feature_profile.family,
      supportedDialects: fixture.feature_profile.supported_dialects,
      supportedPolicies: fixture.feature_profile.supported_policies
    });
  });

  it('conforms to the c module analysis fixture', () => {
    const fixture = readFixture<{
      dialect: 'c';
      source: string;
      expected: { owners: Array<{ path: string; owner_kind: string; match_key?: string }> };
    }>('c', 'slice-102-analysis', 'module-owners.json');

    const result = parseC(fixture.source, fixture.dialect);
    expect(result.ok).toBe(true);
    expect(
      result.analysis?.owners.map((owner) => ({
        path: owner.path,
        owner_kind: owner.ownerKind,
        ...(owner.matchKey ? { match_key: owner.matchKey } : {})
      }))
    ).toEqual(fixture.expected.owners);
  });

  it('conforms to the c matching fixture', () => {
    const fixture = readFixture<{
      template: string;
      destination: string;
      expected: {
        matched: Array<[string, string]>;
        unmatched_template: string[];
        unmatched_destination: string[];
      };
    }>('c', 'slice-103-matching', 'path-equality.json');

    const template = parseC(fixture.template, 'c');
    const destination = parseC(fixture.destination, 'c');
    const result = matchCOwners(template.analysis!, destination.analysis!);
    expect(
      result.matched.map(({ templatePath, destinationPath }) => [templatePath, destinationPath])
    ).toEqual(fixture.expected.matched);
    expect(result.unmatchedTemplate).toEqual(fixture.expected.unmatched_template);
    expect(result.unmatchedDestination).toEqual(fixture.expected.unmatched_destination);
  });

  it('conforms to the c merge fixtures', () => {
    const mergeFixture = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; output: string };
    }>('c', 'slice-104-merge', 'module-merge.json');
    const mergeResult = mergeC(mergeFixture.template, mergeFixture.destination, 'c');
    expect(mergeResult.ok).toBe(mergeFixture.expected.ok);
    expect(mergeResult.output).toBe(mergeFixture.expected.output);

    const invalidTemplate = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; diagnostics: Array<{ severity: 'error'; category: 'parse_error' }> };
    }>('c', 'slice-104-merge', 'invalid-template.json');
    const invalidTemplateResult = mergeC(
      invalidTemplate.template,
      invalidTemplate.destination,
      'c'
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
    }>('c', 'slice-104-merge', 'invalid-destination.json');
    const invalidDestinationResult = mergeC(
      invalidDestination.template,
      invalidDestination.destination,
      'c'
    );
    expect(invalidDestinationResult.ok).toBe(invalidDestination.expected.ok);
    expect(
      invalidDestinationResult.diagnostics.map(({ severity, category }) => ({ severity, category }))
    ).toEqual(invalidDestination.expected.diagnostics);
  });

  it('conforms to c source-family backends and plan metadata', () => {
    const backendsFixture = readFixture<{
      family: 'c';
      backends: Array<'kreuzberg-language-pack'>;
    }>('diagnostics', 'slice-204-c-family-backends', 'c-backends.json');
    const backendFixture = readFixture<{
      tree_sitter: {
        backend: 'kreuzberg-language-pack';
        backend_ref: { id: 'kreuzberg-language-pack'; family: 'tree-sitter' };
        supports_dialects: boolean;
        supported_policies: Array<{ surface: 'array'; name: string }>;
      };
    }>(
      'diagnostics',
      'slice-122-source-family-backend-feature-profiles',
      'c-backend-feature-profiles.json'
    );

    expect(cBackends()).toEqual(backendsFixture.backends);
    expect(registeredBackends()).toContainEqual({
      id: 'kreuzberg-language-pack',
      family: 'tree-sitter'
    });
    expect(cBackendFeatureProfile('kreuzberg-language-pack')).toEqual({
      backend: backendFixture.tree_sitter.backend,
      backendRef: backendFixture.tree_sitter.backend_ref,
      supportsDialects: backendFixture.tree_sitter.supports_dialects,
      supportedPolicies: backendFixture.tree_sitter.supported_policies
    });
    expect(cPlanContext('kreuzberg-language-pack')).toEqual({
      familyProfile: {
        family: 'c',
        supportedDialects: ['c'],
        supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
      },
      featureProfile: {
        backend: backendFixture.tree_sitter.backend,
        supportsDialects: backendFixture.tree_sitter.supports_dialects,
        supportedPolicies: backendFixture.tree_sitter.supported_policies
      }
    });
  });
});
