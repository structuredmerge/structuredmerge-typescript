import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  conformanceFamilyFeatureProfilePath,
  conformanceFixturePath,
  reportConformanceManifest,
  planNamedConformanceSuites,
  type ConformanceManifest
} from '@structuredmerge/ast-merge';
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
  });

  it('conforms to the slice-135 TOML backend feature profile fixture', () => {
    const fixture = readFixture<{
      tree_sitter: {
        backend: 'kreuzberg-language-pack';
        supported_policies: Array<{ surface: 'array'; name: string }>;
      };
    }>(
      'diagnostics',
      'slice-135-toml-family-backend-feature-profiles',
      'typescript-toml-backend-feature-profiles.json'
    );

    expect(tomlBackendFeatureProfile()).toMatchObject({
      backend: fixture.tree_sitter.backend,
      supportedPolicies: fixture.tree_sitter.supported_policies
    });
    expect(tomlPlanContext().featureProfile).toEqual({
      backend: fixture.tree_sitter.backend,
      supportsDialects: false,
      supportedPolicies: fixture.tree_sitter.supported_policies
    });
  });

  it('conforms to the slice-136 TOML plan-context fixture', () => {
    const fixture = readFixture<{
      tree_sitter: {
        family_profile: {
          family: 'toml';
          supported_dialects: ['toml'];
          supported_policies: Array<{ surface: 'array'; name: string }>;
        };
        feature_profile: {
          backend: 'kreuzberg-language-pack';
          supports_dialects: false;
          supported_policies: Array<{ surface: 'array'; name: string }>;
        };
      };
    }>('diagnostics', 'slice-136-toml-family-plan-contexts', 'typescript-toml-plan-contexts.json');

    expect(tomlPlanContext()).toEqual({
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
  });

  it('conforms to the slice-91 TOML parse fixtures', () => {
    const validFixture = readFixture<{
      dialect: 'toml';
      source: string;
      expected: { ok: boolean; root_kind: 'table'; diagnostics: [] };
    }>('toml', 'slice-91-parse', 'valid-document.json');
    const validResult = parseToml(validFixture.source, validFixture.dialect);
    expect(validResult.ok).toBe(validFixture.expected.ok);
    expect(validResult.analysis?.rootKind).toBe(validFixture.expected.root_kind);
    expect(validResult.diagnostics).toEqual(validFixture.expected.diagnostics);

    const invalidFixture = readFixture<{
      dialect: 'toml';
      source: string;
      expected: { ok: boolean; diagnostics: Array<{ severity: 'error'; category: 'parse_error' }> };
    }>('toml', 'slice-91-parse', 'invalid-document.json');
    const invalidResult = parseToml(invalidFixture.source, invalidFixture.dialect);
    expect(invalidResult.ok).toBe(invalidFixture.expected.ok);
    expect(
      invalidResult.diagnostics.map(({ severity, category }) => ({ severity, category }))
    ).toEqual(invalidFixture.expected.diagnostics);
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

    const result = parseToml(fixture.source, fixture.dialect);
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

    const template = parseToml(fixture.template, 'toml');
    const destination = parseToml(fixture.destination, 'toml');
    const result = matchTomlOwners(template.analysis!, destination.analysis!);

    expect(
      result.matched.map(({ templatePath, destinationPath }) => [templatePath, destinationPath])
    ).toEqual(fixture.expected.matched);
    expect(result.unmatchedTemplate).toEqual(fixture.expected.unmatched_template);
    expect(result.unmatchedDestination).toEqual(fixture.expected.unmatched_destination);
  });

  it('conforms to the slice-94 TOML merge fixtures', () => {
    const mergeFixture = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; output: string };
    }>('toml', 'slice-94-merge', 'table-merge.json');
    const mergeResult = mergeToml(mergeFixture.template, mergeFixture.destination, 'toml');
    expect(mergeResult.ok).toBe(mergeFixture.expected.ok);
    expect(mergeResult.output).toBe(mergeFixture.expected.output);

    const invalidTemplateFixture = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; diagnostics: Array<{ severity: 'error'; category: 'parse_error' }> };
    }>('toml', 'slice-94-merge', 'invalid-template.json');
    const invalidTemplateResult = mergeToml(
      invalidTemplateFixture.template,
      invalidTemplateFixture.destination,
      'toml'
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
    }>('toml', 'slice-94-merge', 'invalid-destination.json');
    const invalidDestinationResult = mergeToml(
      invalidDestinationFixture.template,
      invalidDestinationFixture.destination,
      'toml'
    );
    expect(invalidDestinationResult.ok).toBe(invalidDestinationFixture.expected.ok);
    expect(
      invalidDestinationResult.diagnostics.map(({ severity, category }) => ({ severity, category }))
    ).toEqual(invalidDestinationFixture.expected.diagnostics);
  });

  it('conforms to the slice-139 TOML family named-suite plan fixture', () => {
    const fixture = readFixture<{
      manifest: ConformanceManifest;
      contexts: { toml: unknown };
      expected_entries: unknown[];
    }>(
      'diagnostics',
      'slice-139-toml-family-named-suite-plans',
      'typescript-toml-named-suite-plans.json'
    );

    const actual = planNamedConformanceSuites(fixture.manifest, { toml: tomlPlanContext() }).map(
      (entry) => ({
        suite: entry.suite,
        plan: {
          family: entry.plan.family,
          entries: entry.plan.entries.map((planEntry) => ({
            ref: planEntry.ref,
            path: [...planEntry.path],
            run: {
              ref: planEntry.run.ref,
              requirements: planEntry.run.requirements,
              family_profile: {
                family: planEntry.run.familyProfile.family,
                supported_dialects: [...planEntry.run.familyProfile.supportedDialects],
                supported_policies: [...(planEntry.run.familyProfile.supportedPolicies ?? [])]
              },
              feature_profile: {
                backend: planEntry.run.featureProfile?.backend,
                supports_dialects: planEntry.run.featureProfile?.supportsDialects,
                supported_policies: [...(planEntry.run.featureProfile?.supportedPolicies ?? [])]
              }
            }
          })),
          missing_roles: [...entry.plan.missingRoles]
        }
      })
    );

    expect(actual).toEqual(fixture.expected_entries);
  });

  it('conforms to the slice-140 TOML family manifest-report fixture', () => {
    const fixture = readFixture<{
      manifest: ConformanceManifest;
      options: { contexts: { toml: unknown } };
      executions: Record<string, { outcome: 'passed' | 'failed'; messages: string[] }>;
      expected_report: unknown;
    }>(
      'diagnostics',
      'slice-140-toml-family-manifest-report',
      'typescript-toml-manifest-report.json'
    );

    expect(
      reportConformanceManifest(
        fixture.manifest,
        { contexts: { toml: tomlPlanContext() } },
        (run) => fixture.executions[`${run.ref.family}:${run.ref.role}:${run.ref.case}`]
      )
    ).toEqual(fixture.expected_report);
  });
});
