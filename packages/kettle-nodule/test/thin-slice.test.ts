import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyProject, planProject } from '../src/index';

interface ThinSliceFixture {
  readonly case_id: string;
  readonly ecosystem: string;
  readonly inputs: {
    readonly files: Record<string, string>;
  };
  readonly expected: {
    readonly facts: unknown;
    readonly changedFiles: readonly string[];
    readonly files: Record<string, string>;
  };
}

interface ThinSliceContract {
  readonly canonical_recipes: readonly { readonly name: string }[];
  readonly required_fact_groups: readonly string[];
  readonly ecosystem_fact_groups: Record<string, string>;
  readonly report_contract: {
    readonly request_envelope_kind: string;
    readonly report_envelope_kind: string;
  };
  readonly validated_ecosystems: readonly string[];
}

function writeTree(root: string, files: Record<string, string>): void {
  for (const [relativePath, content] of Object.entries(files)) {
    const targetPath = path.join(root, relativePath);
    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, content);
  }
}

function readProjectFiles(root: string, paths: readonly string[]): Record<string, string> {
  return Object.fromEntries(
    paths.map((relativePath) => [relativePath, readFileSync(path.join(root, relativePath), 'utf8')])
  );
}

describe('kettle-nodule thin vertical slice', () => {
  it('plans and applies npm package templating requests', () => {
    const fixturePath = path.resolve(import.meta.dirname, 'fixtures', 'thin-slice.json');
    const contractPath = path.resolve(
      import.meta.dirname,
      '..',
      '..',
      '..',
      '..',
      'fixtures',
      'packaging',
      'thin-slice-contract.json'
    );
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as ThinSliceFixture;
    const contract = JSON.parse(readFileSync(contractPath, 'utf8')) as ThinSliceContract;
    const projectRoot = mkdtempSync(path.join(tmpdir(), 'kettle-nodule-thin-slice-'));
    const expectedRecipeNames = contract.canonical_recipes.map((recipe) => recipe.name);
    expect(contract.validated_ecosystems).toContain(fixture.ecosystem);
    expect(Object.keys(fixture.expected.facts as Record<string, unknown>)).toEqual(
      expect.arrayContaining([
        ...contract.required_fact_groups,
        contract.ecosystem_fact_groups[fixture.ecosystem]
      ])
    );

    writeTree(projectRoot, fixture.inputs.files);

    const plan = planProject(projectRoot);
    expect(plan.facts).toEqual(fixture.expected.facts);
    expect(plan.recipePack.recipes.map((recipe) => recipe.name)).toEqual(expectedRecipeNames);
    expect(plan.changedFiles).toEqual(fixture.expected.changedFiles);
    expect([...new Set(plan.recipeReports.map((report) => report.requestEnvelope.kind))]).toEqual([
      contract.report_contract.request_envelope_kind
    ]);
    expect([...new Set(plan.recipeReports.map((report) => report.reportEnvelope.kind))]).toEqual([
      contract.report_contract.report_envelope_kind
    ]);

    const apply = applyProject(projectRoot);
    expect(apply.changedFiles).toEqual(fixture.expected.changedFiles);
    expect(readProjectFiles(projectRoot, Object.keys(fixture.expected.files))).toEqual(
      fixture.expected.files
    );
  });
});
