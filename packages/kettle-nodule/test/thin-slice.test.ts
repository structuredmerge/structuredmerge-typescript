import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyProject, planProject } from '../src/index';

interface ThinSliceFixture {
  readonly inputs: {
    readonly files: Record<string, string>;
  };
  readonly expected: {
    readonly facts: unknown;
    readonly changedFiles: readonly string[];
    readonly files: Record<string, string>;
  };
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
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as ThinSliceFixture;
    const projectRoot = mkdtempSync(path.join(tmpdir(), 'kettle-nodule-thin-slice-'));
    writeTree(projectRoot, fixture.inputs.files);

    const plan = planProject(projectRoot);
    expect(plan.facts).toEqual(fixture.expected.facts);
    expect(plan.recipePack.recipes.map((recipe) => recipe.name)).toEqual([
      'readme_metadata',
      'changelog_unreleased',
      'generated_block_sync'
    ]);
    expect(plan.changedFiles).toEqual(fixture.expected.changedFiles);
    expect([...new Set(plan.recipeReports.map((report) => report.requestEnvelope.kind))]).toEqual([
      'content_recipe_execution_request'
    ]);
    expect([...new Set(plan.recipeReports.map((report) => report.reportEnvelope.kind))]).toEqual([
      'content_recipe_execution_report'
    ]);

    const apply = applyProject(projectRoot);
    expect(apply.changedFiles).toEqual(fixture.expected.changedFiles);
    expect(readProjectFiles(projectRoot, Object.keys(fixture.expected.files))).toEqual(
      fixture.expected.files
    );
  });
});
