import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AdapterInfo, FeatureProfile, ParserRequest } from '../src/index';
import type { PolicyReference } from '@structuredmerge/ast-merge';

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

function readFixture<T>(...segments: string[]): T {
  const fixturePath = path.resolve(process.cwd(), '..', 'fixtures', ...segments);

  return JSON.parse(readFileSync(fixturePath, 'utf8')) as T;
}

describe('tree-haver shared fixtures', () => {
  it('conforms to the slice-06 parser request fixture', () => {
    const fixture = readFixture<ParserAdapterFixture>(
      'diagnostics',
      'slice-06-parser-adapters',
      'parser-request.json'
    );

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
      'diagnostics',
      'slice-19-adapter-policy-support',
      'adapter-info.json'
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
      'diagnostics',
      'slice-20-adapter-feature-profile',
      'feature-profile.json'
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
});
