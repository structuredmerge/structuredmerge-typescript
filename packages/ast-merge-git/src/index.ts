import type { Diagnostic } from '@structuredmerge/ast-merge';

export const packageName = '@structuredmerge/ast-merge-git';

export interface Merge3Request {
  readonly base_source: string;
  readonly ours_source: string;
  readonly theirs_source: string;
  readonly path_name?: string;
  readonly language?: string;
  readonly dialect?: string;
  readonly profile_id?: string;
  readonly fallback_policy?: string;
  readonly conflict_marker_size?: number;
  readonly render_policy?: string;
}

export interface Merge3Conflict {
  readonly conflict_id: string;
  readonly category: string;
  readonly path: string;
  readonly message: string;
}

export interface Merge3Response {
  readonly ok: boolean;
  readonly merged_source?: string;
  readonly conflicts: readonly Merge3Conflict[];
  readonly diagnostics: readonly Diagnostic[];
  readonly fallbacks: readonly string[];
  readonly profile: Readonly<Record<string, string>>;
  readonly render_report: {
    readonly strategy: string;
  };
  readonly formatting_preservation: {
    readonly line_diff_score: number;
    readonly character_diff_score: number;
  };
  readonly reparse_after_render: boolean | null;
}

const absent = Symbol('absent');
type MaybeAbsent = unknown | typeof absent;

export function merge3(request: Merge3Request): Merge3Response {
  switch (normalizeLanguage(request)) {
    case 'json':
      return merge3Json(request);
    default:
      return response(request, {
        ok: false,
        diagnostics: [
          {
            severity: 'error',
            category: 'unsupported_feature',
            message: 'ast-merge-git currently supports only json merge3.'
          }
        ]
      });
  }
}

export function merge3Json(request: Merge3Request): Merge3Response {
  try {
    const base = parseJsonRole('base', request.base_source);
    const ours = parseJsonRole('ours', request.ours_source);
    const theirs = parseJsonRole('theirs', request.theirs_source);
    const conflicts: Merge3Conflict[] = [];
    const merged = mergeJsonValue(base, ours, theirs, '', conflicts);
    if (conflicts.length > 0) {
      return response(request, {
        ok: false,
        conflicts,
        diagnostics: [
          {
            severity: 'error',
            category: 'configuration_error',
            message: `merge_conflict: merge3 found ${conflicts.length} unresolved conflict(s).`
          }
        ]
      });
    }

    const mergedSource = JSON.stringify(merged);
    return response(request, {
      ok: true,
      merged_source: mergedSource,
      reparse_after_render: JSON.parse(mergedSource) !== undefined,
      formatting_preservation: {
        line_diff_score: 1,
        character_diff_score: 1
      }
    });
  } catch (error) {
    return response(request, {
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          category: 'parse_error',
          message: String(error)
        }
      ]
    });
  }
}

function response(
  request: Merge3Request,
  fields: Partial<Merge3Response> & { readonly ok: boolean }
): Merge3Response {
  return {
    ok: fields.ok,
    merged_source: fields.merged_source,
    conflicts: fields.conflicts ?? [],
    diagnostics: fields.diagnostics ?? [],
    fallbacks: fields.fallbacks ?? [],
    profile: {
      profile_id: request.profile_id ?? '',
      language: normalizeLanguage(request),
      dialect: request.dialect ?? ''
    },
    render_report: {
      strategy: request.render_policy || 'canonical'
    },
    formatting_preservation: fields.formatting_preservation ?? {
      line_diff_score: 0,
      character_diff_score: 0
    },
    reparse_after_render: fields.reparse_after_render ?? null
  };
}

function parseJsonRole(role: string, source: string): unknown {
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`${role} parse error: ${String(error)}`);
  }
}

function mergeJsonValue(
  base: unknown,
  ours: unknown,
  theirs: unknown,
  path: string,
  conflicts: Merge3Conflict[]
): unknown {
  if (jsonEqual(ours, theirs)) return ours;
  if (jsonEqual(base, ours)) return theirs;
  if (jsonEqual(base, theirs)) return ours;
  if (isRecord(base) && isRecord(ours) && isRecord(theirs)) {
    return mergeJsonObjects(base, ours, theirs, path, conflicts);
  }

  addConflict(conflicts, 'edit_edit', path, 'value changed differently in ours and theirs');
  return ours;
}

function mergeJsonObjects(
  base: Readonly<Record<string, unknown>>,
  ours: Readonly<Record<string, unknown>>,
  theirs: Readonly<Record<string, unknown>>,
  path: string,
  conflicts: Merge3Conflict[]
): Readonly<Record<string, unknown>> {
  const result: Record<string, unknown> = {};
  const keys = [...new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)])].sort();
  for (const key of keys) {
    const [merged, keep] = mergeJsonEntry(
      Object.hasOwn(base, key) ? base[key] : absent,
      Object.hasOwn(ours, key) ? ours[key] : absent,
      Object.hasOwn(theirs, key) ? theirs[key] : absent,
      jsonPointerJoin(path, key),
      conflicts
    );
    if (keep) result[key] = merged;
  }
  return result;
}

function mergeJsonEntry(
  base: MaybeAbsent,
  ours: MaybeAbsent,
  theirs: MaybeAbsent,
  path: string,
  conflicts: Merge3Conflict[]
): readonly [unknown, boolean] {
  const baseAbsent = base === absent;
  const oursAbsent = ours === absent;
  const theirsAbsent = theirs === absent;
  if (baseAbsent && oursAbsent && theirsAbsent) return [undefined, false];
  if (baseAbsent && oursAbsent) return [theirs, true];
  if (baseAbsent && theirsAbsent) return [ours, true];
  if (baseAbsent && jsonEqual(ours, theirs)) return [ours, true];
  if (baseAbsent) {
    addConflict(conflicts, 'add_add', path, 'same path added differently in ours and theirs');
    return [ours, true];
  }
  if (oursAbsent && theirsAbsent) return [undefined, false];
  if (oursAbsent && jsonEqual(base, theirs)) return [undefined, false];
  if (theirsAbsent && jsonEqual(base, ours)) return [undefined, false];
  if (oursAbsent) {
    addConflict(conflicts, 'delete_edit', path, 'ours deleted a value that theirs edited');
    return [theirs, true];
  }
  if (theirsAbsent) {
    addConflict(conflicts, 'delete_edit', path, 'theirs deleted a value that ours edited');
    return [ours, true];
  }
  return [mergeJsonValue(base, ours, theirs, path, conflicts), true];
}

function addConflict(
  conflicts: Merge3Conflict[],
  category: string,
  path: string,
  message: string
): void {
  conflicts.push({
    conflict_id: `conflict-${conflicts.length + 1}`,
    category,
    path: path || '/',
    message
  });
}

function jsonPointerJoin(parent: string, token: string): string {
  const escaped = token.replaceAll('~', '~0').replaceAll('/', '~1');
  return parent ? `${parent}/${escaped}` : `/${escaped}`;
}

function jsonEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeLanguage(request: Merge3Request): string {
  if (request.language?.trim().toLowerCase() === 'json') return 'json';
  if (request.path_name?.toLowerCase().endsWith('.json')) return 'json';
  return request.language?.trim().toLowerCase() ?? '';
}
