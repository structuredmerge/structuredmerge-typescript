import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type {
  DiagnosticCategory,
  DiagnosticSeverity,
  FamilyFeatureProfile,
  PolicyReference,
  PolicySurface
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

function readFixture<T>(...segments: string[]): T {
  const fixturePath = path.resolve(process.cwd(), '..', 'fixtures', ...segments);

  return JSON.parse(readFileSync(fixturePath, 'utf8')) as T;
}

describe('ast-merge shared fixtures', () => {
  it('conforms to the slice-02 diagnostic vocabulary fixture', () => {
    const fixture = readFixture<DiagnosticFixture>(
      'diagnostics',
      'slice-02-core',
      'diagnostic-categories.json'
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
    const fixture = readFixture<PolicyFixture>(
      'diagnostics',
      'slice-17-policy-vocabulary',
      'policy-references.json'
    );

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
      'diagnostics',
      'slice-18-policy-reporting',
      'result-policies.json'
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
    const fixture = readFixture<FamilyFeatureProfileFixture>(
      'diagnostics',
      'slice-22-shared-family-feature-profile',
      'family-feature-profile.json'
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
});
