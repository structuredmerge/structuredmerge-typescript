import { describe, expect, it } from 'vitest';
import { registeredBackends } from '@structuredmerge/tree-haver';
import {
  availableTomlBackends,
  mergeToml,
  parseToml,
  tomlBackendFeatureProfile,
  tomlFeatureProfile,
  tomlPlanContext
} from '../src/index';

describe('peggy-toml-merge contracts', () => {
  it('exposes the TOML family through the peggy provider backend', () => {
    expect(tomlFeatureProfile()).toEqual({
      family: 'toml',
      supportedDialects: ['toml'],
      supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
    });
    expect(availableTomlBackends()).toEqual(['peggy']);
    expect(tomlBackendFeatureProfile()).toEqual({
      family: 'toml',
      supportedDialects: ['toml'],
      supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }],
      backend: 'peggy'
    });
    expect(tomlPlanContext()).toEqual({
      familyProfile: {
        family: 'toml',
        supportedDialects: ['toml'],
        supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
      },
      featureProfile: {
        backend: 'peggy',
        supportsDialects: false,
        supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
      }
    });
    expect(registeredBackends()).toContainEqual({ id: 'peggy', family: 'peg' });
  });

  it('rejects unsupported provider backend overrides', () => {
    const parseResult = parseToml('title = "x"\n', 'toml', 'kreuzberg-language-pack');
    expect(parseResult.ok).toBe(false);
    expect(parseResult.diagnostics).toEqual([
      {
        severity: 'error',
        category: 'unsupported_feature',
        message: 'Unsupported TOML backend kreuzberg-language-pack.'
      }
    ]);

    const mergeResult = mergeToml(
      'title = "x"\n',
      'title = "y"\n',
      'toml',
      'kreuzberg-language-pack'
    );
    expect(mergeResult.ok).toBe(false);
    expect(mergeResult.diagnostics).toEqual([
      {
        severity: 'error',
        category: 'unsupported_feature',
        message: 'Unsupported TOML backend kreuzberg-language-pack.'
      }
    ]);
  });
});
