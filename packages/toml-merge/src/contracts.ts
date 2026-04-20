import { parse as parseTomlDocument } from 'smol-toml';
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
  createPeggyParser,
  currentBackendId,
  PEGGY_BACKEND,
  type BackendReference,
  parseWithPeggy
} from '@structuredmerge/tree-haver';

export type TomlDialect = 'toml';
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

export type TomlBackend = 'native' | 'peggy';

export interface TomlBackendFeatureProfile extends TomlFeatureProfile {
  readonly backend: TomlBackend;
  readonly backendRef: BackendReference;
}

const destinationWinsArrayPolicy: PolicyReference = {
  surface: 'array',
  name: 'destination_wins_array'
};
const NATIVE_BACKEND: BackendReference = { id: 'native', family: 'builtin' };
const TOML_PEGGY_GRAMMAR = String.raw`
{
  function text() { return input.substring(location().start.offset, location().end.offset); }
}

start = spacing document:document spacing EOF { return document; }
document = (table / keyValue / blankLine / commentLine)*
table = "[" keyPath "]" entryEnd
keyValue = keyPath spacing "=" spacing value entryEnd
keyPath = bareKey ("." bareKey)*
value = array / string / boolean / number
array = "[" spacing arrayValues? spacing "]"
arrayValues = value (spacing "," spacing value)*
string = "\"" chars:([^"\\] / "\\\"" / "\\\\" / "\\n" / "\\t")* "\""
boolean = "true" / "false"
number = "-"? [0-9]+ ("." [0-9]+)?
bareKey = [A-Za-z0-9_-]+
commentLine = spacing "#" [^\n\r]* newline
blankLine = spacing newline
entryEnd = spacing comment? (newline / EOF)
comment = "#" [^\n\r]*
newline = "\r\n" / "\n" / "\r"
spacing = [ \t]*
EOF = !.
`;
const tomlPeggyParser = createPeggyParser(TOML_PEGGY_GRAMMAR);

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
  return ['native', 'peggy'];
}

export function tomlBackendFeatureProfile(backend?: TomlBackend): TomlBackendFeatureProfile {
  const resolvedBackend = resolveBackend(backend);
  return {
    ...tomlFeatureProfile(),
    backend: resolvedBackend,
    backendRef: resolvedBackend === 'peggy' ? PEGGY_BACKEND : NATIVE_BACKEND
  };
}

export function tomlPlanContext(backend?: TomlBackend): ConformanceFamilyPlanContext {
  const backendProfile = tomlBackendFeatureProfile(backend);
  const featureProfile: ConformanceFeatureProfileView = {
    backend: backendProfile.backend,
    supportsDialects: backendProfile.backend !== 'peggy',
    supportedPolicies: backendProfile.supportedPolicies
  };

  return {
    familyProfile: tomlFeatureProfile(),
    featureProfile
  };
}

function resolveBackend(backend?: TomlBackend): TomlBackend {
  if (backend) return backend;
  return currentBackendId() === 'peggy' ? 'peggy' : 'native';
}

function isScalar(value: unknown): value is TomlScalar {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function validateTomlNode(
  value: unknown,
  path: string
): { ok: true; value: TomlNode } | { ok: false; diagnostic: Diagnostic } {
  if (isScalar(value)) {
    return { ok: true, value };
  }

  if (Array.isArray(value)) {
    if (value.every((item) => isScalar(item))) {
      return { ok: true, value };
    }

    return {
      ok: false,
      diagnostic: unsupportedFeature(
        `Unsupported TOML array value at ${path || '/'}. Only scalar arrays are supported.`
      )
    };
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const table: Record<string, TomlNode> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort((left, right) =>
      left.localeCompare(right)
    )) {
      const nextPath = `${path}/${key}`;
      const validated = validateTomlNode((value as Record<string, unknown>)[key], nextPath);
      if (!validated.ok) {
        return validated;
      }
      table[key] = validated.value;
    }
    return { ok: true, value: table };
  }

  return {
    ok: false,
    diagnostic: unsupportedFeature(
      `Unsupported TOML value at ${path || '/'}. Only tables, scalar values, and scalar arrays are supported.`
    )
  };
}

function renderTomlScalar(value: TomlScalar): string {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return Number.isFinite(value) ? String(value) : JSON.stringify(value);
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

function analyzeTomlDocument(source: string): ParseResult<TomlAnalysis> {
  try {
    const parsed = parseTomlDocument(source) as unknown;
    const validated = validateTomlNode(parsed, '');
    if (!validated.ok) {
      return { ok: false, diagnostics: [validated.diagnostic] };
    }

    if (Array.isArray(validated.value) || isScalar(validated.value)) {
      return {
        ok: false,
        diagnostics: [parseError('TOML documents must parse to a table root.')]
      };
    }

    return {
      ok: true,
      diagnostics: [],
      analysis: {
        kind: 'toml',
        dialect: 'toml',
        normalizedSource: canonicalToml(validated.value as TomlTable),
        rootKind: 'table',
        owners: collectTomlOwners(validated.value as TomlTable)
      },
      policies: []
    };
  } catch (error) {
    return {
      ok: false,
      diagnostics: [parseError(error instanceof Error ? error.message : 'TOML parse failed.')]
    };
  }
}

function validateTomlSyntax(source: string, backend: TomlBackend): ParseResult<undefined> {
  if (backend === 'peggy') {
    const result = parseWithPeggy(source, tomlPeggyParser);
    return result.ok
      ? { ok: true, diagnostics: [] }
      : { ok: false, diagnostics: result.diagnostics };
  }

  return { ok: true, diagnostics: [] };
}

export function parseToml(
  source: string,
  dialect: TomlDialect,
  backend?: TomlBackend
): ParseResult<TomlAnalysis> {
  if (dialect !== 'toml') {
    return { ok: false, diagnostics: [unsupportedFeature(`Unsupported TOML dialect ${dialect}.`)] };
  }

  const resolvedBackend = resolveBackend(backend);
  const syntax = validateTomlSyntax(source, resolvedBackend);
  if (!syntax.ok) {
    return { ok: false, diagnostics: syntax.diagnostics };
  }

  return analyzeTomlDocument(source);
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
  const template = parseToml(templateSource, dialect, resolvedBackend);
  if (!template.ok || !template.analysis) {
    return { ok: false, diagnostics: template.diagnostics, policies: [] };
  }

  const destination = parseToml(destinationSource, dialect, resolvedBackend);
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
      parseTomlDocument(template.analysis.normalizedSource) as TomlTable,
      parseTomlDocument(destination.analysis.normalizedSource) as TomlTable
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
