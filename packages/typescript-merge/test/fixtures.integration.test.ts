import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  conformanceFamilyFeatureProfilePath,
  conformanceFixturePath,
  type ConformanceManifest
} from '@structuredmerge/ast-merge';
import {
  typeScriptBackends,
  matchTypeScriptOwners,
  mergeTypeScript,
  parseTypeScript,
  typeScriptBackendFeatureProfile,
  typeScriptFeatureProfile,
  typeScriptPlanContext
} from '../src/index';

function readFixture<T>(...segments: string[]): T {
  const fixturePath = path.resolve(process.cwd(), '..', 'fixtures', ...segments);
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as T;
}

describe('typescript-merge shared fixtures', () => {
  it('conforms to the slice-101 feature profile fixture', () => {
    const fixture = readFixture<{
      feature_profile: {
        family: 'typescript';
        supported_dialects: ['typescript'];
        supported_policies: Array<{ surface: 'array'; name: string }>;
      };
    }>(
      'diagnostics',
      'slice-101-typescript-family-feature-profile',
      'typescript-feature-profile.json'
    );

    expect(typeScriptFeatureProfile()).toEqual({
      family: fixture.feature_profile.family,
      supportedDialects: fixture.feature_profile.supported_dialects,
      supportedPolicies: fixture.feature_profile.supported_policies
    });
  });

  it('conforms to the slice-102 module analysis fixture', () => {
    const fixture = readFixture<{
      dialect: 'typescript';
      source: string;
      expected: { owners: Array<{ path: string; owner_kind: string; match_key?: string }> };
    }>('typescript', 'slice-102-analysis', 'module-owners.json');

    const result = parseTypeScript(fixture.source, fixture.dialect);
    expect(result.ok).toBe(true);
    expect(
      result.analysis?.owners.map((owner) => ({
        path: owner.path,
        owner_kind: owner.ownerKind,
        ...(owner.matchKey ? { match_key: owner.matchKey } : {})
      }))
    ).toEqual(fixture.expected.owners);
  });

  it('conforms to the slice-103 matching fixture', () => {
    const fixture = readFixture<{
      template: string;
      destination: string;
      expected: {
        matched: Array<[string, string]>;
        unmatched_template: string[];
        unmatched_destination: string[];
      };
    }>('typescript', 'slice-103-matching', 'path-equality.json');

    const template = parseTypeScript(fixture.template, 'typescript');
    const destination = parseTypeScript(fixture.destination, 'typescript');
    const result = matchTypeScriptOwners(template.analysis!, destination.analysis!);
    expect(
      result.matched.map(({ templatePath, destinationPath }) => [templatePath, destinationPath])
    ).toEqual(fixture.expected.matched);
    expect(result.unmatchedTemplate).toEqual(fixture.expected.unmatched_template);
    expect(result.unmatchedDestination).toEqual(fixture.expected.unmatched_destination);
  });

  it('conforms to the slice-104 merge fixtures', () => {
    const mergeFixture = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; output: string };
    }>('typescript', 'slice-104-merge', 'module-merge.json');
    const mergeResult = mergeTypeScript(
      mergeFixture.template,
      mergeFixture.destination,
      'typescript'
    );
    expect(mergeResult.ok).toBe(mergeFixture.expected.ok);
    expect(mergeResult.output).toBe(mergeFixture.expected.output);

    const invalidTemplate = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; diagnostics: Array<{ severity: 'error'; category: 'parse_error' }> };
    }>('typescript', 'slice-104-merge', 'invalid-template.json');
    const invalidTemplateResult = mergeTypeScript(
      invalidTemplate.template,
      invalidTemplate.destination,
      'typescript'
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
    }>('typescript', 'slice-104-merge', 'invalid-destination.json');
    const invalidDestinationResult = mergeTypeScript(
      invalidDestination.template,
      invalidDestination.destination,
      'typescript'
    );
    expect(invalidDestinationResult.ok).toBe(invalidDestination.expected.ok);
    expect(
      invalidDestinationResult.diagnostics.map(({ severity, category }) => ({ severity, category }))
    ).toEqual(invalidDestination.expected.diagnostics);
  });

  it('conforms to the slice-115 backend fixture', () => {
    const fixture = readFixture<{
      family: 'typescript';
      backends: Array<'kreuzberg-language-pack'>;
    }>('diagnostics', 'slice-115-typescript-family-backends', 'typescript-backends.json');

    expect(typeScriptBackends()).toEqual(fixture.backends);
  });

  it('conforms to the slice-122 backend feature-profile fixtures', () => {
    const fixture = readFixture<{
      tree_sitter: {
        backend: string;
        supports_dialects: boolean;
        supported_policies: Array<{ surface: 'array'; name: string }>;
      };
    }>(
      'diagnostics',
      'slice-122-source-family-backend-feature-profiles',
      'typescript-backend-feature-profiles.json'
    );

    expect(typeScriptBackendFeatureProfile('kreuzberg-language-pack')).toEqual({
      backend: fixture.tree_sitter.backend,
      supportsDialects: fixture.tree_sitter.supports_dialects,
      supportedPolicies: fixture.tree_sitter.supported_policies
    });
  });

  it('conforms to the slice-123 backend plan-context fixtures', () => {
    const fixture = readFixture<{
      tree_sitter: {
        family_profile: {
          family: 'typescript';
          supported_dialects: ['typescript'];
          supported_policies: Array<{ surface: 'array'; name: string }>;
        };
        feature_profile: {
          backend: string;
          supports_dialects: boolean;
          supported_policies: Array<{ surface: 'array'; name: string }>;
        };
      };
    }>('diagnostics', 'slice-123-source-family-plan-contexts', 'typescript-plan-contexts.json');

    expect(typeScriptPlanContext('kreuzberg-language-pack')).toEqual({
      familyProfile: {
        family: fixture.tree_sitter.family_profile.family,
        supportedDialects: fixture.tree_sitter.family_profile.supported_dialects,
        supportedPolicies: fixture.tree_sitter.family_profile.supported_policies
      },
      featureProfile: {
        backend: fixture.tree_sitter.feature_profile.backend,
        supportsDialects: fixture.tree_sitter.feature_profile.supports_dialects,
        supportedPolicies: fixture.tree_sitter.feature_profile.supported_policies
      }
    });
  });

  it('conforms to the slice-124 source-family manifest fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-124-source-family-manifest',
      'source-family-manifest.json'
    );

    expect(conformanceFamilyFeatureProfilePath(manifest, 'typescript')).toEqual([
      'diagnostics',
      'slice-101-typescript-family-feature-profile',
      'typescript-feature-profile.json'
    ]);
    expect(conformanceFixturePath(manifest, 'typescript', 'analysis')).toEqual([
      'typescript',
      'slice-102-analysis',
      'module-owners.json'
    ]);
    expect(conformanceFixturePath(manifest, 'typescript', 'matching')).toEqual([
      'typescript',
      'slice-103-matching',
      'path-equality.json'
    ]);
    expect(conformanceFixturePath(manifest, 'typescript', 'merge')).toEqual([
      'typescript',
      'slice-104-merge',
      'module-merge.json'
    ]);
  });

  it('conforms to the slice-131 canonical manifest fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(conformanceFamilyFeatureProfilePath(manifest, 'typescript')).toEqual([
      'diagnostics',
      'slice-101-typescript-family-feature-profile',
      'typescript-feature-profile.json'
    ]);
    expect(conformanceFixturePath(manifest, 'typescript', 'analysis')).toEqual([
      'typescript',
      'slice-102-analysis',
      'module-owners.json'
    ]);
    expect(conformanceFixturePath(manifest, 'typescript', 'matching')).toEqual([
      'typescript',
      'slice-103-matching',
      'path-equality.json'
    ]);
    expect(conformanceFixturePath(manifest, 'typescript', 'merge')).toEqual([
      'typescript',
      'slice-104-merge',
      'module-merge.json'
    ]);
  });
});
