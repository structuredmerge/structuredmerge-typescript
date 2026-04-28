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
import type { SessionCommand, SessionEntrypoint, SessionInvocation } from '../src/index';
import { readRelativeFileTree, writeRelativeFileTree } from '@structuredmerge/ast-merge';
import { mergeMarkdown } from '../../markdown-merge/src/index';
import { mergeRuby } from '../../ruby-merge/src/index';
import { mergeToml } from '../../toml-merge/src/index';
import {
  importSessionCommandEnvelope,
  applyTemplateDirectorySessionToDirectory,
  applyTemplateDirectorySessionDiagnosticsWithDefaultRegistryToDirectory,
  applyTemplateDirectorySessionEnvelopeWithDefaultRegistryToDirectory,
  applyTemplateDirectorySessionOutcomeWithDefaultRegistryToDirectory,
  runTemplateDirectorySessionWithProfile,
  runTemplateDirectorySessionWithDefaultRegistryToDirectory,
  runTemplateDirectorySessionWithOptions,
  applyTemplateDirectorySessionWithDefaultRegistryToDirectory,
  applyTemplateDirectorySessionWithRegistryToDirectory,
  defaultFamilyMergeAdapterRegistry,
  mergePreparedContentFromRegistry,
  planTemplateDirectorySessionDiagnosticsFromDirectories,
  planTemplateDirectorySessionEnvelopeFromDirectories,
  planTemplateDirectorySessionFromDirectories,
  planTemplateDirectorySessionOutcomeFromDirectories,
  reportTemplateDirectorySessionOptionsConfiguration,
  reportTemplateDirectorySessionOptionsRequest,
  reportTemplateDirectorySessionProfileConfiguration,
  reportTemplateDirectorySessionProfileRequest,
  reportTemplateDirectorySessionRunnerInput,
  reportTemplateDirectorySessionRunnerPayload,
  reportTemplateDirectorySessionEntrypoint,
  reportTemplateDirectorySessionInspection,
  reportTemplateDirectorySessionResolution,
  runTemplateDirectorySessionCommand,
  runTemplateDirectorySessionCommandPayload,
  runTemplateDirectorySession,
  runTemplateDirectorySessionDispatch,
  runTemplateDirectorySessionEntrypoint,
  runTemplateDirectorySessionRequest,
  runTemplateDirectorySessionRunnerPayload,
  runTemplateDirectorySessionRunnerRequest,
  reportAdapterCapabilitiesFromDirectories,
  reportDefaultAdapterCapabilitiesFromDirectories,
  importSessionInvocationEnvelope,
  reportTemplateDirectorySessionStatus,
  reapplyTemplateDirectorySessionToDirectory,
  sessionCommandEnvelope,
  sessionInvocationEnvelope
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

  it('conforms to the default-adapter-discovery fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-355-template-directory-default-adapter-discovery-report',
      'template-directory-default-adapter-discovery-report.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      default_discovery: SessionFixtureSection & { allowed_families: string[] | null };
      filtered_discovery: SessionFixtureSection & { allowed_families: string[] | null };
    };

    for (const [label, section] of [
      ['default_discovery', fixture.default_discovery] as const,
      ['filtered_discovery', fixture.filtered_discovery] as const
    ]) {
      const tempRoot = path.resolve(
        process.cwd(),
        'packages',
        'ast-template',
        'tmp',
        `discovery-${label}`
      );
      rmSync(tempRoot, { recursive: true, force: true });
      mkdirSync(tempRoot, { recursive: true });
      writeRelativeFileTree(
        tempRoot,
        readRelativeFileTree(path.join(fixtureRoot, 'apply-run', 'destination'))
      );

      const actual = applyTemplateDirectorySessionWithDefaultRegistryToDirectory(
        path.join(fixtureRoot, 'apply-run', 'template'),
        tempRoot,
        normalizeContext(section.context),
        section.default_strategy,
        section.overrides,
        section.replacements,
        section.allowed_families ?? undefined
      );
      expect(actual).toEqual(section.expected);
      expect(actual.adapter_families).toEqual(
        Object.keys(defaultFamilyMergeAdapterRegistry(section.allowed_families ?? undefined)).sort()
      );
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('conforms to the adapter-capability fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-356-template-directory-adapter-capability-report',
      'template-directory-adapter-capability-report.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      full_registry: SessionFixtureSection;
      partial_registry: SessionFixtureSection;
      filtered_discovery: SessionFixtureSection & { allowed_families: string[] | null };
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

    expect(
      reportAdapterCapabilitiesFromDirectories(
        path.join(fixtureRoot, 'apply-run', 'template'),
        path.join(fixtureRoot, 'apply-run', 'destination'),
        normalizeContext(fixture.full_registry.context),
        fixture.full_registry.default_strategy,
        fixture.full_registry.overrides,
        fixture.full_registry.replacements,
        fullRegistry
      )
    ).toEqual(fixture.full_registry.expected);

    expect(
      reportAdapterCapabilitiesFromDirectories(
        path.join(fixtureRoot, 'apply-run', 'template'),
        path.join(fixtureRoot, 'apply-run', 'destination'),
        normalizeContext(fixture.partial_registry.context),
        fixture.partial_registry.default_strategy,
        fixture.partial_registry.overrides,
        fixture.partial_registry.replacements,
        partialRegistry
      )
    ).toEqual(fixture.partial_registry.expected);

    expect(
      reportDefaultAdapterCapabilitiesFromDirectories(
        path.join(fixtureRoot, 'apply-run', 'template'),
        path.join(fixtureRoot, 'apply-run', 'destination'),
        normalizeContext(fixture.filtered_discovery.context),
        fixture.filtered_discovery.default_strategy,
        fixture.filtered_discovery.overrides,
        fixture.filtered_discovery.replacements,
        fixture.filtered_discovery.allowed_families ?? undefined
      )
    ).toEqual(fixture.filtered_discovery.expected);
  });

  it('conforms to the session-envelope fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-357-template-directory-session-envelope-report',
      'template-directory-session-envelope-report.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      dry_run: SessionFixtureSection & { allowed_families: string[] | null };
      apply_run: SessionFixtureSection & { allowed_families: string[] | null };
      filtered_discovery: SessionFixtureSection & { allowed_families: string[] | null };
    };

    expect(
      planTemplateDirectorySessionEnvelopeFromDirectories(
        path.join(fixtureRoot, 'dry-run', 'template'),
        path.join(fixtureRoot, 'dry-run', 'destination'),
        normalizeContext(fixture.dry_run.context),
        fixture.dry_run.default_strategy,
        fixture.dry_run.overrides,
        fixture.dry_run.replacements,
        fixture.dry_run.allowed_families ?? undefined
      )
    ).toEqual(fixture.dry_run.expected);

    for (const [label, section] of [
      ['apply_run', fixture.apply_run] as const,
      ['filtered_discovery', fixture.filtered_discovery] as const
    ]) {
      const tempRoot = path.resolve(
        process.cwd(),
        'packages',
        'ast-template',
        'tmp',
        `envelope-${label}`
      );
      rmSync(tempRoot, { recursive: true, force: true });
      mkdirSync(tempRoot, { recursive: true });
      writeRelativeFileTree(
        tempRoot,
        readRelativeFileTree(path.join(fixtureRoot, 'apply-run', 'destination'))
      );

      expect(
        applyTemplateDirectorySessionEnvelopeWithDefaultRegistryToDirectory(
          path.join(fixtureRoot, 'apply-run', 'template'),
          tempRoot,
          normalizeContext(section.context),
          section.default_strategy,
          section.overrides,
          section.replacements,
          section.allowed_families ?? undefined
        )
      ).toEqual(section.expected);
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('conforms to the session-status fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-358-template-directory-session-status-report',
      'template-directory-session-status-report.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      dry_run: SessionFixtureSection & { allowed_families: string[] | null };
      apply_run: SessionFixtureSection & { allowed_families: string[] | null };
      filtered_discovery: SessionFixtureSection & { allowed_families: string[] | null };
    };

    expect(
      reportTemplateDirectorySessionStatus(
        planTemplateDirectorySessionEnvelopeFromDirectories(
          path.join(fixtureRoot, 'dry-run', 'template'),
          path.join(fixtureRoot, 'dry-run', 'destination'),
          normalizeContext(fixture.dry_run.context),
          fixture.dry_run.default_strategy,
          fixture.dry_run.overrides,
          fixture.dry_run.replacements,
          fixture.dry_run.allowed_families ?? undefined
        )
      )
    ).toEqual(fixture.dry_run.expected);

    for (const [label, section] of [
      ['apply_run', fixture.apply_run] as const,
      ['filtered_discovery', fixture.filtered_discovery] as const
    ]) {
      const tempRoot = path.resolve(
        process.cwd(),
        'packages',
        'ast-template',
        'tmp',
        `status-${label}`
      );
      rmSync(tempRoot, { recursive: true, force: true });
      mkdirSync(tempRoot, { recursive: true });
      writeRelativeFileTree(
        tempRoot,
        readRelativeFileTree(path.join(fixtureRoot, 'apply-run', 'destination'))
      );

      expect(
        reportTemplateDirectorySessionStatus(
          applyTemplateDirectorySessionEnvelopeWithDefaultRegistryToDirectory(
            path.join(fixtureRoot, 'apply-run', 'template'),
            tempRoot,
            normalizeContext(section.context),
            section.default_strategy,
            section.overrides,
            section.replacements,
            section.allowed_families ?? undefined
          )
        )
      ).toEqual(section.expected);
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('conforms to the session-diagnostics fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-359-template-directory-session-diagnostics-report',
      'template-directory-session-diagnostics-report.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      dry_run: SessionFixtureSection & { allowed_families: string[] | null };
      apply_run: SessionFixtureSection & { allowed_families: string[] | null };
      filtered_discovery: SessionFixtureSection & { allowed_families: string[] | null };
    };

    expect(
      planTemplateDirectorySessionDiagnosticsFromDirectories(
        path.join(fixtureRoot, 'dry-run', 'template'),
        path.join(fixtureRoot, 'dry-run', 'destination'),
        normalizeContext(fixture.dry_run.context),
        fixture.dry_run.default_strategy,
        fixture.dry_run.overrides,
        fixture.dry_run.replacements,
        fixture.dry_run.allowed_families ?? undefined
      )
    ).toEqual(fixture.dry_run.expected);

    for (const [label, section] of [
      ['apply_run', fixture.apply_run] as const,
      ['filtered_discovery', fixture.filtered_discovery] as const
    ]) {
      const tempRoot = path.resolve(
        process.cwd(),
        'packages',
        'ast-template',
        'tmp',
        `diagnostics-${label}`
      );
      rmSync(tempRoot, { recursive: true, force: true });
      mkdirSync(tempRoot, { recursive: true });
      writeRelativeFileTree(
        tempRoot,
        readRelativeFileTree(path.join(fixtureRoot, 'apply-run', 'destination'))
      );

      expect(
        applyTemplateDirectorySessionDiagnosticsWithDefaultRegistryToDirectory(
          path.join(fixtureRoot, 'apply-run', 'template'),
          tempRoot,
          normalizeContext(section.context),
          section.default_strategy,
          section.overrides,
          section.replacements,
          section.allowed_families ?? undefined
        )
      ).toEqual(section.expected);
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('conforms to the session-outcome fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-360-template-directory-session-outcome-report',
      'template-directory-session-outcome-report.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      dry_run: SessionFixtureSection & { allowed_families: string[] | null };
      apply_run: SessionFixtureSection & { allowed_families: string[] | null };
      filtered_discovery: SessionFixtureSection & { allowed_families: string[] | null };
    };

    expect(
      planTemplateDirectorySessionOutcomeFromDirectories(
        path.join(fixtureRoot, 'dry-run', 'template'),
        path.join(fixtureRoot, 'dry-run', 'destination'),
        normalizeContext(fixture.dry_run.context),
        fixture.dry_run.default_strategy,
        fixture.dry_run.overrides,
        fixture.dry_run.replacements,
        fixture.dry_run.allowed_families ?? undefined
      )
    ).toEqual(fixture.dry_run.expected);

    for (const [label, section] of [
      ['apply_run', fixture.apply_run] as const,
      ['filtered_discovery', fixture.filtered_discovery] as const
    ]) {
      const tempRoot = path.resolve(
        process.cwd(),
        'packages',
        'ast-template',
        'tmp',
        `outcome-${label}`
      );
      rmSync(tempRoot, { recursive: true, force: true });
      mkdirSync(tempRoot, { recursive: true });
      writeRelativeFileTree(
        tempRoot,
        readRelativeFileTree(path.join(fixtureRoot, 'apply-run', 'destination'))
      );

      expect(
        applyTemplateDirectorySessionOutcomeWithDefaultRegistryToDirectory(
          path.join(fixtureRoot, 'apply-run', 'template'),
          tempRoot,
          normalizeContext(section.context),
          section.default_strategy,
          section.overrides,
          section.replacements,
          section.allowed_families ?? undefined
        )
      ).toEqual(section.expected);
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('conforms to the session-runner fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-361-template-directory-session-runner-report',
      'template-directory-session-runner-report.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      plan_run: SessionFixtureSection & { mode: 'plan'; allowed_families: string[] | null };
      apply_run: SessionFixtureSection & { mode: 'apply'; allowed_families: string[] | null };
      reapply_run: SessionFixtureSection & { mode: 'reapply'; allowed_families: string[] | null };
    };

    expect(
      runTemplateDirectorySessionWithDefaultRegistryToDirectory(
        fixture.plan_run.mode,
        path.join(fixtureRoot, 'dry-run', 'template'),
        path.join(fixtureRoot, 'dry-run', 'destination'),
        normalizeContext(fixture.plan_run.context),
        fixture.plan_run.default_strategy,
        fixture.plan_run.overrides,
        fixture.plan_run.replacements,
        fixture.plan_run.allowed_families ?? undefined
      )
    ).toEqual(fixture.plan_run.expected);

    const tempRoot = path.resolve(process.cwd(), 'packages', 'ast-template', 'tmp', 'runner');
    rmSync(tempRoot, { recursive: true, force: true });
    mkdirSync(tempRoot, { recursive: true });
    writeRelativeFileTree(
      tempRoot,
      readRelativeFileTree(path.join(fixtureRoot, 'apply-run', 'destination'))
    );

    expect(
      runTemplateDirectorySessionWithDefaultRegistryToDirectory(
        fixture.apply_run.mode,
        path.join(fixtureRoot, 'apply-run', 'template'),
        tempRoot,
        normalizeContext(fixture.apply_run.context),
        fixture.apply_run.default_strategy,
        fixture.apply_run.overrides,
        fixture.apply_run.replacements,
        fixture.apply_run.allowed_families ?? undefined
      )
    ).toEqual(fixture.apply_run.expected);

    expect(
      runTemplateDirectorySessionWithDefaultRegistryToDirectory(
        fixture.reapply_run.mode,
        path.join(fixtureRoot, 'apply-run', 'template'),
        tempRoot,
        normalizeContext(fixture.reapply_run.context),
        fixture.reapply_run.default_strategy,
        fixture.reapply_run.overrides,
        fixture.reapply_run.replacements,
        fixture.reapply_run.allowed_families ?? undefined
      )
    ).toEqual(fixture.reapply_run.expected);

    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('conforms to the session-options fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-362-template-directory-session-options-report',
      'template-directory-session-options-report.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      plan_run: { options: Record<string, unknown>; expected: unknown };
      apply_run: { options: Record<string, unknown>; expected: unknown };
      reapply_run: { options: Record<string, unknown>; expected: unknown };
    };

    expect(
      runTemplateDirectorySessionWithOptions(
        normalizeOptions(
          fixture.plan_run.options,
          path.join(fixtureRoot, 'dry-run', 'template'),
          path.join(fixtureRoot, 'dry-run', 'destination')
        )
      )
    ).toEqual(fixture.plan_run.expected);

    const tempRoot = path.resolve(process.cwd(), 'packages', 'ast-template', 'tmp', 'options');
    rmSync(tempRoot, { recursive: true, force: true });
    mkdirSync(tempRoot, { recursive: true });
    writeRelativeFileTree(
      tempRoot,
      readRelativeFileTree(path.join(fixtureRoot, 'apply-run', 'destination'))
    );

    expect(
      runTemplateDirectorySessionWithOptions(
        normalizeOptions(
          fixture.apply_run.options,
          path.join(fixtureRoot, 'apply-run', 'template'),
          tempRoot
        )
      )
    ).toEqual(fixture.apply_run.expected);

    expect(
      runTemplateDirectorySessionWithOptions(
        normalizeOptions(
          fixture.reapply_run.options,
          path.join(fixtureRoot, 'apply-run', 'template'),
          tempRoot
        )
      )
    ).toEqual(fixture.reapply_run.expected);

    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('conforms to the session-profile fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-363-template-directory-session-profile-report',
      'template-directory-session-profile-report.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      profiles: Record<string, Record<string, unknown>>;
      plan_run: { profile: string; overrides: Record<string, unknown>; expected: unknown };
      apply_run: { profile: string; overrides: Record<string, unknown>; expected: unknown };
      reapply_run: { profile: string; overrides: Record<string, unknown>; expected: unknown };
    };
    const profiles = normalizeProfiles(fixture.profiles);

    expect(
      runTemplateDirectorySessionWithProfile(profiles, fixture.plan_run.profile, {
        templateRoot: path.join(fixtureRoot, 'dry-run', 'template'),
        destinationRoot: path.join(fixtureRoot, 'dry-run', 'destination')
      } as any)
    ).toEqual(fixture.plan_run.expected);

    const tempRoot = path.resolve(process.cwd(), 'packages', 'ast-template', 'tmp', 'profiles');
    rmSync(tempRoot, { recursive: true, force: true });
    mkdirSync(tempRoot, { recursive: true });
    writeRelativeFileTree(
      tempRoot,
      readRelativeFileTree(path.join(fixtureRoot, 'apply-run', 'destination'))
    );

    expect(
      runTemplateDirectorySessionWithProfile(profiles, fixture.apply_run.profile, {
        templateRoot: path.join(fixtureRoot, 'apply-run', 'template'),
        destinationRoot: tempRoot
      } as any)
    ).toEqual(fixture.apply_run.expected);

    expect(
      runTemplateDirectorySessionWithProfile(
        profiles,
        fixture.reapply_run.profile,
        normalizeOptions(
          fixture.reapply_run.overrides,
          path.join(fixtureRoot, 'apply-run', 'template'),
          tempRoot
        )
      )
    ).toEqual(fixture.reapply_run.expected);

    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('conforms to the session-configuration fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-364-template-directory-session-configuration-report',
      'template-directory-session-configuration-report.json'
    );
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      profiles: Record<string, Record<string, unknown>>;
      options_valid: { options: Record<string, unknown>; expected: unknown };
      options_missing_roots: { options: Record<string, unknown>; expected: unknown };
      profile_valid: { profile: string; overrides: Record<string, unknown>; expected: unknown };
      profile_missing_profile: {
        profile: string;
        overrides: Record<string, unknown>;
        expected: unknown;
      };
      profile_missing_roots: {
        profile: string;
        overrides: Record<string, unknown>;
        expected: unknown;
      };
    };
    const profiles = normalizeProfiles(fixture.profiles);

    expect(
      reportTemplateDirectorySessionOptionsConfiguration(
        normalizeOptionsDirect(fixture.options_valid.options)
      )
    ).toEqual(fixture.options_valid.expected);

    expect(
      reportTemplateDirectorySessionOptionsConfiguration(
        normalizeOptionsDirect(fixture.options_missing_roots.options)
      )
    ).toEqual(fixture.options_missing_roots.expected);

    expect(
      reportTemplateDirectorySessionProfileConfiguration(
        profiles,
        fixture.profile_valid.profile,
        normalizeOptionsDirect(fixture.profile_valid.overrides)
      )
    ).toEqual(fixture.profile_valid.expected);

    expect(
      reportTemplateDirectorySessionProfileConfiguration(
        profiles,
        fixture.profile_missing_profile.profile,
        normalizeOptionsDirect(fixture.profile_missing_profile.overrides)
      )
    ).toEqual(fixture.profile_missing_profile.expected);

    expect(
      reportTemplateDirectorySessionProfileConfiguration(
        profiles,
        fixture.profile_missing_roots.profile,
        normalizeOptionsDirect(fixture.profile_missing_roots.overrides)
      )
    ).toEqual(fixture.profile_missing_roots.expected);
  });

  it('conforms to the session-profile-configuration-outcome fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-365-template-directory-session-profile-configuration-outcome-report',
      'template-directory-session-profile-configuration-outcome-report.json'
    );
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      profiles: Record<string, Record<string, unknown>>;
      missing_profile: {
        profile: string;
        overrides: Record<string, unknown>;
        expected: unknown;
      };
      missing_roots: {
        profile: string;
        overrides: Record<string, unknown>;
        expected: unknown;
      };
    };
    const profiles = normalizeProfiles(fixture.profiles);

    expect(
      runTemplateDirectorySessionWithProfile(
        profiles,
        fixture.missing_profile.profile,
        normalizeOptionsDirect(fixture.missing_profile.overrides) as any
      )
    ).toEqual(fixture.missing_profile.expected);

    expect(
      runTemplateDirectorySessionWithProfile(
        profiles,
        fixture.missing_roots.profile,
        normalizeOptionsDirect(fixture.missing_roots.overrides) as any
      )
    ).toEqual(fixture.missing_roots.expected);
  });

  it('conforms to the session-options-configuration-outcome fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-366-template-directory-session-options-configuration-outcome-report',
      'template-directory-session-options-configuration-outcome-report.json'
    );
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      missing_both_roots: { options: Record<string, unknown>; expected: unknown };
      missing_destination_root: { options: Record<string, unknown>; expected: unknown };
    };

    expect(
      runTemplateDirectorySessionWithOptions(
        normalizeOptionsDirect(fixture.missing_both_roots.options) as any
      )
    ).toEqual(fixture.missing_both_roots.expected);

    expect(
      runTemplateDirectorySessionWithOptions(
        normalizeOptionsDirect(fixture.missing_destination_root.options) as any
      )
    ).toEqual(fixture.missing_destination_root.expected);
  });

  it('conforms to the session-request fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-367-template-directory-session-request-report',
      'template-directory-session-request-report.json'
    );
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      profiles: Record<string, Record<string, unknown>>;
      options_valid: { options: Record<string, unknown>; expected: unknown };
      options_invalid: { options: Record<string, unknown>; expected: unknown };
      profile_valid: { profile: string; overrides: Record<string, unknown>; expected: unknown };
      profile_invalid: { profile: string; overrides: Record<string, unknown>; expected: unknown };
    };
    const profiles = normalizeProfiles(fixture.profiles);

    expect(
      reportTemplateDirectorySessionOptionsRequest(
        normalizeOptionsDirect(fixture.options_valid.options) as any
      )
    ).toEqual(fixture.options_valid.expected);

    expect(
      reportTemplateDirectorySessionOptionsRequest(
        normalizeOptionsDirect(fixture.options_invalid.options) as any
      )
    ).toEqual(fixture.options_invalid.expected);

    expect(
      reportTemplateDirectorySessionProfileRequest(
        profiles,
        fixture.profile_valid.profile,
        normalizeOptionsDirect(fixture.profile_valid.overrides) as any
      )
    ).toEqual(fixture.profile_valid.expected);

    expect(
      reportTemplateDirectorySessionProfileRequest(
        profiles,
        fixture.profile_invalid.profile,
        normalizeOptionsDirect(fixture.profile_invalid.overrides) as any
      )
    ).toEqual(fixture.profile_invalid.expected);
  });

  it('conforms to the session-request-outcome fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-368-template-directory-session-request-outcome-report',
      'template-directory-session-request-outcome-report.json'
    );
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      options_ready: { request: unknown; expected: unknown };
      options_blocked: { request: unknown; expected: unknown };
      profile_ready: { request: unknown; expected: unknown };
      profile_blocked: { request: unknown; expected: unknown };
    };
    const fixtureRoot = path.dirname(fixturePath);

    expect(
      runTemplateDirectorySessionRequest(
        resolveRequestFixturePaths(
          fixture.options_ready.request as Record<string, unknown>,
          fixtureRoot
        ) as any
      )
    ).toEqual(fixture.options_ready.expected);
    expect(
      runTemplateDirectorySessionRequest(
        resolveRequestFixturePaths(
          fixture.options_blocked.request as Record<string, unknown>,
          fixtureRoot
        ) as any
      )
    ).toEqual(fixture.options_blocked.expected);
    expect(
      runTemplateDirectorySessionRequest(
        resolveRequestFixturePaths(
          fixture.profile_ready.request as Record<string, unknown>,
          fixtureRoot
        ) as any
      )
    ).toEqual(fixture.profile_ready.expected);
    expect(
      runTemplateDirectorySessionRequest(
        resolveRequestFixturePaths(
          fixture.profile_blocked.request as Record<string, unknown>,
          fixtureRoot
        ) as any
      )
    ).toEqual(fixture.profile_blocked.expected);
  });

  it('conforms to the session-request-runner fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-369-template-directory-session-request-runner-report',
      'template-directory-session-request-runner-report.json'
    );
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      profiles: Record<string, Record<string, unknown>>;
      options_ready: { request: Record<string, unknown>; expected: unknown };
      options_blocked: { request: Record<string, unknown>; expected: unknown };
      profile_ready: { request: Record<string, unknown>; expected: unknown };
      profile_blocked: { request: Record<string, unknown>; expected: unknown };
    };
    const fixtureRoot = path.dirname(fixturePath);
    const profiles = normalizeProfiles(fixture.profiles);

    expect(
      runTemplateDirectorySessionRunnerRequest(
        resolveRunnerRequestFixturePaths(fixture.options_ready.request, fixtureRoot) as any,
        profiles
      )
    ).toEqual(fixture.options_ready.expected);
    expect(
      runTemplateDirectorySessionRunnerRequest(
        resolveRunnerRequestFixturePaths(fixture.options_blocked.request, fixtureRoot) as any,
        profiles
      )
    ).toEqual(fixture.options_blocked.expected);
    expect(
      runTemplateDirectorySessionRunnerRequest(
        resolveRunnerRequestFixturePaths(fixture.profile_ready.request, fixtureRoot) as any,
        profiles
      )
    ).toEqual(fixture.profile_ready.expected);
    expect(
      runTemplateDirectorySessionRunnerRequest(
        resolveRunnerRequestFixturePaths(fixture.profile_blocked.request, fixtureRoot) as any,
        profiles
      )
    ).toEqual(fixture.profile_blocked.expected);
  });

  it('conforms to the session-runner-input fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-370-template-directory-session-runner-input-report',
      'template-directory-session-runner-input-report.json'
    );
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      options_ready: { input: Record<string, unknown>; expected: unknown };
      options_blocked: { input: Record<string, unknown>; expected: unknown };
      profile_ready: { input: Record<string, unknown>; expected: unknown };
      profile_blocked: { input: Record<string, unknown>; expected: unknown };
    };

    expect(reportTemplateDirectorySessionRunnerInput(fixture.options_ready.input as any)).toEqual(
      fixture.options_ready.expected
    );
    expect(reportTemplateDirectorySessionRunnerInput(fixture.options_blocked.input as any)).toEqual(
      fixture.options_blocked.expected
    );
    expect(reportTemplateDirectorySessionRunnerInput(fixture.profile_ready.input as any)).toEqual(
      fixture.profile_ready.expected
    );
    expect(reportTemplateDirectorySessionRunnerInput(fixture.profile_blocked.input as any)).toEqual(
      fixture.profile_blocked.expected
    );
  });

  it('conforms to the session-runner-payload fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-371-template-directory-session-runner-payload-report',
      'template-directory-session-runner-payload-report.json'
    );
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      options_explicit: { input: Record<string, unknown>; expected: unknown };
      options_inferred: { input: Record<string, unknown>; expected: unknown };
      profile_default_name: { input: Record<string, unknown>; expected: unknown };
      profile_explicit_name: { input: Record<string, unknown>; expected: unknown };
    };

    expect(
      reportTemplateDirectorySessionRunnerPayload(fixture.options_explicit.input as any)
    ).toEqual(fixture.options_explicit.expected);
    expect(
      reportTemplateDirectorySessionRunnerPayload(fixture.options_inferred.input as any)
    ).toEqual(fixture.options_inferred.expected);
    expect(
      reportTemplateDirectorySessionRunnerPayload(fixture.profile_default_name.input as any)
    ).toEqual(fixture.profile_default_name.expected);
    expect(
      reportTemplateDirectorySessionRunnerPayload(fixture.profile_explicit_name.input as any)
    ).toEqual(fixture.profile_explicit_name.expected);
  });

  it('conforms to the session-runner-payload-outcome fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-372-template-directory-session-runner-payload-outcome-report',
      'template-directory-session-runner-payload-outcome-report.json'
    );
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      profiles: Record<string, Record<string, unknown>>;
      options_ready: { payload: Record<string, unknown>; expected: unknown };
      options_blocked: { payload: Record<string, unknown>; expected: unknown };
      profile_ready: { payload: Record<string, unknown>; expected: unknown };
      profile_blocked: { payload: Record<string, unknown>; expected: unknown };
    };
    const fixtureRoot = path.dirname(fixturePath);
    const profiles = normalizeProfiles(fixture.profiles);

    expect(
      runTemplateDirectorySessionRunnerPayload(
        resolveSessionRunnerPayloadFixturePaths(fixture.options_ready.payload, fixtureRoot) as any,
        profiles
      )
    ).toEqual(fixture.options_ready.expected);
    expect(
      runTemplateDirectorySessionRunnerPayload(
        resolveSessionRunnerPayloadFixturePaths(
          fixture.options_blocked.payload,
          fixtureRoot
        ) as any,
        profiles
      )
    ).toEqual(fixture.options_blocked.expected);
    expect(
      runTemplateDirectorySessionRunnerPayload(
        resolveSessionRunnerPayloadFixturePaths(fixture.profile_ready.payload, fixtureRoot) as any,
        profiles
      )
    ).toEqual(fixture.profile_ready.expected);
    expect(
      runTemplateDirectorySessionRunnerPayload(
        resolveSessionRunnerPayloadFixturePaths(
          fixture.profile_blocked.payload,
          fixtureRoot
        ) as any,
        profiles
      )
    ).toEqual(fixture.profile_blocked.expected);
  });

  it('conforms to the session-entrypoint-outcome fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-373-template-directory-session-entrypoint-outcome-report',
      'template-directory-session-entrypoint-outcome-report.json'
    );
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      profiles: Record<string, Record<string, unknown>>;
      payload_ready: { input: Record<string, unknown>; expected: unknown };
      request_blocked: { input: Record<string, unknown>; expected: unknown };
      request_ready: { input: Record<string, unknown>; expected: unknown };
      payload_blocked: { input: Record<string, unknown>; expected: unknown };
    };
    const fixtureRoot = path.dirname(fixturePath);
    const profiles = normalizeProfiles(fixture.profiles);

    expect(
      runTemplateDirectorySessionEntrypoint(
        resolveSessionEntrypointFixturePaths(fixture.payload_ready.input, fixtureRoot) as any,
        profiles
      )
    ).toEqual(fixture.payload_ready.expected);
    expect(
      runTemplateDirectorySessionEntrypoint(
        resolveSessionEntrypointFixturePaths(fixture.request_blocked.input, fixtureRoot) as any,
        profiles
      )
    ).toEqual(fixture.request_blocked.expected);
    expect(
      runTemplateDirectorySessionEntrypoint(
        resolveSessionEntrypointFixturePaths(fixture.request_ready.input, fixtureRoot) as any,
        profiles
      )
    ).toEqual(fixture.request_ready.expected);
    expect(
      runTemplateDirectorySessionEntrypoint(
        resolveSessionEntrypointFixturePaths(fixture.payload_blocked.input, fixtureRoot) as any,
        profiles
      )
    ).toEqual(fixture.payload_blocked.expected);
  });

  it('conforms to the session-entrypoint-report fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-374-template-directory-session-entrypoint-report',
      'template-directory-session-entrypoint-report.json'
    );
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      payload_ready: { input: Record<string, unknown>; expected: unknown };
      request_blocked: { input: Record<string, unknown>; expected: unknown };
      request_ready: { input: Record<string, unknown>; expected: unknown };
      payload_blocked: { input: Record<string, unknown>; expected: unknown };
    };

    expect(reportTemplateDirectorySessionEntrypoint(fixture.payload_ready.input as any)).toEqual(
      fixture.payload_ready.expected
    );
    expect(reportTemplateDirectorySessionEntrypoint(fixture.request_blocked.input as any)).toEqual(
      fixture.request_blocked.expected
    );
    expect(reportTemplateDirectorySessionEntrypoint(fixture.request_ready.input as any)).toEqual(
      fixture.request_ready.expected
    );
    expect(reportTemplateDirectorySessionEntrypoint(fixture.payload_blocked.input as any)).toEqual(
      fixture.payload_blocked.expected
    );
  });

  it('conforms to the session-resolution-report fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-375-template-directory-session-resolution-report',
      'template-directory-session-resolution-report.json'
    );
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      profiles: Record<string, Record<string, unknown>>;
      payload_ready: { input: Record<string, unknown>; expected: unknown };
      request_blocked: { input: Record<string, unknown>; expected: unknown };
      request_ready: { input: Record<string, unknown>; expected: unknown };
      payload_blocked: { input: Record<string, unknown>; expected: unknown };
    };
    const profiles = normalizeProfiles(fixture.profiles);

    expect(
      reportTemplateDirectorySessionResolution(fixture.payload_ready.input as any, profiles)
    ).toEqual(fixture.payload_ready.expected);
    expect(
      reportTemplateDirectorySessionResolution(fixture.request_blocked.input as any, profiles)
    ).toEqual(fixture.request_blocked.expected);
    expect(
      reportTemplateDirectorySessionResolution(fixture.request_ready.input as any, profiles)
    ).toEqual(fixture.request_ready.expected);
    expect(
      reportTemplateDirectorySessionResolution(fixture.payload_blocked.input as any, profiles)
    ).toEqual(fixture.payload_blocked.expected);
  });

  it('conforms to the session-inspection-report fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-376-template-directory-session-inspection-report',
      'template-directory-session-inspection-report.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      profiles: Record<string, Record<string, unknown>>;
      payload_ready: { input: Record<string, unknown>; expected: unknown };
      request_blocked: { input: Record<string, unknown>; expected: unknown };
      request_ready: { input: Record<string, unknown>; expected: unknown };
      payload_blocked: { input: Record<string, unknown>; expected: unknown };
    };
    const profiles = normalizeProfiles(fixture.profiles);

    expect(
      reportTemplateDirectorySessionInspection(
        resolveSessionEntrypointFixturePaths(fixture.payload_ready.input, fixtureRoot) as any,
        profiles
      )
    ).toEqual(resolveSessionInspectionExpectedPaths(fixture.payload_ready.expected, fixtureRoot));
    expect(
      reportTemplateDirectorySessionInspection(
        resolveSessionEntrypointFixturePaths(fixture.request_blocked.input, fixtureRoot) as any,
        profiles
      )
    ).toEqual(resolveSessionInspectionExpectedPaths(fixture.request_blocked.expected, fixtureRoot));
    expect(
      reportTemplateDirectorySessionInspection(
        resolveSessionEntrypointFixturePaths(fixture.request_ready.input, fixtureRoot) as any,
        profiles
      )
    ).toEqual(resolveSessionInspectionExpectedPaths(fixture.request_ready.expected, fixtureRoot));
    expect(
      reportTemplateDirectorySessionInspection(
        resolveSessionEntrypointFixturePaths(fixture.payload_blocked.input, fixtureRoot) as any,
        profiles
      )
    ).toEqual(resolveSessionInspectionExpectedPaths(fixture.payload_blocked.expected, fixtureRoot));
  });

  it('conforms to the session-dispatch-report fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-377-template-directory-session-dispatch-report',
      'template-directory-session-dispatch-report.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      profiles: Record<string, Record<string, unknown>>;
      inspect_payload_ready: { input: Record<string, unknown>; expected: unknown };
      inspect_request_blocked: { input: Record<string, unknown>; expected: unknown };
      run_request_ready: { input: Record<string, unknown>; expected: unknown };
      run_payload_blocked: { input: Record<string, unknown>; expected: unknown };
    };
    const profiles = normalizeProfiles(fixture.profiles);

    for (const key of [
      'inspect_payload_ready',
      'inspect_request_blocked',
      'run_request_ready',
      'run_payload_blocked'
    ] as const) {
      const input = fixture[key].input as Record<string, unknown>;
      expect(
        runTemplateDirectorySessionDispatch(
          String(input.operation),
          resolveSessionEntrypointFixturePaths(
            input.entrypoint as Record<string, unknown>,
            fixtureRoot
          ) as any,
          profiles
        )
      ).toEqual(resolveSessionDispatchExpectedPaths(fixture[key].expected, fixtureRoot));
    }
  });

  it('conforms to the session-command-report fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-378-template-directory-session-command-report',
      'template-directory-session-command-report.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      profiles: Record<string, Record<string, unknown>>;
      inspect_payload_ready: { input: Record<string, unknown>; expected: unknown };
      run_request_ready: { input: Record<string, unknown>; expected: unknown };
      run_payload_blocked: { input: Record<string, unknown>; expected: unknown };
    };
    const profiles = normalizeProfiles(fixture.profiles);

    for (const key of [
      'inspect_payload_ready',
      'run_request_ready',
      'run_payload_blocked'
    ] as const) {
      const input = resolveSessionCommandFixturePaths(
        fixture[key].input as Record<string, unknown>,
        fixtureRoot
      );
      expect(runTemplateDirectorySessionCommand(input as any, profiles)).toEqual(
        resolveSessionDispatchExpectedPaths(fixture[key].expected, fixtureRoot)
      );
    }
  });

  it('conforms to the session-command-payload-report fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-379-template-directory-session-command-payload-report',
      'template-directory-session-command-payload-report.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      profiles: Record<string, Record<string, unknown>>;
      inspect_ready: { input: Record<string, unknown>; expected: unknown };
      run_profile_ready: { input: Record<string, unknown>; expected: unknown };
      run_profile_blocked: { input: Record<string, unknown>; expected: unknown };
    };
    const profiles = normalizeProfiles(fixture.profiles);

    for (const key of ['inspect_ready', 'run_profile_ready', 'run_profile_blocked'] as const) {
      const input = resolveSessionCommandPayloadFixturePaths(
        fixture[key].input as Record<string, unknown>,
        fixtureRoot
      );
      expect(runTemplateDirectorySessionCommandPayload(input as any, profiles)).toEqual(
        resolveSessionDispatchExpectedPaths(fixture[key].expected, fixtureRoot)
      );
    }
  });

  it('conforms to the session-dispatch-rejection fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-380-template-directory-session-dispatch-rejection',
      'template-directory-session-dispatch-rejection.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      cases: Array<{
        label: string;
        input: Record<string, unknown>;
        expected_error: string;
      }>;
    };

    for (const testCase of fixture.cases) {
      const input = testCase.input;
      expect(() =>
        runTemplateDirectorySessionDispatch(
          String(input.operation),
          resolveSessionEntrypointFixturePaths(
            input.entrypoint as Record<string, unknown>,
            fixtureRoot
          ) as SessionEntrypoint,
          {}
        )
      ).toThrow(testCase.expected_error);
    }
  });

  it('conforms to the session-command-rejection fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-381-template-directory-session-command-rejection',
      'template-directory-session-command-rejection.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      cases: Array<{
        label: string;
        input: Record<string, unknown>;
        expected_error: string;
      }>;
    };

    for (const testCase of fixture.cases) {
      const input = resolveSessionCommandFixturePaths(testCase.input, fixtureRoot);
      expect(() => runTemplateDirectorySessionCommand(input as SessionCommand, {})).toThrow(
        testCase.expected_error
      );
    }
  });

  it('conforms to the session-command-payload-rejection fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-382-template-directory-session-command-payload-rejection',
      'template-directory-session-command-payload-rejection.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      cases: Array<{
        label: string;
        input: Record<string, unknown>;
        expected_error: string;
      }>;
    };

    for (const testCase of fixture.cases) {
      const input = resolveSessionCommandPayloadFixturePaths(testCase.input, fixtureRoot);
      expect(() => runTemplateDirectorySessionCommandPayload(input, {})).toThrow(
        testCase.expected_error
      );
    }
  });

  it('conforms to the session-command transport-envelope fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-389-template-directory-session-command-transport-envelope',
      'template-directory-session-command-envelope.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      cases: Array<{
        label: string;
        input: Record<string, unknown>;
        expected_envelope: Record<string, unknown>;
      }>;
    };

    for (const testCase of fixture.cases) {
      const input = resolveSessionCommandFixturePaths(testCase.input, fixtureRoot);
      const expected = resolveSessionCommandEnvelopeFixturePaths(
        testCase.expected_envelope,
        fixtureRoot
      );

      expect(sessionCommandEnvelope(input as SessionCommand)).toEqual(expected);
      expect(importSessionCommandEnvelope(expected)).toEqual({ command: input });
    }
  });

  it('conforms to the session-command transport-rejection fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-390-template-directory-session-command-transport-rejection',
      'template-directory-session-command-envelope-rejection.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      cases: Array<{
        label: string;
        envelope: Record<string, unknown>;
        expected_error: Record<string, unknown>;
      }>;
    };

    for (const testCase of fixture.cases) {
      const envelope = resolveSessionCommandEnvelopeFixturePaths(testCase.envelope, fixtureRoot);
      expect(importSessionCommandEnvelope(envelope)).toEqual({
        error: testCase.expected_error
      });
    }
  });

  it('conforms to the session-invocation-report fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-383-template-directory-session-invocation-report',
      'template-directory-session-invocation-report.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      profiles: Record<string, Record<string, unknown>>;
      inspect_nested_payload_ready: { input: Record<string, unknown>; expected: unknown };
      run_nested_request_ready: { input: Record<string, unknown>; expected: unknown };
      run_flat_profile_blocked: { input: Record<string, unknown>; expected: unknown };
    };
    const profiles = normalizeProfiles(fixture.profiles);

    for (const key of [
      'inspect_nested_payload_ready',
      'run_nested_request_ready',
      'run_flat_profile_blocked'
    ] as const) {
      const input = resolveSessionInvocationFixturePaths(
        fixture[key].input as Record<string, unknown>,
        fixtureRoot
      );
      expect(runTemplateDirectorySession(input, profiles)).toEqual(
        resolveSessionDispatchExpectedPaths(fixture[key].expected, fixtureRoot)
      );
    }
  });

  it('conforms to the session-invocation-rejection fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-384-template-directory-session-invocation-rejection',
      'template-directory-session-invocation-rejection.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      cases: Array<{
        label: string;
        input: Record<string, unknown>;
        expected_error: string;
      }>;
    };

    for (const testCase of fixture.cases) {
      const input = resolveSessionInvocationFixturePaths(testCase.input, fixtureRoot);
      expect(() => runTemplateDirectorySession(input as SessionInvocation, {})).toThrow(
        testCase.expected_error
      );
    }
  });

  it('conforms to the session-invocation-json-roundtrip fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-385-template-directory-session-invocation-json-roundtrip',
      'template-directory-session-invocation-json-roundtrip.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      cases: Array<{
        label: string;
        input: Record<string, unknown>;
      }>;
    };

    for (const testCase of fixture.cases) {
      const input = resolveSessionInvocationFixturePaths(testCase.input, fixtureRoot);
      const roundTripped = JSON.parse(JSON.stringify(input)) as SessionInvocation;
      expect(roundTripped).toEqual(input);
    }
  });

  it('conforms to the session-invocation transport-envelope fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-386-template-directory-session-invocation-transport-envelope',
      'template-directory-session-invocation-envelope.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      cases: Array<{
        label: string;
        input: Record<string, unknown>;
        expected_envelope: Record<string, unknown>;
      }>;
    };

    for (const testCase of fixture.cases) {
      const input = resolveSessionInvocationFixturePaths(testCase.input, fixtureRoot);
      const expected = resolveSessionInvocationEnvelopeFixturePaths(
        testCase.expected_envelope,
        fixtureRoot
      );

      expect(sessionInvocationEnvelope(input)).toEqual(expected);
      expect(importSessionInvocationEnvelope(expected)).toEqual({ invocation: input });
    }
  });

  it('conforms to the session-invocation transport-rejection fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-387-template-directory-session-invocation-transport-rejection',
      'template-directory-session-invocation-envelope-rejection.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      cases: Array<{
        label: string;
        envelope: Record<string, unknown>;
        expected_error: Record<string, unknown>;
      }>;
    };

    for (const testCase of fixture.cases) {
      const envelope = resolveSessionInvocationEnvelopeFixturePaths(testCase.envelope, fixtureRoot);
      expect(importSessionInvocationEnvelope(envelope)).toEqual({
        error: testCase.expected_error
      });
    }
  });

  it('conforms to the session-invocation envelope-application fixture', () => {
    const fixturePath = path.resolve(
      process.cwd(),
      '..',
      'fixtures',
      'diagnostics',
      'slice-388-template-directory-session-invocation-envelope-application',
      'template-directory-session-invocation-envelope-application.json'
    );
    const fixtureRoot = path.dirname(fixturePath);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      profiles: Readonly<Record<string, unknown>>;
      cases: Array<{
        label: string;
        envelope: Record<string, unknown>;
        expected: unknown;
      }>;
      rejections: Array<{
        label: string;
        envelope: Record<string, unknown>;
        expected_error: Record<string, unknown>;
      }>;
    };
    const profiles = normalizeProfiles(
      fixture.profiles as Readonly<Record<string, Record<string, unknown>>>
    );

    for (const testCase of fixture.cases) {
      const envelope = resolveSessionInvocationEnvelopeFixturePaths(testCase.envelope, fixtureRoot);
      const imported = importSessionInvocationEnvelope(envelope);
      expect(imported.error).toBeUndefined();
      expect(
        runTemplateDirectorySession(imported.invocation as SessionInvocation, profiles)
      ).toEqual(resolveSessionDispatchExpectedPaths(testCase.expected, fixtureRoot));
    }

    for (const testCase of fixture.rejections) {
      const envelope = resolveSessionInvocationEnvelopeFixturePaths(testCase.envelope, fixtureRoot);
      expect(importSessionInvocationEnvelope(envelope)).toEqual({
        error: testCase.expected_error
      });
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

function normalizeOptions(
  options: Record<string, unknown>,
  templateRoot: string,
  destinationRoot: string
) {
  return {
    mode: options.mode as 'plan' | 'apply' | 'reapply',
    templateRoot,
    destinationRoot,
    context: normalizeContext((options.context ?? {}) as Record<string, unknown>),
    defaultStrategy: options.default_strategy as TemplateStrategy,
    overrides: (options.overrides ?? []) as TemplateStrategyOverride[],
    replacements: (options.replacements ?? {}) as Record<string, string>,
    allowedFamilies: (options.allowed_families ?? undefined) as string[] | undefined
  };
}

function normalizeProfiles(profiles: Record<string, Record<string, unknown>>) {
  return Object.fromEntries(
    Object.entries(profiles).map(([name, profile]) => [
      name,
      {
        mode: profile.mode as 'plan' | 'apply' | 'reapply',
        context: normalizeContext((profile.context ?? {}) as Record<string, unknown>),
        defaultStrategy: profile.default_strategy as TemplateStrategy,
        overrides: (profile.overrides ?? []) as TemplateStrategyOverride[],
        replacements: (profile.replacements ?? {}) as Record<string, string>,
        allowedFamilies: (profile.allowed_families ?? undefined) as string[] | undefined
      }
    ])
  );
}

function normalizeOptionsDirect(options: Record<string, unknown>) {
  return {
    mode: options.mode as 'plan' | 'apply' | 'reapply',
    templateRoot: (options.template_root ?? '') as string,
    destinationRoot: (options.destination_root ?? '') as string,
    context: options.context
      ? normalizeContext(options.context as Record<string, unknown>)
      : undefined,
    defaultStrategy: options.default_strategy as TemplateStrategy | undefined,
    overrides: options.overrides as TemplateStrategyOverride[] | undefined,
    replacements: options.replacements as Record<string, string> | undefined,
    allowedFamilies: (options.allowed_families ?? undefined) as string[] | undefined
  };
}

function resolveRequestFixturePaths(request: Record<string, unknown>, fixtureRoot: string) {
  const cloned = JSON.parse(JSON.stringify(request)) as Record<string, unknown>;
  const resolved = cloned.resolved_options as Record<string, unknown> | null | undefined;
  if (resolved) {
    resolveOptionsFixturePaths(resolved, fixtureRoot);
  }
  return cloned;
}

function resolveOptionsFixturePaths(options: Record<string, unknown>, fixtureRoot: string) {
  if (typeof options.template_root === 'string' && options.template_root.length > 0) {
    options.template_root = path.join(fixtureRoot, options.template_root);
  }
  if (typeof options.destination_root === 'string' && options.destination_root.length > 0) {
    options.destination_root = path.join(fixtureRoot, options.destination_root);
  }
  return options;
}

function resolveRunnerRequestFixturePaths(request: Record<string, unknown>, fixtureRoot: string) {
  const cloned = JSON.parse(JSON.stringify(request)) as Record<string, unknown>;
  const options = cloned.options as Record<string, unknown> | null | undefined;
  if (options) {
    if (typeof options.template_root === 'string' && options.template_root.length > 0) {
      options.template_root = path.join(fixtureRoot, options.template_root);
    }
    if (typeof options.destination_root === 'string' && options.destination_root.length > 0) {
      options.destination_root = path.join(fixtureRoot, options.destination_root);
    }
  }
  const overrides = cloned.overrides as Record<string, unknown> | null | undefined;
  if (overrides) {
    if (typeof overrides.template_root === 'string' && overrides.template_root.length > 0) {
      overrides.template_root = path.join(fixtureRoot, overrides.template_root);
    }
    if (typeof overrides.destination_root === 'string' && overrides.destination_root.length > 0) {
      overrides.destination_root = path.join(fixtureRoot, overrides.destination_root);
    }
  }
  return cloned;
}

function resolveSessionRunnerPayloadFixturePaths(
  payload: Record<string, unknown>,
  fixtureRoot: string
) {
  const cloned = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  if (typeof cloned.template_root === 'string' && cloned.template_root.length > 0) {
    cloned.template_root = path.join(fixtureRoot, cloned.template_root);
  }
  if (typeof cloned.destination_root === 'string' && cloned.destination_root.length > 0) {
    cloned.destination_root = path.join(fixtureRoot, cloned.destination_root);
  }
  return cloned;
}

function resolveSessionEntrypointFixturePaths(
  entrypoint: Record<string, unknown>,
  fixtureRoot: string
) {
  const cloned = JSON.parse(JSON.stringify(entrypoint)) as Record<string, unknown>;
  if (cloned.payload && typeof cloned.payload === 'object') {
    cloned.payload = resolveSessionRunnerPayloadFixturePaths(
      cloned.payload as Record<string, unknown>,
      fixtureRoot
    );
  }
  if (cloned.request && typeof cloned.request === 'object') {
    cloned.request = resolveRunnerRequestFixturePaths(
      cloned.request as Record<string, unknown>,
      fixtureRoot
    );
  }
  return cloned;
}

function resolveSessionInspectionExpectedPaths(value: unknown, fixtureRoot: string): unknown {
  const cloned = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  const entrypointReport = cloned.entrypoint_report as Record<string, unknown> | undefined;
  if (entrypointReport?.runner_request) {
    entrypointReport.runner_request = resolveRunnerRequestFixturePaths(
      entrypointReport.runner_request as Record<string, unknown>,
      fixtureRoot
    );
  }
  const sessionResolution = cloned.session_resolution as Record<string, unknown> | undefined;
  if (sessionResolution?.runner_request) {
    sessionResolution.runner_request = resolveRunnerRequestFixturePaths(
      sessionResolution.runner_request as Record<string, unknown>,
      fixtureRoot
    );
  }
  const sessionRequest = sessionResolution?.session_request as Record<string, unknown> | undefined;
  if (sessionRequest?.resolved_options) {
    sessionRequest.resolved_options = resolveOptionsFixturePaths(
      sessionRequest.resolved_options as Record<string, unknown>,
      fixtureRoot
    );
  }
  return cloned;
}

function resolveSessionCommandFixturePaths(command: Record<string, unknown>, fixtureRoot: string) {
  const cloned = JSON.parse(JSON.stringify(command)) as Record<string, unknown>;
  if (cloned.payload && typeof cloned.payload === 'object') {
    cloned.payload = resolveSessionRunnerPayloadFixturePaths(
      cloned.payload as Record<string, unknown>,
      fixtureRoot
    );
  }
  if (cloned.request && typeof cloned.request === 'object') {
    cloned.request = resolveRunnerRequestFixturePaths(
      cloned.request as Record<string, unknown>,
      fixtureRoot
    );
  }
  return cloned;
}

function resolveSessionCommandPayloadFixturePaths(
  command: Record<string, unknown>,
  fixtureRoot: string
) {
  return resolveSessionRunnerPayloadFixturePaths(command, fixtureRoot);
}

function resolveSessionCommandEnvelopeFixturePaths(
  envelope: Record<string, unknown>,
  fixtureRoot: string
) {
  const cloned = JSON.parse(JSON.stringify(envelope)) as Record<string, unknown>;
  if (cloned.command && typeof cloned.command === 'object') {
    cloned.command = resolveSessionCommandFixturePaths(
      cloned.command as Record<string, unknown>,
      fixtureRoot
    );
  }
  return cloned;
}

function resolveSessionInvocationFixturePaths(
  invocation: Record<string, unknown>,
  fixtureRoot: string
): SessionInvocation {
  const cloned = JSON.parse(JSON.stringify(invocation)) as Record<string, unknown>;
  if (cloned.payload) {
    cloned.payload = resolveSessionRunnerPayloadFixturePaths(
      cloned.payload as Record<string, unknown>,
      fixtureRoot
    );
  }
  if (cloned.request) {
    cloned.request = resolveRunnerRequestFixturePaths(
      cloned.request as Record<string, unknown>,
      fixtureRoot
    );
  }
  if (typeof cloned.template_root === 'string' && cloned.template_root.length > 0) {
    cloned.template_root = path.join(fixtureRoot, cloned.template_root);
  }
  if (typeof cloned.destination_root === 'string' && cloned.destination_root.length > 0) {
    cloned.destination_root = path.join(fixtureRoot, cloned.destination_root);
  }
  return cloned as SessionInvocation;
}

function resolveSessionInvocationEnvelopeFixturePaths(
  envelope: Record<string, unknown>,
  fixtureRoot: string
) {
  const cloned = JSON.parse(JSON.stringify(envelope)) as Record<string, unknown>;
  if (cloned.invocation && typeof cloned.invocation === 'object') {
    cloned.invocation = resolveSessionInvocationFixturePaths(
      cloned.invocation as Record<string, unknown>,
      fixtureRoot
    );
  }
  return cloned;
}

function resolveSessionDispatchExpectedPaths(value: unknown, fixtureRoot: string): unknown {
  const cloned = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  if (cloned.inspection) {
    cloned.inspection = resolveSessionInspectionExpectedPaths(cloned.inspection, fixtureRoot);
  }
  return cloned;
}
