import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  conformanceFamilyFeatureProfilePath,
  conformanceFixturePath,
  planNamedConformanceSuites,
  reportConformanceManifest,
  type ConformanceFamilyPlanContext,
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

function readFixture<T>(...segments: string[]): T {
  const fixturePath = path.resolve(process.cwd(), '..', 'fixtures', ...segments);
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as T;
}

function toCamelCaseKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

function normalizeFixtureValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeFixtureValue(item)) as T;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [toCamelCaseKey(key), normalizeFixtureValue(entry)])
    ) as T;
  }
  return value;
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
      tree_sitter: {
        backend: 'kreuzberg-language-pack';
        supports_dialects: false;
        supported_policies: Array<{ surface: 'array'; name: string }>;
        backend_ref: { id: 'kreuzberg-language-pack'; family: 'tree-sitter' };
      };
    }>(
      'diagnostics',
      'slice-171-yaml-family-backend-feature-profiles',
      'typescript-yaml-backend-feature-profiles.json'
    );

    expect(availableYamlBackends()).toEqual(['kreuzberg-language-pack']);
    expect(yamlBackendFeatureProfile('kreuzberg-language-pack')).toEqual({
      family: 'yaml',
      supportedDialects: ['yaml'],
      backend: fixture.tree_sitter.backend,
      backendRef: fixture.tree_sitter.backend_ref,
      supportedPolicies: fixture.tree_sitter.supported_policies
    });
  });

  it('conforms to the slice-172 YAML backend plan-context fixtures', () => {
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
      'slice-172-yaml-family-backend-plan-contexts',
      'typescript-yaml-plan-contexts.json'
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

    expect(manifest.suite_descriptors).toContainEqual({
      kind: 'portable',
      subject: { grammar: 'yaml' },
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
      'slice-96-parse',
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
      invalidDestinationResult.diagnostics.map(({ severity, category }) => ({
        severity,
        category
      }))
    ).toEqual(invalidDestinationFixture.expected.diagnostics);
  });

  it('conforms to the slice-173 family named-suite plan fixture', () => {
    const fixture = readFixture<{
      manifest: ConformanceManifest;
      contexts: Record<string, unknown>;
      expected_entries: unknown;
    }>(
      'diagnostics',
      'slice-173-yaml-family-backend-named-suite-plans',
      'typescript-yaml-backend-named-suite-plans.json'
    );

    expect(
      planNamedConformanceSuites(
        fixture.manifest,
        normalizeFixtureValue(fixture.contexts) as Readonly<
          Record<string, ConformanceFamilyPlanContext>
        >
      )
    ).toEqual(normalizeFixtureValue(fixture.expected_entries));
  });

  it('conforms to the slice-174 family manifest report fixture', () => {
    const fixture = readFixture<{
      manifest: ConformanceManifest;
      options: Record<string, unknown>;
      executions: Record<string, { outcome: 'passed' | 'failed'; messages: string[] }>;
      expected_report: unknown;
    }>(
      'diagnostics',
      'slice-174-yaml-family-backend-manifest-report',
      'typescript-yaml-backend-manifest-report.json'
    );

    const report = reportConformanceManifest(fixture.manifest, fixture.options, (run) => {
      const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
      return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
    });

    expect(report).toEqual(fixture.expected_report);
  });

  it('rejects unsupported provider backend overrides', () => {
    const result = parseYaml('name: structuredmerge\n', 'yaml', 'js-yaml' as never);
    expect(result).toEqual({
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          category: 'unsupported_feature',
          message: 'Unsupported YAML backend js-yaml.'
        }
      ]
    });
  });
});
