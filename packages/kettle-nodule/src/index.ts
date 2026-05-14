import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type {
  ContentRecipeExecutionReport,
  ContentRecipeExecutionReportEnvelope,
  ContentRecipeExecutionRequest,
  ContentRecipeExecutionRequestEnvelope,
  ContentRecipeStep,
  ContentRecipeStepReport,
  Diagnostic,
  StructuredEditApplication,
  StructuredEditOperationProfile,
  StructuredEditResult
} from '@structuredmerge/ast-merge';
import { STRUCTURED_EDIT_TRANSPORT_VERSION } from '@structuredmerge/ast-merge';

export const packageName = '@structuredmerge/kettle-nodule';

const MANAGED_BLOCK_OPEN = '// <<kettle-nodule:generated>> do not edit below this line';
const MANAGED_BLOCK_CLOSE = '// <</kettle-nodule:generated>>';

export interface PackageFacts {
  readonly package: {
    readonly ecosystem: 'npm';
    readonly name: string;
    readonly slug: string;
    readonly description?: string;
    readonly homepageUrl?: string;
    readonly sourceUrl?: string;
    readonly licenseExpression?: string;
  };
  readonly npm: {
    readonly packageJsonPath: 'package.json';
    readonly packageManager?: string;
    readonly moduleType?: string;
  };
  readonly funding?: {
    readonly urls: readonly string[];
  };
}

export interface PackagingRecipe {
  readonly name:
    | 'readme_metadata'
    | 'changelog_unreleased'
    | 'generated_block_sync'
    | 'template_source_application';
  readonly targetPath: string;
  readonly providerFamily: 'markdown' | 'text';
  readonly primitive:
    | 'supplied_readme_metadata_synchronization'
    | 'changelog_unreleased_normalization'
    | 'supplied_managed_text_block_replacement'
    | 'supplied_template_source_application';
  readonly facts: readonly string[];
  readonly selectors: readonly string[];
}

export interface RecipePack {
  readonly name: 'kettle-nodule-core' | 'kettle-nodule-packaged-template-inventory';
  readonly version: 1;
  readonly ecosystem: 'npm';
  readonly recipes: readonly PackagingRecipe[];
}

export interface RecipeRunReport {
  readonly recipeName: PackagingRecipe['name'];
  readonly relativePath: string;
  readonly changed: boolean;
  readonly requestEnvelope: ContentRecipeExecutionRequestEnvelope;
  readonly reportEnvelope: ContentRecipeExecutionReportEnvelope;
  readonly finalContent: string;
  readonly diagnostics: readonly Diagnostic[];
}

export interface ProjectReport {
  readonly mode: 'plan' | 'apply';
  readonly ready: boolean;
  readonly facts: PackageFacts;
  readonly recipePack: RecipePack;
  readonly recipeReports: readonly RecipeRunReport[];
  readonly changedFiles: readonly string[];
  readonly diagnostics: readonly Diagnostic[];
}

export interface ReadmeStyleReport {
  readonly readmePath: string;
  readonly changed: boolean;
  readonly style: string;
  readonly preservedSections: readonly string[];
  readonly renderedSections: readonly string[];
  readonly omittedSections: readonly string[];
  readonly missingIntegrations: readonly string[];
  readonly disabledIntegrations: readonly string[];
  readonly unresolvedLogoSlugs: readonly string[];
  readonly licenseFilesChanged: boolean;
  readonly copyrightAuthors: readonly string[];
  readonly finalContent: string;
}

interface KettleConfig {
  readonly readme?: ReadmeConfig;
}

interface ReadmeConfig {
  readonly style?: string;
  readonly project_emoji?: string;
  readonly logo_row?: {
    readonly enabled?: boolean;
    readonly max_count?: number;
    readonly logos?: readonly ReadmeLogo[];
  };
  readonly badges?: {
    readonly disabled?: readonly string[];
  };
  readonly preserve_sections?: readonly string[];
  readonly section_aliases?: Record<string, string>;
  readonly conditional_sections?: {
    readonly floss_funding?: string;
  };
  readonly license?: {
    readonly spdx?: readonly string[];
  };
}

interface ReadmeLogo {
  readonly type?: string;
  readonly slug?: string;
  readonly alt?: string;
  readonly href?: string;
}

interface PackageJson {
  readonly name?: string;
  readonly description?: string;
  readonly homepage?: string;
  readonly repository?: string | { readonly url?: string };
  readonly license?: string;
  readonly packageManager?: string;
  readonly type?: string;
  readonly funding?: string | { readonly url?: string } | Array<string | { readonly url?: string }>;
}

export function discoverFacts(projectRoot: string): PackageFacts {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJson;
  const name = packageJson.name ?? path.basename(projectRoot);
  const fundingUrls = normalizeFundingUrls(packageJson.funding);
  const facts: PackageFacts = {
    package: compact({
      ecosystem: 'npm',
      name,
      slug: name,
      description: packageJson.description,
      homepageUrl: packageJson.homepage,
      sourceUrl: repositoryUrl(packageJson.repository),
      licenseExpression: packageJson.license
    }),
    npm: compact({
      packageJsonPath: 'package.json',
      packageManager: packageJson.packageManager,
      moduleType: packageJson.type
    })
  };

  return fundingUrls.length > 0 ? { ...facts, funding: { urls: fundingUrls } } : facts;
}

export function recipePack(): RecipePack {
  return {
    name: 'kettle-nodule-core',
    version: 1,
    ecosystem: 'npm',
    recipes: [
      recipeEntry(
        'readme_metadata',
        'README.md',
        'markdown',
        'supplied_readme_metadata_synchronization',
        ['package', 'funding', 'readme']
      ),
      recipeEntry(
        'changelog_unreleased',
        'CHANGELOG.md',
        'markdown',
        'changelog_unreleased_normalization',
        ['package', 'changelog']
      ),
      recipeEntry(
        'generated_block_sync',
        'src/generated-package-info.ts',
        'text',
        'supplied_managed_text_block_replacement',
        ['package', 'generated_blocks']
      )
    ]
  };
}

export function packagedTemplateInventoryPack(): RecipePack {
  return {
    name: 'kettle-nodule-packaged-template-inventory',
    version: 1,
    ecosystem: 'npm',
    recipes: [
      templateRecipe('.editorconfig'),
      templateRecipe('.github/workflows/ci.yml'),
      templateRecipe('.gitignore'),
      templateRecipe('.npmrc'),
      templateRecipe('.prettierrc.json'),
      templateRecipe('README.md')
    ]
  };
}

export function planProject(projectRoot: string): ProjectReport {
  const facts = discoverFacts(projectRoot);
  const pack = recipePack();
  const files = readProjectFiles(projectRoot, pack);
  const recipeReports = pack.recipes.map((recipe) =>
    executeRecipe({ projectRoot, recipe, facts, files })
  );
  const changedFiles = changedFilesForReports(recipeReports);

  return {
    mode: 'plan',
    ready: true,
    facts,
    recipePack: pack,
    recipeReports,
    changedFiles,
    diagnostics: recipeReports.flatMap((report) => report.diagnostics)
  };
}

export function planPackagedTemplateInventory(projectRoot: string): ProjectReport {
  const facts = discoverFacts(projectRoot);
  const pack = packagedTemplateInventoryPack();
  const files = readProjectFiles(projectRoot, pack);
  const recipeReports = pack.recipes.map((recipe) =>
    executeRecipe({ projectRoot, recipe, facts, files })
  );

  return {
    mode: 'plan',
    ready: true,
    facts,
    recipePack: pack,
    recipeReports,
    changedFiles: changedFilesForReports(recipeReports),
    diagnostics: recipeReports.flatMap((report) => report.diagnostics)
  };
}

export function applyPackagedTemplateInventory(projectRoot: string): ProjectReport {
  const report = { ...planPackagedTemplateInventory(projectRoot), mode: 'apply' as const };
  for (const recipeReport of report.recipeReports) {
    if (!recipeReport.changed) continue;

    const targetPath = path.join(projectRoot, recipeReport.relativePath);
    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, recipeReport.finalContent);
  }
  return report;
}

export function applyProject(projectRoot: string): ProjectReport {
  const report = { ...planProject(projectRoot), mode: 'apply' as const };
  for (const recipeReport of report.recipeReports) {
    if (!recipeReport.changed) continue;

    const targetPath = path.join(projectRoot, recipeReport.relativePath);
    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, recipeReport.finalContent);
  }
  return report;
}

export function planReadmeStyle(projectRoot: string): ReadmeStyleReport {
  const facts = discoverFacts(projectRoot);
  const config = readKettleConfig(projectRoot).readme ?? {};
  const readmePath = path.join(projectRoot, 'README.md');
  const original = existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : '';
  const hasSecurity = existsSync(path.join(projectRoot, 'SECURITY.md'));
  return renderReadmeStyle(original, facts, config, hasSecurity);
}

export function applyReadmeStyle(projectRoot: string): ReadmeStyleReport {
  const report = planReadmeStyle(projectRoot);
  if (!report.changed) return report;

  writeFileSync(path.join(projectRoot, report.readmePath), report.finalContent);
  return report;
}

function executeRecipe(input: {
  readonly projectRoot: string;
  readonly recipe: PackagingRecipe;
  readonly facts: PackageFacts;
  readonly files: Readonly<Record<string, string>>;
}): RecipeRunReport {
  const original = input.files[input.recipe.targetPath] ?? '';
  const finalContent =
    input.recipe.name === 'readme_metadata'
      ? synchronizeReadme(original, input.facts)
      : input.recipe.name === 'changelog_unreleased'
        ? normalizeChangelog(original)
        : input.recipe.name === 'generated_block_sync'
          ? synchronizeManagedBlock(original, input.facts)
          : renderPackagedTemplate(input.recipe.targetPath, input.facts);
  const request = contentRecipeExecutionRequest({
    recipeName: input.recipe.primitive,
    recipeVersion: '1',
    relativePath: input.recipe.targetPath,
    providerFamily: input.recipe.providerFamily,
    templateContent: '',
    destinationContent: original,
    steps: [contentRecipeStep(input.recipe)],
    runtimeContext: runtimeContext(input.facts),
    metadata: {
      packagingRecipe: input.recipe.name,
      projectRoot: input.projectRoot
    }
  });
  const changed = finalContent !== original;
  const stepReport = contentRecipeStepReport({
    recipe: input.recipe,
    request,
    original,
    finalContent,
    changed
  });
  const report = contentRecipeExecutionReport({
    request,
    finalContent,
    changed,
    stepReports: [stepReport],
    diagnostics: [],
    metadata: { packagingRecipe: input.recipe.name }
  });

  return {
    recipeName: input.recipe.name,
    relativePath: input.recipe.targetPath,
    changed,
    requestEnvelope: contentRecipeExecutionRequestEnvelope(request),
    reportEnvelope: contentRecipeExecutionReportEnvelope(report),
    finalContent,
    diagnostics: []
  };
}

export function contentRecipeExecutionRequest(
  request: ContentRecipeExecutionRequest
): ContentRecipeExecutionRequest {
  return { ...request };
}

export function contentRecipeExecutionRequestEnvelope(
  request: ContentRecipeExecutionRequest
): ContentRecipeExecutionRequestEnvelope {
  return {
    kind: 'content_recipe_execution_request',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    request
  };
}

export function contentRecipeExecutionReport(
  report: ContentRecipeExecutionReport
): ContentRecipeExecutionReport {
  return { ...report };
}

export function contentRecipeExecutionReportEnvelope(
  report: ContentRecipeExecutionReport
): ContentRecipeExecutionReportEnvelope {
  return {
    kind: 'content_recipe_execution_report',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    report
  };
}

function contentRecipeStep(recipe: PackagingRecipe): ContentRecipeStep {
  return {
    stepId: recipe.name,
    stepKind: 'structured_edit',
    name: recipe.name,
    providerFamily: recipe.providerFamily,
    metadata: { primitive: recipe.primitive, targetPath: recipe.targetPath }
  };
}

function contentRecipeStepReport(input: {
  readonly recipe: PackagingRecipe;
  readonly request: ContentRecipeExecutionRequest;
  readonly original: string;
  readonly finalContent: string;
  readonly changed: boolean;
}): ContentRecipeStepReport {
  const operationProfile: StructuredEditOperationProfile = {
    operationKind: input.recipe.primitive,
    operationFamily: 'kettle-nodule',
    knownOperationKind: true,
    sourceRequirement: 'destination_content',
    destinationRequirement: 'relative_path',
    replacementSource: 'runtime_context',
    capturesSourceText: false,
    supportsIfMissing: true
  };
  const result: StructuredEditResult = {
    operationKind: input.recipe.primitive,
    updatedContent: input.finalContent,
    changed: input.changed,
    operationProfile
  };
  const application: StructuredEditApplication = {
    request: {
      operationKind: input.recipe.primitive,
      content: input.original,
      sourceLabel: input.recipe.targetPath,
      metadata: { packagingRecipe: input.recipe.name }
    },
    result
  };

  return {
    stepId: input.recipe.name,
    stepKind: input.recipe.primitive,
    status: input.changed ? 'applied' : 'unchanged',
    changed: input.changed,
    inputContent: input.original,
    outputContent: input.finalContent,
    application,
    diagnostics: [],
    metadata: { targetPath: input.recipe.targetPath }
  };
}

function synchronizeReadme(content: string, facts: PackageFacts): string {
  const lines = content.split('\n');
  const heading = `# ${facts.package.name}`;
  const h1Index = lines.findIndex((line) => line.startsWith('# '));
  if (h1Index >= 0) {
    lines[h1Index] = heading;
  } else {
    lines.unshift(heading, '');
  }
  return replaceMarkdownManagedBlock(
    lines.join('\n'),
    'kettle-nodule:metadata',
    readmeMetadataBlock(facts)
  );
}

function normalizeChangelog(content: string): string {
  let text = content;
  if (!text.split('\n')[0]?.startsWith('# ')) {
    text = `# Changelog\n\n${text}`;
  }
  if (/^##\s+\[?Unreleased\]?/im.test(text)) {
    return ensureTrailingNewline(text);
  }

  const lines = text.split('\n');
  const insertAt = lines.findIndex((line) => line.startsWith('## '));
  const section = ['', '## [Unreleased]', '', '### Added', '', '### Changed', '', '### Fixed', ''];
  lines.splice(insertAt >= 0 ? insertAt : lines.length, 0, ...section);
  return ensureTrailingNewline(lines.join('\n').replace(/\n{3,}/g, '\n\n'));
}

function synchronizeManagedBlock(content: string, facts: PackageFacts): string {
  const replacement = [
    MANAGED_BLOCK_OPEN,
    `export const packageName = ${JSON.stringify(facts.package.name)};`,
    `export const packageEcosystem = ${JSON.stringify(facts.package.ecosystem)};`,
    MANAGED_BLOCK_CLOSE,
    ''
  ].join('\n');
  return replaceTextManagedBlock(content, replacement);
}

function readProjectFiles(projectRoot: string, pack: RecipePack): Record<string, string> {
  return Object.fromEntries(
    pack.recipes.map((recipe) => {
      const targetPath = path.join(projectRoot, recipe.targetPath);
      return [recipe.targetPath, existsSync(targetPath) ? readFileSync(targetPath, 'utf8') : ''];
    })
  );
}

function runtimeContext(facts: PackageFacts): Readonly<Record<string, unknown>> {
  return facts.funding
    ? { package: facts.package, npm: facts.npm, funding: facts.funding }
    : { package: facts.package, npm: facts.npm };
}

function recipeEntry(
  name: PackagingRecipe['name'],
  targetPath: string,
  providerFamily: PackagingRecipe['providerFamily'],
  primitive: PackagingRecipe['primitive'],
  facts: readonly string[]
): PackagingRecipe {
  return {
    name,
    targetPath,
    providerFamily,
    primitive,
    facts,
    selectors: []
  };
}

function templateRecipe(targetPath: string): PackagingRecipe {
  return recipeEntry(
    'template_source_application',
    targetPath,
    'text',
    'supplied_template_source_application',
    ['package', 'templates']
  );
}

function changedFilesForReports(reports: readonly RecipeRunReport[]): readonly string[] {
  return reports
    .filter((report) => report.changed)
    .map((report) => report.relativePath)
    .sort();
}

function renderPackagedTemplate(targetPath: string, facts: PackageFacts): string {
  return packagedTemplateContent(targetPath)
    .replaceAll('{{PACKAGE_NAME}}', facts.package.name)
    .replaceAll('{{PACKAGE_MANAGER_COMMAND}}', packageManagerCommand(facts.npm.packageManager))
    .replaceAll('{{NODE_VERSION}}', nodeVersionFromPackageManager(facts.npm.packageManager));
}

function packagedTemplateContent(targetPath: string): string {
  switch (targetPath) {
    case '.editorconfig':
      return 'root = true\n\n[*]\ncharset = utf-8\nend_of_line = lf\ninsert_final_newline = true\ntrim_trailing_whitespace = true\n';
    case '.github/workflows/ci.yml':
      return 'name: CI\n\non:\n  push:\n  pull_request:\n\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: "{{NODE_VERSION}}"\n      - run: corepack enable\n      - run: {{PACKAGE_MANAGER_COMMAND}} install\n      - run: {{PACKAGE_MANAGER_COMMAND}} test\n';
    case '.gitignore':
      return 'node_modules/\ncoverage/\ndist/\n';
    case '.npmrc':
      return 'engine-strict=true\nfund=true\n';
    case '.prettierrc.json':
      return '{\n  "singleQuote": true,\n  "trailingComma": "none"\n}\n';
    case 'README.md':
      return '# {{PACKAGE_NAME}}\n\n## Synopsis\n\n## Installation\n\n```sh\n{{PACKAGE_MANAGER_COMMAND}} add {{PACKAGE_NAME}}\n```\n\n## Configuration\n\n## Basic Usage\n';
    default:
      return '';
  }
}

function nodeVersionFromPackageManager(packageManager: string | undefined): string {
  const match = packageManager?.match(/node@(\d+(?:\.\d+){0,2})/);
  return match?.[1] ?? '20';
}

function packageManagerCommand(packageManager: string | undefined): string {
  return packageManager?.split('@')[0] || 'npm';
}

function readmeMetadataBlock(facts: PackageFacts): string {
  const rows = [
    ['Package', facts.package.name],
    ['Description', facts.package.description],
    ['Homepage', facts.package.homepageUrl],
    ['Source', facts.package.sourceUrl],
    ['License', facts.package.licenseExpression]
  ].filter((row): row is [string, string] => typeof row[1] === 'string' && row[1].length > 0);

  return [
    '<!-- kettle-nodule:metadata:start -->',
    '| Field | Value |',
    '|---|---|',
    ...rows.map(([field, value]) => `| ${field} | ${value} |`),
    '<!-- kettle-nodule:metadata:end -->'
  ].join('\n');
}

function replaceMarkdownManagedBlock(content: string, marker: string, replacement: string): string {
  return replaceBetweenMarkers(
    content,
    `<!-- ${marker}:start -->`,
    `<!-- ${marker}:end -->`,
    replacement,
    () => `${content.trimEnd()}\n\n${replacement}\n`
  );
}

function replaceTextManagedBlock(content: string, replacement: string): string {
  return replaceBetweenMarkers(content, MANAGED_BLOCK_OPEN, MANAGED_BLOCK_CLOSE, replacement, () =>
    [content.trimEnd(), replacement].filter((part) => part.length > 0).join('\n')
  );
}

function replaceBetweenMarkers(
  content: string,
  openMarker: string,
  closeMarker: string,
  replacement: string,
  fallback: () => string
): string {
  const openIndex = content.indexOf(openMarker);
  const closeIndex = content.indexOf(closeMarker);
  if (openIndex < 0 || closeIndex < openIndex) return fallback();

  let closeEnd = closeIndex + closeMarker.length;
  if (content[closeEnd] === '\n') closeEnd += 1;
  return `${content.slice(0, openIndex)}${replacement}\n${content.slice(closeEnd)}`;
}

function repositoryUrl(repository: PackageJson['repository']): string | undefined {
  if (typeof repository === 'string') return repository;
  return repository?.url;
}

function readKettleConfig(projectRoot: string): KettleConfig {
  const configPath = path.join(projectRoot, 'kettle.yml');
  if (!existsSync(configPath)) return {};
  return parseKettleConfig(readFileSync(configPath, 'utf8'));
}

function parseKettleConfig(source: string): KettleConfig {
  const readme: {
    style?: string;
    project_emoji?: string;
    logo_row?: { enabled?: boolean; max_count?: number; logos: ReadmeLogo[] };
    badges?: { disabled: string[] };
    preserve_sections?: string[];
    section_aliases?: Record<string, string>;
    conditional_sections?: { floss_funding?: string };
    license?: { spdx: string[] };
  } = {};
  let section = '';
  let list = '';
  let currentLogo: Record<string, string> | undefined;
  for (const rawLine of source.split('\n')) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed === 'readme:') continue;
    if (trimmed.endsWith(':') && !trimmed.startsWith('- ')) {
      const key = trimmed.slice(0, -1);
      if (['logo_row', 'badges', 'section_aliases', 'conditional_sections', 'license'].includes(key)) {
        section = key;
        list = '';
      } else if (section === 'logo_row' && key === 'logos') {
        list = 'logos';
        readme.logo_row ??= { logos: [] };
      } else if (section === 'badges' && key === 'disabled') {
        list = 'disabled';
        readme.badges ??= { disabled: [] };
      } else if (section === 'license' && key === 'spdx') {
        list = 'spdx';
        readme.license ??= { spdx: [] };
      } else {
        section = key;
      }
      continue;
    }
    if (trimmed.startsWith('- ')) {
      const value = unquote(trimmed.slice(2));
      if (section === 'logo_row' && list === 'logos') {
        currentLogo = {};
        readme.logo_row ??= { logos: [] };
        readme.logo_row.logos.push(currentLogo);
        const [key, rest] = splitYamlPair(value);
        if (key) currentLogo[key] = rest;
      } else if (section === 'badges' && list === 'disabled') {
        readme.badges ??= { disabled: [] };
        readme.badges.disabled.push(value);
      } else if (section === 'license' && list === 'spdx') {
        readme.license ??= { spdx: [] };
        readme.license.spdx.push(value);
      } else if (section === 'preserve_sections') {
        readme.preserve_sections ??= [];
        readme.preserve_sections.push(value);
      }
      continue;
    }
    const [key, value] = splitYamlPair(trimmed);
    if (!key) continue;
    if (section === '') {
      if (key === 'style') readme.style = value;
      if (key === 'project_emoji') readme.project_emoji = value;
      if (key === 'preserve_sections') section = 'preserve_sections';
    } else if (section === 'logo_row') {
      readme.logo_row ??= { logos: [] };
      if (currentLogo && list === 'logos') {
        currentLogo[key] = value;
      } else if (key === 'enabled') {
        readme.logo_row.enabled = value === 'true';
      } else if (key === 'max_count') {
        readme.logo_row.max_count = Number.parseInt(value, 10);
      }
    } else if (section === 'section_aliases') {
      readme.section_aliases ??= {};
      readme.section_aliases[key] = value;
    } else if (section === 'conditional_sections') {
      readme.conditional_sections ??= {};
      if (key === 'floss_funding') readme.conditional_sections.floss_funding = value;
    }
  }
  return { readme };
}

function splitYamlPair(value: string): readonly [string, string] {
  const index = value.indexOf(':');
  if (index < 0) return ['', ''];
  return [value.slice(0, index).trim(), unquote(value.slice(index + 1).trim())];
}

function unquote(value: string): string {
  return value.replace(/^["']|["']$/g, '');
}

function renderReadmeStyle(
  destination: string,
  facts: PackageFacts,
  rawConfig: ReadmeConfig,
  hasSecurity: boolean
): ReadmeStyleReport {
  const config = defaultReadmeConfig(rawConfig);
  const preserved = preservedReadmeSections(destination, config);
  const license = readmeLicense(config, facts);
  const [logoRow, unresolvedLogoSlugs] = readmeLogoRow(config);
  const [badgeCloud, missingIntegrations, disabledIntegrations] = readmeBadgeCloud(
    config,
    facts,
    license,
    hasSecurity
  );
  const renderedSections = [
    ...(logoRow ? ['Logos'] : []),
    'Project Name',
    'Badges',
    'Synopsis',
    'Info you can shake a stick at',
    'Installation',
    'Configuration',
    'Basic Usage',
    'Versioning',
    'License',
    'A request for help'
  ];
  const omittedSections = ['Hostile RubyGems Takeover', 'Secure Installation'];
  const includeFunding = shouldIncludeFunding(config, license);
  if (includeFunding) renderedSections.push('FLOSS Funding');
  else omittedSections.push('FLOSS Funding');
  if (hasSecurity) renderedSections.push('Security');
  else omittedSections.push('Security');
  renderedSections.push('Contributing');

  const sections = [
    ...(logoRow ? [logoRow] : []),
    `# ${config.project_emoji} ${facts.package.name}`,
    ...(badgeCloud ? [badgeCloud] : []),
    `## 🌻 Synopsis\n\n${preserved.synopsis ?? ''}`,
    `## 💡 Info you can shake a stick at\n\nCompatible with ${facts.npm.packageManager ?? 'the configured npm runtime'}.\n\n${readmeFamilyIntroAndBackendMatrix()}`,
    `## ✨ Installation\n\n\`\`\`console\n${packageManagerCommand(facts.npm.packageManager)} add ${facts.package.name}\n\`\`\``,
    `## ⚙️ Configuration\n\n${preserved.configuration ?? ''}`,
    `## 🔧 Basic Usage\n\n${preserved['basic usage'] ?? ''}`,
    ...(includeFunding
      ? [
          '## 🦷 FLOSS Funding\n\nThis free software project accepts funding support when configured by the package maintainer.'
        ]
      : []),
    ...(hasSecurity ? ['## 🔐 Security\n\nSee [SECURITY.md](SECURITY.md).'] : []),
    '## 🤝 Contributing\n\nContributions are welcome. Missing optional service integrations are reported by the generator instead of rendered as broken badges.',
    '## 📌 Versioning\n\nThis project follows semantic versioning for its public API where practical.',
    `## 📄 License\n\n${licenseParagraph(license)}`,
    '## 🤑 A request for help\n\nPlease support the project by using it, reporting issues, and contributing improvements.'
  ];
  const finalContent = ensureTrailingNewline(sections.join('\n\n'));
  return {
    readmePath: 'README.md',
    changed: finalContent !== destination,
    style: config.style,
    preservedSections: ['Synopsis', 'Configuration', 'Basic Usage'],
    renderedSections,
    omittedSections,
    missingIntegrations,
    disabledIntegrations,
    unresolvedLogoSlugs,
    licenseFilesChanged: false,
    copyrightAuthors: [],
    finalContent
  };
}

function readmeFamilyIntroAndBackendMatrix(): string {
  return [
    '<details markdown="1">',
    '<summary>StructuredMerge package family and backend compatibility</summary>',
    '',
    'StructuredMerge packages provide fixture-backed merge behavior for document, configuration, source, archive, and binary formats. Shared contracts live in fixtures, while Go, Ruby, Rust, and TypeScript packages expose language-native APIs over the same behavior.',
    '',
    '| Package | Layer | Families | Status | README role |',
    '|---|---|---|---|---|',
    '| ast-template | workflow | template, readme | active | applies shared templates, package README sections, and package-directory sync workflows |',
    '| ast-merge | core | template, review, structured-edit | active | documents provider-neutral contracts, token resolution, review state, and execution reports |',
    '| tree-haver | backend substrate | parser, backend | active | documents backend selection, language-pack integration, position data, and capability reporting |',
    '| markdown-merge | family | markdown | active | documents Markdown heading, fenced-code, nested-family, and provider behavior |',
    '| json-merge | family | json, jsonc | active | documents JSON and JSONC merge behavior; old jsonc-merge is superseded |',
    '| toml-merge | family | toml | active | documents TOML table, value, parser, and backend behavior |',
    '| yaml-merge | family | yaml | active | documents YAML mapping, sequence, scalar, and backend behavior |',
    '| ruby-merge | family | ruby-source | active | documents Ruby source merge behavior; old prism-merge is backend/provider prior art |',
    '| zip-merge | family | zip, archive | active | documents ZIP member planning and raw-preservation behavior |',
    '| binary-merge | family | binary | active | documents binary preservation and diagnostics behavior |',
    '',
    '| Backend | Languages | Families | Note |',
    '|---|---|---|---|',
    '| tree-sitter-language-pack | Go, Ruby, Rust, TypeScript | markdown, toml, yaml, source | Preferred cross-language parser substrate where a family has language-pack support. |',
    '| native ecosystem parser | Ruby | ruby, yaml, markdown, toml | Backend-specific Ruby packages are provider prior art or adapters, not the source schema. |',
    '| plain structured text | Go, Ruby, Rust, TypeScript | plain, binary, zip | Families without parser requirements document preservation, byte ranges, archive members, and diagnostics. |',
    '',
    '| Compatibility claim | Current disposition | Fixture source |',
    '|---|---|---|',
    '| Old Ruby runtime backend tables | Prior art only; not a cross-language support promise | slice-741 backend/platform reconciliation |',
    '| tree-sitter-language-pack | Current portable parser substrate for Go, Ruby, Rust, and TypeScript | slices 122, 135, 171, 195, 215 |',
    '| Native parser/adaptor backends | Implementation-specific providers documented through family fixtures | slices 122 and 183 |',
    '| bash-merge, dotenv-merge, rbs-merge | Excluded from generated support tables until explicit scope decisions exist | slice-741 unresolved package list |',
    '',
    '</details>'
  ].join('\n');
}

function defaultReadmeConfig(config: ReadmeConfig): Required<Pick<ReadmeConfig, 'style' | 'project_emoji' | 'preserve_sections' | 'section_aliases'>> & ReadmeConfig {
  return {
    ...config,
    style: config.style ?? 'thin',
    project_emoji: config.project_emoji ?? '💎',
    preserve_sections: config.preserve_sections ?? ['Synopsis', 'Configuration', 'Basic Usage'],
    section_aliases: {
      summary: 'synopsis',
      usage: 'basic usage',
      'configuration options': 'configuration',
      setup: 'basic usage',
      ...Object.fromEntries(
        Object.entries(config.section_aliases ?? {}).map(([from, to]) => [
          normalizeReadmeHeading(from),
          normalizeReadmeHeading(to)
        ])
      )
    }
  };
}

function preservedReadmeSections(
  content: string,
  config: Required<Pick<ReadmeConfig, 'preserve_sections' | 'section_aliases'>> & ReadmeConfig
): Record<string, string> {
  const sections = markdownSectionBodies(content);
  return Object.fromEntries(
    config.preserve_sections.map((section) => {
      const key = normalizeReadmeHeading(section);
      const alias = Object.entries(config.section_aliases).find(([, to]) => to === key)?.[0];
      return [key, sections[key] ?? (alias ? sections[alias] : undefined) ?? ''];
    })
  );
}

function markdownSectionBodies(content: string): Record<string, string> {
  const lines = content.split('\n');
  const headings = lines.flatMap((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    return match ? [{ index, level: match[1]!.length, key: normalizeReadmeHeading(match[2]!) }] : [];
  });
  return Object.fromEntries(
    headings.map((heading, index) => {
      const next = headings.slice(index + 1).find((candidate) => candidate.level <= heading.level);
      return [
        heading.key,
        lines
          .slice(heading.index + 1, next?.index ?? lines.length)
          .join('\n')
          .trim()
      ];
    })
  );
}

function normalizeReadmeHeading(value: string): string {
  const fields = value.trim().split(/\s+/);
  return fields.length > 1 && !/^[A-Za-z0-9]/.test(fields[0]!)
    ? fields.slice(1).join(' ').toLowerCase()
    : value.trim().toLowerCase();
}

function readmeLicense(config: ReadmeConfig, facts: PackageFacts): string {
  return config.license?.spdx?.join(' OR ') || facts.package.licenseExpression || 'MIT';
}

function readmeLogoRow(config: ReadmeConfig): readonly [string, readonly string[]] {
  if (config.logo_row?.enabled === false) return ['', []];
  const maxCount = Math.min(Math.max(config.logo_row?.max_count ?? 3, 1), 3);
  const unresolved: string[] = [];
  const parts = (config.logo_row?.logos ?? []).slice(0, maxCount).flatMap((logo) => {
    const type = logo.type?.trim().toLowerCase().replaceAll('-', '_') ?? '';
    const slug = logo.slug?.trim() ?? '';
    if (!['language', 'org', 'project', 'affiliated_project'].includes(type) || slug.length === 0) {
      unresolved.push(slug);
      return [];
    }
    const ref = slug.replaceAll('/', '-');
    const alt = logo.alt?.trim() || slug;
    const href = logo.href?.trim() || `https://logos.galtzo.com/assets/images/${slug}/`;
    return [
      `[![${alt}][🖼️${ref}-i]][🖼️${ref}]\n[🖼️${ref}-i]: https://logos.galtzo.com/assets/images/${slug}/avatar-192px.svg\n[🖼️${ref}]: ${href}`
    ];
  });
  return [parts.join('\n'), unresolved];
}

function readmeBadgeCloud(
  config: ReadmeConfig,
  facts: PackageFacts,
  license: string,
  hasSecurity: boolean
): readonly [string, readonly string[], readonly string[]] {
  const disabled = [...(config.badges?.disabled ?? [])];
  const missing = ['codecov', 'coveralls', 'qlty', 'codeql'].filter(
    (integration) => !disabled.includes(integration)
  );
  const badges = [
    ...(facts.package.sourceUrl
      ? [`[![Source](https://img.shields.io/badge/source-github-238636.svg)](${facts.package.sourceUrl})`]
      : []),
    `![License](https://img.shields.io/badge/license-${license.replaceAll(' ', '%20')}-259D6C.svg)`,
    ...(hasSecurity
      ? ['[![Security](https://img.shields.io/badge/security-policy-259D6C.svg)](SECURITY.md)']
      : [])
  ];
  return [badges.join(' '), missing, disabled];
}

function shouldIncludeFunding(config: ReadmeConfig, license: string): boolean {
  const policy = config.conditional_sections?.floss_funding?.trim().toLowerCase();
  if (['disabled', 'false', 'never'].includes(policy ?? '')) return false;
  if (['enabled', 'true', 'always'].includes(policy ?? '')) return true;
  return license === 'MIT';
}

function licenseParagraph(license: string): string {
  return license === 'MIT'
    ? 'This project is made available under the terms of the MIT License.'
    : `This project is made available under the following license expression: ${license}.`;
}

function normalizeFundingUrls(funding: PackageJson['funding']): readonly string[] {
  if (!funding) return [];
  const entries = Array.isArray(funding) ? funding : [funding];
  return entries
    .map((entry) => (typeof entry === 'string' ? entry : entry.url))
    .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    .sort();
}

function ensureTrailingNewline(text: string): string {
  return text.endsWith('\n') ? text : `${text}\n`;
}

function compact<T extends Record<string, unknown>>(record: T): T {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === 'string' || Array.isArray(value)) return value.length > 0;
      return true;
    })
  ) as T;
}
