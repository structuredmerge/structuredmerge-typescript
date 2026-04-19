import { describe, expect, it } from 'vitest';
import {
  matchTextBlocks,
  mergeText,
  refinedTextSimilarity,
  analyzeText,
  DEFAULT_TEXT_REFINEMENT_WEIGHTS
} from '../src/index';

describe('text-merge', () => {
  it('matches text blocks by exact normalized content', () => {
    const result = matchTextBlocks(
      'Alpha\n\nBeta\n\nAlpha\n\nTemplate only',
      'Beta\n\nAlpha\n\nAlpha\n\nDestination only'
    );

    expect(result.matched).toEqual([
      { templateIndex: 1, destinationIndex: 0, phase: 'exact', score: 1 },
      { templateIndex: 0, destinationIndex: 1, phase: 'exact', score: 1 },
      { templateIndex: 2, destinationIndex: 2, phase: 'exact', score: 1 }
    ]);
    expect(result.unmatchedTemplate).toEqual([3]);
    expect(result.unmatchedDestination).toEqual([3]);
  });

  it('refines near-edited text blocks and suppresses stale template replay', () => {
    const result = matchTextBlocks(
      'Alpha beta gamma\n\nDelta anchor\n\nClosing line',
      'Alpha beta delta\n\nDelta anchor\n\nClosing line'
    );

    expect(result.matched).toEqual([
      { templateIndex: 0, destinationIndex: 0, phase: 'refined', score: 0.825 },
      { templateIndex: 1, destinationIndex: 1, phase: 'exact', score: 1 },
      { templateIndex: 2, destinationIndex: 2, phase: 'exact', score: 1 }
    ]);
    expect(result.unmatchedTemplate).toEqual([]);
    expect(result.unmatchedDestination).toEqual([]);

    const merged = mergeText(
      'Alpha beta gamma\n\nDelta anchor\n\nClosing line',
      'Alpha beta delta\n\nDelta anchor\n\nClosing line'
    );
    expect(merged.output).toBe('Alpha beta delta\n\nDelta anchor\n\nClosing line');
  });

  it('scores refined similarity consistently', () => {
    const template = analyzeText('Alpha beta gamma');
    const destination = analyzeText('Alpha beta delta');

    const score = refinedTextSimilarity(
      template.blocks[0],
      destination.blocks[0],
      template.blocks.length,
      destination.blocks.length,
      DEFAULT_TEXT_REFINEMENT_WEIGHTS
    );

    expect(score).toBe(0.825);
  });
});
