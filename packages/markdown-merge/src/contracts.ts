import type {
  AppliedDelegatedChildOutput,
  ConformanceFamilyPlanContext,
  ConformanceManifestReviewState,
  ConformanceManifest,
  DelegatedChildGroupReviewState,
  DelegatedChildOperation,
  DelegatedChildSurfaceOutput,
  DiscoveredSurface,
  Diagnostic,
  FamilyFeatureProfile,
  MergeResult,
  ParseResult,
  ReviewReplayBundle,
  ReviewedNestedExecution
} from '@structuredmerge/ast-merge';
import {
  delegatedChildApplyPlan as astDelegatedChildApplyPlan,
  executeNestedMerge,
  executeReviewReplayBundleReviewedNestedExecutions,
  executeReviewStateReviewedNestedExecutions,
  executeReviewedNestedMerge
} from '@structuredmerge/ast-merge';
import {
  KREUZBERG_LANGUAGE_PACK_BACKEND,
  parseWithLanguagePack,
  type BackendReference
} from '@structuredmerge/tree-haver';

export type MarkdownDialect = 'markdown';
export type MarkdownBackend = 'kreuzberg-language-pack';
export type MarkdownRootKind = 'document';
export type MarkdownOwnerKind = 'heading' | 'code_fence';

export interface MarkdownOwner {
  readonly path: string;
  readonly ownerKind: MarkdownOwnerKind;
  readonly matchKey: string;
  readonly level?: number;
  readonly infoString?: string;
}

export interface MarkdownOwnerMatch {
  readonly templatePath: string;
  readonly destinationPath: string;
}

export interface MarkdownOwnerMatchResult {
  readonly matched: readonly MarkdownOwnerMatch[];
  readonly unmatchedTemplate: readonly string[];
  readonly unmatchedDestination: readonly string[];
}

export interface MarkdownAnalysis {
  readonly kind: 'markdown';
  readonly dialect: MarkdownDialect;
  readonly normalizedSource: string;
  readonly rootKind: MarkdownRootKind;
  readonly owners: readonly MarkdownOwner[];
}

interface MarkdownSection {
  readonly path: string;
  readonly text: string;
}

type DelegatedChildApplyPlan = ReturnType<typeof astDelegatedChildApplyPlan>;

export interface MarkdownEmbeddedFamilyCandidate {
  readonly path: string;
  readonly language: string;
  readonly family: 'typescript' | 'rust' | 'go' | 'json' | 'yaml' | 'toml';
  readonly dialect: string;
}

export interface AppliedChildOutput {
  readonly operationId: string;
  readonly output: string;
}

export interface NestedChildOutput {
  readonly surfaceAddress: string;
  readonly output: string;
}

export interface MarkdownFeatureProfile extends FamilyFeatureProfile {
  readonly family: 'markdown';
  readonly supportedDialects: readonly MarkdownDialect[];
  readonly supportedPolicies: readonly [];
}

export interface MarkdownBackendFeatureProfile extends MarkdownFeatureProfile {
  readonly backend: MarkdownBackend;
  readonly backendRef: BackendReference;
}

function unsupportedFeature(message: string): Diagnostic {
  return { severity: 'error', category: 'unsupported_feature', message };
}

function configurationError(message: string): Diagnostic {
  return { severity: 'error', category: 'configuration_error', message };
}

export function normalizeMarkdownSource(source: string): string {
  return source.replace(/\r\n?/g, '\n');
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[`*_~[\]()<>]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section'
  );
}

export function collectMarkdownOwners(source: string): MarkdownOwner[] {
  const owners: MarkdownOwner[] = [];
  const lines = normalizeMarkdownSource(source).split('\n');
  let headingIndex = 0;
  let codeFenceIndex = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const level = heading[1].length;
      const title = heading[2].trim();
      owners.push({
        path: `/heading/${headingIndex}`,
        ownerKind: 'heading',
        matchKey: `h${level}:${slugify(title)}`,
        level
      });
      headingIndex += 1;
      continue;
    }

    const fence = line.match(/^\s*(`{3,}|~{3,})\s*(.*?)\s*$/);
    if (!fence) {
      continue;
    }

    const marker = fence[1];
    const markerChar = marker[0];
    const markerLength = marker.length;
    const infoString = fence[2].trim().split(/\s+/)[0] ?? '';
    owners.push({
      path: `/code_fence/${codeFenceIndex}`,
      ownerKind: 'code_fence',
      matchKey: `fence:${infoString || 'plain'}`,
      ...(infoString ? { infoString } : {})
    });
    codeFenceIndex += 1;

    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (new RegExp(`^\\s*${markerChar}{${markerLength},}\\s*$`).test(lines[cursor])) {
        index = cursor;
        break;
      }
      if (cursor === lines.length - 1) {
        index = cursor;
      }
    }
  }

  return owners;
}

function resolveBackend(backend?: MarkdownBackend): MarkdownBackend {
  if (backend) return backend;
  return 'kreuzberg-language-pack';
}

export function markdownFeatureProfile(): MarkdownFeatureProfile {
  return {
    family: 'markdown',
    supportedDialects: ['markdown'],
    supportedPolicies: []
  };
}

export function availableMarkdownBackends(): readonly MarkdownBackend[] {
  return ['kreuzberg-language-pack'];
}

export function markdownBackendFeatureProfile(
  backend?: MarkdownBackend
): MarkdownBackendFeatureProfile {
  return {
    ...markdownFeatureProfile(),
    backend: resolveBackend(backend),
    backendRef: KREUZBERG_LANGUAGE_PACK_BACKEND
  };
}

export function markdownPlanContext(backend?: MarkdownBackend): ConformanceFamilyPlanContext {
  const resolvedBackend = resolveBackend(backend);
  return {
    familyProfile: markdownFeatureProfile(),
    featureProfile: {
      backend: resolvedBackend,
      supportsDialects: false,
      supportedPolicies: []
    }
  };
}

export function parseMarkdown(
  source: string,
  dialect: MarkdownDialect,
  backend?: MarkdownBackend
): ParseResult<MarkdownAnalysis> {
  if (dialect !== 'markdown') {
    return {
      ok: false,
      diagnostics: [unsupportedFeature(`Unsupported Markdown dialect ${dialect}.`)]
    };
  }

  const resolvedBackend = resolveBackend(backend);

  if (resolvedBackend !== 'kreuzberg-language-pack') {
    return {
      ok: false,
      diagnostics: [unsupportedFeature(`Unsupported Markdown backend ${resolvedBackend}.`)]
    };
  }

  const syntax = parseWithLanguagePack({ source, language: 'markdown', dialect });
  if (!syntax.ok) {
    return { ok: false, diagnostics: syntax.diagnostics };
  }

  const normalizedSource = normalizeMarkdownSource(source);
  return {
    ok: true,
    diagnostics: [],
    analysis: {
      kind: 'markdown',
      dialect,
      normalizedSource,
      rootKind: 'document',
      owners: collectMarkdownOwners(normalizedSource)
    },
    policies: []
  };
}

export function matchMarkdownOwners(
  template: MarkdownAnalysis,
  destination: MarkdownAnalysis
): MarkdownOwnerMatchResult {
  const destinationPaths = new Set(destination.owners.map((owner) => owner.path));
  const templatePaths = new Set(template.owners.map((owner) => owner.path));

  return {
    matched: template.owners
      .filter((owner) => destinationPaths.has(owner.path))
      .map((owner) => ({ templatePath: owner.path, destinationPath: owner.path })),
    unmatchedTemplate: template.owners
      .map((owner) => owner.path)
      .filter((path) => !destinationPaths.has(path)),
    unmatchedDestination: destination.owners
      .map((owner) => owner.path)
      .filter((path) => !templatePaths.has(path))
  };
}

function markdownOwnerStartIndices(source: string): Map<string, number> {
  const starts = new Map<string, number>();
  const lines = normalizeMarkdownSource(source).split('\n');
  let headingIndex = 0;
  let codeFenceIndex = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      starts.set(`/heading/${headingIndex}`, index);
      headingIndex += 1;
      continue;
    }

    const fence = line.match(/^\s*(`{3,}|~{3,})\s*(.*?)\s*$/);
    if (!fence) {
      continue;
    }

    starts.set(`/code_fence/${codeFenceIndex}`, index);
    codeFenceIndex += 1;

    const marker = fence[1];
    const markerChar = marker[0];
    const markerLength = marker.length;
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (new RegExp(`^\\s*${markerChar}{${markerLength},}\\s*$`).test(lines[cursor] ?? '')) {
        index = cursor;
        break;
      }
      if (cursor === lines.length - 1) {
        index = cursor;
      }
    }
  }

  return starts;
}

function collectMarkdownSections(source: string, owners: readonly MarkdownOwner[]): MarkdownSection[] {
  const normalized = normalizeMarkdownSource(source);
  const lines = normalized.split('\n');
  const starts = markdownOwnerStartIndices(normalized);
  const orderedStarts = owners
    .map((owner) => ({ owner, start: starts.get(owner.path) }))
    .filter((entry): entry is { owner: MarkdownOwner; start: number } => entry.start !== undefined)
    .sort((left, right) => left.start - right.start);

  return orderedStarts.map(({ owner, start }, index) => {
    const nextStart = orderedStarts[index + 1]?.start ?? lines.length - 1;
    const endExclusive = index + 1 < orderedStarts.length ? nextStart : lines.length;
    const text = lines.slice(start, endExclusive).join('\n').trim();
    return { path: owner.path, text };
  });
}

interface MarkdownFenceRange {
  readonly start: number;
  readonly end: number;
}

function markdownFenceRanges(source: string): ReadonlyMap<string, MarkdownFenceRange> {
  const lines = normalizeMarkdownSource(source).split('\n');
  const ranges = new Map<string, MarkdownFenceRange>();
  let codeFenceIndex = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const fence = line.match(/^\s*(`{3,}|~{3,})\s*(.*?)\s*$/);
    if (!fence) {
      continue;
    }

    const marker = fence[1]!;
    const markerChar = marker[0]!;
    const markerLength = marker.length;
    let end = index;
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (new RegExp(`^\\s*${markerChar}{${markerLength},}\\s*$`).test(lines[cursor] ?? '')) {
        end = cursor;
        break;
      }
      if (cursor === lines.length - 1) {
        end = cursor;
      }
    }

    ranges.set(`/code_fence/${codeFenceIndex}`, { start: index, end });
    codeFenceIndex += 1;
    index = end;
  }

  return ranges;
}

export function applyMarkdownDelegatedChildOutputs(
  source: string,
  operations: readonly DelegatedChildOperation[],
  applyPlan: DelegatedChildApplyPlan,
  appliedChildren: readonly AppliedChildOutput[]
): MergeResult<string> {
  const lines = normalizeMarkdownSource(source).split('\n');
  const ranges = markdownFenceRanges(source);
  const operationsById = new Map(operations.map((operation) => [operation.operationId, operation]));
  const outputsById = new Map(appliedChildren.map((entry) => [entry.operationId, entry.output]));

  const replacements = applyPlan.entries.flatMap((entry) => {
    const operation = operationsById.get(entry.delegatedGroup.childOperationId);
    const output = outputsById.get(entry.delegatedGroup.childOperationId);
    if (!operation || output === undefined) {
      return [];
    }

    const ownerPath = operation.surface.owner.address;
    const range = ranges.get(ownerPath);
    if (!range) {
      throw new Error(`missing fenced-code range for ${ownerPath}`);
    }

    return [{ range, output }];
  });

  try {
    replacements
      .sort((left, right) => right.range.start - left.range.start)
      .forEach(({ range, output }) => {
        const bodyLines = output.replace(/\n$/, '').split('\n');
        const replacement = output.length === 0 ? [] : bodyLines;
        lines.splice(range.start + 1, Math.max(0, range.end - range.start - 1), ...replacement);
      });
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        configurationError(error instanceof Error ? error.message : 'failed to apply delegated child outputs.')
      ],
      policies: []
    };
  }

  return {
    ok: true,
    diagnostics: [],
    output: `${lines.join('\n').replace(/\n+$/, '')}\n`,
    policies: []
  };
}

export function mergeMarkdownWithNestedOutputs(
  templateSource: string,
  destinationSource: string,
  dialect: MarkdownDialect,
  nestedOutputs: readonly NestedChildOutput[],
  backend?: MarkdownBackend
): MergeResult<string> {
  return executeNestedMerge<string>(
    nestedOutputs as readonly DelegatedChildSurfaceOutput[],
    {
      defaultFamily: 'markdown',
      requestIdPrefix: 'nested_markdown_child'
    },
    {
      mergeParent: () => mergeMarkdown(templateSource, destinationSource, dialect, backend),
      discoverOperations: (mergedOutput) => {
        const analysis = parseMarkdown(mergedOutput, dialect, backend);
        if (!analysis.ok || !analysis.analysis) {
          return { ok: false, diagnostics: analysis.diagnostics };
        }

        return {
          ok: true,
          diagnostics: [],
          operations: markdownDelegatedChildOperations(analysis.analysis)
        };
      },
      applyResolvedOutputs: (mergedOutput, operations, applyPlan, appliedChildren) =>
        applyMarkdownDelegatedChildOutputs(
          mergedOutput,
          operations,
          applyPlan,
          appliedChildren as readonly AppliedDelegatedChildOutput[]
        )
    }
  );
}

export function mergeMarkdownWithReviewedNestedOutputs(
  templateSource: string,
  destinationSource: string,
  dialect: MarkdownDialect,
  reviewState: DelegatedChildGroupReviewState,
  appliedChildren: readonly AppliedChildOutput[],
  backend?: MarkdownBackend
): MergeResult<string> {
  return executeReviewedNestedMerge<string>(
    reviewState,
    'markdown',
    appliedChildren as readonly AppliedDelegatedChildOutput[],
    {
      mergeParent: () => mergeMarkdown(templateSource, destinationSource, dialect, backend),
      discoverOperations: (mergedOutput) => {
        const analysis = parseMarkdown(mergedOutput, dialect, backend);
        if (!analysis.ok || !analysis.analysis) {
          return { ok: false, diagnostics: analysis.diagnostics };
        }

        return {
          ok: true,
          diagnostics: [],
          operations: markdownDelegatedChildOperations(analysis.analysis)
        };
      },
      applyResolvedOutputs: (mergedOutput, operations, applyPlan, resolvedChildren) =>
        applyMarkdownDelegatedChildOutputs(
          mergedOutput,
          operations,
          applyPlan,
          resolvedChildren as readonly AppliedDelegatedChildOutput[]
        )
    }
  );
}

function reviewedNestedExecutionForMarkdown(
  executions: readonly ReviewedNestedExecution[]
): ReviewedNestedExecution | undefined {
  return executions.find((execution) => execution.family === 'markdown');
}

export function mergeMarkdownWithReviewedNestedOutputsFromReplayBundle(
  templateSource: string,
  destinationSource: string,
  dialect: MarkdownDialect,
  replayBundle: ReviewReplayBundle,
  backend?: MarkdownBackend
): MergeResult<string> {
  const execution = reviewedNestedExecutionForMarkdown(replayBundle.reviewedNestedExecutions ?? []);
  if (!execution) {
    return {
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          category: 'configuration_error',
          message: 'review replay bundle does not include a reviewed nested execution for markdown.'
        }
      ],
      policies: []
    };
  }

  return executeReviewReplayBundleReviewedNestedExecutions<string>(replayBundle, () => ({
    mergeParent: () => mergeMarkdown(templateSource, destinationSource, dialect, backend),
    discoverOperations: (mergedOutput) => {
      const analysis = parseMarkdown(mergedOutput, dialect, backend);
      if (!analysis.ok || !analysis.analysis) {
        return { ok: false, diagnostics: analysis.diagnostics };
      }

      return {
        ok: true,
        diagnostics: [],
        operations: markdownDelegatedChildOperations(analysis.analysis)
      };
    },
    applyResolvedOutputs: (mergedOutput, operations, applyPlan, resolvedChildren) =>
      applyMarkdownDelegatedChildOutputs(
        mergedOutput,
        operations,
        applyPlan,
        resolvedChildren as readonly AppliedDelegatedChildOutput[]
      )
  })).find((run) => run.execution.family === execution.family)?.result ?? {
    ok: false,
    diagnostics: [
      {
        severity: 'error',
        category: 'configuration_error',
        message: 'review replay bundle markdown execution could not be applied.'
      }
    ],
    policies: []
  };
}

export function mergeMarkdownWithReviewedNestedOutputsFromReviewState(
  templateSource: string,
  destinationSource: string,
  dialect: MarkdownDialect,
  reviewState: ConformanceManifestReviewState,
  backend?: MarkdownBackend
): MergeResult<string> {
  const execution = reviewedNestedExecutionForMarkdown(reviewState.reviewedNestedExecutions ?? []);
  if (!execution) {
    return {
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          category: 'configuration_error',
          message: 'review state does not include a reviewed nested execution for markdown.'
        }
      ],
      policies: []
    };
  }

  return executeReviewStateReviewedNestedExecutions<string>(reviewState, () => ({
    mergeParent: () => mergeMarkdown(templateSource, destinationSource, dialect, backend),
    discoverOperations: (mergedOutput) => {
      const analysis = parseMarkdown(mergedOutput, dialect, backend);
      if (!analysis.ok || !analysis.analysis) {
        return { ok: false, diagnostics: analysis.diagnostics };
      }

      return {
        ok: true,
        diagnostics: [],
        operations: markdownDelegatedChildOperations(analysis.analysis)
      };
    },
    applyResolvedOutputs: (mergedOutput, operations, applyPlan, resolvedChildren) =>
      applyMarkdownDelegatedChildOutputs(
        mergedOutput,
        operations,
        applyPlan,
        resolvedChildren as readonly AppliedDelegatedChildOutput[]
      )
  })).find((run) => run.execution.family === execution.family)?.result ?? {
    ok: false,
    diagnostics: [
      {
        severity: 'error',
        category: 'configuration_error',
        message: 'review state markdown execution could not be applied.'
      }
    ],
    policies: []
  };
}

export function mergeMarkdown(
  templateSource: string,
  destinationSource: string,
  dialect: MarkdownDialect,
  backend?: MarkdownBackend
): MergeResult<string> {
  const template = parseMarkdown(templateSource, dialect, backend);
  if (!template.ok || !template.analysis) {
    return { ok: false, diagnostics: template.diagnostics, policies: [] };
  }

  const destination = parseMarkdown(destinationSource, dialect, backend);
  if (!destination.ok || !destination.analysis) {
    return { ok: false, diagnostics: destination.diagnostics, policies: [] };
  }

  const destinationSections = collectMarkdownSections(
    destination.analysis.normalizedSource,
    destination.analysis.owners
  );
  const templateSections = collectMarkdownSections(
    template.analysis.normalizedSource,
    template.analysis.owners
  );
  const destinationPaths = new Set(destinationSections.map((section) => section.path));
  const mergedSections = [
    ...destinationSections.map((section) => section.text),
    ...templateSections
      .filter((section) => !destinationPaths.has(section.path))
      .map((section) => section.text)
  ].filter((section) => section.length > 0);

  return {
    ok: true,
    diagnostics: [],
    output: `${mergedSections.join('\n\n').trimEnd()}\n`,
    policies: []
  };
}

function codeFenceFamily(
  infoString?: string
): MarkdownEmbeddedFamilyCandidate['family'] | undefined {
  switch ((infoString ?? '').toLowerCase()) {
    case 'ts':
    case 'typescript':
      return 'typescript';
    case 'rust':
    case 'rs':
      return 'rust';
    case 'go':
      return 'go';
    case 'json':
    case 'jsonc':
      return 'json';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'toml':
      return 'toml';
    default:
      return undefined;
  }
}

function codeFenceDialect(
  infoString?: string,
  family?: MarkdownEmbeddedFamilyCandidate['family']
): string | undefined {
  const language = (infoString ?? '').toLowerCase();
  if (!family) {
    return undefined;
  }

  switch (family) {
    case 'typescript':
      return 'typescript';
    case 'rust':
      return 'rust';
    case 'go':
      return 'go';
    case 'json':
      return language === 'jsonc' ? 'jsonc' : 'json';
    case 'yaml':
      return 'yaml';
    case 'toml':
      return 'toml';
  }
}

export function markdownEmbeddedFamilies(
  analysis: MarkdownAnalysis
): readonly MarkdownEmbeddedFamilyCandidate[] {
  return analysis.owners.flatMap((owner) => {
    if (owner.ownerKind !== 'code_fence' || !owner.infoString) {
      return [];
    }

    const family = codeFenceFamily(owner.infoString);
    const dialect = codeFenceDialect(owner.infoString, family);
    if (!family || !dialect) {
      return [];
    }

    return [
      {
        path: owner.path,
        language: owner.infoString,
        family,
        dialect
      }
    ];
  });
}

export function markdownDiscoveredSurfaces(
  analysis: MarkdownAnalysis
): readonly DiscoveredSurface[] {
  return markdownEmbeddedFamilies(analysis).map((candidate) => ({
    surfaceKind: 'markdown_fenced_code_block',
    declaredLanguage: candidate.language,
    effectiveLanguage: candidate.dialect,
    address: `document[0] > fenced_code_block[${candidate.path}]`,
    parentAddress: 'document[0]',
    owner: {
      kind: 'structural_owner',
      address: candidate.path
    },
    reconstructionStrategy: 'portable_write',
    metadata: {
      family: candidate.family,
      dialect: candidate.dialect,
      path: candidate.path
    }
  }));
}

export function markdownDelegatedChildOperations(
  analysis: MarkdownAnalysis,
  parentOperationId = 'markdown-document-0'
): readonly DelegatedChildOperation[] {
  return markdownDiscoveredSurfaces(analysis).map((surface, index) => ({
    operationId: `markdown-fence-${index}`,
    parentOperationId,
    requestedStrategy: 'delegate_child_surface',
    languageChain: ['markdown', surface.effectiveLanguage],
    surface
  }));
}

export function markdownManifestRolePaths(manifest: ConformanceManifest): {
  readonly familyProfile: readonly string[] | undefined;
  readonly analysis: readonly string[] | undefined;
  readonly matching: readonly string[] | undefined;
  readonly merge: readonly string[] | undefined;
} {
  return {
    familyProfile: manifest.family_feature_profiles.find((entry) => entry.family === 'markdown')
      ?.path,
    analysis: manifest.families.markdown?.find((entry) => entry.role === 'analysis')?.path,
    matching: manifest.families.markdown?.find((entry) => entry.role === 'matching')?.path,
    merge: manifest.families.markdown?.find((entry) => entry.role === 'merge')?.path
  };
}
