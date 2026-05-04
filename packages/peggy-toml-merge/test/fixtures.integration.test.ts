import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  planNamedConformanceSuites,
  reportNamedConformanceSuiteEnvelope,
  reportPlannedNamedConformanceSuites,
  type ConformanceCaseExecution,
  type ConformanceManifest
} from '@structuredmerge/ast-merge';
import {
  matchTomlOwners,
  mergeToml,
  parseToml,
  tomlBackendFeatureProfile,
  tomlFeatureProfile,
  tomlPlanContext
} from '../src/index';

function readFixture(...parts: string[]): Record<string, unknown> {
  return JSON.parse(
    readFileSync(resolve(__dirname, '..', '..', '..', '..', 'fixtures', ...parts), 'utf8')
  ) as Record<string, unknown>;
}

describe('peggy-toml-merge shared fixtures', () => {
  it('conforms to the provider feature-profile fixture', () => {
    const familyFixture = readFixture(
      'diagnostics',
      'slice-90-toml-family-feature-profile',
      'toml-feature-profile.json'
    );
    const fixture = readFixture(
      'diagnostics',
      'slice-269-toml-provider-feature-profiles',
      'typescript-toml-provider-feature-profiles.json'
    );
    const familyProfile = familyFixture.feature_profile as Record<string, unknown>;
    const providerProfile = (
      (fixture.providers as Record<string, Record<string, Record<string, unknown>>>)
        .peggy as Record<string, Record<string, unknown>>
    ).feature_profile;

    expect(tomlFeatureProfile()).toEqual({
      family: familyProfile.family,
      supportedDialects: familyProfile.supported_dialects,
      supportedPolicies: familyProfile.supported_policies
    });
    expect(tomlBackendFeatureProfile()).toEqual({
      family: providerProfile.family,
      supportedDialects: providerProfile.supported_dialects,
      supportedPolicies: providerProfile.supported_policies,
      backend: providerProfile.backend,
      backendRef: (providerProfile.backendRef ?? providerProfile.backend_ref) as
        | Record<string, unknown>
        | undefined
    });
  });

  it('conforms to the provider plan-context fixture', () => {
    const fixture = readFixture(
      'diagnostics',
      'slice-270-toml-provider-plan-contexts',
      'typescript-toml-provider-plan-contexts.json'
    );
    const providerContext = (fixture.providers as Record<string, Record<string, unknown>>).peggy;

    expect(tomlPlanContext()).toEqual({
      familyProfile: {
        family: (providerContext.family_profile as Record<string, unknown>).family,
        supportedDialects: (providerContext.family_profile as Record<string, unknown>)
          .supported_dialects,
        supportedPolicies: (providerContext.family_profile as Record<string, unknown>)
          .supported_policies
      },
      featureProfile: {
        backend: (providerContext.feature_profile as Record<string, unknown>).backend,
        supportsDialects: (providerContext.feature_profile as Record<string, unknown>)
          .supports_dialects,
        supportedPolicies: (providerContext.feature_profile as Record<string, unknown>)
          .supported_policies
      }
    });
  });

  it('conforms to the shared TOML parse, matching, and merge fixtures', () => {
    const validFixture = readFixture('toml', 'slice-91-parse', 'valid-document.json');
    const validResult = parseToml(validFixture.source as string, validFixture.dialect as 'toml');
    expect(validResult.ok).toBe(true);
    expect(validResult.analysis?.rootKind).toBe('table');

    const structureFixture = readFixture('toml', 'slice-92-structure', 'table-and-array.json');
    const structureResult = parseToml(
      structureFixture.source as string,
      structureFixture.dialect as 'toml'
    );
    expect(structureResult.ok).toBe(true);
    expect(
      structureResult.analysis?.owners.map((owner) => ({
        path: owner.path,
        owner_kind: owner.ownerKind,
        ...(owner.matchKey ? { match_key: owner.matchKey } : {})
      }))
    ).toEqual((structureFixture.expected as Record<string, unknown>).owners);

    const matchingFixture = readFixture('toml', 'slice-93-matching', 'path-equality.json');
    const template = parseToml(matchingFixture.template as string, 'toml');
    const destination = parseToml(matchingFixture.destination as string, 'toml');
    const matching = matchTomlOwners(template.analysis!, destination.analysis!);
    expect(matching.matched.map((match) => [match.templatePath, match.destinationPath])).toEqual(
      (matchingFixture.expected as Record<string, unknown>).matched as string[][]
    );
    expect(matching.unmatchedTemplate).toEqual(
      (matchingFixture.expected as Record<string, unknown>).unmatched_template as string[]
    );
    expect(matching.unmatchedDestination).toEqual(
      (matchingFixture.expected as Record<string, unknown>).unmatched_destination as string[]
    );

    const mergeFixture = readFixture('toml', 'slice-94-merge', 'table-merge.json');
    const merged = mergeToml(
      mergeFixture.template as string,
      mergeFixture.destination as string,
      'toml'
    );
    expect(merged.ok).toBe(true);
    expect(merged.output).toBe((mergeFixture.expected as Record<string, unknown>).output);
  });

  it('conforms to the provider named-suite plan fixture', () => {
    const fixture = readFixture(
      'diagnostics',
      'slice-271-toml-provider-named-suite-plans',
      'typescript-toml-provider-named-suite-plans.json'
    );

    const actual = planNamedConformanceSuites(fixture.manifest as ConformanceManifest, {
      toml: tomlPlanContext()
    }).map((entry) => ({
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
    }));

    expect(actual).toEqual(fixture.expected_entries);
  });

  it('conforms to the provider manifest-report fixture', () => {
    const fixture = readFixture(
      'diagnostics',
      'slice-272-toml-provider-manifest-report',
      'typescript-toml-provider-manifest-report.json'
    );

    const entries = reportPlannedNamedConformanceSuites(
      planNamedConformanceSuites(fixture.manifest as ConformanceManifest, {
        toml: tomlPlanContext()
      }),
      (run) => {
        const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
        return (
          (fixture.executions as Record<string, ConformanceCaseExecution>)[key] ?? {
            outcome: 'failed',
            messages: ['missing execution']
          }
        );
      }
    );

    expect(reportNamedConformanceSuiteEnvelope(entries)).toEqual(fixture.expected_report);
  });
});
