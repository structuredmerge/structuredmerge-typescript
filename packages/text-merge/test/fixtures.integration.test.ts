import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyzeText, matchTextBlocks, mergeText } from '../src/index';

interface TextAnalysisFixture {
  name: string;
  source: string;
  expected: {
    normalized_source: string;
    blocks: Array<{
      index: number;
      normalized: string;
    }>;
  };
}

interface TextExactMatchFixture {
  name: string;
  template: string;
  destination: string;
  expected: {
    matched: Array<[number, number]>;
    unmatched_template: number[];
    unmatched_destination: number[];
  };
}

interface TextRefinedFixture {
  name: string;
  template: string;
  destination: string;
  expected: {
    matched: Array<{
      templateIndex: number;
      destinationIndex: number;
      phase: 'exact' | 'refined';
    }>;
    unmatchedTemplate: number[];
    unmatchedDestination: number[];
    output: string;
  };
}

function readFixture<T>(...segments: string[]): T {
  const fixturePath = path.resolve(process.cwd(), '..', 'fixtures', ...segments);

  return JSON.parse(readFileSync(fixturePath, 'utf8')) as T;
}

describe('text-merge shared fixtures', () => {
  it('conforms to the slice-03 analysis fixture', () => {
    const fixture = readFixture<TextAnalysisFixture>(
      'text',
      'slice-03-analysis',
      'whitespace-and-blocks.json'
    );

    const analysis = analyzeText(fixture.source);

    expect(analysis.normalizedSource).toBe(fixture.expected.normalized_source);
    expect(
      analysis.blocks.map(({ index, normalized }) => ({
        index,
        normalized
      }))
    ).toEqual(fixture.expected.blocks);
  });

  it('conforms to the slice-11 exact matching fixture', () => {
    const fixture = readFixture<TextExactMatchFixture>(
      'text',
      'slice-11-matching',
      'exact-content.json'
    );

    const result = matchTextBlocks(fixture.template, fixture.destination);

    expect(
      result.matched.map(({ templateIndex, destinationIndex }) => [templateIndex, destinationIndex])
    ).toEqual(fixture.expected.matched);
    expect(result.unmatchedTemplate).toEqual(fixture.expected.unmatched_template);
    expect(result.unmatchedDestination).toEqual(fixture.expected.unmatched_destination);
  });

  it('conforms to the slice-13 refined matching fixture', () => {
    const fixture = readFixture<TextRefinedFixture>(
      'text',
      'slice-13-refined-matching',
      'content-refined-merge.json'
    );

    const result = matchTextBlocks(fixture.template, fixture.destination);

    expect(
      result.matched.map(({ templateIndex, destinationIndex, phase }) => ({
        templateIndex,
        destinationIndex,
        phase
      }))
    ).toEqual(fixture.expected.matched);
    expect(result.unmatchedTemplate).toEqual(fixture.expected.unmatchedTemplate);
    expect(result.unmatchedDestination).toEqual(fixture.expected.unmatchedDestination);

    const merged = mergeText(fixture.template, fixture.destination);
    expect(merged.output).toBe(fixture.expected.output);
  });
});
