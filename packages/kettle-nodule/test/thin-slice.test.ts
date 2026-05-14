import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyPackagedTemplateInventory,
  applyProject,
  applyReadmeStyle,
  planPackagedTemplateInventory,
  planProject,
  planReadmeStyle
} from '../src/index';

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
    const projectRoot = path.resolve(import.meta.dirname, '..', 'tmp', 'thin-slice');
    rmSync(projectRoot, { force: true, recursive: true });
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
    rmSync(projectRoot, { force: true, recursive: true });
  });

  it('plans, applies, and reapplies packaged template inventory', () => {
    const projectRoot = path.resolve(
      import.meta.dirname,
      '..',
      'tmp',
      'packaged-template-inventory'
    );
    rmSync(projectRoot, { force: true, recursive: true });
    writeTree(projectRoot, {
      'package.json': JSON.stringify(
        {
          name: '@acme/widget',
          version: '0.1.0',
          packageManager: 'pnpm@9.1.0',
          type: 'module'
        },
        null,
        2
      )
    });

    const expectedChanged = [
      '.editorconfig',
      '.github/workflows/ci.yml',
      '.gitignore',
      '.npmrc',
      '.prettierrc.json',
      'README.md'
    ];
    const plan = planPackagedTemplateInventory(projectRoot);
    expect(plan.recipePack.name).toBe('kettle-nodule-packaged-template-inventory');
    expect(plan.changedFiles).toEqual(expectedChanged);

    const apply = applyPackagedTemplateInventory(projectRoot);
    expect(apply.changedFiles).toEqual(expectedChanged);
    const ci = readFileSync(path.join(projectRoot, '.github/workflows/ci.yml'), 'utf8');
    expect(ci).toContain('node-version: "20"');
    expect(ci).toContain('- run: pnpm test');
    const readme = readFileSync(path.join(projectRoot, 'README.md'), 'utf8');
    expect(readme).toContain('# @acme/widget');
    expect(readme).toContain('## Synopsis');
    expect(readme).toContain('## Installation');
    expect(readme).toContain('pnpm add @acme/widget');
    expect(readme).toContain('## Configuration');
    expect(readme).toContain('## Basic Usage');

    const second = applyPackagedTemplateInventory(projectRoot);
    expect(second.changedFiles).toEqual([]);
    expect(readFileSync(path.join(projectRoot, '.github/workflows/ci.yml'), 'utf8')).toBe(ci);
    expect(readFileSync(path.join(projectRoot, 'README.md'), 'utf8')).toBe(readme);
    rmSync(projectRoot, { force: true, recursive: true });
  });

  it('conforms to the README style profile', () => {
    const fixturePath = path.resolve(
      import.meta.dirname,
      '..',
      '..',
      '..',
      '..',
      'fixtures',
      'diagnostics',
      'slice-740-kettle-readme-style-profile',
      'kettle-readme-style-profile.json'
    );
    const styleFixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      readonly profile: { readonly name: string };
    };
    expect(styleFixture.profile.name).toBe('kettle-readme-style-profile');
    const projectRoot = path.resolve(import.meta.dirname, '..', 'tmp', 'readme-style-profile');
    rmSync(projectRoot, { force: true, recursive: true });
    writeTree(projectRoot, {
      'package.json': JSON.stringify(
        {
          name: '@acme/widget',
          version: '0.1.0',
          description: 'Example npm package',
          repository: { url: 'https://github.com/acme/widget' },
          license: 'MIT',
          type: 'module',
          packageManager: 'pnpm@9.1.0'
        },
        null,
        2
      ),
      'kettle.yml': [
        'readme:',
        '  style: thin',
        '  project_emoji: "📦"',
        '  logo_row:',
        '    enabled: true',
        '    max_count: 3',
        '    logos:',
        '      - type: language',
        '        slug: typescript-lang',
        '        alt: TypeScript language logo',
        '      - type: org',
        '        slug: acme',
        '        alt: Acme org logo',
        '      - type: affiliated_project',
        '        slug: tree-sitter/tree-sitter',
        '        alt: Tree-sitter project logo',
        '      - type: project',
        '        slug: acme/ignored',
        '        alt: Ignored fourth logo',
        '  preserve_sections:',
        '    - Synopsis',
        '    - Configuration',
        '    - Basic Usage',
        '  section_aliases:',
        '    Usage: Basic Usage',
        '  conditional_sections:',
        '    floss_funding: default_for_mit_opt_in_otherwise',
        '  badges:',
        '    disabled:',
        '      - coveralls',
        '  license:',
        '    spdx:',
        '      - MIT',
        ''
      ].join('\n'),
      'SECURITY.md': '# Security\n',
      'README.md': [
        '# Old Package',
        '',
        '## Summary',
        '',
        'Destination synopsis.',
        '',
        '## Configuration',
        '',
        'Destination configuration.',
        '',
        '## Usage',
        '',
        'Destination usage.',
        ''
      ].join('\n')
    });

    const plan = planReadmeStyle(projectRoot);
    expect(plan.changed).toBe(true);
    expect(plan.style).toBe('thin');
    expect(plan.preservedSections).toEqual(
      expect.arrayContaining(['Synopsis', 'Configuration', 'Basic Usage'])
    );
    expect(plan.renderedSections).toEqual(
      expect.arrayContaining([
        'Logos',
        'Project Name',
        'Badges',
        'Synopsis',
        'Installation',
        'Configuration',
        'Basic Usage',
        'FLOSS Funding',
        'Security',
        'Contributing',
        'Versioning',
        'License',
        'A request for help'
      ])
    );
    expect(plan.omittedSections).toEqual(
      expect.arrayContaining(['Hostile RubyGems Takeover', 'Secure Installation'])
    );
    expect(plan.missingIntegrations).toEqual(expect.arrayContaining(['codecov', 'qlty']));
    expect(plan.missingIntegrations).not.toContain('coveralls');
    expect(plan.disabledIntegrations).toContain('coveralls');
    expect(plan.finalContent).not.toContain('Ignored fourth logo');
    for (const snippet of [
      '# 📦 @acme/widget',
      '## 🌻 Synopsis\n\nDestination synopsis.',
      '## ⚙️ Configuration\n\nDestination configuration.',
      '## 🔧 Basic Usage\n\nDestination usage.',
      '## 🔐 Security\n\nSee [SECURITY.md](SECURITY.md).',
      '## 🦷 FLOSS Funding',
      'pnpm add @acme/widget',
      'https://logos.galtzo.com/assets/images/tree-sitter/tree-sitter/avatar-192px.svg',
      'StructuredMerge packages provide fixture-backed merge behavior',
      '| tree-sitter-language-pack | Go, Ruby, Rust, TypeScript | markdown, toml, yaml, source |',
      '| bash-merge, dotenv-merge, rbs-merge | Excluded from generated support tables until explicit scope decisions exist |',
      '| Freeze tokens | Show how destination-owned regions are preserved without filling project-specific usage sections |'
    ]) {
      expect(plan.finalContent).toContain(snippet);
    }

    const apply = applyReadmeStyle(projectRoot);
    expect(apply.changed).toBe(true);
    const second = applyReadmeStyle(projectRoot);
    expect(second.changed).toBe(false);
    rmSync(projectRoot, { force: true, recursive: true });
  });
});
