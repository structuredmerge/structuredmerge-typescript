import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  planNamedConformanceSuites,
  reportNamedConformanceSuiteEnvelope,
  reportPlannedNamedConformanceSuites,
  type ConformanceManifest,
  type ConformanceCaseExecution
} from '@structuredmerge/ast-merge';
import {
  availableMarkdownBackends,
  markdownEmbeddedFamilies,
  markdownBackendFeatureProfile,
  markdownFeatureProfile,
  markdownPlanContext,
  matchMarkdownOwners,
  parseMarkdown
} from '../src/index';

function readFixture(...parts: string[]): Record<string, unknown> {
  return JSON.parse(
    readFileSync(resolve(__dirname, '..', '..', '..', '..', 'fixtures', ...parts), 'utf8')
  ) as Record<string, unknown>;
}

describe('markdown-it-merge shared fixtures', () => {
  it('conforms to the provider feature-profile fixture', () => {
    const familyFixture = readFixture(
      'diagnostics',
      'slice-194-markdown-family-feature-profile',
      'markdown-feature-profile.json'
    );
    const fixture = readFixture(
      'diagnostics',
      'slice-204-markdown-provider-feature-profiles',
      'typescript-markdown-provider-feature-profiles.json'
    );
    const familyProfile = familyFixture.feature_profile as Record<string, unknown>;
    expect(markdownFeatureProfile()).toEqual({
      family: familyProfile.family,
      supportedDialects: familyProfile.supported_dialects,
      supportedPolicies: familyProfile.supported_policies
    });
    expect(availableMarkdownBackends()).toEqual(['markdown-it']);
    const providerProfile = (
      (fixture.providers as Record<string, Record<string, Record<string, unknown>>>)[
        'markdown-it'
      ] as Record<string, Record<string, unknown>>
    ).feature_profile;
    expect(markdownBackendFeatureProfile()).toEqual({
      family: providerProfile.family,
      supportedDialects: providerProfile.supported_dialects,
      supportedPolicies: providerProfile.supported_policies,
      backend: providerProfile.backend,
      backendRef: (providerProfile.backendRef ??
        providerProfile.backend_ref) as Record<string, unknown> | undefined
    });
  });

  it('conforms to the provider plan-context fixture', () => {
    const fixture = readFixture(
      'diagnostics',
      'slice-205-markdown-provider-plan-contexts',
      'typescript-markdown-provider-plan-contexts.json'
    );
    const providerContext = (fixture.providers as Record<string, Record<string, unknown>>)[
      'markdown-it'
    ];
    expect(markdownPlanContext()).toEqual({
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

  it('conforms to the shared Markdown analysis and matching fixtures', () => {
    const analysisFixture = readFixture(
      'markdown',
      'slice-198-analysis',
      'headings-and-code-fences.json'
    );
    const matchingFixture = readFixture('markdown', 'slice-199-matching', 'path-equality.json');

    const analysis = parseMarkdown(
      analysisFixture.source as string,
      analysisFixture.dialect as 'markdown'
    );
    expect(analysis.ok).toBe(true);
    expect(analysis.analysis?.rootKind).toBe('document');

    const template = parseMarkdown(
      matchingFixture.template as string,
      matchingFixture.dialect as 'markdown'
    );
    const destination = parseMarkdown(
      matchingFixture.destination as string,
      matchingFixture.dialect as 'markdown'
    );
    expect(template.ok).toBe(true);
    expect(destination.ok).toBe(true);

    const result = matchMarkdownOwners(template.analysis!, destination.analysis!);
    expect(result.matched.map((match) => [match.templatePath, match.destinationPath])).toEqual(
      (matchingFixture.expected as Record<string, unknown>).matched as string[][]
    );
    expect(result.unmatchedTemplate).toEqual(
      (matchingFixture.expected as Record<string, unknown>).unmatched_template as string[]
    );
    expect(result.unmatchedDestination).toEqual(
      (matchingFixture.expected as Record<string, unknown>).unmatched_destination as string[]
    );
  });

  it('conforms to the slice-208 embedded-family fixture', () => {
    const fixture = readFixture(
      'markdown',
      'slice-208-embedded-families',
      'code-fence-families.json'
    );
    const analysis = parseMarkdown(fixture.source as string, 'markdown');
    expect(analysis.ok).toBe(true);
    expect(markdownEmbeddedFamilies(analysis.analysis!)).toEqual(fixture.expected);
  });

  it('conforms to the provider named-suite plan fixture', () => {
    const fixture = readFixture(
      'diagnostics',
      'slice-206-markdown-provider-named-suite-plans',
      'typescript-markdown-provider-named-suite-plans.json'
    );

    const actual = planNamedConformanceSuites(fixture.manifest as ConformanceManifest, {
      markdown: markdownPlanContext()
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
      'slice-207-markdown-provider-manifest-report',
      'typescript-markdown-provider-manifest-report.json'
    );

    const entries = reportPlannedNamedConformanceSuites(
      planNamedConformanceSuites(fixture.manifest as ConformanceManifest, {
        markdown: markdownPlanContext()
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
