import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AdapterInfo, BackendReference, FeatureProfile, ParserRequest } from '../src/index';
import {
  conformanceFixturePath,
  type ConformanceManifest,
  type PolicyReference
} from '@structuredmerge/ast-merge';
import { processWithLanguagePack } from '../src/index';
import {
  currentBackendId,
  PEGGY_BACKEND,
  peggyAdapterInfo,
  peggyFeatureProfile,
  registerBackend,
  registeredBackends,
  withBackend
} from '../src/index';

interface ParserAdapterFixture {
  request: {
    source: string;
    language: string;
    dialect?: string;
  };
  adapter_info: {
    backend: string;
    supports_dialects: boolean;
    supported_policies?: PolicyReference[];
  };
}

interface FeatureProfileFixture {
  feature_profile: {
    backend: string;
    supports_dialects: boolean;
    supported_policies?: PolicyReference[];
  };
}

interface BackendRegistryFixture {
  backends: BackendReference[];
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

describe('tree-haver shared fixtures', () => {
  it('conforms to the slice-06 parser request fixture', () => {
    const fixture = readFixture<ParserAdapterFixture>(...diagnosticsFixturePath('parser_request'));

    const request: ParserRequest = {
      source: fixture.request.source,
      language: fixture.request.language,
      dialect: fixture.request.dialect
    };

    const adapterInfo: AdapterInfo = {
      backend: fixture.adapter_info.backend,
      supportsDialects: fixture.adapter_info.supports_dialects
    };

    expect(request).toEqual(fixture.request);
    expect({
      backend: adapterInfo.backend,
      supports_dialects: adapterInfo.supportsDialects
    }).toEqual(fixture.adapter_info);
  });

  it('conforms to the slice-19 adapter policy support fixture', () => {
    const fixture = readFixture<ParserAdapterFixture>(
      ...diagnosticsFixturePath('adapter_policy_support')
    );

    const adapterInfo: AdapterInfo = {
      backend: fixture.adapter_info.backend,
      supportsDialects: fixture.adapter_info.supports_dialects,
      supportedPolicies: fixture.adapter_info.supported_policies
    };

    expect({
      backend: adapterInfo.backend,
      supports_dialects: adapterInfo.supportsDialects,
      supported_policies: adapterInfo.supportedPolicies
    }).toEqual(fixture.adapter_info);
  });

  it('conforms to the slice-20 adapter feature profile fixture', () => {
    const fixture = readFixture<FeatureProfileFixture>(
      ...diagnosticsFixturePath('adapter_feature_profile')
    );

    const profile: FeatureProfile = {
      backend: fixture.feature_profile.backend,
      supportsDialects: fixture.feature_profile.supports_dialects,
      supportedPolicies: fixture.feature_profile.supported_policies
    };

    expect({
      backend: profile.backend,
      supports_dialects: profile.supportsDialects,
      supported_policies: profile.supportedPolicies
    }).toEqual(fixture.feature_profile);
  });

  it('conforms to the slice-25 backend registry fixture', () => {
    const fixture = readFixture<BackendRegistryFixture>(
      ...diagnosticsFixturePath('backend_registry')
    );

    const backends: BackendReference[] = [
      {
        id: 'native',
        family: 'builtin'
      },
      {
        id: 'tree-sitter',
        family: 'tree-sitter'
      }
    ];

    const profile: FeatureProfile = {
      backend: 'tree-sitter',
      backendRef: backends[1],
      supportsDialects: true,
      supportedPolicies: []
    };

    expect(backends).toEqual(fixture.backends);
    expect(profile.backendRef).toEqual(fixture.backends[1]);
  });

  it('conforms to the slice-100 process baseline fixture', () => {
    const fixture = readFixture<{
      request: { language: string; source: string };
      expected: {
        language: string;
        structure: Array<{ kind: string; name?: string }>;
        imports: Array<{ source: string; items: string[] }>;
      };
    }>(...diagnosticsFixturePath('process_baseline'));

    const result = processWithLanguagePack(fixture.request);

    expect(result.ok).toBe(true);
    expect(result.analysis?.language).toBe(fixture.expected.language);
    expect(
      result.analysis?.structure.map((item) => ({
        kind: item.kind,
        ...(item.name ? { name: item.name } : {})
      }))
    ).toEqual(fixture.expected.structure);
    expect(
      result.analysis?.imports.map((item) => ({
        source: item.source,
        items: item.items
      }))
    ).toEqual(fixture.expected.imports);
  });

  it('exposes PEG backend references for parser-plurality slices', () => {
    expect(PEGGY_BACKEND).toEqual({ id: 'peggy', family: 'peg' });
    expect(peggyAdapterInfo.backendRef).toEqual({ id: 'peggy', family: 'peg' });
    expect(peggyFeatureProfile.backendRef).toEqual({ id: 'peggy', family: 'peg' });
  });

  it('supports temporary backend context selection', () => {
    expect(currentBackendId()).toBeUndefined();

    withBackend('peggy', () => {
      expect(currentBackendId()).toBe('peggy');
      withBackend('kreuzberg-language-pack', () => {
        expect(currentBackendId()).toBe('kreuzberg-language-pack');
      });
      expect(currentBackendId()).toBe('peggy');
    });

    expect(currentBackendId()).toBeUndefined();
  });

  it('supports runtime backend registration', () => {
    registerBackend({ id: 'custom-markdown', family: 'native' });

    expect(registeredBackends()).toContainEqual({ id: 'custom-markdown', family: 'native' });
    expect(withBackend('custom-markdown', () => currentBackendId())).toBe('custom-markdown');
    expect(currentBackendId()).toBeUndefined();
  });
});
