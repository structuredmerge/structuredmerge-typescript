import type {
  ConformanceFamilyPlanContext,
  ConformanceFeatureProfileView,
  Diagnostic,
  FamilyFeatureProfile,
  MergeResult,
  ParseResult,
  PolicyReference
} from '@structuredmerge/ast-merge';
import {
  KREUZBERG_LANGUAGE_PACK_BACKEND,
  parseWithLanguagePack,
  type BackendReference
} from '@structuredmerge/tree-haver';

export type TomlDialect = 'toml';
export type TomlBackend = 'kreuzberg-language-pack';
export type TomlRootKind = 'table';
export type TomlOwnerKind = 'table' | 'key_value' | 'array_item';

type TomlScalar = string | number | boolean;
type TomlArray = readonly TomlScalar[];
interface TomlTable {
  [key: string]: TomlNode;
}
type TomlNode = TomlScalar | TomlArray | TomlTable;

export interface TomlOwner {
  readonly path: string;
  readonly ownerKind: TomlOwnerKind;
  readonly matchKey?: string;
}

export interface TomlOwnerMatch {
  readonly templatePath: string;
  readonly destinationPath: string;
}

export interface TomlOwnerMatchResult {
  readonly matched: readonly TomlOwnerMatch[];
  readonly unmatchedTemplate: readonly string[];
  readonly unmatchedDestination: readonly string[];
}

export interface TomlAnalysis {
  readonly kind: 'toml';
  readonly dialect: TomlDialect;
  readonly normalizedSource: string;
  readonly rootKind: TomlRootKind;
  readonly owners: readonly TomlOwner[];
}

export interface TomlMerger {
  merge(template: TomlAnalysis, destination: TomlAnalysis): MergeResult<string>;
}

export interface TomlAnalyzer {
  parse(source: string, dialect: TomlDialect): ParseResult<TomlAnalysis>;
}

export interface TomlStructureAnalyzer {
  analyze(source: string, dialect: TomlDialect): ParseResult<TomlAnalysis>;
}

export interface TomlOwnerMatcher {
  match(template: TomlAnalysis, destination: TomlAnalysis): TomlOwnerMatchResult;
}

export interface TomlMergeResolution {
  readonly output: string;
}

export interface TomlFeatureProfile extends FamilyFeatureProfile {
  readonly family: 'toml';
  readonly supportedDialects: readonly TomlDialect[];
  readonly supportedPolicies: readonly PolicyReference[];
}

export interface TomlBackendFeatureProfile extends TomlFeatureProfile {
  readonly backend: TomlBackend;
  readonly backendRef: BackendReference;
}

const destinationWinsArrayPolicy: PolicyReference = {
  surface: 'array',
  name: 'destination_wins_array'
};

class TomlParseError extends Error {}

function parseError(message: string): Diagnostic {
  return { severity: 'error', category: 'parse_error', message };
}

function destinationParseError(message: string): Diagnostic {
  return { severity: 'error', category: 'destination_parse_error', message };
}

function unsupportedFeature(message: string): Diagnostic {
  return { severity: 'error', category: 'unsupported_feature', message };
}

export function tomlFeatureProfile(): TomlFeatureProfile {
  return {
    family: 'toml',
    supportedDialects: ['toml'],
    supportedPolicies: [destinationWinsArrayPolicy]
  };
}

export function availableTomlBackends(): readonly TomlBackend[] {
  return ['kreuzberg-language-pack'];
}

export function tomlBackendFeatureProfile(backend?: TomlBackend): TomlBackendFeatureProfile {
  const resolvedBackend = resolveBackend(backend);
  return {
    ...tomlFeatureProfile(),
    backend: resolvedBackend,
    backendRef: KREUZBERG_LANGUAGE_PACK_BACKEND
  };
}

export function tomlPlanContext(backend?: TomlBackend): ConformanceFamilyPlanContext {
  const backendProfile = tomlBackendFeatureProfile(backend);
  const featureProfile: ConformanceFeatureProfileView = {
    backend: backendProfile.backend,
    supportsDialects: false,
    supportedPolicies: backendProfile.supportedPolicies
  };

  return {
    familyProfile: tomlFeatureProfile(),
    featureProfile
  };
}

function resolveBackend(backend?: TomlBackend): TomlBackend {
  return backend ?? 'kreuzberg-language-pack';
}

function normalizeTomlSource(source: string): string {
  return source.replace(/\r\n?/g, '\n');
}

function splitOutsideQuotes(value: string, separator: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inString = false;
  let escaped = false;
  let depth = 0;

  for (const char of value) {
    if (inString) {
      current += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      current += char;
      continue;
    }

    if (char === '[') {
      depth += 1;
      current += char;
      continue;
    }

    if (char === ']') {
      depth -= 1;
      current += char;
      continue;
    }

    if (char === separator && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (inString || depth !== 0) {
    throw new TomlParseError('Unterminated TOML string or array.');
  }

  parts.push(current.trim());
  return parts;
}

function stripTomlComment(line: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (const char of line) {
    if (inString) {
      result += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }

    if (char === '#') {
      break;
    }

    result += char;
  }

  if (inString) {
    throw new TomlParseError('Unterminated TOML string.');
  }

  return result.trim();
}

function parseTomlKeyPath(value: string): string[] {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new TomlParseError('Missing TOML key path.');
  }

  const parts = trimmed.split('.').map((part) => part.trim());
  if (parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) {
    throw new TomlParseError(`Unsupported TOML key path ${trimmed}.`);
  }

  return parts;
}

function parseTomlString(value: string): string {
  try {
    return JSON.parse(value) as string;
  } catch {
    throw new TomlParseError(`Invalid TOML string ${value}.`);
  }
}

function parseTomlScalarValue(value: string): TomlScalar {
  if (value.startsWith('"') && value.endsWith('"')) {
    return parseTomlString(value);
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) {
    return Number(value);
  }

  throw new TomlParseError(`Unsupported TOML value ${value}.`);
}

function parseTomlValue(value: string): TomlNode {
  if (value.startsWith('[')) {
    if (!value.endsWith(']')) {
      throw new TomlParseError(`Invalid TOML array ${value}.`);
    }
    const inner = value.slice(1, -1).trim();
    if (inner.length === 0) {
      return [];
    }

    return splitOutsideQuotes(inner, ',').map((entry) => parseTomlScalarValue(entry));
  }

  return parseTomlScalarValue(value);
}

function ensureTomlTable(root: TomlTable, path: readonly string[]): TomlTable {
  let current = root;
  for (const segment of path) {
    const existing = current[segment];
    if (existing === undefined) {
      current[segment] = {};
      current = current[segment] as TomlTable;
      continue;
    }

    if (typeof existing === 'object' && !Array.isArray(existing)) {
      current = existing as TomlTable;
      continue;
    }

    throw new TomlParseError(`TOML table path /${path.join('/')} conflicts with a value.`);
  }

  return current;
}

function assignTomlValue(root: TomlTable, path: readonly string[], value: TomlNode): void {
  if (path.length === 0) {
    throw new TomlParseError('Missing TOML assignment path.');
  }

  const table = ensureTomlTable(root, path.slice(0, -1));
  const key = path[path.length - 1];
  const existing = table[key];
  if (existing !== undefined && typeof existing === 'object' && !Array.isArray(existing)) {
    throw new TomlParseError(`TOML key /${path.join('/')} conflicts with a table.`);
  }
  table[key] = value;
}

function parseTomlDocument(source: string): TomlTable {
  const lines = normalizeTomlSource(source).split('\n');
  const root: TomlTable = {};
  let currentTablePath: string[] = [];

  for (const rawLine of lines) {
    const line = stripTomlComment(rawLine);
    if (line.length === 0) {
      continue;
    }

    if (line.startsWith('[')) {
      if (!line.endsWith(']')) {
        throw new TomlParseError(`Invalid TOML table header ${line}.`);
      }
      currentTablePath = parseTomlKeyPath(line.slice(1, -1));
      ensureTomlTable(root, currentTablePath);
      continue;
    }

    const parts = splitOutsideQuotes(line, '=');
    if (parts.length !== 2) {
      throw new TomlParseError(`Invalid TOML assignment ${line}.`);
    }

    const keyPath = parseTomlKeyPath(parts[0]);
    const value = parseTomlValue(parts[1]);
    assignTomlValue(root, [...currentTablePath, ...keyPath], value);
  }

  return root;
}

function renderTomlScalar(value: TomlScalar): string {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

function renderTomlValue(value: TomlNode): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => renderTomlScalar(item)).join(', ')}]`;
  }

  if (typeof value === 'object') {
    throw new Error('table values are rendered by renderTomlTable');
  }

  return renderTomlScalar(value);
}

function renderTomlTable(table: TomlTable, path: readonly string[] = []): string[] {
  const lines: string[] = [];
  const keys = Object.keys(table).sort((left, right) => left.localeCompare(right));
  const valueKeys = keys.filter(
    (key) => typeof table[key] !== 'object' || Array.isArray(table[key])
  );
  const tableKeys = keys.filter(
    (key) => typeof table[key] === 'object' && !Array.isArray(table[key])
  );

  if (path.length > 0) {
    lines.push(`[${path.join('.')}]`);
  }

  for (const key of valueKeys) {
    lines.push(`${key} = ${renderTomlValue(table[key])}`);
  }

  for (const key of tableKeys) {
    if (lines.length > 0) lines.push('');
    lines.push(...renderTomlTable(table[key] as TomlTable, [...path, key]));
  }

  return lines;
}

function canonicalToml(table: TomlTable): string {
  return `${renderTomlTable(table).join('\n')}\n`;
}

function collectTomlOwners(table: TomlTable, prefix = ''): TomlOwner[] {
  const owners: TomlOwner[] = [];

  for (const key of Object.keys(table).sort((left, right) => left.localeCompare(right))) {
    const path = `${prefix}/${key}`;
    const value = table[key];

    if (Array.isArray(value)) {
      owners.push({ path, ownerKind: 'key_value', matchKey: key });
      value.forEach((_, index) => {
        owners.push({ path: `${path}/${index}`, ownerKind: 'array_item' });
      });
      continue;
    }

    if (typeof value === 'object') {
      owners.push({ path, ownerKind: 'table', matchKey: key });
      owners.push(...collectTomlOwners(value as TomlTable, path));
      continue;
    }

    owners.push({ path, ownerKind: 'key_value', matchKey: key });
  }

  return owners;
}

function mergeTomlTables(template: TomlTable, destination: TomlTable): TomlTable {
  const merged: TomlTable = {};
  const keys = new Set([...Object.keys(template), ...Object.keys(destination)]);

  for (const key of Array.from(keys).sort((left, right) => left.localeCompare(right))) {
    const templateValue = template[key];
    const destinationValue = destination[key];

    if (templateValue === undefined) {
      merged[key] = destinationValue;
      continue;
    }

    if (destinationValue === undefined) {
      merged[key] = templateValue;
      continue;
    }

    if (
      typeof templateValue === 'object' &&
      !Array.isArray(templateValue) &&
      typeof destinationValue === 'object' &&
      !Array.isArray(destinationValue)
    ) {
      merged[key] = mergeTomlTables(templateValue as TomlTable, destinationValue as TomlTable);
      continue;
    }

    merged[key] = destinationValue;
  }

  return merged;
}

export function analyzeTomlSource(source: string, dialect: TomlDialect): ParseResult<TomlAnalysis> {
  if (dialect !== 'toml') {
    return { ok: false, diagnostics: [unsupportedFeature(`Unsupported TOML dialect ${dialect}.`)] };
  }

  try {
    const table = parseTomlDocument(source);
    return {
      ok: true,
      diagnostics: [],
      analysis: {
        kind: 'toml',
        dialect: 'toml',
        normalizedSource: canonicalToml(table),
        rootKind: 'table',
        owners: collectTomlOwners(table)
      },
      policies: []
    };
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        parseError(error instanceof Error ? error.message : 'TOML subset analysis failed.')
      ]
    };
  }
}

export function mergeTomlWithParser(
  templateSource: string,
  destinationSource: string,
  dialect: TomlDialect,
  parser: (source: string, dialect: TomlDialect) => ParseResult<TomlAnalysis>
): MergeResult<string> {
  const template = parser(templateSource, dialect);
  if (!template.ok || !template.analysis) {
    return { ok: false, diagnostics: template.diagnostics, policies: [] };
  }

  const destination = parser(destinationSource, dialect);
  if (!destination.ok || !destination.analysis) {
    return {
      ok: false,
      diagnostics: destination.diagnostics.map((diagnostic) => ({
        ...diagnostic,
        category:
          diagnostic.category === 'parse_error' ? 'destination_parse_error' : diagnostic.category
      })),
      policies: []
    };
  }

  try {
    const merged = mergeTomlTables(
      parseTomlDocument(template.analysis.normalizedSource),
      parseTomlDocument(destination.analysis.normalizedSource)
    );

    return {
      ok: true,
      diagnostics: [],
      output: canonicalToml(merged),
      policies: [destinationWinsArrayPolicy]
    };
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        destinationParseError(error instanceof Error ? error.message : 'TOML merge failed.')
      ],
      policies: []
    };
  }
}

export function parseToml(
  source: string,
  dialect: TomlDialect,
  backend?: TomlBackend
): ParseResult<TomlAnalysis> {
  const resolvedBackend = resolveBackend(backend);
  if (resolvedBackend !== 'kreuzberg-language-pack') {
    return {
      ok: false,
      diagnostics: [unsupportedFeature(`Unsupported TOML backend ${resolvedBackend}.`)]
    };
  }

  const syntax = parseWithLanguagePack({ source, language: 'toml', dialect });
  if (!syntax.ok) {
    return { ok: false, diagnostics: syntax.diagnostics };
  }

  return analyzeTomlSource(source, dialect);
}

export function matchTomlOwners(
  template: TomlAnalysis,
  destination: TomlAnalysis
): TomlOwnerMatchResult {
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

export function mergeToml(
  templateSource: string,
  destinationSource: string,
  dialect: TomlDialect,
  backend?: TomlBackend
): MergeResult<string> {
  const resolvedBackend = resolveBackend(backend);
  if (resolvedBackend !== 'kreuzberg-language-pack') {
    return {
      ok: false,
      diagnostics: [unsupportedFeature(`Unsupported TOML backend ${resolvedBackend}.`)]
    };
  }

  return mergeTomlWithParser(templateSource, destinationSource, dialect, (source, parseDialect) =>
    parseToml(source, parseDialect, resolvedBackend)
  );
}
