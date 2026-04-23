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
  applyTemplateDirectorySessionWithRegistryToDirectory,
  mergePreparedContentFromRegistry,
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

  it('conforms to the adapter-registry fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-354-template-directory-adapter-registry-report',
      'template-directory-adapter-registry-report.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      full_registry: SessionFixtureSection;
      partial_registry: SessionFixtureSection;
    };

    const fullRegistry = {
      markdown: markdownAdapter,
      ruby: rubyAdapter,
      toml: tomlAdapter
    };
    const partialRegistry = {
      markdown: markdownAdapter,
      toml: tomlAdapter
    };

    for (const [label, section, registry] of [
      ['full_registry', fixture.full_registry, fullRegistry] as const,
      ['partial_registry', fixture.partial_registry, partialRegistry] as const
    ]) {
      const tempRoot = path.resolve(
        process.cwd(),
        'packages',
        'ast-template',
        'tmp',
        `registry-${label}`
      );
      rmSync(tempRoot, { recursive: true, force: true });
      mkdirSync(tempRoot, { recursive: true });
      writeRelativeFileTree(
        tempRoot,
        readRelativeFileTree(path.join(fixtureRoot, 'apply-run', 'destination'))
      );

      const actual = applyTemplateDirectorySessionWithRegistryToDirectory(
        path.join(fixtureRoot, 'apply-run', 'template'),
        tempRoot,
        normalizeContext(section.context),
        section.default_strategy,
        section.overrides,
        section.replacements,
        registry
      );
      expect(actual).toEqual(section.expected);
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});

function multiFamilyMergeCallback(entry: TemplateExecutionPlanEntry): MergeResult<string> {
  return mergePreparedContentFromRegistry(
    {
      markdown: markdownAdapter,
      ruby: rubyAdapter,
      toml: tomlAdapter
    },
    entry
  );
}

function markdownAdapter(entry: TemplateExecutionPlanEntry): MergeResult<string> {
  const destination = entry.destinationContent ?? '';
  const template = entry.preparedTemplateContent ?? '';
  return mergeMarkdown(template, destination, 'markdown');
}

function tomlAdapter(entry: TemplateExecutionPlanEntry): MergeResult<string> {
  const destination = entry.destinationContent ?? '';
  const template = entry.preparedTemplateContent ?? '';
  return mergeToml(template, destination, 'toml');
}

function rubyAdapter(entry: TemplateExecutionPlanEntry): MergeResult<string> {
  const destination = entry.destinationContent ?? '';
  const template = entry.preparedTemplateContent ?? '';
  return mergeRuby(template, destination, 'ruby');
}

function normalizeContext(context: Record<string, unknown>): TemplateDestinationContext {
  return {
    projectName: typeof context.project_name === 'string' ? context.project_name : undefined
  };
}
