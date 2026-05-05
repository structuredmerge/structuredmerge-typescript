import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type {
  ConformanceCaseExecution,
  ConformanceFamilyPlanContext,
  ConformanceManifest
} from '@structuredmerge/ast-merge';
import {
  planNamedConformanceSuites,
  reportNamedConformanceSuiteEnvelope,
  reportPlannedNamedConformanceSuites
} from '@structuredmerge/ast-merge';
import {
  availableYamlBackends,
  matchYamlOwners,
  mergeYaml,
  parseYaml,
  yamlFeatureProfile,
  yamlBackendFeatureProfile,
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
      Object.entries(value).map(([key, entry]) => [
        toCamelCaseKey(key),
        normalizeFixtureValue(entry)
      ])
    ) as T;
  }
  return value;
}

describe('js-yaml-merge shared fixtures', () => {
  it('conforms to the provider feature-profile and plan-context fixtures', () => {
    const familyFixture = readFixture<{
      feature_profile: Record<string, unknown>;
    }>('diagnostics', 'slice-95-yaml-family-feature-profile', 'yaml-feature-profile.json');
    const featureFixture = readFixture<{
      providers: {
        js_yaml: {
          feature_profile: Record<string, unknown>;
        };
      };
    }>(
      'diagnostics',
      'slice-277-yaml-provider-feature-profiles',
      'typescript-yaml-provider-feature-profiles.json'
    );
    const planFixture = readFixture<{
      providers: {
        js_yaml: Record<string, unknown>;
      };
    }>(
      'diagnostics',
      'slice-278-yaml-provider-plan-contexts',
      'typescript-yaml-provider-plan-contexts.json'
    );

    expect(availableYamlBackends()).toEqual(['js-yaml']);
    expect(yamlFeatureProfile()).toEqual(normalizeFixtureValue(familyFixture.feature_profile));
    expect(yamlBackendFeatureProfile()).toEqual(
      normalizeFixtureValue(featureFixture.providers.js_yaml.feature_profile)
    );
    expect(yamlPlanContext()).toEqual(normalizeFixtureValue(planFixture.providers.js_yaml));
  });

  it('conforms to the shared YAML analysis, matching, and merge fixtures', () => {
    const parseFixture = readFixture<{
      dialect: 'yaml';
      source: string;
      expected: { ok: boolean; root_kind: 'mapping' };
    }>('yaml', 'slice-96-parse', 'valid-document.json');
    const structureFixture = readFixture<{
      dialect: 'yaml';
      source: string;
      expected: { owners: Array<{ path: string; owner_kind: string; match_key?: string }> };
    }>('yaml', 'slice-97-structure', 'mapping-and-sequence.json');
    const matchingFixture = readFixture<{
      template: string;
      destination: string;
      expected: {
        matched: Array<[string, string]>;
        unmatched_template: string[];
        unmatched_destination: string[];
      };
    }>('yaml', 'slice-98-matching', 'path-equality.json');
    const mergeFixture = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; output: string };
    }>('yaml', 'slice-99-merge', 'mapping-merge.json');

    const parseResult = parseYaml(parseFixture.source, parseFixture.dialect);
    expect(parseResult.ok).toBe(parseFixture.expected.ok);
    expect(parseResult.analysis?.rootKind).toBe(parseFixture.expected.root_kind);

    const structureResult = parseYaml(structureFixture.source, structureFixture.dialect);
    expect(
      structureResult.analysis?.owners.map((owner) => ({
        path: owner.path,
        owner_kind: owner.ownerKind,
        ...(owner.matchKey ? { match_key: owner.matchKey } : {})
      }))
    ).toEqual(structureFixture.expected.owners);

    const template = parseYaml(matchingFixture.template, 'yaml');
    const destination = parseYaml(matchingFixture.destination, 'yaml');
    const matchingResult = matchYamlOwners(template.analysis!, destination.analysis!);
    expect(
      matchingResult.matched.map(({ templatePath, destinationPath }) => [
        templatePath,
        destinationPath
      ])
    ).toEqual(matchingFixture.expected.matched);
    expect(matchingResult.unmatchedTemplate).toEqual(matchingFixture.expected.unmatched_template);
    expect(matchingResult.unmatchedDestination).toEqual(
      matchingFixture.expected.unmatched_destination
    );

    const mergeResult = mergeYaml(mergeFixture.template, mergeFixture.destination, 'yaml');
    expect(mergeResult.ok).toBe(mergeFixture.expected.ok);
    expect(mergeResult.output).toBe(mergeFixture.expected.output);
  });

  it('conforms to the provider named-suite plan and manifest-report fixtures', () => {
    const plansFixture = readFixture<{
      manifest: ConformanceManifest;
      contexts: { js_yaml: Record<string, unknown> };
      expected_entries: { js_yaml: unknown };
    }>(
      'diagnostics',
      'slice-279-yaml-provider-named-suite-plans',
      'typescript-yaml-provider-named-suite-plans.json'
    );
    const reportFixture = readFixture<{
      manifest: ConformanceManifest;
      options: { js_yaml: { contexts: Record<string, unknown> } };
      executions: { js_yaml: Record<string, ConformanceCaseExecution> };
      expected_reports: { js_yaml: unknown };
    }>(
      'diagnostics',
      'slice-280-yaml-provider-manifest-report',
      'typescript-yaml-provider-manifest-report.json'
    );

    expect(
      planNamedConformanceSuites(
        plansFixture.manifest,
        normalizeFixtureValue(plansFixture.contexts.js_yaml) as Readonly<
          Record<string, ConformanceFamilyPlanContext>
        >
      )
    ).toEqual(normalizeFixtureValue(plansFixture.expected_entries.js_yaml));

    const entries = reportPlannedNamedConformanceSuites(
      planNamedConformanceSuites(
        reportFixture.manifest,
        normalizeFixtureValue(reportFixture.options.js_yaml.contexts) as Readonly<
          Record<string, ConformanceFamilyPlanContext>
        >
      ),
      (run) => {
        const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
        return (
          reportFixture.executions.js_yaml[key] ?? {
            outcome: 'failed',
            messages: ['missing execution']
          }
        );
      }
    );

    expect(reportNamedConformanceSuiteEnvelope(entries)).toEqual(
      normalizeFixtureValue(reportFixture.expected_reports.js_yaml)
    );
  });
});
