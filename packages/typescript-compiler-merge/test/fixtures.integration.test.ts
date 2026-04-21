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
  availableTypeScriptBackends,
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

describe('typescript-compiler-merge shared fixtures', () => {
  it('conforms to the provider feature-profile and plan-context fixtures', () => {
    const featureFixture = readFixture<{
      providers: {
        typescript_compiler: {
          feature_profile: Record<string, unknown>;
        };
      };
    }>(
      'diagnostics',
      'slice-273-typescript-provider-feature-profiles',
      'typescript-typescript-provider-feature-profiles.json'
    );
    const planFixture = readFixture<{
      providers: {
        typescript_compiler: Record<string, unknown>;
      };
    }>(
      'diagnostics',
      'slice-274-typescript-provider-plan-contexts',
      'typescript-typescript-provider-plan-contexts.json'
    );

    expect(availableTypeScriptBackends()).toEqual(['typescript-compiler']);
    expect(typeScriptBackendFeatureProfile()).toEqual(
      normalizeFixtureValue(featureFixture.providers.typescript_compiler.feature_profile)
    );
    expect(typeScriptPlanContext()).toEqual(
      normalizeFixtureValue(planFixture.providers.typescript_compiler)
    );
  });

  it('conforms to the shared TypeScript analysis, matching, and merge fixtures', () => {
    const analysisFixture = readFixture<{
      dialect: 'typescript';
      source: string;
      expected: { owners: Array<{ path: string; owner_kind: string; match_key?: string }> };
    }>('typescript', 'slice-102-analysis', 'module-owners.json');
    const matchingFixture = readFixture<{
      template: string;
      destination: string;
      expected: {
        matched: Array<[string, string]>;
        unmatched_template: string[];
        unmatched_destination: string[];
      };
    }>('typescript', 'slice-103-matching', 'path-equality.json');
    const mergeFixture = readFixture<{
      template: string;
      destination: string;
      expected: { ok: boolean; output: string };
    }>('typescript', 'slice-104-merge', 'module-merge.json');

    const analysis = parseTypeScript(analysisFixture.source, analysisFixture.dialect);
    expect(analysis.ok).toBe(true);
    expect(
      analysis.analysis?.owners.map((owner) => ({
        path: owner.path,
        owner_kind: owner.ownerKind,
        ...(owner.matchKey ? { match_key: owner.matchKey } : {})
      }))
    ).toEqual(analysisFixture.expected.owners);

    const template = parseTypeScript(matchingFixture.template, 'typescript');
    const destination = parseTypeScript(matchingFixture.destination, 'typescript');
    const matchResult = matchTypeScriptOwners(template.analysis!, destination.analysis!);
    expect(
      matchResult.matched.map(({ templatePath, destinationPath }) => [templatePath, destinationPath])
    ).toEqual(matchingFixture.expected.matched);
    expect(matchResult.unmatchedTemplate).toEqual(matchingFixture.expected.unmatched_template);
    expect(matchResult.unmatchedDestination).toEqual(matchingFixture.expected.unmatched_destination);

    const mergeResult = mergeTypeScript(mergeFixture.template, mergeFixture.destination, 'typescript');
    expect(mergeResult.ok).toBe(mergeFixture.expected.ok);
    expect(mergeResult.output).toBe(mergeFixture.expected.output);
  });

  it('conforms to the slice-116 provider parity fixture', () => {
    const fixture = readFixture<{
      dialect: 'typescript';
      source: string;
      template: string;
      destination: string;
      expected: {
        owners: Array<{ path: string; owner_kind: string; match_key?: string }>;
        output: string;
      };
    }>('typescript', 'slice-116-native', 'module-parity.json');

    const result = parseTypeScript(fixture.source, fixture.dialect);
    expect(result.ok).toBe(true);
    expect(
      result.analysis?.owners.map((owner) => ({
        path: owner.path,
        owner_kind: owner.ownerKind,
        ...(owner.matchKey ? { match_key: owner.matchKey } : {})
      }))
    ).toEqual(fixture.expected.owners);

    const mergeResult = mergeTypeScript(fixture.template, fixture.destination, fixture.dialect);
    expect(mergeResult.ok).toBe(true);
    expect(mergeResult.output).toBe(fixture.expected.output);
  });

  it('conforms to the provider named-suite plan and manifest-report fixtures', () => {
    const plansFixture = readFixture<{
      manifest: ConformanceManifest;
      contexts: { typescript_compiler: Record<string, unknown> };
      expected_entries: { typescript_compiler: unknown };
    }>(
      'diagnostics',
      'slice-275-typescript-provider-named-suite-plans',
      'typescript-typescript-provider-named-suite-plans.json'
    );
    const reportFixture = readFixture<{
      manifest: ConformanceManifest;
      options: { typescript_compiler: { contexts: Record<string, unknown> } };
      executions: { typescript_compiler: Record<string, ConformanceCaseExecution> };
      expected_reports: { typescript_compiler: unknown };
    }>(
      'diagnostics',
      'slice-276-typescript-provider-manifest-report',
      'typescript-typescript-provider-manifest-report.json'
    );

    expect(
      planNamedConformanceSuites(
        plansFixture.manifest,
        normalizeFixtureValue(
          plansFixture.contexts.typescript_compiler
        ) as Readonly<Record<string, ConformanceFamilyPlanContext>>
      )
    ).toEqual(normalizeFixtureValue(plansFixture.expected_entries.typescript_compiler));

    const entries = reportPlannedNamedConformanceSuites(
      planNamedConformanceSuites(
        reportFixture.manifest,
        normalizeFixtureValue(
          reportFixture.options.typescript_compiler.contexts
        ) as Readonly<Record<string, ConformanceFamilyPlanContext>>
      ),
      (run) => {
        const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
        return reportFixture.executions.typescript_compiler[key] ?? {
          outcome: 'failed',
          messages: ['missing execution']
        };
      }
    );

    expect(reportNamedConformanceSuiteEnvelope(entries)).toEqual(
      normalizeFixtureValue(reportFixture.expected_reports.typescript_compiler)
    );
  });
});
