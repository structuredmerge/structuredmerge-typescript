import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { binaryFeatureProfile, preservationReport, unsafeDiagnostic } from '../src/index';

interface BinaryCoreFixture {
  merge_report: {
    format: string;
    schema: string;
    preserved_ranges: Array<{ start_byte: number; end_byte: number }>;
  };
}

function readFixture<T>(...segments: string[]): T {
  const fixturePath = path.resolve(process.cwd(), '..', 'fixtures', ...segments);

  return JSON.parse(readFileSync(fixturePath, 'utf8')) as T;
}

describe('binary-merge shared fixtures', () => {
  it('assembles a binary preservation report from the shared binary fixture', () => {
    const fixture = readFixture<BinaryCoreFixture>(
      'diagnostics',
      'slice-723-binary-core-contract',
      'binary-core.json'
    );
    const firstRange = fixture.merge_report.preserved_ranges[0]!;
    const preservedRange = {
      startByte: firstRange.start_byte,
      endByte: firstRange.end_byte
    };

    const report = preservationReport(
      fixture.merge_report.format,
      fixture.merge_report.schema,
      ['/chunks/0', '/chunks/1'],
      [preservedRange]
    );
    const diagnostic = unsafeDiagnostic(
      '/chunks/2',
      { startByte: 78, endByte: 96 },
      'critical image data mutation is not enabled'
    );

    expect(binaryFeatureProfile().family).toBe('binary');
    expect(report.preservedRanges[0]!.endByte - report.preservedRanges[0]!.startByte).toBe(25);
    expect(report.rewrittenNodes).toEqual([]);
    expect(diagnostic.category).toBe('unsafe_binary_mutation');
  });
});
