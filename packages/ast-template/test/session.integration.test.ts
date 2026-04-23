import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type {
  MergeResult,
  TemplateDestinationContext,
  TemplateExecutionPlanEntry,
  TemplateStrategy,
  TemplateStrategyOverride
} from '@structuredmerge/ast-merge';
import { readRelativeFileTree, writeRelativeFileTree } from '@structuredmerge/ast-merge';
import { mergeMarkdown } from '../../markdown-merge/src/index';
import { mergeRuby } from '../../ruby-merge/src/index';
import { mergeToml } from '../../toml-merge/src/index';
import {
  applyTemplateDirectorySessionToDirectory,
  planTemplateDirectorySessionFromDirectories,
  reapplyTemplateDirectorySessionToDirectory
} from '../src/index';

interface SessionFixtureSection {
  context: Record<string, unknown>;
  default_strategy: TemplateStrategy;
  overrides: TemplateStrategyOverride[];
  replacements: Record<string, string>;
  expected: unknown;
}

describe('template directory session report fixture', () => {
  it('conforms to the shared fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-353-template-directory-session-report',
      'template-directory-session-report.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      dry_run: SessionFixtureSection;
      apply_run: SessionFixtureSection;
      reapply_run: SessionFixtureSection;
    };

    const dryRunActual = planTemplateDirectorySessionFromDirectories(
      path.join(fixtureRoot, 'dry-run', 'template'),
      path.join(fixtureRoot, 'dry-run', 'destination'),
      normalizeContext(fixture.dry_run.context),
      fixture.dry_run.default_strategy,
      fixture.dry_run.overrides,
      fixture.dry_run.replacements
    );
    expect(dryRunActual).toEqual(fixture.dry_run.expected);

    const tempRoot = path.resolve(process.cwd(), 'packages', 'ast-template', 'tmp', 'session');
    rmSync(tempRoot, { recursive: true, force: true });
    mkdirSync(tempRoot, { recursive: true });
    writeRelativeFileTree(
      tempRoot,
      readRelativeFileTree(path.join(fixtureRoot, 'apply-run', 'destination'))
    );

    const applyActual = applyTemplateDirectorySessionToDirectory(
      path.join(fixtureRoot, 'apply-run', 'template'),
      tempRoot,
      normalizeContext(fixture.apply_run.context),
      fixture.apply_run.default_strategy,
      fixture.apply_run.overrides,
      fixture.apply_run.replacements,
      multiFamilyMergeCallback
    );
    expect(applyActual).toEqual(fixture.apply_run.expected);

    const reapplyActual = reapplyTemplateDirectorySessionToDirectory(
      path.join(fixtureRoot, 'apply-run', 'template'),
      tempRoot,
      normalizeContext(fixture.reapply_run.context),
      fixture.reapply_run.default_strategy,
      fixture.reapply_run.overrides,
      fixture.reapply_run.replacements,
      multiFamilyMergeCallback
    );
    expect(reapplyActual).toEqual(fixture.reapply_run.expected);

    rmSync(tempRoot, { recursive: true, force: true });
  });
});

function multiFamilyMergeCallback(entry: TemplateExecutionPlanEntry): MergeResult<string> {
  const destination = entry.destinationContent ?? '';
  const template = entry.preparedTemplateContent ?? '';
  switch (entry.classification.family) {
    case 'markdown':
      return mergeMarkdown(template, destination, 'markdown');
    case 'toml':
      return mergeToml(template, destination, 'toml');
    case 'ruby':
      return mergeRuby(template, destination, 'ruby');
    default:
      return {
        ok: false,
        diagnostics: [
          {
            severity: 'error',
            category: 'configuration_error',
            message: `missing family merge adapter for ${entry.classification.family}`
          }
        ],
        policies: []
      };
  }
}

function normalizeContext(context: Record<string, unknown>): TemplateDestinationContext {
  return {
    projectName: typeof context.project_name === 'string' ? context.project_name : undefined
  };
}
