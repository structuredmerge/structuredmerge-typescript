import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  matchRubyOwners,
  parseRuby,
  rubyDelegatedChildOperations,
  rubyDiscoveredSurfaces,
  rubyFeatureProfile
} from '../src/index';

interface FixtureSurfaceOwner {
  readonly kind: string;
  readonly address: string;
}

interface FixtureSurfaceSpan {
  readonly start_line: number;
  readonly end_line: number;
}

interface FixtureSurface {
  readonly surface_kind: string;
  readonly declared_language?: string;
  readonly effective_language: string;
  readonly address: string;
  readonly parent_address?: string;
  readonly owner: FixtureSurfaceOwner;
  readonly span?: FixtureSurfaceSpan;
  readonly reconstruction_strategy: string;
  readonly metadata?: Record<string, unknown>;
}

interface FixtureChildOperation {
  readonly operation_id: string;
  readonly parent_operation_id: string;
  readonly requested_strategy: string;
  readonly language_chain: string[];
  readonly surface: FixtureSurface;
}

function readFixture<T>(...segments: string[]): T {
  const fixturePath = path.resolve(process.cwd(), '..', 'fixtures', ...segments);
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as T;
}

function normalizeSurface(surface: FixtureSurface) {
  return {
    surfaceKind: surface.surface_kind,
    ...(surface.declared_language ? { declaredLanguage: surface.declared_language } : {}),
    effectiveLanguage: surface.effective_language,
    address: surface.address,
    ...(surface.parent_address ? { parentAddress: surface.parent_address } : {}),
    owner: surface.owner,
    ...(surface.span
      ? { span: { startLine: surface.span.start_line, endLine: surface.span.end_line } }
      : {}),
    reconstructionStrategy: surface.reconstruction_strategy,
    ...(surface.metadata ? { metadata: surface.metadata } : {})
  };
}

function normalizeChildOperation(operation: FixtureChildOperation) {
  return {
    operationId: operation.operation_id,
    parentOperationId: operation.parent_operation_id,
    requestedStrategy: operation.requested_strategy,
    languageChain: operation.language_chain,
    surface: normalizeSurface(operation.surface)
  };
}

describe('ruby-merge shared fixtures', () => {
  it('conforms to the Ruby family fixtures', () => {
    const profileFixture = readFixture<{
      feature_profile: {
        family: 'ruby';
        supported_dialects: ['ruby'];
        supported_policies: Array<{ surface: 'array'; name: string }>;
      };
    }>('diagnostics', 'slice-214-ruby-family-feature-profile', 'ruby-feature-profile.json');
    expect(rubyFeatureProfile()).toEqual({
      family: profileFixture.feature_profile.family,
      supportedDialects: profileFixture.feature_profile.supported_dialects,
      supportedPolicies: profileFixture.feature_profile.supported_policies
    });

    const analysisFixture = readFixture<{
      dialect: 'ruby';
      source: string;
      expected: { owners: Array<{ path: string; owner_kind: string; match_key?: string }> };
    }>('ruby', 'slice-218-analysis', 'module-owners.json');
    const analysis = parseRuby(analysisFixture.source, analysisFixture.dialect);
    expect(analysis.ok).toBe(true);
    expect(
      analysis.analysis?.owners.map((owner) => ({
        path: owner.path,
        owner_kind: owner.ownerKind,
        ...(owner.matchKey ? { match_key: owner.matchKey } : {})
      }))
    ).toEqual(analysisFixture.expected.owners);

    const matchingFixture = readFixture<{
      template: string;
      destination: string;
      expected: {
        matched: Array<[string, string]>;
        unmatched_template: string[];
        unmatched_destination: string[];
      };
    }>('ruby', 'slice-219-matching', 'path-equality.json');
    const template = parseRuby(matchingFixture.template, 'ruby');
    const destination = parseRuby(matchingFixture.destination, 'ruby');
    const matched = matchRubyOwners(template.analysis!, destination.analysis!);
    expect(
      matched.matched.map(({ templatePath, destinationPath }) => [templatePath, destinationPath])
    ).toEqual(matchingFixture.expected.matched);
    expect(matched.unmatchedTemplate).toEqual(matchingFixture.expected.unmatched_template);
    expect(matched.unmatchedDestination).toEqual(matchingFixture.expected.unmatched_destination);

    const surfacesFixture = readFixture<{
      source: string;
      expected: FixtureSurface[];
    }>('ruby', 'slice-220-discovered-surfaces', 'doc-comment-surfaces.json');
    const surfaceAnalysis = parseRuby(surfacesFixture.source, 'ruby');
    expect(rubyDiscoveredSurfaces(surfaceAnalysis.analysis!)).toEqual(
      surfacesFixture.expected.map((surface) => normalizeSurface(surface))
    );

    const childFixture = readFixture<{
      source: string;
      parent_operation_id: string;
      expected: FixtureChildOperation[];
    }>('ruby', 'slice-221-delegated-child-operations', 'yard-example-child-operations.json');
    const childAnalysis = parseRuby(childFixture.source, 'ruby');
    expect(
      rubyDelegatedChildOperations(childAnalysis.analysis!, childFixture.parent_operation_id)
    ).toEqual(childFixture.expected.map((operation) => normalizeChildOperation(operation)));
  });
});
