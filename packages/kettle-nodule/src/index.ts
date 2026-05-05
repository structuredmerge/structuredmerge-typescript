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
      templateRecipe('.prettierrc.json')
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
