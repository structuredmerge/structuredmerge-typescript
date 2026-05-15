import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { astMergeContractAnchor, boundaryReport } from '../src/index';

interface BoundaryFixture {
  boundary: Readonly<Record<string, unknown>>;
}

function readFixture(): BoundaryFixture {
  const fixturePath = path.resolve(
    process.cwd(),
    '..',
    'fixtures',
    'diagnostics',
    'slice-916-ast-crispr-package-boundary',
    'ast-crispr-package-boundary.json'
  );

  return JSON.parse(readFileSync(fixturePath, 'utf8')) as BoundaryFixture;
}

describe('@structuredmerge/ast-crispr', () => {
  it('conforms to the package boundary fixture', () => {
    expect(boundaryReport()).toEqual(readFixture().boundary);
    expect(astMergeContractAnchor()).toBe('StructuredEditCrisprExampleParityReport');
  });
});
