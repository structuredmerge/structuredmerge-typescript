import { describe, expect, it } from 'vitest';
import { withBackend } from '@structuredmerge/tree-haver';
import {
  availableMarkdownBackends,
  markdownBackendFeatureProfile,
  markdownFeatureProfile,
  markdownPlanContext,
  parseMarkdown
} from '../src/index';

describe('markdown-merge contracts', () => {
  it('exports the Markdown family profile', () => {
    expect(markdownFeatureProfile()).toEqual({
      family: 'markdown',
      supportedDialects: ['markdown'],
      supportedPolicies: []
    });
  });

  it('resolves the backend from tree-haver context', () => {
    expect(availableMarkdownBackends()).toEqual(['markdown-it', 'kreuzberg-language-pack']);

    withBackend('kreuzberg-language-pack', () => {
      expect(markdownBackendFeatureProfile()).toEqual({
        family: 'markdown',
        supportedDialects: ['markdown'],
        supportedPolicies: [],
        backend: 'kreuzberg-language-pack'
      });
      expect(markdownPlanContext().featureProfile).toEqual({
        backend: 'kreuzberg-language-pack',
        supportsDialects: false,
        supportedPolicies: []
      });
    });
  });

  it('extracts headings and code fences from Markdown analysis', () => {
    const result = parseMarkdown(
      "# Title\n\n```ts\nconsole.log('hi')\n```\n",
      'markdown',
      'markdown-it'
    );
    expect(result.ok).toBe(true);
    expect(result.analysis?.owners).toEqual([
      { path: '/heading/0', ownerKind: 'heading', matchKey: 'h1:title', level: 1 },
      {
        path: '/code_fence/0',
        ownerKind: 'code_fence',
        matchKey: 'fence:ts',
        infoString: 'ts'
      }
    ]);
  });
});
