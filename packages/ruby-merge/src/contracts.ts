import type {
  ConformanceFamilyPlanContext,
  DelegatedChildOperation,
  DiscoveredSurface,
  FamilyFeatureProfile,
  ParseResult,
  PolicyReference
} from '@structuredmerge/ast-merge';
import { parseWithLanguagePack, type ParserRequest } from '@structuredmerge/tree-haver';

export type RubyDialect = 'ruby';
export type RubyOwnerKind = 'require' | 'declaration';

export interface RubyOwner {
  readonly path: string;
  readonly ownerKind: RubyOwnerKind;
  readonly matchKey?: string;
}

export interface RubyOwnerMatch {
  readonly templatePath: string;
  readonly destinationPath: string;
}

export interface RubyOwnerMatchResult {
  readonly matched: readonly RubyOwnerMatch[];
  readonly unmatchedTemplate: readonly string[];
  readonly unmatchedDestination: readonly string[];
}

export interface RubyAnalysis {
  readonly kind: 'ruby';
  readonly dialect: RubyDialect;
  readonly rootKind: 'document';
  readonly source: string;
  readonly owners: readonly RubyOwner[];
  readonly discoveredSurfaces: readonly DiscoveredSurface[];
}

export interface RubyFeatureProfile extends FamilyFeatureProfile {
  readonly family: 'ruby';
  readonly supportedDialects: readonly RubyDialect[];
  readonly supportedPolicies: readonly PolicyReference[];
}

export type RubyBackend = 'kreuzberg-language-pack';

const destinationWinsArrayPolicy: PolicyReference = {
  surface: 'array',
  name: 'destination_wins_array'
};

const requirePattern = /^\s*require(?:_relative)?\s+["']([^"']+)["']/;
const classPattern = /^\s*class\s+([A-Z]\w*(?:::\w+)*)/;
const modulePattern = /^\s*module\s+([A-Z]\w*(?:::\w+)*)/;
const defPattern = /^\s*def\s+(?:self\.)?([a-zA-Z_]\w*[!?=]?)/;
const exampleTag = /^@example\b(.*)$/;
const tagPrefix = /^@[a-z_]+\b/;
const directiveLine = /^(?::nocov:|[\w-]+:(?:freeze|unfreeze))$/;
const magicCommentPrefixes = [
  'coding',
  'encoding',
  'frozen_string_literal',
  'shareable_constant_value',
  'typed',
  'warn_indent'
] as const;

interface CommentEntry {
  readonly line: number;
  readonly raw: string;
}

function rubyParseRequest(source: string): ParserRequest {
  return { source, language: 'ruby', dialect: 'ruby' };
}

function normalizeSource(source: string): string {
  return source.replace(/\r\n?/g, '\n');
}

function commentLine(line: string): boolean {
  return line.trimStart().startsWith('#');
}

function normalizeCommentContent(raw: string): string {
  return raw.replace(/^\s*#\s?/, '').trim();
}

function docCommentContent(raw: string): boolean {
  const content = normalizeCommentContent(raw);
  if (content.length === 0 || directiveLine.test(content)) {
    return false;
  }
  return !magicCommentPrefixes.some((prefix) => content.startsWith(`${prefix}:`));
}

function commentPrefix(raw: string): string {
  return raw.match(/^\s*#\s?/u)?.[0] ?? '# ';
}

function declaredExampleLanguage(rest: string): string | undefined {
  const match = rest.trim().match(/^\[(?<language>[^\]]+)\]/u);
  return match?.groups?.language?.toLowerCase().replace(/-/g, '_');
}

function surfacesForOwner(
  ownerName: string,
  commentEntries: readonly CommentEntry[]
): DiscoveredSurface[] {
  const filteredEntries = commentEntries.filter((entry) => docCommentContent(entry.raw));
  if (filteredEntries.length === 0) {
    return [];
  }

  const docSurface: DiscoveredSurface = {
    surfaceKind: 'ruby_doc_comment',
    declaredLanguage: 'yard',
    effectiveLanguage: 'yard',
    address: `document[0] > ruby_doc_comment[${ownerName}]`,
    parentAddress: 'document[0]',
    owner: {
      kind: 'owned_region',
      address: `/declarations/${ownerName}`
    },
    span: {
      startLine: filteredEntries[0].line,
      endLine: filteredEntries[filteredEntries.length - 1].line
    },
    reconstructionStrategy: 'rewrite_with_prefix_preservation',
    metadata: {
      owner_signature: ownerName,
      comment_prefix: commentPrefix(filteredEntries[0].raw),
      entries: filteredEntries.map((entry) => ({ line: entry.line, raw: entry.raw }))
    }
  };

  const normalized = filteredEntries.map((entry) => normalizeCommentContent(entry.raw));
  const exampleSurfaces: DiscoveredSurface[] = [];
  for (const [tagIndex, content] of normalized.entries()) {
    const match = content.match(exampleTag);
    if (!match) {
      continue;
    }
    const bodyStart = tagIndex + 1;
    let bodyEnd = normalized.length;
    for (let index = bodyStart; index < normalized.length; index += 1) {
      if (tagPrefix.test(normalized[index]!)) {
        bodyEnd = index;
        break;
      }
    }
    if (bodyStart >= bodyEnd) {
      continue;
    }
    const bodyEntries = filteredEntries.slice(bodyStart, bodyEnd);
    if (bodyEntries.length === 0) {
      continue;
    }
    const language = declaredExampleLanguage(match[1] ?? '') ?? 'ruby';
    exampleSurfaces.push({
      surfaceKind: 'yard_example_block',
      declaredLanguage: language,
      effectiveLanguage: language,
      address: `${docSurface.address} > yard_example[${tagIndex}]`,
      parentAddress: docSurface.address,
      owner: {
        kind: 'owned_region',
        address: docSurface.address
      },
      span: {
        startLine: bodyEntries[0]!.line,
        endLine: bodyEntries[bodyEntries.length - 1]!.line
      },
      reconstructionStrategy: 'rewrite_with_prefix_preservation',
      metadata: {
        tag_kind: 'example',
        tag_index: tagIndex,
        tag_text: normalized[tagIndex],
        comment_prefix: docSurface.metadata?.comment_prefix
      }
    });
  }

  return [docSurface, ...exampleSurfaces];
}

function analyzeRubyDocument(source: string): RubyAnalysis {
  const normalized = normalizeSource(source);
  const lines = normalized.split('\n');
  const requires: RubyOwner[] = [];
  const declarations: RubyOwner[] = [];
  const surfaces: DiscoveredSurface[] = [];
  let pendingComments: CommentEntry[] = [];

  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;
    const stripped = line.trim();

    if (commentLine(line)) {
      pendingComments = [...pendingComments, { line: lineNumber, raw: line }];
      continue;
    }

    if (stripped.length === 0) {
      pendingComments = [];
      continue;
    }

    const requireMatch = line.match(requirePattern);
    if (requireMatch) {
      requires.push({
        path: `/requires/${requires.length}`,
        ownerKind: 'require',
        matchKey: requireMatch[1]
      });
      pendingComments = [];
      continue;
    }

    const declarationMatch =
      line.match(classPattern) ?? line.match(modulePattern) ?? line.match(defPattern);
    if (declarationMatch?.[1]) {
      const name = declarationMatch[1];
      declarations.push({
        path: `/declarations/${name}`,
        ownerKind: 'declaration',
        matchKey: name
      });
      surfaces.push(...surfacesForOwner(name, pendingComments));
      pendingComments = [];
      continue;
    }

    pendingComments = [];
  }

  return {
    kind: 'ruby',
    dialect: 'ruby',
    rootKind: 'document',
    source: normalized,
    owners: [...requires, ...declarations].sort((left, right) =>
      left.path < right.path ? -1 : left.path > right.path ? 1 : 0
    ),
    discoveredSurfaces: surfaces
  };
}

export function rubyFeatureProfile(): RubyFeatureProfile {
  return {
    family: 'ruby',
    supportedDialects: ['ruby'],
    supportedPolicies: [destinationWinsArrayPolicy]
  };
}

export function availableRubyBackends(): readonly RubyBackend[] {
  return ['kreuzberg-language-pack'];
}

export function rubyBackendFeatureProfile(
  backend: RubyBackend = 'kreuzberg-language-pack'
): RubyFeatureProfile & {
  readonly backend: RubyBackend;
  readonly supportsDialects: true;
} {
  return {
    ...rubyFeatureProfile(),
    backend,
    supportsDialects: true
  };
}

export function rubyPlanContext(
  backend: RubyBackend = 'kreuzberg-language-pack'
): ConformanceFamilyPlanContext {
  const profile = rubyBackendFeatureProfile(backend);
  return {
    familyProfile: rubyFeatureProfile(),
    featureProfile: {
      backend: profile.backend,
      supportsDialects: profile.supportsDialects,
      supportedPolicies: profile.supportedPolicies
    }
  };
}

export function parseRuby(source: string, dialect: RubyDialect): ParseResult<RubyAnalysis> {
  const parsed = parseWithLanguagePack(rubyParseRequest(source));
  if (!parsed.ok) {
    return { ok: false, diagnostics: parsed.diagnostics };
  }
  void dialect;
  return { ok: true, diagnostics: [], analysis: analyzeRubyDocument(source), policies: [] };
}

export function matchRubyOwners(
  template: RubyAnalysis,
  destination: RubyAnalysis
): RubyOwnerMatchResult {
  const destinationOwners = new Set(destination.owners.map((owner) => owner.path));
  const templateOwners = new Set(template.owners.map((owner) => owner.path));

  return {
    matched: template.owners
      .filter((owner) => destinationOwners.has(owner.path))
      .map((owner) => ({ templatePath: owner.path, destinationPath: owner.path })),
    unmatchedTemplate: template.owners
      .map((owner) => owner.path)
      .filter((path) => !destinationOwners.has(path)),
    unmatchedDestination: destination.owners
      .map((owner) => owner.path)
      .filter((path) => !templateOwners.has(path))
  };
}

export function rubyDiscoveredSurfaces(analysis: RubyAnalysis): readonly DiscoveredSurface[] {
  return analysis.discoveredSurfaces;
}

export function rubyDelegatedChildOperations(
  analysis: RubyAnalysis,
  parentOperationId = 'ruby-document-0'
): readonly DelegatedChildOperation[] {
  const operations: DelegatedChildOperation[] = [];
  const docOperationIds = new Map<string, string>();
  let docIndex = 0;
  let exampleIndex = 0;

  for (const surface of analysis.discoveredSurfaces) {
    if (surface.surfaceKind !== 'ruby_doc_comment') {
      continue;
    }
    const operationId = `ruby-doc-comment-${docIndex}`;
    docOperationIds.set(surface.address, operationId);
    operations.push({
      operationId,
      parentOperationId,
      requestedStrategy: 'delegate_child_surface',
      languageChain: ['ruby', surface.effectiveLanguage],
      surface
    });
    docIndex += 1;
  }

  for (const surface of analysis.discoveredSurfaces) {
    if (surface.surfaceKind !== 'yard_example_block') {
      continue;
    }
    operations.push({
      operationId: `yard-example-${exampleIndex}`,
      parentOperationId: docOperationIds.get(surface.parentAddress ?? '') ?? parentOperationId,
      requestedStrategy: 'delegate_child_surface',
      languageChain: ['ruby', 'yard', surface.effectiveLanguage],
      surface
    });
    exampleIndex += 1;
  }

  return operations;
}
