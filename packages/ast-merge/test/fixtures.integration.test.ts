import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type {
  ConformanceCaseRef,
  ConformanceCaseResult,
  ConformanceManifest,
  ConformanceOutcome,
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
});
