import { describe, expect, it } from 'vitest';
import { registeredBackends } from '@structuredmerge/tree-haver';
import {
  availableMarkdownBackends,
  markdownBackendFeatureProfile,
  markdownFeatureProfile,
  markdownPlanContext,
  parseMarkdown
} from '../src/index';

describe('markdown-it-merge contracts', () => {
  it('exposes the Markdown family through the markdown-it provider backend', () => {
    expect(markdownFeatureProfile()).toEqual({
      family: 'markdown',
      supportedDialects: ['markdown'],
      supportedPolicies: []
    });
    expect(availableMarkdownBackends()).toEqual(['markdown-it']);
    expect(markdownBackendFeatureProfile()).toEqual({
      family: 'markdown',
      supportedDialects: ['markdown'],
      supportedPolicies: [],
      backend: 'markdown-it'
    });
    expect(markdownPlanContext()).toEqual({
      familyProfile: {
        family: 'markdown',
        supportedDialects: ['markdown'],
        supportedPolicies: []
      },
      featureProfile: {
        backend: 'markdown-it',
        supportsDialects: true,
        supportedPolicies: []
      }
    });
    expect(registeredBackends()).toContainEqual({ id: 'markdown-it', family: 'native' });
  });

  it('rejects unsupported provider backend overrides', () => {
    const result = parseMarkdown('# Title\n', 'markdown', 'kreuzberg-language-pack');
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual([
      {
        severity: 'error',
        category: 'unsupported_feature',
        message: 'Unsupported Markdown backend kreuzberg-language-pack.'
      }
    ]);
  });
});
