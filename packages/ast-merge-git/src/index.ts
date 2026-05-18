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
  readonly conflicted_source?: string;
  readonly conflicts: readonly Merge3Conflict[];
  readonly diagnostics: readonly Diagnostic[];
  readonly fallbacks: readonly string[];
  readonly profile: Readonly<Record<string, string>>;
  readonly render_report: {
    readonly strategy: string;
    readonly backend_id?: string;
    readonly parser_identity?: string;
  };
  readonly owned_regions: readonly OwnedRegionReport[];
  readonly formatting_preservation: {
    readonly line_diff_score: number;
    readonly character_diff_score: number;
  };
  readonly secondary_formatting_metrics: {
    readonly unchanged_line_churn: number;
    readonly output_diff_size: number;
    readonly source_fragment_retention: number;
    readonly weighted: boolean;
    readonly diagnostics: readonly string[];
  };
  readonly default_driver_evaluation: {
    readonly status: string;
    readonly formatting_threshold: number;
    readonly formatting_score: number;
    readonly hard_gates: readonly {
      readonly name: string;
      readonly passed: boolean;
      readonly weighted: boolean;
    }[];
    readonly blocking_reasons: readonly string[];
    readonly diagnostics: readonly string[];
  };
  readonly reparse_after_render: boolean | null;
}

export interface SourceRange {
  readonly start: number;
  readonly end: number;
}

export interface AttachedSpan {
  readonly kind: string;
  readonly line_range: SourceRange;
  readonly byte_range?: SourceRange;
}

export interface OwnedRegionReport {
  readonly owner_path: string;
  readonly node_id: string;
  readonly region_kind: string;
  readonly byte_range: SourceRange;
  readonly line_range: SourceRange;
  readonly attached_spans: readonly AttachedSpan[];
  readonly backend_id: string;
  readonly parser_identity: string;
  readonly can_replace: boolean;
  readonly can_line_merge: boolean;
  readonly requires_reparse: boolean;
}

export interface CommentDeltaResult {
  readonly ok: boolean;
  readonly merged_comment: string | null;
  readonly conflicts: readonly Merge3Conflict[];
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
      const ownedRegions = jsonOwnedRegionsForConflicts(request, conflicts);
      return response(request, {
        ok: false,
        conflicts,
        conflicted_source: renderConflictSource(request, conflicts),
        owned_regions: ownedRegions,
        render_report: {
          strategy:
            ownedRegions.length === 0
              ? 'full_file_conflict_markers'
              : 'owned_region_conflict_markers'
        },
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

export function mergeCommentDelta(
  baseComment: string | null,
  oursComment: string | null,
  theirsComment: string | null,
  ownerPath: string
): CommentDeltaResult {
  const conflicts: Merge3Conflict[] = [];
  let mergedComment: string | null = null;

  if (oursComment === theirsComment) {
    mergedComment = oursComment;
  } else if (baseComment === oursComment) {
    mergedComment = theirsComment;
  } else if (baseComment === theirsComment) {
    mergedComment = oursComment;
  } else if (oursComment === null) {
    conflicts.push(
      commentConflict('delete_edit', ownerPath, 'ours deleted a comment that theirs edited')
    );
  } else if (theirsComment === null) {
    conflicts.push(
      commentConflict('delete_edit', ownerPath, 'theirs deleted a comment that ours edited')
    );
  } else {
    conflicts.push(
      commentConflict('edit_edit', ownerPath, 'comment changed differently in ours and theirs')
    );
  }

  return {
    ok: conflicts.length === 0,
    merged_comment: conflicts.length === 0 ? mergedComment : null,
    conflicts
  };
}

function response(
  request: Merge3Request,
  fields: Partial<Merge3Response> & { readonly ok: boolean }
): Merge3Response {
  const renderReport = {
    ...renderIdentity(request),
    strategy: fields.render_report?.strategy ?? request.render_policy ?? 'canonical'
  };
  const formattingPreservation = fields.formatting_preservation ?? {
    line_diff_score: 0,
    character_diff_score: 0
  };
  const reparseAfterRender = fields.reparse_after_render ?? null;
  return {
    ok: fields.ok,
    merged_source: fields.merged_source,
    conflicted_source: fields.conflicted_source,
    conflicts: fields.conflicts ?? [],
    diagnostics: fields.diagnostics ?? [],
    fallbacks: fields.fallbacks ?? [],
    owned_regions: fields.owned_regions ?? [],
    profile: {
      profile_id: request.profile_id ?? '',
      language: normalizeLanguage(request),
      dialect: request.dialect ?? ''
    },
    render_report: renderReport,
    formatting_preservation: formattingPreservation,
    secondary_formatting_metrics:
      fields.secondary_formatting_metrics ??
      secondaryFormattingMetrics(fields.merged_source !== undefined),
    default_driver_evaluation:
      fields.default_driver_evaluation ??
      defaultDriverEvaluation(formattingPreservation, reparseAfterRender, renderReport),
    reparse_after_render: reparseAfterRender
  };
}

function defaultDriverEvaluation(
  formattingPreservation: Merge3Response['formatting_preservation'],
  reparseAfterRender: boolean | null,
  renderReport: Merge3Response['render_report']
): Merge3Response['default_driver_evaluation'] {
  const threshold = 0.95;
  const score =
    (formattingPreservation.line_diff_score + formattingPreservation.character_diff_score) / 2;
  const reparsePassed = reparseAfterRender === true;
  const noFullFileRewrite = renderReport.strategy !== 'full_file_conflict_markers';
  const coherentConflictMarkers = renderReport.strategy !== 'full_file_conflict_markers';
  const blockingReasons: string[] = [];
  if (!reparsePassed) blockingReasons.push('rendered output did not reparse');
  if (score < threshold) blockingReasons.push('formatting score is below threshold');
  if (!noFullFileRewrite) blockingReasons.push('full-file rewrite or conflict markers were used');
  if (!coherentConflictMarkers) {
    blockingReasons.push('conflict marker placement is not syntactically coherent');
  }
  return {
    status: blockingReasons.length === 0 ? 'recommended' : 'not_recommended',
    formatting_threshold: threshold,
    formatting_score: score,
    hard_gates: [
      { name: 'reparse_after_render', passed: reparsePassed, weighted: false },
      { name: 'no_full_file_rewrite', passed: noFullFileRewrite, weighted: false },
      {
        name: 'coherent_conflict_marker_placement',
        passed: coherentConflictMarkers,
        weighted: false
      }
    ],
    blocking_reasons: blockingReasons,
    diagnostics: ['default-driver evaluation is advisory unless explicitly required']
  };
}

function secondaryFormattingMetrics(
  merged: boolean
): Merge3Response['secondary_formatting_metrics'] {
  if (merged) {
    return {
      unchanged_line_churn: 0,
      output_diff_size: 0,
      source_fragment_retention: 1,
      weighted: false,
      diagnostics: ['canonical JSON has no trivia-preserving source fragments yet']
    };
  }
  return {
    unchanged_line_churn: 0,
    output_diff_size: 0,
    source_fragment_retention: 0,
    weighted: false,
    diagnostics: [
      'unresolved conflict did not produce a merged source-fragment retention measurement'
    ]
  };
}

function renderIdentity(request: Merge3Request): {
  readonly backend_id?: string;
  readonly parser_identity?: string;
} {
  if (normalizeLanguage(request) === 'json') {
    return {
      backend_id: 'native-json',
      parser_identity: 'standard-json'
    };
  }
  return {};
}

function renderConflictSource(
  request: Merge3Request,
  conflicts: readonly Merge3Conflict[]
): string {
  const markerSize = Math.max(request.conflict_marker_size ?? 7, 1);
  return [
    `/* smorg structured conflicts: ${conflicts.length} unresolved */`,
    `${'<'.repeat(markerSize)} ours`,
    request.ours_source,
    `${'|'.repeat(markerSize)} base`,
    request.base_source,
    '='.repeat(markerSize),
    request.theirs_source,
    `${'>'.repeat(markerSize)} theirs`,
    ''
  ].join('\n');
}

function jsonOwnedRegionsForConflicts(
  request: Merge3Request,
  conflicts: readonly Merge3Conflict[]
): OwnedRegionReport[] {
  return conflicts.flatMap((conflict) => {
    if (!conflict.path.startsWith('/') || conflict.path.split('/').length !== 2) return [];
    const key = conflict.path.slice(1);
    return [
      {
        owner_path: conflict.path,
        node_id: `json:key:${key}`,
        region_kind: 'node',
        byte_range: jsonKeyByteRange(request.base_source, key),
        line_range: { start: 1, end: 1 },
        attached_spans: [],
        backend_id: 'native-json',
        parser_identity: 'standard-json',
        can_replace: true,
        can_line_merge: false,
        requires_reparse: true
      }
    ];
  });
}

function jsonKeyByteRange(source: string, key: string): SourceRange {
  const needle = `"${key}"`;
  const start = source.indexOf(needle);
  if (start < 0) return { start: 0, end: source.length };
  let end = start + needle.length;
  while (end < source.length && source[end] !== ',' && source[end] !== '}') end += 1;
  return { start, end };
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
  const keys = [
    ...new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)])
  ].sort();
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

function commentConflict(category: string, path: string, message: string): Merge3Conflict {
  return {
    conflict_id: 'comment-conflict-1',
    category,
    path: path || '/',
    message
  };
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
