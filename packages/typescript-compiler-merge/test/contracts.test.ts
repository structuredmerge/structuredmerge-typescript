import { describe, expect, it } from 'vitest';
import { registeredBackends } from '@structuredmerge/tree-haver';
import {
  availableTypeScriptBackends,
  backendId,
  mergeTypeScript,
  packageName,
  parseTypeScript,
  typeScriptBackendFeatureProfile,
  typeScriptFeatureProfile,
  typeScriptPlanContext
} from '../src/index';

describe('typescript-compiler-merge contracts', () => {
  it('exposes the TypeScript family through the compiler provider backend', () => {
    expect(packageName).toBe('@structuredmerge/typescript-compiler-merge');
    expect(backendId).toBe('typescript-compiler');
    expect(availableTypeScriptBackends()).toEqual(['typescript-compiler']);
    expect(typeScriptBackendFeatureProfile()).toEqual({
      ...typeScriptFeatureProfile(),
      backend: 'typescript-compiler',
      backendRef: { id: 'typescript-compiler', family: 'native' }
    });
    expect(typeScriptPlanContext()).toEqual({
      familyProfile: typeScriptFeatureProfile(),
      featureProfile: {
        backend: 'typescript-compiler',
        supportsDialects: true,
        supportedPolicies: typeScriptFeatureProfile().supportedPolicies
      }
    });
    expect(registeredBackends()).toContainEqual({ id: 'typescript-compiler', family: 'native' });
  });

  it('rejects unsupported backend overrides', () => {
    expect(parseTypeScript('export const answer = 42;\n', 'typescript', 'kreuzberg-language-pack')).toEqual({
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          category: 'unsupported_feature',
          message: 'Unsupported TypeScript backend kreuzberg-language-pack.'
        }
      ]
    });

    expect(mergeTypeScript('export const a = 1;\n', 'export const b = 2;\n', 'typescript', 'kreuzberg-language-pack')).toEqual({
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          category: 'unsupported_feature',
          message: 'Unsupported TypeScript backend kreuzberg-language-pack.'
        }
      ],
      policies: []
    });
  });
});
