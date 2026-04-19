import type { AnalysisHandle, ParserAdapter, ParserRequest } from '@structuredmerge/tree-haver';
import type {
  Diagnostic,
  MergeResult,
  ParseResult,
  PolicyReference
} from '@structuredmerge/ast-merge';

export type JsonDialect = 'json' | 'jsonc';
export type JsonRootKind = 'object' | 'array' | 'scalar';
export type JsonOwnerKind = 'member' | 'element';

export interface JsonOwner {
  readonly path: string;
  readonly ownerKind: JsonOwnerKind;
  readonly matchKey?: string;
}

export interface JsonOwnerMatch {
  readonly templatePath: string;
  readonly destinationPath: string;
}

export interface JsonOwnerMatchResult {
  readonly matched: readonly JsonOwnerMatch[];
  readonly unmatchedTemplate: readonly string[];
  readonly unmatchedDestination: readonly string[];
}

export interface JsonAnalysis extends AnalysisHandle {
  readonly kind: 'json';
  readonly dialect: JsonDialect;
  readonly allowsComments: boolean;
  readonly normalizedSource: string;
  readonly rootKind: JsonRootKind;
  readonly owners: readonly JsonOwner[];
}

export interface JsonMerger {
  merge(template: JsonAnalysis, destination: JsonAnalysis): MergeResult<string>;
}

export type JsonParserAdapter = ParserAdapter<JsonAnalysis>;

export interface JsonAnalyzer {
  parse(source: string, dialect: JsonDialect): ParseResult<JsonAnalysis>;
}

export interface JsonStructureAnalyzer {
  analyze(source: string, dialect: JsonDialect): ParseResult<JsonAnalysis>;
}

export interface JsonOwnerMatcher {
  match(template: JsonAnalysis, destination: JsonAnalysis): JsonOwnerMatchResult;
}

export interface JsonMergeResolution {
  readonly output: string;
}

const destinationWinsArrayPolicy: PolicyReference = {
  surface: 'array',
  name: 'destination_wins_array'
};

const trailingCommaFallbackPolicy: PolicyReference = {
  surface: 'fallback',
  name: 'trailing_comma_destination_fallback'
};

export function jsonParseRequest(source: string, dialect: JsonDialect): ParserRequest {
  return {
    source,
    language: 'json',
    dialect
  };
}

function detectTrailingComma(source: string): boolean {
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (char === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') inString = false;
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '/' && next === '/') {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      inBlockComment = true;
      i += 1;
      continue;
    }

    if (char === ',') {
      let j = i + 1;
      while (j < source.length && /\s/.test(source[j])) j += 1;
      if (source[j] === ']' || source[j] === '}') return true;
    }
  }

  return false;
}

function stripJsonComments(source: string): string {
  let result = '';
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        result += '\n';
      }
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      result += char;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') inString = false;
      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }

    if (char === '/' && next === '/') {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      inBlockComment = true;
      i += 1;
      continue;
    }

    result += char;
  }

  return result;
}

function parseError(message: string): Diagnostic {
  return {
    severity: 'error',
    category: 'parse_error',
    message
  };
}

function destinationParseError(message: string): Diagnostic {
  return {
    severity: 'error',
    category: 'destination_parse_error',
    message
  };
}

function fallbackApplied(message: string): Diagnostic {
  return {
    severity: 'warning',
    category: 'fallback_applied',
    message
  };
}

function stripTrailingCommas(source: string): string {
  let result = '';
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      result += char;
      if (char === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      result += char;
      if (char === '*' && next === '/') {
        result += next;
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      result += char;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') inString = false;
      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }

    if (char === '/' && next === '/') {
      inLineComment = true;
      result += char;
      result += next;
      i += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      inBlockComment = true;
      result += char;
      result += next;
      i += 1;
      continue;
    }

    if (char === ',') {
      let j = i + 1;
      while (j < source.length && /\s/.test(source[j])) j += 1;
      if (source[j] === ']' || source[j] === '}') continue;
    }

    result += char;
  }

  return result;
}

function escapePointerSegment(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

function analyzeValue(value: unknown, path = ''): { rootKind: JsonRootKind; owners: JsonOwner[] } {
  if (Array.isArray(value)) {
    const owners: JsonOwner[] = [];
    value.forEach((item, index) => {
      const childPath = `${path}/${index}`;
      owners.push({ path: childPath, ownerKind: 'element' });
      owners.push(...analyzeValue(item, childPath).owners);
    });
    return { rootKind: 'array', owners };
  }

  if (value && typeof value === 'object') {
    const owners: JsonOwner[] = [];
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}/${escapePointerSegment(key)}`;
      owners.push({ path: childPath, ownerKind: 'member', matchKey: key });
      owners.push(...analyzeValue(child, childPath).owners);
    }
    owners.sort((left, right) => left.path.localeCompare(right.path));
    return { rootKind: 'object', owners };
  }

  return { rootKind: 'scalar', owners: [] };
}

export function parseJson(source: string, dialect: JsonDialect): ParseResult<JsonAnalysis> {
  const diagnostics: Diagnostic[] = [];

  if (detectTrailingComma(source)) {
    diagnostics.push(parseError('Trailing commas are not supported.'));
    return { ok: false, diagnostics, policies: [] };
  }

  const normalizedSource = dialect === 'jsonc' ? stripJsonComments(source) : source;

  if (dialect === 'json' && normalizedSource !== stripJsonComments(source)) {
    diagnostics.push(parseError('Comments are not supported in strict JSON.'));
    return { ok: false, diagnostics, policies: [] };
  }

  try {
    const decoded = JSON.parse(normalizedSource) as unknown;
    const structure = analyzeValue(decoded);

    return {
      ok: true,
      diagnostics,
      policies: [],
      analysis: {
        kind: 'json',
        dialect,
        allowsComments: dialect === 'jsonc',
        normalizedSource,
        rootKind: structure.rootKind,
        owners: structure.owners
      }
    };
  } catch (error) {
    diagnostics.push(parseError(error instanceof Error ? error.message : 'JSON parse failed.'));
    return { ok: false, diagnostics, policies: [] };
  }
}

export function matchJsonOwners(
  template: JsonAnalysis,
  destination: JsonAnalysis
): JsonOwnerMatchResult {
  const destinationPaths = new Set(destination.owners.map((owner) => owner.path));
  const templatePaths = new Set(template.owners.map((owner) => owner.path));

  const matched = template.owners
    .map((owner) => owner.path)
    .filter((path) => destinationPaths.has(path))
    .map((path) => ({ templatePath: path, destinationPath: path }));

  const unmatchedTemplate = template.owners
    .map((owner) => owner.path)
    .filter((path) => !destinationPaths.has(path));

  const unmatchedDestination = destination.owners
    .map((owner) => owner.path)
    .filter((path) => !templatePaths.has(path));

  return {
    matched,
    unmatchedTemplate,
    unmatchedDestination
  };
}

function parseNormalizedJson(
  source: string,
  dialect: JsonDialect,
  diagnosticFactory: (message: string) => Diagnostic
): unknown {
  const result = parseJson(source, dialect);
  if (!result.ok || !result.analysis) {
    throw diagnosticFactory(result.diagnostics[0]?.message ?? 'JSON parse failed.');
  }
  try {
    return JSON.parse(result.analysis.normalizedSource) as unknown;
  } catch (error) {
    throw diagnosticFactory(error instanceof Error ? error.message : 'JSON parse failed.');
  }
}

function mergeValues(template: unknown, destination: unknown): unknown {
  if (Array.isArray(template) && Array.isArray(destination)) {
    return destination;
  }

  if (
    template &&
    destination &&
    typeof template === 'object' &&
    typeof destination === 'object' &&
    !Array.isArray(template) &&
    !Array.isArray(destination)
  ) {
    const merged: Record<string, unknown> = {};
    const keys = new Set([
      ...Object.keys(template as Record<string, unknown>),
      ...Object.keys(destination as Record<string, unknown>)
    ]);
    for (const key of [...keys].sort()) {
      const templateRecord = template as Record<string, unknown>;
      const destinationRecord = destination as Record<string, unknown>;
      const hasTemplate = Object.prototype.hasOwnProperty.call(templateRecord, key);
      const hasDestination = Object.prototype.hasOwnProperty.call(destinationRecord, key);

      if (hasTemplate && hasDestination) {
        merged[key] = mergeValues(templateRecord[key], destinationRecord[key]);
      } else if (hasDestination) {
        merged[key] = destinationRecord[key];
      } else {
        merged[key] = templateRecord[key];
      }
    }
    return merged;
  }

  return destination;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`);
    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

export function mergeJson(
  templateSource: string,
  destinationSource: string,
  dialect: JsonDialect
): MergeResult<string> {
  try {
    const template = parseNormalizedJson(templateSource, dialect, parseError);
    const diagnostics: Diagnostic[] = [];
    const policies: PolicyReference[] = [destinationWinsArrayPolicy];
    let destination: unknown;

    try {
      destination = parseNormalizedJson(destinationSource, dialect, destinationParseError);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'category' in error &&
        error.category === 'destination_parse_error' &&
        detectTrailingComma(destinationSource)
      ) {
        const sanitizedDestination = stripTrailingCommas(destinationSource);
        if (sanitizedDestination === destinationSource) {
          throw error;
        }
        destination = parseNormalizedJson(sanitizedDestination, dialect, destinationParseError);
        policies.push(trailingCommaFallbackPolicy);
        diagnostics.push(
          fallbackApplied('Applied destination trailing-comma fallback during merge.')
        );
      } else {
        throw error;
      }
    }

    const merged = mergeValues(template, destination);

    return {
      ok: true,
      diagnostics,
      policies,
      output: canonicalJson(merged)
    };
  } catch (error) {
    const diagnostic =
      error &&
      typeof error === 'object' &&
      'severity' in error &&
      'category' in error &&
      'message' in error
        ? (error as Diagnostic)
        : parseError(error instanceof Error ? error.message : 'JSON merge failed.');

    return {
      ok: false,
      diagnostics: [diagnostic],
      policies: []
    };
  }
}
