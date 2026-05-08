import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { registeredBackends } from '@structuredmerge/tree-haver';
import {
  javaBackendFeatureProfile,
  javaBackends,
  javaFeatureProfile,
  javaPlanContext,
  matchJavaOwners,
  mergeJava,
  parseJava
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

describe('java-merge shared fixtures', () => {
  it('conforms to the java feature profile fixture', () => {
    const fixture = readFixture<{
      feature_profile: {
        family: 'java';
        supported_dialects: ['java'];
        supported_policies: Array<{ surface: 'array'; name: string }>;
      };
    }>('diagnostics', 'slice-200-java-family-feature-profile', 'java-feature-profile.json');

    expect(javaFeatureProfile()).toEqual({
      family: fixture.feature_profile.family,
      supportedDialects: fixture.feature_profile.supported_dialects,
      supportedPolicies: fixture.feature_profile.supported_policies
    });
  });

  it('conforms to the java module analysis fixture', () => {
    const fixture = readFixture<{
      dialect: 'java';
      source: string;
      expected: { owners: Array<{ path: string; owner_kind: string; match_key?: string }> };
    }>('java', 'slice-102-analysis', 'module-owners.json');

    const result = parseJava(fixture.source, fixture.dialect);
    expect(result.ok).toBe(true);
    expect(
      result.analysis?.owners.map((owner) => ({
        path: owner.path,
        owner_kind: owner.ownerKind,
        ...(owner.matchKey ? { match_key: owner.matchKey } : {})
      }))
    ).toEqual(fixture.expected.owners);
  });

  it('conforms to the java matching fixture', () => {
    const fixture = readFixture<{
      template: string;
      destination: string;
      expected: {
        matched: Array<[string, string]>;
        unmatched_template: string[];
        unmatched_destination: string[];
      };
    }>('java', 'slice-103-matching', 'path-equality.json');

    const template = parseJava(fixture.template, 'java');
    const destination = parseJava(fixture.destination, 'java');
    const result = matchJavaOwners(template.analysis!, destination.analysis!);
    expect(
      result.matched.map(({ templatePath, destinationPath }) => [templatePath, destinationPath])
    ).toEqual(fixture.expected.matched);
    expect(result.unmatchedTemplate).toEqual(fixture.expected.unmatched_template);
    expect(result.unmatchedDestination).toEqual(fixture.expected.unmatched_destination);
  });

  it('conforms to the java merge fixtures', () => {
    const mergeFixture = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; output: string };
    }>('java', 'slice-104-merge', 'module-merge.json');
    const mergeResult = mergeJava(mergeFixture.template, mergeFixture.destination, 'java');
    expect(mergeResult.ok).toBe(mergeFixture.expected.ok);
    expect(mergeResult.output).toBe(mergeFixture.expected.output);

    const invalidTemplate = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; diagnostics: Array<{ severity: 'error'; category: 'parse_error' }> };
    }>('java', 'slice-104-merge', 'invalid-template.json');
    const invalidTemplateResult = mergeJava(
      invalidTemplate.template,
      invalidTemplate.destination,
      'java'
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
    }>('java', 'slice-104-merge', 'invalid-destination.json');
    const invalidDestinationResult = mergeJava(
      invalidDestination.template,
      invalidDestination.destination,
      'java'
    );
    expect(invalidDestinationResult.ok).toBe(invalidDestination.expected.ok);
    expect(
      invalidDestinationResult.diagnostics.map(({ severity, category }) => ({ severity, category }))
    ).toEqual(invalidDestination.expected.diagnostics);
  });

  it('conforms to java source-family backends and plan metadata', () => {
    const backendsFixture = readFixture<{
      family: 'java';
      backends: Array<'kreuzberg-language-pack'>;
    }>('diagnostics', 'slice-201-java-family-backends', 'java-backends.json');
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
      'java-backend-feature-profiles.json'
    );

    expect(javaBackends()).toEqual(backendsFixture.backends);
    expect(registeredBackends()).toContainEqual({
      id: 'kreuzberg-language-pack',
      family: 'tree-sitter'
    });
    expect(javaBackendFeatureProfile('kreuzberg-language-pack')).toEqual({
      backend: backendFixture.tree_sitter.backend,
      backendRef: backendFixture.tree_sitter.backend_ref,
      supportsDialects: backendFixture.tree_sitter.supports_dialects,
      supportedPolicies: backendFixture.tree_sitter.supported_policies
    });
    expect(javaPlanContext('kreuzberg-language-pack')).toEqual({
      familyProfile: {
        family: 'java',
        supportedDialects: ['java'],
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
