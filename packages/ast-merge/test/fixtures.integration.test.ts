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
  ConformanceManifest,
  ConformanceOutcome,
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
  reportConformanceSuite,
  runConformanceCase,
  runConformanceSuite,
  selectConformanceCase,
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
});
