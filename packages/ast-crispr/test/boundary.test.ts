import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AstCrisprError,
  DestinationProfile,
  Limit,
  MatchProfile,
  OperationProfile,
  SelectionProfile,
  astMergeContractAnchor,
  boundaryReport,
  deleteOperation,
  insertOperation,
  moveOperation,
  replaceOperation
} from '../src/index';

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

interface LimitFixture {
  cases: Array<{
    name: string;
    spec: unknown;
    expected_description: string;
    expectations: Array<{ count: number; allowed: boolean }>;
  }>;
  invalid_cases: Array<{
    name: string;
    spec: unknown;
    expected_error: string;
  }>;
}

function readLimitFixture(): LimitFixture {
  const fixturePath = path.resolve(
    process.cwd(),
    '..',
    'fixtures',
    'diagnostics',
    'slice-917-ast-crispr-limit-helpers',
    'ast-crispr-limit-helpers.json'
  );

  return JSON.parse(readFileSync(fixturePath, 'utf8')) as LimitFixture;
}

interface MatchProfileFixture {
  cases: Array<{
    name: string;
    profile: {
      start_boundary: string;
      end_boundary: string;
      payload_kind: string;
    };
    expected: Readonly<Record<string, unknown>>;
  }>;
}

function readMatchProfileFixture(): MatchProfileFixture {
  const fixturePath = path.resolve(
    process.cwd(),
    '..',
    'fixtures',
    'diagnostics',
    'slice-918-ast-crispr-match-profile-helpers',
    'ast-crispr-match-profile-helpers.json'
  );

  return JSON.parse(readFileSync(fixturePath, 'utf8')) as MatchProfileFixture;
}

interface SelectionProfileFixture {
  cases: Array<{
    name: string;
    profile: ConstructorParameters<typeof SelectionProfile>[0];
    expected: Readonly<Record<string, unknown>>;
  }>;
}

function readSelectionProfileFixture(): SelectionProfileFixture {
  const fixturePath = path.resolve(
    process.cwd(),
    '..',
    'fixtures',
    'diagnostics',
    'slice-919-ast-crispr-selection-profile-helpers',
    'ast-crispr-selection-profile-helpers.json'
  );

  return JSON.parse(readFileSync(fixturePath, 'utf8')) as SelectionProfileFixture;
}

interface DestinationProfileFixture {
  cases: Array<{
    name: string;
    profile: ConstructorParameters<typeof DestinationProfile>[0];
    expected: Readonly<Record<string, unknown>>;
  }>;
}

function readDestinationProfileFixture(): DestinationProfileFixture {
  const fixturePath = path.resolve(
    process.cwd(),
    '..',
    'fixtures',
    'diagnostics',
    'slice-920-ast-crispr-destination-profile-helpers',
    'ast-crispr-destination-profile-helpers.json'
  );

  return JSON.parse(readFileSync(fixturePath, 'utf8')) as DestinationProfileFixture;
}

interface OperationProfileFixture {
  cases: Array<{
    name: string;
    profile: ConstructorParameters<typeof OperationProfile>[0];
    expected: Readonly<Record<string, unknown>>;
  }>;
}

function readOperationProfileFixture(): OperationProfileFixture {
  const fixturePath = path.resolve(
    process.cwd(),
    '..',
    'fixtures',
    'diagnostics',
    'slice-921-ast-crispr-operation-profile-helpers',
    'ast-crispr-operation-profile-helpers.json'
  );

  return JSON.parse(readFileSync(fixturePath, 'utf8')) as OperationProfileFixture;
}

interface OperationHelperFixture {
  cases: Array<{
    name: string;
    helper: 'replace' | 'delete' | 'insert' | 'move';
    expected_operation_profile: Readonly<Record<string, unknown>>;
  }>;
}

function readOperationHelperFixture(): OperationHelperFixture {
  const fixturePath = path.resolve(
    process.cwd(),
    '..',
    'fixtures',
    'diagnostics',
    'slice-922-ast-crispr-operation-helpers',
    'ast-crispr-operation-helpers.json'
  );

  return JSON.parse(readFileSync(fixturePath, 'utf8')) as OperationHelperFixture;
}

describe('@structuredmerge/ast-crispr', () => {
  it('conforms to the package boundary fixture', () => {
    expect(boundaryReport()).toEqual(readFixture().boundary);
    expect(astMergeContractAnchor()).toBe('StructuredEditCrisprExampleParityReport');
  });

  it('conforms to the limit helper fixture', () => {
    const fixture = readLimitFixture();

    for (const testCase of fixture.cases) {
      const limit = new Limit(testCase.spec);
      expect(limit.describe()).toBe(testCase.expected_description);
      for (const expectation of testCase.expectations) {
        expect(limit.allows(expectation.count)).toBe(expectation.allowed);
      }
    }

    for (const testCase of fixture.invalid_cases) {
      expect(() => new Limit(testCase.spec)).toThrow(AstCrisprError);
      try {
        new Limit(testCase.spec);
      } catch (error) {
        expect((error as AstCrisprError).code).toBe(testCase.expected_error);
      }
    }
  });

  it('conforms to the match profile helper fixture', () => {
    const fixture = readMatchProfileFixture();

    for (const testCase of fixture.cases) {
      expect(new MatchProfile(testCase.profile).report()).toEqual(testCase.expected);
    }
  });

  it('conforms to the selection profile helper fixture', () => {
    const fixture = readSelectionProfileFixture();

    for (const testCase of fixture.cases) {
      expect(new SelectionProfile(testCase.profile).report()).toEqual(testCase.expected);
    }
  });

  it('conforms to the destination profile helper fixture', () => {
    const fixture = readDestinationProfileFixture();

    for (const testCase of fixture.cases) {
      expect(new DestinationProfile(testCase.profile).report()).toEqual(testCase.expected);
    }
  });

  it('conforms to the operation profile helper fixture', () => {
    const fixture = readOperationProfileFixture();

    for (const testCase of fixture.cases) {
      expect(new OperationProfile(testCase.profile).report()).toEqual(testCase.expected);
    }
  });

  it('conforms to the operation helper fixture', () => {
    const fixture = readOperationHelperFixture();
    const helpers = {
      replace: replaceOperation,
      delete: deleteOperation,
      insert: insertOperation,
      move: moveOperation
    };

    for (const testCase of fixture.cases) {
      expect(helpers[testCase.helper]().report()).toEqual(testCase.expected_operation_profile);
    }
  });
});
