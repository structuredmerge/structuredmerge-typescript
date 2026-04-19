import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type {
  ConformanceCaseRef,
  ConformanceCaseRun,
  ConformanceCaseExecution,
  ConformanceCaseRequirements,
  ConformanceCaseSelection,
  ConformanceCaseResult,
  ConformanceFamilyPlanContext,
  ConformanceManifest,
  NamedConformanceSuiteReport,
  NamedConformanceSuitePlan,
  NamedConformanceSuiteResults,
  NamedConformanceSuiteReportEnvelope,
  ConformanceOutcome,
  ConformanceSuiteDefinition,
  ConformanceSuitePlan,
  ConformanceSuiteReport,
  ConformanceSuiteSummary,
  DiagnosticCategory,
  DiagnosticSeverity,
  FamilyFeatureProfile,
  PolicyReference,
  PolicySurface
} from '../src/index';
import {
  conformanceFamilyFeatureProfilePath,
  conformanceFixturePath,
  conformanceSuiteDefinition,
  conformanceSuiteNames,
  planConformanceSuite,
  planNamedConformanceSuiteEntry,
  planNamedConformanceSuites,
  planNamedConformanceSuite,
  reportNamedConformanceSuiteEnvelope,
  reportNamedConformanceSuiteManifest,
  reportNamedConformanceSuiteEntry,
  reportNamedConformanceSuite,
  reportPlannedNamedConformanceSuites,
  reportPlannedConformanceSuite,
  reportConformanceSuite,
  runConformanceCase,
  runNamedConformanceSuiteEntry,
  runNamedConformanceSuite,
  runPlannedNamedConformanceSuites,
  runPlannedConformanceSuite,
  runConformanceSuite,
  selectConformanceCase,
  summarizeNamedConformanceSuiteReports,
  summarizeConformanceResults
} from '../src/index';

interface DiagnosticFixture {
  severities: DiagnosticSeverity[];
  categories: DiagnosticCategory[];
}

interface PolicyFixture {
  surfaces: PolicySurface[];
  policies: PolicyReference[];
}

interface PolicyReportingFixture {
  merge_policies: PolicyReference[];
}

interface FamilyFeatureProfileFixture {
  feature_profile: {
    family: string;
    supported_dialects: string[];
    supported_policies: PolicyReference[];
  };
}

interface ConformanceRunnerFixture {
  case_ref: ConformanceCaseRef;
  result: {
    ref: ConformanceCaseRef;
    outcome: ConformanceOutcome;
    messages: string[];
  };
}

interface ConformanceSummaryFixture {
  results: ConformanceCaseResult[];
  summary: ConformanceSuiteSummary;
}

interface ConformanceSelectionFixtureCase {
  ref: ConformanceCaseRef;
  family_profile: {
    family: string;
    supported_dialects: string[];
    supported_policies: PolicyReference[];
  };
  feature_profile: {
    backend: string;
    supports_dialects: boolean;
    supported_policies: PolicyReference[];
  };
  requirements: ConformanceCaseRequirements;
  expected: ConformanceCaseSelection;
}

interface ConformanceSelectionFixture {
  cases: ConformanceSelectionFixtureCase[];
}

interface ConformanceCaseRunnerFixtureCase {
  run: {
    ref: ConformanceCaseRef;
    requirements: ConformanceCaseRequirements;
    family_profile: {
      family: string;
      supported_dialects: string[];
      supported_policies: PolicyReference[];
    };
    feature_profile?: {
      backend: string;
      supports_dialects: boolean;
      supported_policies: PolicyReference[];
    };
  };
  execution: ConformanceCaseExecution;
  expected: ConformanceCaseResult;
}

interface ConformanceCaseRunnerFixture {
  cases: ConformanceCaseRunnerFixtureCase[];
}

interface ConformanceSuiteRunnerFixture {
  cases: Array<{
    ref: ConformanceCaseRef;
    requirements: ConformanceCaseRequirements;
    family_profile: {
      family: string;
      supported_dialects: string[];
      supported_policies: PolicyReference[];
    };
    feature_profile?: {
      backend: string;
      supports_dialects: boolean;
      supported_policies: PolicyReference[];
    };
  }>;
  executions: Record<string, ConformanceCaseExecution>;
  expected_results: ConformanceCaseResult[];
}

interface ConformanceSuitePlanFixture {
  family: string;
  roles: string[];
  family_profile: {
    family: string;
    supported_dialects: string[];
    supported_policies: PolicyReference[];
  };
  feature_profile?: {
    backend: string;
    supports_dialects: boolean;
    supported_policies: PolicyReference[];
  };
  expected: {
    family: string;
    entries: Array<{
      ref: ConformanceCaseRef;
      path: string[];
      run: {
        ref: ConformanceCaseRef;
        requirements: ConformanceCaseRequirements;
        family_profile: {
          family: string;
          supported_dialects: string[];
          supported_policies: PolicyReference[];
        };
        feature_profile?: {
          backend: string;
          supports_dialects: boolean;
          supported_policies: PolicyReference[];
        };
      };
    }>;
    missing_roles: string[];
  };
}

interface PlannedConformanceSuiteRunnerFixture {
  plan: ConformanceSuitePlanFixture['expected'];
  executions: Record<string, ConformanceCaseExecution>;
  expected_results: ConformanceCaseResult[];
}

interface PlannedConformanceSuiteReportFixture {
  plan: ConformanceSuitePlanFixture['expected'];
  executions: Record<string, ConformanceCaseExecution>;
  expected_report: ConformanceSuiteReport;
}

interface ManifestRequirementsFixture {
  family: string;
  roles: string[];
  family_profile: {
    family: string;
    supported_dialects: string[];
    supported_policies: PolicyReference[];
  };
  expected_requirements: Record<string, ConformanceCaseRequirements>;
}

interface SuiteDefinitionsFixture {
  suite_name: string;
  expected: ConformanceSuiteDefinition;
}

interface NamedSuiteReportFixture {
  suite_name: string;
  family_profile: {
    family: string;
    supported_dialects: string[];
    supported_policies: PolicyReference[];
  };
  executions: Record<string, ConformanceCaseExecution>;
  expected_report: ConformanceSuiteReport;
}

interface NamedSuiteRunnerFixture {
  suite_name: string;
  family_profile: NamedSuiteReportFixture['family_profile'];
  executions: Record<string, ConformanceCaseExecution>;
  expected_results: ConformanceCaseResult[];
}

interface SuiteNamesFixture {
  suite_names: string[];
}

interface NamedSuiteEntryFixture {
  suite_name: string;
  family_profile: NamedSuiteReportFixture['family_profile'];
  executions: Record<string, ConformanceCaseExecution>;
  expected_entry: NamedConformanceSuiteReport;
}

interface FamilyPlanContextFixture {
  context: ConformanceFamilyPlanContext;
}

interface NamedSuitePlanEntryFixture {
  suite_name: string;
  context: ConformanceFamilyPlanContext;
  expected_entry: NamedConformanceSuitePlan;
}

interface NamedSuitePlansFixture {
  contexts: Record<string, ConformanceFamilyPlanContext>;
  expected_entries: NamedConformanceSuitePlan[];
}

interface NamedSuiteResultsFixture {
  suite_name: string;
  family_profile: NamedSuiteReportFixture['family_profile'];
  executions: Record<string, ConformanceCaseExecution>;
  expected_entry: NamedConformanceSuiteResults;
}

interface NamedSuiteRunnerEntriesFixture {
  contexts: Record<string, ConformanceFamilyPlanContext>;
  executions: Record<string, ConformanceCaseExecution>;
  expected_entries: NamedConformanceSuiteResults[];
}

interface NamedSuiteReportEntriesFixture {
  contexts: Record<string, ConformanceFamilyPlanContext>;
  executions: Record<string, ConformanceCaseExecution>;
  expected_entries: NamedConformanceSuiteReport[];
}

interface NamedSuiteSummaryFixture {
  entries: NamedConformanceSuiteReport[];
  expected_summary: ConformanceSuiteSummary;
}

interface NamedSuiteReportEnvelopeFixture {
  entries: NamedConformanceSuiteReport[];
  expected_report: NamedConformanceSuiteReportEnvelope;
}

interface NamedSuiteReportManifestFixture {
  contexts: Record<string, ConformanceFamilyPlanContext>;
  executions: Record<string, ConformanceCaseExecution>;
  expected_report: NamedConformanceSuiteReportEnvelope;
}

function readFixture<T>(...segments: string[]): T {
  const fixturePath = path.resolve(process.cwd(), '..', 'fixtures', ...segments);

  return JSON.parse(readFileSync(fixturePath, 'utf8')) as T;
}

function diagnosticsFixturePath(role: string): string[] {
  const manifest = readFixture<ConformanceManifest>(
    'conformance',
    'slice-24-manifest',
    'family-feature-profiles.json'
  );
  const entry = conformanceFixturePath(manifest, 'diagnostics', role);

  if (!entry) {
    throw new Error(`missing diagnostics fixture entry for ${role}`);
  }

  return [...entry];
}

function normalizeFamilyPlanContext(raw: {
  family_profile: NamedSuiteReportFixture['family_profile'];
  feature_profile?: {
    backend: string;
    supports_dialects: boolean;
    supported_policies: PolicyReference[];
  };
}): ConformanceFamilyPlanContext {
  return {
    familyProfile: {
      family: raw.family_profile.family,
      supportedDialects: raw.family_profile.supported_dialects,
      supportedPolicies: raw.family_profile.supported_policies
    },
    featureProfile: raw.feature_profile
      ? {
          backend: raw.feature_profile.backend,
          supportsDialects: raw.feature_profile.supports_dialects,
          supportedPolicies: raw.feature_profile.supported_policies
        }
      : undefined
  };
}

function normalizeSuitePlan(raw: {
  suite: string;
  plan: {
    family: string;
    entries: Array<{
      ref: ConformanceCaseRef;
      path: string[];
      run: {
        ref: ConformanceCaseRef;
        requirements: ConformanceCaseRequirements;
        family_profile: NamedSuiteReportFixture['family_profile'];
        feature_profile?: {
          backend: string;
          supports_dialects: boolean;
          supported_policies: PolicyReference[];
        };
      };
    }>;
    missing_roles: string[];
  };
}): NamedConformanceSuitePlan {
  return {
    suite: raw.suite,
    plan: {
      family: raw.plan.family,
      entries: raw.plan.entries.map((entry) => ({
        ref: entry.ref,
        path: entry.path,
        run: {
          ref: entry.run.ref,
          requirements: entry.run.requirements,
          familyProfile: {
            family: entry.run.family_profile.family,
            supportedDialects: entry.run.family_profile.supported_dialects,
            supportedPolicies: entry.run.family_profile.supported_policies
          },
          featureProfile: entry.run.feature_profile
            ? {
                backend: entry.run.feature_profile.backend,
                supportsDialects: entry.run.feature_profile.supports_dialects,
                supportedPolicies: entry.run.feature_profile.supported_policies
              }
            : undefined
        }
      })),
      missingRoles: raw.plan.missing_roles
    }
  };
}

function normalizeSuiteResults(raw: {
  suite: string;
  results: ConformanceCaseResult[];
}): NamedConformanceSuiteResults {
  return {
    suite: raw.suite,
    results: raw.results
  };
}

function normalizeSuiteReportEnvelope(raw: {
  entries: readonly NamedConformanceSuiteReport[];
  summary: ConformanceSuiteSummary;
}): NamedConformanceSuiteReportEnvelope {
  return {
    entries: raw.entries,
    summary: raw.summary
  };
}

describe('ast-merge shared fixtures', () => {
  it('conforms to the slice-02 diagnostic vocabulary fixture', () => {
    const fixture = readFixture<DiagnosticFixture>(
      ...diagnosticsFixturePath('diagnostic_vocabulary')
    );

    const severities: DiagnosticSeverity[] = ['info', 'warning', 'error'];
    const categories: DiagnosticCategory[] = [
      'parse_error',
      'destination_parse_error',
      'unsupported_feature',
      'fallback_applied',
      'ambiguity'
    ];

    expect(severities).toEqual(fixture.severities);
    expect(categories).toEqual(fixture.categories);
  });

  it('conforms to the slice-17 policy vocabulary fixture', () => {
    const fixture = readFixture<PolicyFixture>(...diagnosticsFixturePath('policy_vocabulary'));

    const surfaces: PolicySurface[] = ['fallback', 'array'];
    const policies: PolicyReference[] = [
      {
        surface: 'fallback',
        name: 'trailing_comma_destination_fallback'
      },
      {
        surface: 'array',
        name: 'destination_wins_array'
      }
    ];

    expect(surfaces).toEqual(fixture.surfaces);
    expect(policies).toEqual(fixture.policies);
  });

  it('conforms to the slice-18 policy reporting fixture', () => {
    const fixture = readFixture<PolicyReportingFixture>(
      ...diagnosticsFixturePath('policy_reporting')
    );

    const mergePolicies: PolicyReference[] = [
      {
        surface: 'array',
        name: 'destination_wins_array'
      },
      {
        surface: 'fallback',
        name: 'trailing_comma_destination_fallback'
      }
    ];

    expect(mergePolicies).toEqual(fixture.merge_policies);
  });

  it('conforms to the slice-22 shared family feature profile fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const fixture = readFixture<FamilyFeatureProfileFixture>(
      ...((conformanceFixturePath(manifest, 'diagnostics', 'shared_family_feature_profile') ??
        []) as string[])
    );

    const featureProfile: FamilyFeatureProfile = {
      family: 'example',
      supportedDialects: ['alpha', 'beta'],
      supportedPolicies: [
        {
          surface: 'array',
          name: 'destination_wins_array'
        }
      ]
    };

    expect({
      family: featureProfile.family,
      supported_dialects: featureProfile.supportedDialects,
      supported_policies: featureProfile.supportedPolicies
    }).toEqual(fixture.feature_profile);
  });

  it('conforms to the slice-28 conformance runner shape fixture', () => {
    const fixture = readFixture<ConformanceRunnerFixture>(
      ...diagnosticsFixturePath('runner_shape')
    );

    const caseRef: ConformanceCaseRef = {
      family: 'json',
      role: 'tree_sitter_adapter',
      case: 'valid_strict_json'
    };
    const result: ConformanceCaseResult = {
      ref: caseRef,
      outcome: 'passed',
      messages: []
    };

    expect(caseRef).toEqual(fixture.case_ref);
    expect(result).toEqual(fixture.result);
  });

  it('conforms to the slice-30 normalized manifest contract', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(conformanceFamilyFeatureProfilePath(manifest, 'json')).toEqual([
      'diagnostics',
      'slice-21-family-feature-profile',
      'json-feature-profile.json'
    ]);
    expect(conformanceFixturePath(manifest, 'text', 'analysis')).toEqual([
      'text',
      'slice-03-analysis',
      'whitespace-and-blocks.json'
    ]);
    expect(conformanceFixturePath(manifest, 'diagnostics', 'runner_shape')).toEqual([
      'diagnostics',
      'slice-28-conformance-runner',
      'runner-shape.json'
    ]);
  });

  it('conforms to the slice-32 conformance suite summary fixture', () => {
    const fixture = readFixture<ConformanceSummaryFixture>(
      ...diagnosticsFixturePath('runner_summary')
    );

    expect(summarizeConformanceResults(fixture.results)).toEqual(fixture.summary);
  });

  it('conforms to the slice-33 capability-aware selection fixture', () => {
    const fixture = readFixture<ConformanceSelectionFixture>(
      ...diagnosticsFixturePath('capability_selection')
    );

    for (const testCase of fixture.cases) {
      const selection = selectConformanceCase(
        testCase.ref,
        testCase.requirements,
        {
          family: testCase.family_profile.family,
          supportedDialects: testCase.family_profile.supported_dialects,
          supportedPolicies: testCase.family_profile.supported_policies
        },
        {
          backend: testCase.feature_profile.backend,
          supportsDialects: testCase.feature_profile.supports_dialects,
          supportedPolicies: testCase.feature_profile.supported_policies
        }
      );

      expect(selection.ref).toEqual(testCase.ref);
      expect({
        status: selection.status,
        messages: selection.messages
      }).toEqual(testCase.expected);
    }
  });

  it('conforms to the slice-34 conformance case runner fixture', () => {
    const fixture = readFixture<ConformanceCaseRunnerFixture>(
      ...diagnosticsFixturePath('case_runner')
    );

    for (const testCase of fixture.cases) {
      const run: ConformanceCaseRun = {
        ref: testCase.run.ref,
        requirements: testCase.run.requirements,
        familyProfile: {
          family: testCase.run.family_profile.family,
          supportedDialects: testCase.run.family_profile.supported_dialects,
          supportedPolicies: testCase.run.family_profile.supported_policies
        },
        ...(testCase.run.feature_profile
          ? {
              featureProfile: {
                backend: testCase.run.feature_profile.backend,
                supportsDialects: testCase.run.feature_profile.supports_dialects,
                supportedPolicies: testCase.run.feature_profile.supported_policies
              }
            }
          : {})
      };

      expect(runConformanceCase(run, () => testCase.execution)).toEqual(testCase.expected);
    }
  });

  it('conforms to the slice-35 conformance suite runner fixture', () => {
    const fixture = readFixture<ConformanceSuiteRunnerFixture>(
      ...diagnosticsFixturePath('suite_runner')
    );

    const runs: ConformanceCaseRun[] = fixture.cases.map((testCase) => ({
      ref: testCase.ref,
      requirements: testCase.requirements,
      familyProfile: {
        family: testCase.family_profile.family,
        supportedDialects: testCase.family_profile.supported_dialects,
        supportedPolicies: testCase.family_profile.supported_policies
      },
      ...(testCase.feature_profile
        ? {
            featureProfile: {
              backend: testCase.feature_profile.backend,
              supportsDialects: testCase.feature_profile.supports_dialects,
              supportedPolicies: testCase.feature_profile.supported_policies
            }
          }
        : {})
    }));

    expect(
      runConformanceSuite(runs, (run) => {
        const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
        return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
      })
    ).toEqual(fixture.expected_results);
  });

  it('conforms to the slice-36 conformance suite report fixture', () => {
    const fixture = readFixture<{
      results: ConformanceCaseResult[];
      report: ConformanceSuiteReport;
    }>(...diagnosticsFixturePath('suite_report'));

    expect(reportConformanceSuite(fixture.results)).toEqual(fixture.report);
  });

  it('conforms to the slice-39 conformance suite-plan fixture', () => {
    const fixture = readFixture<ConformanceSuitePlanFixture>(
      ...diagnosticsFixturePath('suite_plan')
    );
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    const plan = planConformanceSuite(
      manifest,
      fixture.family,
      fixture.roles,
      {
        family: fixture.family_profile.family,
        supportedDialects: fixture.family_profile.supported_dialects,
        supportedPolicies: fixture.family_profile.supported_policies
      },
      fixture.feature_profile
        ? {
            backend: fixture.feature_profile.backend,
            supportsDialects: fixture.feature_profile.supports_dialects,
            supportedPolicies: fixture.feature_profile.supported_policies
          }
        : undefined
    );

    const expected: ConformanceSuitePlan = {
      family: fixture.expected.family,
      entries: fixture.expected.entries.map((entry) => ({
        ref: entry.ref,
        path: entry.path,
        run: {
          ref: entry.run.ref,
          requirements: entry.run.requirements,
          familyProfile: {
            family: entry.run.family_profile.family,
            supportedDialects: entry.run.family_profile.supported_dialects,
            supportedPolicies: entry.run.family_profile.supported_policies
          },
          featureProfile: entry.run.feature_profile
            ? {
                backend: entry.run.feature_profile.backend,
                supportsDialects: entry.run.feature_profile.supports_dialects,
                supportedPolicies: entry.run.feature_profile.supported_policies
              }
            : undefined
        }
      })),
      missingRoles: fixture.expected.missing_roles
    };

    expect(plan).toEqual(expected);
  });

  it('conforms to the slice-40 planned conformance suite-runner fixture', () => {
    const fixture = readFixture<PlannedConformanceSuiteRunnerFixture>(
      ...diagnosticsFixturePath('planned_suite_runner')
    );

    const plan: ConformanceSuitePlan = {
      family: fixture.plan.family,
      entries: fixture.plan.entries.map((entry) => ({
        ref: entry.ref,
        path: entry.path,
        run: {
          ref: entry.run.ref,
          requirements: entry.run.requirements,
          familyProfile: {
            family: entry.run.family_profile.family,
            supportedDialects: entry.run.family_profile.supported_dialects,
            supportedPolicies: entry.run.family_profile.supported_policies
          },
          featureProfile: entry.run.feature_profile
            ? {
                backend: entry.run.feature_profile.backend,
                supportsDialects: entry.run.feature_profile.supports_dialects,
                supportedPolicies: entry.run.feature_profile.supported_policies
              }
            : undefined
        }
      })),
      missingRoles: fixture.plan.missing_roles
    };

    expect(
      runPlannedConformanceSuite(plan, (run) => {
        const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
        return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
      })
    ).toEqual(fixture.expected_results);
  });

  it('conforms to the slice-41 planned conformance suite-report fixture', () => {
    const fixture = readFixture<PlannedConformanceSuiteReportFixture>(
      ...diagnosticsFixturePath('planned_suite_report')
    );

    const plan: ConformanceSuitePlan = {
      family: fixture.plan.family,
      entries: fixture.plan.entries.map((entry) => ({
        ref: entry.ref,
        path: entry.path,
        run: {
          ref: entry.run.ref,
          requirements: entry.run.requirements,
          familyProfile: {
            family: entry.run.family_profile.family,
            supportedDialects: entry.run.family_profile.supported_dialects,
            supportedPolicies: entry.run.family_profile.supported_policies
          },
          featureProfile: entry.run.feature_profile
            ? {
                backend: entry.run.feature_profile.backend,
                supportsDialects: entry.run.feature_profile.supports_dialects,
                supportedPolicies: entry.run.feature_profile.supported_policies
              }
            : undefined
        }
      })),
      missingRoles: fixture.plan.missing_roles
    };

    expect(
      reportPlannedConformanceSuite(plan, (run) => {
        const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
        return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
      })
    ).toEqual(fixture.expected_report);
  });

  it('conforms to the slice-42 manifest case-requirements fixture', () => {
    const fixture = readFixture<ManifestRequirementsFixture>(
      ...diagnosticsFixturePath('manifest_requirements')
    );
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    const plan = planConformanceSuite(manifest, fixture.family, fixture.roles, {
      family: fixture.family_profile.family,
      supportedDialects: fixture.family_profile.supported_dialects,
      supportedPolicies: fixture.family_profile.supported_policies
    });

    expect(
      Object.fromEntries(plan.entries.map((entry) => [entry.ref.role, entry.run.requirements]))
    ).toEqual(fixture.expected_requirements);
  });

  it('conforms to the slice-43 conformance suite-definitions fixture', () => {
    const fixture = readFixture<SuiteDefinitionsFixture>(
      ...diagnosticsFixturePath('suite_definitions')
    );
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(conformanceSuiteDefinition(manifest, fixture.suite_name)).toEqual(fixture.expected);
    expect(
      planNamedConformanceSuite(manifest, fixture.suite_name, {
        family: 'json',
        supportedDialects: ['json', 'jsonc'],
        supportedPolicies: [
          { surface: 'array', name: 'destination_wins_array' },
          { surface: 'fallback', name: 'trailing_comma_destination_fallback' }
        ]
      })
    ).toEqual(
      planConformanceSuite(manifest, fixture.expected.family, fixture.expected.roles, {
        family: 'json',
        supportedDialects: ['json', 'jsonc'],
        supportedPolicies: [
          { surface: 'array', name: 'destination_wins_array' },
          { surface: 'fallback', name: 'trailing_comma_destination_fallback' }
        ]
      })
    );
  });

  it('conforms to the slice-44 named conformance suite-report fixture', () => {
    const fixture = readFixture<NamedSuiteReportFixture>(
      ...diagnosticsFixturePath('named_suite_report')
    );
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(
      reportNamedConformanceSuite(
        manifest,
        fixture.suite_name,
        {
          family: fixture.family_profile.family,
          supportedDialects: fixture.family_profile.supported_dialects,
          supportedPolicies: fixture.family_profile.supported_policies
        },
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        },
        {
          backend: 'kreuzberg-language-pack',
          supportsDialects: false,
          supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
        }
      )
    ).toEqual(fixture.expected_report);
  });

  it('conforms to the slice-45 named conformance suite-runner fixture', () => {
    const fixture = readFixture<NamedSuiteRunnerFixture>(
      ...diagnosticsFixturePath('named_suite_runner')
    );
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(
      runNamedConformanceSuite(
        manifest,
        fixture.suite_name,
        {
          family: fixture.family_profile.family,
          supportedDialects: fixture.family_profile.supported_dialects,
          supportedPolicies: fixture.family_profile.supported_policies
        },
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        },
        {
          backend: 'kreuzberg-language-pack',
          supportsDialects: false,
          supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
        }
      )
    ).toEqual(fixture.expected_results);
  });

  it('conforms to the slice-46 conformance suite-names fixture', () => {
    const fixture = readFixture<SuiteNamesFixture>(...diagnosticsFixturePath('suite_names'));
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(conformanceSuiteNames(manifest)).toEqual(fixture.suite_names);
  });

  it('conforms to the slice-47 named conformance suite-entry fixture', () => {
    const fixture = readFixture<NamedSuiteEntryFixture>(
      ...diagnosticsFixturePath('named_suite_entry')
    );
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(
      reportNamedConformanceSuiteEntry(
        manifest,
        fixture.suite_name,
        {
          family: fixture.family_profile.family,
          supportedDialects: fixture.family_profile.supported_dialects,
          supportedPolicies: fixture.family_profile.supported_policies
        },
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        },
        {
          backend: 'kreuzberg-language-pack',
          supportsDialects: false,
          supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
        }
      )
    ).toEqual(fixture.expected_entry);
  });

  it('conforms to the slice-48 named conformance suite plan-entry fixture', () => {
    const fixture = readFixture<NamedSuitePlanEntryFixture>(
      ...diagnosticsFixturePath('named_suite_plan_entry')
    );
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(
      planNamedConformanceSuiteEntry(
        manifest,
        fixture.suite_name,
        normalizeFamilyPlanContext(fixture.context as never)
      )
    ).toEqual(normalizeSuitePlan(fixture.expected_entry as never));
  });

  it('conforms to the slice-49 conformance family plan-context fixture', () => {
    const fixture = readFixture<FamilyPlanContextFixture>(
      ...diagnosticsFixturePath('family_plan_context')
    );

    expect(normalizeFamilyPlanContext(fixture.context as never)).toEqual({
      familyProfile: {
        family: 'json',
        supportedDialects: ['json', 'jsonc'],
        supportedPolicies: [
          { surface: 'array', name: 'destination_wins_array' },
          { surface: 'fallback', name: 'trailing_comma_destination_fallback' }
        ]
      },
      featureProfile: {
        backend: 'kreuzberg-language-pack',
        supportsDialects: false,
        supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
      }
    });
  });

  it('conforms to the slice-50 named conformance suite-plans fixture', () => {
    const fixture = readFixture<NamedSuitePlansFixture>(
      ...diagnosticsFixturePath('named_suite_plans')
    );
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(
      planNamedConformanceSuites(
        manifest,
        Object.fromEntries(
          Object.entries(fixture.contexts).map(([family, context]) => [
            family,
            normalizeFamilyPlanContext(context as never)
          ])
        )
      )
    ).toEqual(fixture.expected_entries.map((entry) => normalizeSuitePlan(entry as never)));
  });

  it('conforms to the slice-51 named conformance suite-results fixture', () => {
    const fixture = readFixture<NamedSuiteResultsFixture>(
      ...diagnosticsFixturePath('named_suite_results')
    );
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(
      runNamedConformanceSuiteEntry(
        manifest,
        fixture.suite_name,
        {
          family: fixture.family_profile.family,
          supportedDialects: fixture.family_profile.supported_dialects,
          supportedPolicies: fixture.family_profile.supported_policies
        },
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        },
        {
          backend: 'kreuzberg-language-pack',
          supportsDialects: false,
          supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
        }
      )
    ).toEqual(normalizeSuiteResults(fixture.expected_entry as never));
  });

  it('conforms to the slice-52 planned named conformance suite-runner fixture', () => {
    const fixture = readFixture<NamedSuiteRunnerEntriesFixture>(
      ...diagnosticsFixturePath('named_suite_runner_entries')
    );
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const plans = planNamedConformanceSuites(
      manifest,
      Object.fromEntries(
        Object.entries(fixture.contexts).map(([family, context]) => [
          family,
          normalizeFamilyPlanContext(context as never)
        ])
      )
    );

    expect(
      runPlannedNamedConformanceSuites(plans, (run) => {
        const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
        return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
      })
    ).toEqual(fixture.expected_entries.map((entry) => normalizeSuiteResults(entry as never)));
  });

  it('conforms to the slice-53 planned named conformance suite-reports fixture', () => {
    const fixture = readFixture<NamedSuiteReportEntriesFixture>(
      ...diagnosticsFixturePath('named_suite_report_entries')
    );
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );
    const plans = planNamedConformanceSuites(
      manifest,
      Object.fromEntries(
        Object.entries(fixture.contexts).map(([family, context]) => [
          family,
          normalizeFamilyPlanContext(context as never)
        ])
      )
    );

    expect(
      reportPlannedNamedConformanceSuites(plans, (run) => {
        const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
        return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
      })
    ).toEqual(fixture.expected_entries);
  });

  it('conforms to the slice-54 named conformance suite-summary fixture', () => {
    const fixture = readFixture<NamedSuiteSummaryFixture>(
      ...diagnosticsFixturePath('named_suite_summary')
    );

    expect(summarizeNamedConformanceSuiteReports(fixture.entries)).toEqual(
      fixture.expected_summary
    );
  });

  it('conforms to the slice-55 named conformance suite-report envelope fixture', () => {
    const fixture = readFixture<NamedSuiteReportEnvelopeFixture>(
      ...diagnosticsFixturePath('named_suite_report_envelope')
    );

    expect(reportNamedConformanceSuiteEnvelope(fixture.entries)).toEqual(
      normalizeSuiteReportEnvelope(fixture.expected_report)
    );
  });

  it('conforms to the slice-56 named conformance suite-report manifest fixture', () => {
    const fixture = readFixture<NamedSuiteReportManifestFixture>(
      ...diagnosticsFixturePath('named_suite_report_manifest')
    );
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-24-manifest',
      'family-feature-profiles.json'
    );

    expect(
      reportNamedConformanceSuiteManifest(
        manifest,
        Object.fromEntries(
          Object.entries(fixture.contexts).map(([family, context]) => [
            family,
            normalizeFamilyPlanContext(context as never)
          ])
        ),
        (run) => {
          const key = `${run.ref.family}:${run.ref.role}:${run.ref.case}`;
          return fixture.executions[key] ?? { outcome: 'failed', messages: ['missing execution'] };
        }
      )
    ).toEqual(normalizeSuiteReportEnvelope(fixture.expected_report));
  });
});
