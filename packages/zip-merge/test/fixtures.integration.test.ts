import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  newStoredZip,
  parseZipInventory,
  planZipMerge,
  renderWithRawPreservation
} from '../src/index';

interface Slice736Fixture {
  success: { expected_nested_family: string };
  rejections: Array<{ label: string; category: string }>;
}

function readFixture<T>(...segments: string[]): T {
  return JSON.parse(readFileSync(path.resolve(process.cwd(), '..', 'fixtures', ...segments), 'utf8')) as T;
}

describe('zip-merge shared fixtures', () => {
  it('parses, plans, and raw-preserves stored ZIP members', () => {
    const currentSource = newStoredZip({
      'META-INF/MANIFEST.MF': 'Manifest-Version: 1.0\n',
      'docs/readme.md': '# Old\n'
    });
    const ancestor = parseZipInventory(currentSource);
    const incoming = parseZipInventory(
      newStoredZip({
        'META-INF/MANIFEST.MF': 'Manifest-Version: 1.0\n',
        'docs/readme.md': '# New\n'
      })
    );
    const plan = planZipMerge(ancestor, ancestor, incoming);
    const result = renderWithRawPreservation(
      currentSource,
      plan,
      new Map([['docs/readme.md', Buffer.from('# New\n')]])
    );

    expect(result.inventory.archive.entryCount).toBe(2);
    expect(plan.mergeReport.nestedDispatches[0]?.family).toBe('markdown');
    expect(result.report.preservedRanges).toHaveLength(1);
  });

  it('conforms to the slice-736 raw-preservation edge-case fixture categories', () => {
    const fixture = readFixture<Slice736Fixture>(
      'diagnostics',
      'slice-736-zip-raw-preservation-edge-cases',
      'zip-raw-preservation-edge-cases.json'
    );
    const categories = new Map(fixture.rejections.map((item) => [item.label, item.category]));

    expect(fixture.success.expected_nested_family).toBe('markdown');
    expect(categories.get('unsupported-compression')).toBe('unsupported_compression');
    expect(categories.get('archive-comment')).toBe('archive_comment');
    expect(categories.get('encrypted-member')).toBe('encrypted_member');
  });
});
