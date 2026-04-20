import { load as loadJsYaml } from 'js-yaml';
import { parseDocument } from 'yaml';
import type {
  ConformanceFamilyPlanContext,
  ConformanceFeatureProfileView,
  Diagnostic,
  FamilyFeatureProfile,
  MergeResult,
  ParseResult,
  PolicyReference
} from '@structuredmerge/ast-merge';

export type YamlDialect = 'yaml';
export type YamlBackend = 'yaml' | 'js-yaml';
export type YamlRootKind = 'mapping';
export type YamlOwnerKind = 'mapping' | 'key_value' | 'sequence_item';

type YamlScalar = string | number | boolean;
type YamlSequence = readonly YamlScalar[];
interface YamlMapping {
  [key: string]: YamlNode;
}
type YamlNode = YamlScalar | YamlSequence | YamlMapping;

export interface YamlOwner {
  readonly path: string;
  readonly ownerKind: YamlOwnerKind;
  readonly matchKey?: string;
}

export interface YamlOwnerMatch {
  readonly templatePath: string;
  readonly destinationPath: string;
}

export interface YamlOwnerMatchResult {
  readonly matched: readonly YamlOwnerMatch[];
  readonly unmatchedTemplate: readonly string[];
  readonly unmatchedDestination: readonly string[];
}

export interface YamlAnalysis {
  readonly kind: 'yaml';
  readonly dialect: YamlDialect;
  readonly normalizedSource: string;
  readonly rootKind: YamlRootKind;
  readonly owners: readonly YamlOwner[];
}

export interface YamlMerger {
  merge(template: YamlAnalysis, destination: YamlAnalysis): MergeResult<string>;
}

export interface YamlAnalyzer {
  parse(source: string, dialect: YamlDialect, backend?: YamlBackend): ParseResult<YamlAnalysis>;
}

export interface YamlStructureAnalyzer {
  analyze(source: string, dialect: YamlDialect, backend?: YamlBackend): ParseResult<YamlAnalysis>;
}

export interface YamlOwnerMatcher {
  match(template: YamlAnalysis, destination: YamlAnalysis): YamlOwnerMatchResult;
}

export interface YamlMergeResolution {
  readonly output: string;
}

export interface YamlFeatureProfile extends FamilyFeatureProfile {
  readonly family: 'yaml';
  readonly supportedDialects: readonly YamlDialect[];
  readonly supportedPolicies: readonly PolicyReference[];
}

export interface YamlBackendFeatureProfile extends YamlFeatureProfile {
  readonly backend: YamlBackend;
}

const destinationWinsArrayPolicy: PolicyReference = {
  surface: 'array',
  name: 'destination_wins_array'
};

function parseError(message: string): Diagnostic {
  return { severity: 'error', category: 'parse_error', message };
}

function unsupportedFeature(message: string): Diagnostic {
  return { severity: 'error', category: 'unsupported_feature', message };
}

export function yamlFeatureProfile(): YamlFeatureProfile {
  return {
    family: 'yaml',
    supportedDialects: ['yaml'],
    supportedPolicies: [destinationWinsArrayPolicy]
  };
}

export function availableYamlBackends(): readonly YamlBackend[] {
  return ['yaml', 'js-yaml'];
}

export function yamlBackendFeatureProfile(
  backend: YamlBackend = 'yaml'
): YamlBackendFeatureProfile {
  return {
    ...yamlFeatureProfile(),
    backend
  };
}

export function yamlPlanContext(backend: YamlBackend = 'yaml'): ConformanceFamilyPlanContext {
  const featureProfile: ConformanceFeatureProfileView = {
    backend,
    supportsDialects: true,
    supportedPolicies: yamlFeatureProfile().supportedPolicies
  };

  return {
    familyProfile: yamlFeatureProfile(),
    featureProfile
  };
}

function isScalar(value: unknown): value is YamlScalar {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function displayPath(path: string): string {
  return path === '' ? '/' : path;
}

function validateYamlNode(
  value: unknown,
  path: string
): { ok: true; value: YamlNode } | { ok: false; diagnostic: Diagnostic } {
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
        `Unsupported YAML sequence value at ${displayPath(path)}. Only scalar sequences are supported.`
      )
    };
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const mapping: YamlMapping = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort((left, right) =>
      left.localeCompare(right)
    )) {
      const nextPath = `${path}/${key}`;
      const validated = validateYamlNode((value as Record<string, unknown>)[key], nextPath);
      if (!validated.ok) {
        return validated;
      }
      mapping[key] = validated.value;
    }
    return { ok: true, value: mapping };
  }

  return {
    ok: false,
    diagnostic: unsupportedFeature(
      `Unsupported YAML value at ${displayPath(path)}. Only mappings, scalar values, and scalar sequences are supported.`
    )
  };
}

function renderYamlScalar(value: YamlScalar): string {
  if (typeof value === 'string') {
    return /^[A-Za-z0-9_.-]+$/.test(value) ? value : JSON.stringify(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
}

function renderYamlNode(key: string, value: YamlNode, indent: number): string[] {
  const prefix = ' '.repeat(indent);

  if (Array.isArray(value)) {
    return [
      `${prefix}${key}:`,
      ...value.map((item) => `${' '.repeat(indent + 2)}- ${renderYamlScalar(item)}`)
    ];
  }

  if (typeof value === 'object') {
    return [`${prefix}${key}:`, ...renderYamlMapping(value as YamlMapping, indent + 2)];
  }

  return [`${prefix}${key}: ${renderYamlScalar(value)}`];
}

function renderYamlMapping(mapping: YamlMapping, indent = 0): string[] {
  const lines: string[] = [];

  for (const key of Object.keys(mapping).sort((left, right) => left.localeCompare(right))) {
    lines.push(...renderYamlNode(key, mapping[key], indent));
  }

  return lines;
}

function canonicalYaml(mapping: YamlMapping): string {
  return `${renderYamlMapping(mapping).join('\n')}\n`;
}

function collectYamlOwners(mapping: YamlMapping, prefix = ''): YamlOwner[] {
  const owners: YamlOwner[] = [];

  for (const key of Object.keys(mapping).sort((left, right) => left.localeCompare(right))) {
    const path = `${prefix}/${key}`;
    const value = mapping[key];

    if (Array.isArray(value)) {
      owners.push({ path, ownerKind: 'key_value', matchKey: key });
      value.forEach((_, index) => {
        owners.push({ path: `${path}/${index}`, ownerKind: 'sequence_item' });
      });
      continue;
    }

    if (typeof value === 'object') {
      owners.push({ path, ownerKind: 'mapping', matchKey: key });
      owners.push(...collectYamlOwners(value as YamlMapping, path));
      continue;
    }

    owners.push({ path, ownerKind: 'key_value', matchKey: key });
  }

  return owners;
}

function mergeYamlMappings(template: YamlMapping, destination: YamlMapping): YamlMapping {
  const merged: YamlMapping = {};
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
      merged[key] = mergeYamlMappings(
        templateValue as YamlMapping,
        destinationValue as YamlMapping
      );
      continue;
    }

    merged[key] = destinationValue;
  }

  return merged;
}

function parseYamlMapping(source: string, backend: YamlBackend): ParseResult<YamlMapping> {
  if (backend === 'yaml') {
    const document = parseDocument(source, { uniqueKeys: false, merge: false });

    if (document.errors.length > 0) {
      return {
        ok: false,
        diagnostics: [parseError(document.errors[0]?.message ?? 'YAML parse failed.')]
      };
    }

    const parsed = document.toJS();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        ok: false,
        diagnostics: [parseError('YAML documents must parse to a mapping root.')]
      };
    }

    const validated = validateYamlNode(parsed, '');
    if (!validated.ok) {
      return { ok: false, diagnostics: [validated.diagnostic] };
    }

    return {
      ok: true,
      diagnostics: [],
      analysis: validated.value as YamlMapping
    };
  }

  try {
    const parsed = loadJsYaml(source);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        ok: false,
        diagnostics: [parseError('YAML documents must parse to a mapping root.')]
      };
    }

    const validated = validateYamlNode(parsed, '');
    if (!validated.ok) {
      return { ok: false, diagnostics: [validated.diagnostic] };
    }

    return {
      ok: true,
      diagnostics: [],
      analysis: validated.value as YamlMapping
    };
  } catch (error) {
    return {
      ok: false,
      diagnostics: [parseError(error instanceof Error ? error.message : 'YAML parse failed.')]
    };
  }
}

function analyzeYamlDocument(source: string, backend: YamlBackend): ParseResult<YamlAnalysis> {
  const parsed = parseYamlMapping(source, backend);
  if (!parsed.ok || !parsed.analysis) {
    return { ok: false, diagnostics: parsed.diagnostics };
  }

  return {
    ok: true,
    diagnostics: [],
    analysis: {
      kind: 'yaml',
      dialect: 'yaml',
      normalizedSource: canonicalYaml(parsed.analysis),
      rootKind: 'mapping',
      owners: collectYamlOwners(parsed.analysis)
    },
    policies: []
  };
}

export function parseYaml(
  source: string,
  dialect: YamlDialect,
  backend: YamlBackend = 'yaml'
): ParseResult<YamlAnalysis> {
  if (dialect !== 'yaml') {
    return { ok: false, diagnostics: [unsupportedFeature(`Unsupported YAML dialect ${dialect}.`)] };
  }

  return analyzeYamlDocument(source, backend);
}

export function matchYamlOwners(
  template: YamlAnalysis,
  destination: YamlAnalysis
): YamlOwnerMatchResult {
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

export function mergeYaml(
  templateSource: string,
  destinationSource: string,
  dialect: YamlDialect,
  backend: YamlBackend = 'yaml'
): MergeResult<string> {
  const template = parseYaml(templateSource, dialect, backend);
  if (!template.ok || !template.analysis) {
    return { ok: false, diagnostics: template.diagnostics, policies: [] };
  }

  const destination = parseYaml(destinationSource, dialect, backend);
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

  const templateMapping = parseYamlMapping(template.analysis.normalizedSource, backend);
  const destinationMapping = parseYamlMapping(destination.analysis.normalizedSource, backend);
  if (!templateMapping.ok || !templateMapping.analysis) {
    return { ok: false, diagnostics: templateMapping.diagnostics, policies: [] };
  }
  if (!destinationMapping.ok || !destinationMapping.analysis) {
    return {
      ok: false,
      diagnostics: destinationMapping.diagnostics.map((diagnostic) => ({
        ...diagnostic,
        category:
          diagnostic.category === 'parse_error' ? 'destination_parse_error' : diagnostic.category
      })),
      policies: []
    };
  }

  return {
    ok: true,
    diagnostics: [],
    output: canonicalYaml(mergeYamlMappings(templateMapping.analysis, destinationMapping.analysis)),
    policies: [destinationWinsArrayPolicy]
  };
}
