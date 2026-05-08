import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { registeredBackends } from '@structuredmerge/tree-haver';
import {
  pythonBackendFeatureProfile,
  pythonBackends,
  pythonFeatureProfile,
  pythonPlanContext,
  matchPythonOwners,
  mergePython,
  parsePython
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

describe('python-merge shared fixtures', () => {
  it('conforms to the slice-116 python feature profile fixture', () => {
    const fixture = readFixture<{
      feature_profile: {
        family: 'python';
        supported_dialects: ['python'];
        supported_policies: Array<{ surface: 'array'; name: string }>;
      };
    }>('diagnostics', 'slice-116-python-family-feature-profile', 'python-feature-profile.json');

    expect(pythonFeatureProfile()).toEqual({
      family: fixture.feature_profile.family,
      supportedDialects: fixture.feature_profile.supported_dialects,
      supportedPolicies: fixture.feature_profile.supported_policies
    });
  });

  it('conforms to the python module analysis fixture', () => {
    const fixture = readFixture<{
      dialect: 'python';
      source: string;
      expected: { owners: Array<{ path: string; owner_kind: string; match_key?: string }> };
    }>('python', 'slice-102-analysis', 'module-owners.json');

    const result = parsePython(fixture.source, fixture.dialect);
    expect(result.ok).toBe(true);
    expect(
      result.analysis?.owners.map((owner) => ({
        path: owner.path,
        owner_kind: owner.ownerKind,
        ...(owner.matchKey ? { match_key: owner.matchKey } : {})
      }))
    ).toEqual(fixture.expected.owners);
  });

  it('conforms to the python matching fixture', () => {
    const fixture = readFixture<{
      template: string;
      destination: string;
      expected: {
        matched: Array<[string, string]>;
        unmatched_template: string[];
        unmatched_destination: string[];
      };
    }>('python', 'slice-103-matching', 'path-equality.json');

    const template = parsePython(fixture.template, 'python');
    const destination = parsePython(fixture.destination, 'python');
    const result = matchPythonOwners(template.analysis!, destination.analysis!);
    expect(
      result.matched.map(({ templatePath, destinationPath }) => [templatePath, destinationPath])
    ).toEqual(fixture.expected.matched);
    expect(result.unmatchedTemplate).toEqual(fixture.expected.unmatched_template);
    expect(result.unmatchedDestination).toEqual(fixture.expected.unmatched_destination);
  });

  it('conforms to the python merge fixtures', () => {
    const mergeFixture = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; output: string };
    }>('python', 'slice-104-merge', 'module-merge.json');
    const mergeResult = mergePython(mergeFixture.template, mergeFixture.destination, 'python');
    expect(mergeResult.ok).toBe(mergeFixture.expected.ok);
    expect(mergeResult.output).toBe(mergeFixture.expected.output);

    const invalidTemplate = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; diagnostics: Array<{ severity: 'error'; category: 'parse_error' }> };
    }>('python', 'slice-104-merge', 'invalid-template.json');
    const invalidTemplateResult = mergePython(
      invalidTemplate.template,
      invalidTemplate.destination,
      'python'
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
    }>('python', 'slice-104-merge', 'invalid-destination.json');
    const invalidDestinationResult = mergePython(
      invalidDestination.template,
      invalidDestination.destination,
      'python'
    );
    expect(invalidDestinationResult.ok).toBe(invalidDestination.expected.ok);
    expect(
      invalidDestinationResult.diagnostics.map(({ severity, category }) => ({ severity, category }))
    ).toEqual(invalidDestination.expected.diagnostics);
  });

  it('conforms to python source-family backends and plan metadata', () => {
    const backendsFixture = readFixture<{
      family: 'python';
      backends: Array<'kreuzberg-language-pack'>;
    }>('diagnostics', 'slice-118-python-family-backends', 'python-backends.json');
    const backendFixture = readFixture<{
      tree_sitter: {
        backend: 'kreuzberg-language-pack';
        backend_ref: { id: 'kreuzberg-language-pack'; family: 'tree-sitter' };
        supports_dialects: true;
        supported_policies: Array<{ surface: 'array'; name: string }>;
      };
    }>(
      'diagnostics',
      'slice-122-source-family-backend-feature-profiles',
      'python-backend-feature-profiles.json'
    );

    expect(pythonBackends()).toEqual(backendsFixture.backends);
    expect(registeredBackends()).toContainEqual({
      id: 'kreuzberg-language-pack',
      family: 'tree-sitter'
    });
    expect(pythonBackendFeatureProfile('kreuzberg-language-pack')).toEqual({
      backend: backendFixture.tree_sitter.backend,
      backendRef: backendFixture.tree_sitter.backend_ref,
      supportsDialects: backendFixture.tree_sitter.supports_dialects,
      supportedPolicies: backendFixture.tree_sitter.supported_policies
    });
    expect(pythonPlanContext('kreuzberg-language-pack')).toEqual({
      familyProfile: {
        family: 'python',
        supportedDialects: ['python'],
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
