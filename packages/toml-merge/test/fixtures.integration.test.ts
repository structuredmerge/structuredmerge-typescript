import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  conformanceFamilyFeatureProfilePath,
  conformanceFixturePath,
  type ConformanceManifest
} from '@structuredmerge/ast-merge';
import { withBackend } from '@structuredmerge/tree-haver';
import {
  tomlPlanContext,
  parseToml,
  matchTomlOwners,
  mergeToml,
  tomlBackendFeatureProfile,
  tomlFeatureProfile
} from '../src/index';

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
    expect(tomlBackendFeatureProfile('peggy').backendRef).toEqual({ id: 'peggy', family: 'peg' });
  });

  it('conforms to the slice-135 TOML backend feature profile fixture', () => {
    const fixture = readFixture<{
      native: {
        backend: 'native';
        supports_dialects: true;
        supported_policies: Array<{ surface: 'array'; name: string }>;
      };
      peggy: {
        backend: 'peggy';
        supports_dialects: false;
        supported_policies: Array<{ surface: 'array'; name: string }>;
      };
    }>(
      'diagnostics',
      'slice-135-toml-family-backend-feature-profiles',
      'typescript-toml-backend-feature-profiles.json'
    );

    expect(tomlBackendFeatureProfile('native')).toMatchObject({
      backend: fixture.native.backend,
      supportedPolicies: fixture.native.supported_policies
    });
    expect(tomlPlanContext('native').featureProfile).toEqual({
      backend: fixture.native.backend,
      supportsDialects: fixture.native.supports_dialects,
      supportedPolicies: fixture.native.supported_policies
    });
    expect(tomlBackendFeatureProfile('peggy')).toMatchObject({
      backend: fixture.peggy.backend,
      supportedPolicies: fixture.peggy.supported_policies
    });
    expect(tomlPlanContext('peggy').featureProfile).toEqual({
      backend: fixture.peggy.backend,
      supportsDialects: fixture.peggy.supports_dialects,
      supportedPolicies: fixture.peggy.supported_policies
    });
  });

  it('conforms to the slice-136 TOML plan-context fixture', () => {
    const fixture = readFixture<{
      native: {
        family_profile: {
          family: 'toml';
          supported_dialects: ['toml'];
          supported_policies: Array<{ surface: 'array'; name: string }>;
        };
        feature_profile: {
          backend: 'native';
          supports_dialects: true;
          supported_policies: Array<{ surface: 'array'; name: string }>;
        };
      };
      peggy: {
        family_profile: {
          family: 'toml';
          supported_dialects: ['toml'];
          supported_policies: Array<{ surface: 'array'; name: string }>;
        };
        feature_profile: {
          backend: 'peggy';
          supports_dialects: false;
          supported_policies: Array<{ surface: 'array'; name: string }>;
        };
      };
    }>('diagnostics', 'slice-136-toml-family-plan-contexts', 'typescript-toml-plan-contexts.json');

    expect(tomlPlanContext('native')).toEqual({
      familyProfile: {
        family: fixture.native.family_profile.family,
        supportedDialects: fixture.native.family_profile.supported_dialects,
        supportedPolicies: fixture.native.family_profile.supported_policies
      },
      featureProfile: {
        backend: fixture.native.feature_profile.backend,
        supportsDialects: fixture.native.feature_profile.supports_dialects,
        supportedPolicies: fixture.native.feature_profile.supported_policies
      }
    });
    expect(tomlPlanContext('peggy')).toEqual({
      familyProfile: {
        family: fixture.peggy.family_profile.family,
        supportedDialects: fixture.peggy.family_profile.supported_dialects,
        supportedPolicies: fixture.peggy.family_profile.supported_policies
      },
      featureProfile: {
        backend: fixture.peggy.feature_profile.backend,
        supportsDialects: fixture.peggy.feature_profile.supports_dialects,
        supportedPolicies: fixture.peggy.feature_profile.supported_policies
      }
    });
  });

  it('conforms to the slice-137 TOML family manifest fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-137-toml-family-manifest',
      'toml-family-manifest.json'
    );

    expect(manifest.suite_descriptors).toContainEqual({
      kind: 'portable',
      subject: { grammar: 'toml' },
      roles: ['analysis', 'matching', 'merge']
    });
    expect(conformanceFamilyFeatureProfilePath(manifest, 'toml')).toEqual([
      'diagnostics',
      'slice-90-toml-family-feature-profile',
      'toml-feature-profile.json'
    ]);
    expect(conformanceFixturePath(manifest, 'toml', 'analysis')).toEqual([
      'toml',
      'slice-92-structure',
      'table-and-array.json'
    ]);
    expect(conformanceFixturePath(manifest, 'toml', 'matching')).toEqual([
      'toml',
      'slice-93-matching',
      'path-equality.json'
    ]);
    expect(conformanceFixturePath(manifest, 'toml', 'merge')).toEqual([
      'toml',
      'slice-94-merge',
      'table-merge.json'
    ]);
  });

  it('resolves TOML paths through the canonical manifest', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(conformanceFamilyFeatureProfilePath(manifest, 'toml')).toEqual([
      'diagnostics',
      'slice-90-toml-family-feature-profile',
      'toml-feature-profile.json'
    ]);
    expect(conformanceFixturePath(manifest, 'toml', 'analysis')).toEqual([
      'toml',
      'slice-92-structure',
      'table-and-array.json'
    ]);
    expect(conformanceFixturePath(manifest, 'toml', 'matching')).toEqual([
      'toml',
      'slice-93-matching',
      'path-equality.json'
    ]);
    expect(conformanceFixturePath(manifest, 'toml', 'merge')).toEqual([
      'toml',
      'slice-94-merge',
      'table-merge.json'
    ]);
  });

  it('conforms to the slice-91 TOML parse fixtures', () => {
    const validFixture = readFixture<{
      dialect: 'toml';
      source: string;
      expected: { ok: boolean; root_kind: 'table'; diagnostics: [] };
    }>('toml', 'slice-91-parse', 'valid-document.json');
    for (const backend of ['native', 'peggy'] as const) {
      const validResult = parseToml(validFixture.source, validFixture.dialect, backend);
      expect(validResult.ok).toBe(validFixture.expected.ok);
      expect(validResult.analysis?.rootKind).toBe(validFixture.expected.root_kind);
      expect(validResult.diagnostics).toEqual(validFixture.expected.diagnostics);
    }

    const invalidFixture = readFixture<{
      dialect: 'toml';
      source: string;
      expected: { ok: boolean; diagnostics: Array<{ severity: 'error'; category: 'parse_error' }> };
    }>('toml', 'slice-91-parse', 'invalid-document.json');
    for (const backend of ['native', 'peggy'] as const) {
      const invalidResult = parseToml(invalidFixture.source, invalidFixture.dialect, backend);
      expect(invalidResult.ok).toBe(invalidFixture.expected.ok);
      expect(
        invalidResult.diagnostics.map(({ severity, category }) => ({ severity, category }))
      ).toEqual(invalidFixture.expected.diagnostics);
    }
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

    for (const backend of ['native', 'peggy'] as const) {
      const result = parseToml(fixture.source, fixture.dialect, backend);
      expect(result.ok).toBe(true);
      expect(result.analysis?.rootKind).toBe(fixture.expected.root_kind);
      expect(
        result.analysis?.owners.map((owner) => ({
          path: owner.path,
          owner_kind: owner.ownerKind,
          ...(owner.matchKey ? { match_key: owner.matchKey } : {})
        }))
      ).toEqual(fixture.expected.owners);
    }
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

    for (const backend of ['native', 'peggy'] as const) {
      const template = parseToml(fixture.template, 'toml', backend);
      const destination = parseToml(fixture.destination, 'toml', backend);
      const result = matchTomlOwners(template.analysis!, destination.analysis!);

      expect(
        result.matched.map(({ templatePath, destinationPath }) => [templatePath, destinationPath])
      ).toEqual(fixture.expected.matched);
      expect(result.unmatchedTemplate).toEqual(fixture.expected.unmatched_template);
      expect(result.unmatchedDestination).toEqual(fixture.expected.unmatched_destination);
    }
  });

  it('conforms to the slice-94 TOML merge fixtures', () => {
    const mergeFixture = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; output: string };
    }>('toml', 'slice-94-merge', 'table-merge.json');
    for (const backend of ['native', 'peggy'] as const) {
      const mergeResult = mergeToml(
        mergeFixture.template,
        mergeFixture.destination,
        'toml',
        backend
      );
      expect(mergeResult.ok).toBe(mergeFixture.expected.ok);
      expect(mergeResult.output).toBe(mergeFixture.expected.output);
    }

    const invalidTemplateFixture = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; diagnostics: Array<{ severity: 'error'; category: 'parse_error' }> };
    }>('toml', 'slice-94-merge', 'invalid-template.json');
    for (const backend of ['native', 'peggy'] as const) {
      const invalidTemplateResult = mergeToml(
        invalidTemplateFixture.template,
        invalidTemplateFixture.destination,
        'toml',
        backend
      );
      expect(invalidTemplateResult.ok).toBe(invalidTemplateFixture.expected.ok);
      expect(
        invalidTemplateResult.diagnostics.map(({ severity, category }) => ({ severity, category }))
      ).toEqual(invalidTemplateFixture.expected.diagnostics);
    }

    const invalidDestinationFixture = readFixture<{
      template: string;
      destination: string;
      expected: {
        ok: boolean;
        diagnostics: Array<{ severity: 'error'; category: 'destination_parse_error' }>;
      };
    }>('toml', 'slice-94-merge', 'invalid-destination.json');
    for (const backend of ['native', 'peggy'] as const) {
      const invalidDestinationResult = mergeToml(
        invalidDestinationFixture.template,
        invalidDestinationFixture.destination,
        'toml',
        backend
      );
      expect(invalidDestinationResult.ok).toBe(invalidDestinationFixture.expected.ok);
      expect(
        invalidDestinationResult.diagnostics.map(({ severity, category }) => ({
          severity,
          category
        }))
      ).toEqual(invalidDestinationFixture.expected.diagnostics);
    }
  });

  it('uses tree-haver backend context when no explicit TOML backend is given', () => {
    const mergeFixture = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; output: string };
    }>('toml', 'slice-94-merge', 'table-merge.json');

    const result = withBackend('peggy', () =>
      mergeToml(mergeFixture.template, mergeFixture.destination, 'toml')
    );
    expect(result.ok).toBe(mergeFixture.expected.ok);
    expect(result.output).toBe(mergeFixture.expected.output);
  });
});
