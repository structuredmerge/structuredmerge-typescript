import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { registeredBackends } from '@structuredmerge/tree-haver';
import {
  javaScriptBackends,
  javaScriptBackendFeatureProfile,
  javaScriptFeatureProfile,
  javaScriptPlanContext,
  matchJavaScriptOwners,
  mergeJavaScript,
  parseJavaScript
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

describe('javascript-merge shared fixtures', () => {
  it('conforms to the slice-001 javascript feature profile fixture', () => {
    const fixture = readFixture<{
      feature_profile: {
        family: 'javascript';
        supported_dialects: ['javascript'];
        supported_policies: Array<{ surface: 'array'; name: string }>;
      };
    }>(
      'diagnostics',
      'slice-001-javascript-family-feature-profile',
      'javascript-feature-profile.json'
    );

    expect(javaScriptFeatureProfile()).toEqual({
      family: fixture.feature_profile.family,
      supportedDialects: fixture.feature_profile.supported_dialects,
      supportedPolicies: fixture.feature_profile.supported_policies
    });
  });

  it('conforms to the javascript module analysis fixture', () => {
    const fixture = readFixture<{
      dialect: 'javascript';
      source: string;
      expected: { owners: Array<{ path: string; owner_kind: string; match_key?: string }> };
    }>('javascript', 'slice-102-analysis', 'module-owners.json');

    const result = parseJavaScript(fixture.source, fixture.dialect);
    expect(result.ok).toBe(true);
    expect(
      result.analysis?.owners.map((owner) => ({
        path: owner.path,
        owner_kind: owner.ownerKind,
        ...(owner.matchKey ? { match_key: owner.matchKey } : {})
      }))
    ).toEqual(fixture.expected.owners);
  });

  it('conforms to the javascript matching fixture', () => {
    const fixture = readFixture<{
      template: string;
      destination: string;
      expected: {
        matched: Array<[string, string]>;
        unmatched_template: string[];
        unmatched_destination: string[];
      };
    }>('javascript', 'slice-103-matching', 'path-equality.json');

    const template = parseJavaScript(fixture.template, 'javascript');
    const destination = parseJavaScript(fixture.destination, 'javascript');
    const result = matchJavaScriptOwners(template.analysis!, destination.analysis!);
    expect(
      result.matched.map(({ templatePath, destinationPath }) => [templatePath, destinationPath])
    ).toEqual(fixture.expected.matched);
    expect(result.unmatchedTemplate).toEqual(fixture.expected.unmatched_template);
    expect(result.unmatchedDestination).toEqual(fixture.expected.unmatched_destination);
  });

  it('conforms to the javascript merge fixtures', () => {
    const mergeFixture = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; output: string };
    }>('javascript', 'slice-104-merge', 'module-merge.json');
    const mergeResult = mergeJavaScript(
      mergeFixture.template,
      mergeFixture.destination,
      'javascript'
    );
    expect(mergeResult.ok).toBe(mergeFixture.expected.ok);
    expect(mergeResult.output).toBe(mergeFixture.expected.output);

    const invalidTemplate = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; diagnostics: Array<{ severity: 'error'; category: 'parse_error' }> };
    }>('javascript', 'slice-104-merge', 'invalid-template.json');
    const invalidTemplateResult = mergeJavaScript(
      invalidTemplate.template,
      invalidTemplate.destination,
      'javascript'
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
    }>('javascript', 'slice-104-merge', 'invalid-destination.json');
    const invalidDestinationResult = mergeJavaScript(
      invalidDestination.template,
      invalidDestination.destination,
      'javascript'
    );
    expect(invalidDestinationResult.ok).toBe(invalidDestination.expected.ok);
    expect(
      invalidDestinationResult.diagnostics.map(({ severity, category }) => ({ severity, category }))
    ).toEqual(invalidDestination.expected.diagnostics);
  });

  it('conforms to javascript family backends and plan metadata', () => {
    const backendsFixture = readFixture<{
      family: 'javascript';
      backends: Array<'kreuzberg-language-pack'>;
    }>('diagnostics', 'slice-115-javascript-family-backends', 'javascript-backends.json');
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
      'javascript-backend-feature-profiles.json'
    );

    expect(javaScriptBackends()).toEqual(backendsFixture.backends);
    expect(registeredBackends()).toContainEqual({
      id: 'kreuzberg-language-pack',
      family: 'tree-sitter'
    });
    expect(javaScriptBackendFeatureProfile('kreuzberg-language-pack')).toEqual({
      backend: backendFixture.tree_sitter.backend,
      backendRef: backendFixture.tree_sitter.backend_ref,
      supportsDialects: backendFixture.tree_sitter.supports_dialects,
      supportedPolicies: backendFixture.tree_sitter.supported_policies
    });
    expect(javaScriptPlanContext('kreuzberg-language-pack')).toEqual({
      familyProfile: {
        family: 'javascript',
        supportedDialects: ['javascript'],
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
