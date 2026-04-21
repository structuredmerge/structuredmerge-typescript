import { describe, expect, it } from 'vitest';
import {
  availableYamlBackends,
  backendId,
  mergeYaml,
  packageName,
  parseYaml,
  yamlBackendFeatureProfile,
  yamlFeatureProfile,
  yamlPlanContext
} from '../src/index';

describe('js-yaml-merge contracts', () => {
  it('exposes the YAML family through the js-yaml provider backend', () => {
    expect(packageName).toBe('@structuredmerge/js-yaml-merge');
    expect(backendId).toBe('js-yaml');
    expect(availableYamlBackends()).toEqual(['js-yaml']);
    expect(yamlBackendFeatureProfile()).toEqual({
      ...yamlFeatureProfile(),
      backend: 'js-yaml'
    });
    expect(yamlPlanContext()).toEqual({
      familyProfile: yamlFeatureProfile(),
      featureProfile: {
        backend: 'js-yaml',
        supportsDialects: true,
        supportedPolicies: yamlFeatureProfile().supportedPolicies
      }
    });
  });

  it('rejects unsupported backend overrides', () => {
    expect(parseYaml('name: structuredmerge\n', 'yaml', 'kreuzberg-language-pack')).toEqual({
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          category: 'unsupported_feature',
          message: 'Unsupported YAML backend kreuzberg-language-pack.'
        }
      ]
    });
    expect(mergeYaml('name: a\n', 'name: b\n', 'yaml', 'kreuzberg-language-pack')).toEqual({
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          category: 'unsupported_feature',
          message: 'Unsupported YAML backend kreuzberg-language-pack.'
        }
      ],
      policies: []
    });
  });
});
