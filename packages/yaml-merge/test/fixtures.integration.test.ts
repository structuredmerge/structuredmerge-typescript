import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  conformanceFamilyFeatureProfilePath,
  conformanceFixturePath,
  type ConformanceManifest
} from '@structuredmerge/ast-merge';
import {
  availableYamlBackends,
  matchYamlOwners,
  mergeYaml,
  parseYaml,
  yamlBackendFeatureProfile,
  yamlFeatureProfile,
  yamlPlanContext
} from '../src/index';
import { withBackend } from '@structuredmerge/tree-haver';

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

  it('conforms to the slice-171 YAML backend feature profile fixtures', () => {
    const fixture = readFixture<{
      yaml: {
        backend: 'yaml';
        supports_dialects: true;
        supported_policies: Array<{ surface: 'array'; name: string }>;
      };
      js_yaml: {
        backend: 'js-yaml';
        supports_dialects: true;
        supported_policies: Array<{ surface: 'array'; name: string }>;
      };
    }>(
      'diagnostics',
      'slice-171-yaml-family-backend-feature-profiles',
      'typescript-yaml-backend-feature-profiles.json'
    );

    expect(availableYamlBackends()).toEqual(['yaml', 'js-yaml', 'kreuzberg-language-pack']);
    expect(yamlBackendFeatureProfile('yaml')).toMatchObject({
      backend: fixture.yaml.backend,
      supportedPolicies: fixture.yaml.supported_policies
    });
    expect(yamlBackendFeatureProfile('js-yaml')).toMatchObject({
      backend: fixture.js_yaml.backend,
      supportedPolicies: fixture.js_yaml.supported_policies
    });
  });

  it('conforms to the slice-183 YAML polyglot backend feature profile fixtures', () => {
    const fixture = readFixture<{
      tree_sitter: {
        backend: 'kreuzberg-language-pack';
        supported_policies: Array<{ surface: 'array'; name: string }>;
      };
    }>(
      'diagnostics',
      'slice-183-yaml-family-polyglot-backend-feature-profiles',
      'typescript-yaml-polyglot-backend-feature-profiles.json'
    );

    expect(yamlBackendFeatureProfile('kreuzberg-language-pack')).toMatchObject({
      backend: fixture.tree_sitter.backend,
      supportedPolicies: fixture.tree_sitter.supported_policies
    });
  });

  it('conforms to the slice-172 YAML backend plan-context fixtures', () => {
    const fixture = readFixture<{
      yaml: {
        family_profile: {
          family: 'yaml';
          supported_dialects: ['yaml'];
          supported_policies: Array<{ surface: 'array'; name: string }>;
        };
        feature_profile: {
          backend: 'yaml';
          supports_dialects: true;
          supported_policies: Array<{ surface: 'array'; name: string }>;
        };
      };
      js_yaml: {
        family_profile: {
          family: 'yaml';
          supported_dialects: ['yaml'];
          supported_policies: Array<{ surface: 'array'; name: string }>;
        };
        feature_profile: {
          backend: 'js-yaml';
          supports_dialects: true;
          supported_policies: Array<{ surface: 'array'; name: string }>;
        };
      };
    }>(
      'diagnostics',
      'slice-172-yaml-family-backend-plan-contexts',
      'typescript-yaml-plan-contexts.json'
    );

    expect(yamlPlanContext('yaml')).toEqual({
      familyProfile: {
        family: fixture.yaml.family_profile.family,
        supportedDialects: fixture.yaml.family_profile.supported_dialects,
        supportedPolicies: fixture.yaml.family_profile.supported_policies
      },
      featureProfile: {
        backend: fixture.yaml.feature_profile.backend,
        supportsDialects: fixture.yaml.feature_profile.supports_dialects,
        supportedPolicies: fixture.yaml.feature_profile.supported_policies
      }
    });
    expect(yamlPlanContext('js-yaml')).toEqual({
      familyProfile: {
        family: fixture.js_yaml.family_profile.family,
        supportedDialects: fixture.js_yaml.family_profile.supported_dialects,
        supportedPolicies: fixture.js_yaml.family_profile.supported_policies
      },
      featureProfile: {
        backend: fixture.js_yaml.feature_profile.backend,
        supportsDialects: fixture.js_yaml.feature_profile.supports_dialects,
        supportedPolicies: fixture.js_yaml.feature_profile.supported_policies
      }
    });
  });

  it('conforms to the slice-184 YAML polyglot backend plan-context fixtures', () => {
    const fixture = readFixture<{
      tree_sitter: {
        family_profile: {
          family: 'yaml';
          supported_dialects: ['yaml'];
          supported_policies: Array<{ surface: 'array'; name: string }>;
        };
        feature_profile: {
          backend: 'kreuzberg-language-pack';
          supports_dialects: false;
          supported_policies: Array<{ surface: 'array'; name: string }>;
        };
      };
    }>(
      'diagnostics',
      'slice-184-yaml-family-polyglot-backend-plan-contexts',
      'typescript-yaml-polyglot-plan-contexts.json'
    );

    expect(yamlPlanContext('kreuzberg-language-pack')).toEqual({
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

  it('conforms to the slice-143 YAML family manifest fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-143-yaml-family-manifest',
      'yaml-family-manifest.json'
    );
    const suites = manifest.suites as NonNullable<ConformanceManifest['suites']>;

    expect(suites.yaml_portable).toEqual({
      family: 'yaml',
      roles: ['analysis', 'matching', 'merge']
    });
    expect(conformanceFamilyFeatureProfilePath(manifest, 'yaml')).toEqual([
      'diagnostics',
      'slice-95-yaml-family-feature-profile',
      'yaml-feature-profile.json'
    ]);
    expect(conformanceFixturePath(manifest, 'yaml', 'analysis')).toEqual([
      'yaml',
      'slice-97-structure',
      'mapping-and-sequence.json'
    ]);
    expect(conformanceFixturePath(manifest, 'yaml', 'matching')).toEqual([
      'yaml',
      'slice-98-matching',
      'path-equality.json'
    ]);
    expect(conformanceFixturePath(manifest, 'yaml', 'merge')).toEqual([
      'yaml',
      'slice-99-merge',
      'mapping-merge.json'
    ]);
  });

  it('resolves YAML paths through the canonical manifest', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(conformanceFamilyFeatureProfilePath(manifest, 'yaml')).toEqual([
      'diagnostics',
      'slice-95-yaml-family-feature-profile',
      'yaml-feature-profile.json'
    ]);
    expect(conformanceFixturePath(manifest, 'yaml', 'analysis')).toEqual([
      'yaml',
      'slice-97-structure',
      'mapping-and-sequence.json'
    ]);
    expect(conformanceFixturePath(manifest, 'yaml', 'matching')).toEqual([
      'yaml',
      'slice-98-matching',
      'path-equality.json'
    ]);
    expect(conformanceFixturePath(manifest, 'yaml', 'merge')).toEqual([
      'yaml',
      'slice-99-merge',
      'mapping-merge.json'
    ]);
  });

  it('conforms to the slice-96 YAML parse fixtures', () => {
    const validFixture = readFixture<{
      dialect: 'yaml';
      source: string;
      expected: { ok: boolean; root_kind: 'mapping'; diagnostics: [] };
    }>('yaml', 'slice-96-parse', 'valid-document.json');
    for (const backend of ['yaml', 'js-yaml', 'kreuzberg-language-pack'] as const) {
      const validResult = parseYaml(validFixture.source, validFixture.dialect, backend);
      expect(validResult.ok).toBe(validFixture.expected.ok);
      expect(validResult.analysis?.rootKind).toBe(validFixture.expected.root_kind);
      expect(validResult.diagnostics).toEqual(validFixture.expected.diagnostics);
    }

    const invalidFixture = readFixture<{
      dialect: 'yaml';
      source: string;
      expected: { ok: boolean; diagnostics: Array<{ severity: 'error'; category: 'parse_error' }> };
    }>('yaml', 'slice-96-parse', 'invalid-document.json');
    for (const backend of ['yaml', 'js-yaml', 'kreuzberg-language-pack'] as const) {
      const invalidResult = parseYaml(invalidFixture.source, invalidFixture.dialect, backend);
      expect(invalidResult.ok).toBe(invalidFixture.expected.ok);
      expect(
        invalidResult.diagnostics.map(({ severity, category }) => ({ severity, category }))
      ).toEqual(invalidFixture.expected.diagnostics);
    }
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

    for (const backend of ['yaml', 'js-yaml', 'kreuzberg-language-pack'] as const) {
      const result = parseYaml(fixture.source, fixture.dialect, backend);
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

    for (const backend of ['yaml', 'js-yaml', 'kreuzberg-language-pack'] as const) {
      const template = parseYaml(fixture.template, 'yaml', backend);
      const destination = parseYaml(fixture.destination, 'yaml', backend);
      const result = matchYamlOwners(template.analysis!, destination.analysis!);

      expect(
        result.matched.map(({ templatePath, destinationPath }) => [templatePath, destinationPath])
      ).toEqual(fixture.expected.matched);
      expect(result.unmatchedTemplate).toEqual(fixture.expected.unmatched_template);
      expect(result.unmatchedDestination).toEqual(fixture.expected.unmatched_destination);
    }
  });

  it('conforms to the slice-99 YAML merge fixtures', () => {
    const mergeFixture = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; output: string };
    }>('yaml', 'slice-99-merge', 'mapping-merge.json');
    for (const backend of ['yaml', 'js-yaml', 'kreuzberg-language-pack'] as const) {
      const mergeResult = mergeYaml(
        mergeFixture.template,
        mergeFixture.destination,
        'yaml',
        backend
      );
      expect(mergeResult.ok).toBe(mergeFixture.expected.ok);
      expect(mergeResult.output).toBe(mergeFixture.expected.output);
    }

    const invalidTemplateFixture = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; diagnostics: Array<{ severity: 'error'; category: 'parse_error' }> };
    }>('yaml', 'slice-99-merge', 'invalid-template.json');
    for (const backend of ['yaml', 'js-yaml', 'kreuzberg-language-pack'] as const) {
      const invalidTemplateResult = mergeYaml(
        invalidTemplateFixture.template,
        invalidTemplateFixture.destination,
        'yaml',
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
    }>('yaml', 'slice-99-merge', 'invalid-destination.json');
    for (const backend of ['yaml', 'js-yaml'] as const) {
      const invalidDestinationResult = mergeYaml(
        invalidDestinationFixture.template,
        invalidDestinationFixture.destination,
        'yaml',
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

  it('uses the tree-haver backend context when no explicit YAML backend is given', () => {
    const fixture = readFixture<{
      source: string;
      expected: { ok: boolean; root_kind: 'mapping' };
    }>('yaml', 'slice-96-parse', 'valid-document.json');

    const result = withBackend('kreuzberg-language-pack', () => parseYaml(fixture.source, 'yaml'));
    expect(result.ok).toBe(fixture.expected.ok);
    expect(result.analysis?.rootKind).toBe(fixture.expected.root_kind);
  });
});
