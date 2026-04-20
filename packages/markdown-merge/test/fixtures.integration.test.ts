import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  conformanceFamilyFeatureProfilePath,
  conformanceFixturePath,
  type ConformanceManifest
} from '@structuredmerge/ast-merge';
import {
  availableMarkdownBackends,
  markdownBackendFeatureProfile,
  markdownDelegatedChildOperations,
  markdownDiscoveredSurfaces,
  markdownEmbeddedFamilies,
  markdownFeatureProfile,
  markdownPlanContext,
  matchMarkdownOwners,
  parseMarkdown
} from '../src/index';

function readFixture<T>(...segments: string[]): T {
  const fixturePath = path.resolve(process.cwd(), '..', 'fixtures', ...segments);
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as T;
}

describe('markdown-merge shared fixtures', () => {
  it('conforms to the slice-194 Markdown feature profile fixture', () => {
    const fixture = readFixture<{
      feature_profile: {
        family: 'markdown';
        supported_dialects: ['markdown'];
        supported_policies: [];
      };
    }>('diagnostics', 'slice-194-markdown-family-feature-profile', 'markdown-feature-profile.json');

    expect(markdownFeatureProfile()).toEqual({
      family: fixture.feature_profile.family,
      supportedDialects: fixture.feature_profile.supported_dialects,
      supportedPolicies: fixture.feature_profile.supported_policies
    });
  });

  it('conforms to the slice-195 Markdown backend feature profile fixture', () => {
    const fixture = readFixture<{
      native: { backend: 'markdown-it'; supported_policies: [] };
      tree_sitter: { backend: 'kreuzberg-language-pack'; supported_policies: [] };
    }>(
      'diagnostics',
      'slice-195-markdown-family-backend-feature-profiles',
      'typescript-markdown-backend-feature-profiles.json'
    );

    expect(availableMarkdownBackends()).toEqual(['markdown-it', 'kreuzberg-language-pack']);
    expect(markdownBackendFeatureProfile('markdown-it')).toEqual({
      family: 'markdown',
      supportedDialects: ['markdown'],
      supportedPolicies: fixture.native.supported_policies,
      backend: fixture.native.backend
    });
    expect(markdownBackendFeatureProfile('kreuzberg-language-pack')).toEqual({
      family: 'markdown',
      supportedDialects: ['markdown'],
      supportedPolicies: fixture.tree_sitter.supported_policies,
      backend: fixture.tree_sitter.backend
    });
  });

  it('conforms to the slice-196 Markdown plan-context fixture', () => {
    const fixture = readFixture<{
      native: {
        family_profile: {
          family: 'markdown';
          supported_dialects: ['markdown'];
          supported_policies: [];
        };
        feature_profile: {
          backend: 'markdown-it';
          supports_dialects: true;
          supported_policies: [];
        };
      };
      tree_sitter: {
        family_profile: {
          family: 'markdown';
          supported_dialects: ['markdown'];
          supported_policies: [];
        };
        feature_profile: {
          backend: 'kreuzberg-language-pack';
          supports_dialects: false;
          supported_policies: [];
        };
      };
    }>(
      'diagnostics',
      'slice-196-markdown-family-plan-contexts',
      'typescript-markdown-plan-contexts.json'
    );

    expect(markdownPlanContext('markdown-it')).toEqual({
      familyProfile: {
        family: fixture.native.family_profile.family,
        supportedDialects: fixture.native.family_profile.supported_dialects,
        supportedPolicies: fixture.native.family_profile.supported_policies
      },
      featureProfile: {
        backend: fixture.native.feature_profile.backend,
        supportsDialects: fixture.native.feature_profile.supports_dialects,
        supportedPolicies: fixture.native.feature_profile.supported_policies
      }
    });
    expect(markdownPlanContext('kreuzberg-language-pack')).toEqual({
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

  it('conforms to the slice-197 Markdown family manifest fixture', () => {
    const manifest = readFixture<ConformanceManifest>(
      'conformance',
      'slice-197-markdown-family-manifest',
      'markdown-family-manifest.json'
    );

    expect(conformanceFamilyFeatureProfilePath(manifest, 'markdown')).toEqual([
      'diagnostics',
      'slice-194-markdown-family-feature-profile',
      'markdown-feature-profile.json'
    ]);
    expect(conformanceFixturePath(manifest, 'markdown', 'analysis')).toEqual([
      'markdown',
      'slice-198-analysis',
      'headings-and-code-fences.json'
    ]);
    expect(conformanceFixturePath(manifest, 'markdown', 'matching')).toEqual([
      'markdown',
      'slice-199-matching',
      'path-equality.json'
    ]);
  });

  it('conforms to the slice-198 Markdown analysis fixture', () => {
    const fixture = readFixture<{
      source: string;
      dialect: 'markdown';
      expected: {
        ok: true;
        root_kind: 'document';
        owners: Array<{
          path: string;
          owner_kind: 'heading' | 'code_fence';
          match_key: string;
          level?: number;
          info_string?: string;
        }>;
      };
    }>('markdown', 'slice-198-analysis', 'headings-and-code-fences.json');

    for (const backend of availableMarkdownBackends()) {
      const result = parseMarkdown(fixture.source, fixture.dialect, backend);
      expect(result.ok).toBe(true);
      expect(result.analysis?.rootKind).toBe(fixture.expected.root_kind);
      expect(result.analysis?.owners).toEqual(
        fixture.expected.owners.map((owner) => ({
          path: owner.path,
          ownerKind: owner.owner_kind,
          matchKey: owner.match_key,
          ...(owner.level ? { level: owner.level } : {}),
          ...(owner.info_string ? { infoString: owner.info_string } : {})
        }))
      );
    }
  });

  it('conforms to the slice-199 Markdown matching fixture', () => {
    const fixture = readFixture<{
      template: string;
      destination: string;
      dialect: 'markdown';
      expected: {
        matched: Array<[string, string]>;
        unmatched_template: string[];
        unmatched_destination: string[];
      };
    }>('markdown', 'slice-199-matching', 'path-equality.json');

    for (const backend of availableMarkdownBackends()) {
      const template = parseMarkdown(fixture.template, fixture.dialect, backend);
      const destination = parseMarkdown(fixture.destination, fixture.dialect, backend);
      expect(template.ok).toBe(true);
      expect(destination.ok).toBe(true);
      expect(matchMarkdownOwners(template.analysis!, destination.analysis!)).toEqual({
        matched: fixture.expected.matched.map(([templatePath, destinationPath]) => ({
          templatePath,
          destinationPath
        })),
        unmatchedTemplate: fixture.expected.unmatched_template,
        unmatchedDestination: fixture.expected.unmatched_destination
      });
    }
  });

  it('conforms to the slice-208 embedded-family fixture', () => {
    const fixture = readFixture<{
      source: string;
      expected: Array<{
        path: string;
        language: string;
        family: 'typescript' | 'rust' | 'go' | 'json' | 'yaml' | 'toml';
        dialect: string;
      }>;
    }>('markdown', 'slice-208-embedded-families', 'code-fence-families.json');

    const analysis = parseMarkdown(fixture.source, 'markdown', 'markdown-it');
    expect(analysis.ok).toBe(true);
    expect(markdownEmbeddedFamilies(analysis.analysis!)).toEqual(fixture.expected);
  });

  it('conforms to the slice-212 discovered-surfaces fixture', () => {
    const fixture = readFixture<{
      source: string;
      expected: Array<{
        surface_kind: string;
        declared_language?: string;
        effective_language: string;
        address: string;
        parent_address?: string;
        owner: {
          kind: 'structural_owner' | 'owned_region' | 'parent_surface';
          address: string;
        };
        reconstruction_strategy: string;
        metadata?: Record<string, unknown>;
      }>;
    }>('markdown', 'slice-212-discovered-surfaces', 'fenced-code-surfaces.json');

    const analysis = parseMarkdown(fixture.source, 'markdown', 'markdown-it');
    expect(analysis.ok).toBe(true);
    expect(markdownDiscoveredSurfaces(analysis.analysis!)).toEqual(
      fixture.expected.map((surface) => ({
        surfaceKind: surface.surface_kind,
        declaredLanguage: surface.declared_language,
        effectiveLanguage: surface.effective_language,
        address: surface.address,
        parentAddress: surface.parent_address,
        owner: surface.owner,
        reconstructionStrategy: surface.reconstruction_strategy,
        metadata: surface.metadata
      }))
    );
  });

  it('conforms to the slice-213 delegated child-operations fixture', () => {
    const fixture = readFixture<{
      source: string;
      parent_operation_id: string;
      expected: Array<{
        operation_id: string;
        parent_operation_id: string;
        requested_strategy: 'delegate_child_surface';
        language_chain: string[];
        surface: {
          surface_kind: string;
          declared_language?: string;
          effective_language: string;
          address: string;
          parent_address?: string;
          owner: {
            kind: 'structural_owner' | 'owned_region' | 'parent_surface';
            address: string;
          };
          reconstruction_strategy: string;
          metadata?: Record<string, unknown>;
        };
      }>;
    }>('markdown', 'slice-213-delegated-child-operations', 'fenced-code-child-operations.json');

    const analysis = parseMarkdown(fixture.source, 'markdown', 'markdown-it');
    expect(analysis.ok).toBe(true);
    expect(
      markdownDelegatedChildOperations(analysis.analysis!, fixture.parent_operation_id)
    ).toEqual(
      fixture.expected.map((operation) => ({
        operationId: operation.operation_id,
        parentOperationId: operation.parent_operation_id,
        requestedStrategy: operation.requested_strategy,
        languageChain: operation.language_chain,
        surface: {
          surfaceKind: operation.surface.surface_kind,
          declaredLanguage: operation.surface.declared_language,
          effectiveLanguage: operation.surface.effective_language,
          address: operation.surface.address,
          parentAddress: operation.surface.parent_address,
          owner: operation.surface.owner,
          reconstructionStrategy: operation.surface.reconstruction_strategy,
          metadata: operation.surface.metadata
        }
      }))
    );
  });
});
