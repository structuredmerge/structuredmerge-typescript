import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { registeredBackends } from '@structuredmerge/tree-haver';
import {
  conformanceFamilyFeatureProfilePath,
  conformanceFixturePath,
  type ConformanceManifest
} from '@structuredmerge/ast-merge';
import {
  goBackendFeatureProfile,
  goBackends,
  goFeatureProfile,
  goPlanContext,
  matchGoOwners,
  mergeGo,
  parseGo
} from '../src/index';

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

  it('conforms to the Go source-family backend and manifest fixtures', () => {
    const backendsFixture = readFixture<{
      family: 'go';
      backends: Array<'kreuzberg-language-pack'>;
    }>('diagnostics', 'slice-113-go-family-backends', 'go-backends.json');
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
      'go-backend-feature-profiles.json'
    );
    const planFixture = readFixture<{
      tree_sitter: {
        family_profile: {
          family: 'go';
          supported_dialects: ['go'];
          supported_policies: Array<{ surface: 'array'; name: string }>;
        };
        feature_profile: {
          backend: 'kreuzberg-language-pack';
          supports_dialects: true;
          supported_policies: Array<{ surface: 'array'; name: string }>;
        };
      };
    }>('diagnostics', 'slice-123-source-family-plan-contexts', 'go-plan-contexts.json');
    const sourceManifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-124-source-family-manifest',
      'source-family-manifest.json'
    );
    const canonicalManifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(goBackends()).toEqual(backendsFixture.backends);
    expect(registeredBackends()).toContainEqual({
      id: 'kreuzberg-language-pack',
      family: 'tree-sitter'
    });
    expect(goBackendFeatureProfile()).toEqual({
      backend: backendFixture.tree_sitter.backend,
      backendRef: backendFixture.tree_sitter.backend_ref,
      supportsDialects: backendFixture.tree_sitter.supports_dialects,
      supportedPolicies: backendFixture.tree_sitter.supported_policies
    });
    expect(goPlanContext()).toEqual({
      familyProfile: {
        family: planFixture.tree_sitter.family_profile.family,
        supportedDialects: planFixture.tree_sitter.family_profile.supported_dialects,
        supportedPolicies: planFixture.tree_sitter.family_profile.supported_policies
      },
      featureProfile: {
        backend: planFixture.tree_sitter.feature_profile.backend,
        supportsDialects: planFixture.tree_sitter.feature_profile.supports_dialects,
        supportedPolicies: planFixture.tree_sitter.feature_profile.supported_policies
      }
    });

    expect(conformanceFamilyFeatureProfilePath(sourceManifest, 'go')).toEqual([
      'diagnostics',
      'slice-109-go-family-feature-profile',
      'go-feature-profile.json'
    ]);
    expect(conformanceFixturePath(sourceManifest, 'go', 'analysis')).toEqual([
      'go',
      'slice-110-analysis',
      'module-owners.json'
    ]);
    expect(conformanceFixturePath(sourceManifest, 'go', 'matching')).toEqual([
      'go',
      'slice-111-matching',
      'path-equality.json'
    ]);
    expect(conformanceFixturePath(sourceManifest, 'go', 'merge')).toEqual([
      'go',
      'slice-112-merge',
      'module-merge.json'
    ]);

    expect(conformanceFamilyFeatureProfilePath(canonicalManifest, 'go')).toEqual([
      'diagnostics',
      'slice-109-go-family-feature-profile',
      'go-feature-profile.json'
    ]);
    expect(conformanceFixturePath(canonicalManifest, 'go', 'analysis')).toEqual([
      'go',
      'slice-110-analysis',
      'module-owners.json'
    ]);
    expect(conformanceFixturePath(canonicalManifest, 'go', 'matching')).toEqual([
      'go',
      'slice-111-matching',
      'path-equality.json'
    ]);
    expect(conformanceFixturePath(canonicalManifest, 'go', 'merge')).toEqual([
      'go',
      'slice-112-merge',
      'module-merge.json'
    ]);
  });
});
