import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type {
  AdapterInfo,
  BackendAvailabilityCheck,
  BackendAvailabilityReport,
  BackendCapability,
  BackendReference,
  BinaryDiagnostic,
  BinaryMergeReport,
  BinaryNestedDispatch,
  BinaryRawPayload,
  BinaryRenderPolicy,
  BinaryScalarValue,
  ByteEditSpan,
  EditProjectionSupport,
  FeatureProfile,
  NativeParserProvider,
  NativeProviderMetadata,
  NormalizedParseResult,
  NormalizedTreeNode,
  OrderedTreePrimitives,
  ParseErrorTolerance,
  ParserRequest,
  PolicyReference,
  ProviderDiagnostic,
  ProviderDiagnosticsReport,
  SourceSpan,
  TreeHaverProfile,
  ZipUnsafeEntry
} from '../src/index';
import { processWithLanguagePack } from '../src/index';
import {
  buildBackendAvailabilityReport,
  buildProviderDiagnosticsReport,
  byteEditDelta,
  byteEditNewRange,
  byteEditOldRange,
  byteOffsetForPoint,
  byteRangeContainsByte,
  byteRangeLength,
  byteRangeOverlaps,
  currentBackendId,
  extractSourceFragment,
  libraryPathErrors,
  kaitaiAdapterInfo,
  kaitaiFeatureProfile,
  KAITAI_STRUCT_BACKEND,
  type KaitaiTreeAnalysis,
  type KaitaiTreeNode,
  PEGGY_BACKEND,
  peggyAdapterInfo,
  peggyFeatureProfile,
  nodeRoles,
  registerBackend,
  registeredBackends,
  safeBackendName,
  safeLanguageName,
  safeSymbolName,
  sanitizeLanguageName,
  sliceByteRange,
  validateLibraryPath,
  withBackend
} from '../src/index';

interface ParserAdapterFixture {
  request: {
    source: string;
    language: string;
    dialect?: string;
  };
  adapter_info: {
    backend: string;
    supports_dialects: boolean;
    supported_policies?: PolicyReference[];
  };
}

interface FeatureProfileFixture {
  feature_profile: {
    backend: string;
    supports_dialects: boolean;
    supported_policies?: PolicyReference[];
  };
}

interface BackendRegistryFixture {
  backends: BackendReference[];
}

interface EditProjectionSupportFixture {
  backend_ref: BackendReference;
  language: string;
  supports_edit_projection: boolean;
  native_edit_target: string;
  normalized_edit_target: string;
  supported_operations: string[];
  required_node_fields: string[];
  correlation_keys: string[];
  preserves_source_fragments: boolean;
  unsupported_reason: string | null;
  diagnostics: string[];
}

interface PathValidationCase {
  name: string;
  path: string;
  expected_valid: boolean;
  expected_errors: string[];
}

interface NameValidationCase {
  name: string;
  value: string;
  expected_valid: boolean;
  expected_sanitized?: string | null;
}

interface PathValidationFixture {
  library_path_cases: PathValidationCase[];
  language_name_cases: NameValidationCase[];
  symbol_name_cases: NameValidationCase[];
  backend_name_cases: NameValidationCase[];
}

interface BackendAvailabilityReportFixture {
  backend_ref: BackendReference;
  status: 'available' | 'unavailable' | 'unknown';
  checks: BackendAvailabilityCheck[];
  diagnostics: string[];
}

interface ProviderDiagnosticsReportFixture {
  provider_id: string;
  backend_ref: BackendReference;
  language: string;
  status: 'clean' | 'warning' | 'blocked';
  diagnostics: ProviderDiagnostic[];
}

function editProjectionSupport(fixture: EditProjectionSupportFixture): EditProjectionSupport {
  return {
    backendRef: fixture.backend_ref,
    language: fixture.language,
    supportsEditProjection: fixture.supports_edit_projection,
    nativeEditTarget: fixture.native_edit_target,
    normalizedEditTarget: fixture.normalized_edit_target,
    supportedOperations: fixture.supported_operations,
    requiredNodeFields: fixture.required_node_fields,
    correlationKeys: fixture.correlation_keys,
    preservesSourceFragments: fixture.preserves_source_fragments,
    unsupportedReason: fixture.unsupported_reason ?? undefined,
    diagnostics: fixture.diagnostics
  };
}

function backendAvailabilityReport(
  fixture: BackendAvailabilityReportFixture
): BackendAvailabilityReport {
  return {
    backendRef: fixture.backend_ref,
    status: fixture.status,
    checks: fixture.checks,
    diagnostics: fixture.diagnostics
  };
}

function providerDiagnosticsReport(
  fixture: ProviderDiagnosticsReportFixture
): ProviderDiagnosticsReport {
  return {
    providerId: fixture.provider_id,
    backendRef: fixture.backend_ref,
    language: fixture.language,
    status: fixture.status,
    diagnostics: fixture.diagnostics
  };
}

interface KaitaiSubstrateFixture {
  backend: BackendReference;
  adapter_info: {
    backend: string;
    backend_ref: BackendReference;
    supports_dialects: boolean;
    supported_policies: PolicyReference[];
  };
  feature_profile: {
    backend: string;
    backend_ref: BackendReference;
    supports_dialects: boolean;
    supported_policies: PolicyReference[];
  };
  tree_node: {
    kind: string;
    schema_path: string;
    span: { start_byte: number; end_byte: number };
    fields: Record<string, unknown>;
    children: KaitaiSubstrateFixture['tree_node'][];
  };
  analysis: {
    schema: string;
    source_byte_length: number;
    diagnostics: Array<{
      severity: string;
      category: string;
      message: string;
      schema_path: string;
      byte_range: { start_byte: number; end_byte: number };
    }>;
  };
}

interface ByteLocationFixture {
  source: string;
  byte_range: { start_byte: number; end_byte: number };
  source_point: { row: number; column: number };
  edit_span: {
    start_byte: number;
    old_end_byte: number;
    new_end_byte: number;
    start_point: { row: number; column: number };
    old_end_point: { row: number; column: number };
    new_end_point: { row: number; column: number };
  };
  expected: {
    length: number;
    slice: string;
    contains_start: boolean;
    contains_end: boolean;
    overlaps: boolean;
    disjoint: boolean;
    line_column_offset: number;
    old_edit_length: number;
    new_edit_length: number;
    edit_delta: number;
    old_edit_slice: string;
  };
  comparison_ranges: {
    overlapping: { start_byte: number; end_byte: number };
    disjoint: { start_byte: number; end_byte: number };
  };
}

interface BinaryCoreFixture {
  raw_payload: {
    encoding: string;
    value: string;
    byte_length: number;
    regions: Array<{
      kind: string;
      schema_path: string;
      byte_range: { start_byte: number; end_byte: number };
      expected_hex: string;
    }>;
  };
  scalar_values: Array<
    | { kind: 'string'; value: string }
    | { kind: 'integer'; value: number }
    | { kind: 'float'; value: number }
    | { kind: 'boolean'; value: boolean }
    | { kind: 'enum'; symbol: string; raw_value: number }
    | { kind: 'bytes'; encoding: string; value: string }
    | { kind: 'timestamp'; value: string }
    | { kind: 'opaque'; format: string; description: string }
    | { kind: 'null' }
  >;
  render_policies: Array<{
    schema_path: string;
    byte_range: { start_byte: number; end_byte: number };
    operation: string;
    disposition: string;
    reason: string;
  }>;
  merge_report: {
    format: string;
    schema: string;
    matched_schema_paths: string[];
    preserved_ranges: Array<{ start_byte: number; end_byte: number }>;
    rewritten_nodes: string[];
    checksum_updates: string[];
    nested_dispatches: Array<{ schema_path: string; family: string; status: string }>;
    diagnostics: Array<{
      severity: string;
      category: string;
      message: string;
      schema_path: string;
      byte_range?: { start_byte: number; end_byte: number };
    }>;
  };
}

interface ZipFamilyFixture {
  unsafe_entries: Array<{
    path: string;
    normalized_path: string;
    category: string;
    reason: string;
  }>;
}

interface ConformanceManifest {
  readonly families: Readonly<
    Record<string, readonly { readonly role: string; readonly path: readonly string[] }[]>
  >;
}

interface NormalizedTreeNodeFixture {
  readonly id: string;
  readonly kind: string;
  readonly role: NormalizedTreeNode['role'];
  readonly parent_id: string | null;
  readonly child_ids: readonly string[];
  readonly span: {
    readonly range: { readonly start_byte: number; readonly end_byte: number };
    readonly start_point: { readonly row: number; readonly column: number };
    readonly end_point: { readonly row: number; readonly column: number };
  };
  readonly field_name: string | null;
  readonly named: boolean;
  readonly anonymous: boolean;
  readonly has_source_text: boolean;
  readonly source_fragment: string;
  readonly backend_kind?: string;
  readonly semantic_roles?: readonly string[];
  readonly backend_roles?: readonly string[];
  readonly unsupported_features?: readonly string[];
  readonly metadata?: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

interface BackendCapabilityFixture {
  readonly backend_ref: BackendReference;
  readonly language: string;
  readonly parser_identity: {
    readonly name: string;
    readonly version: string;
    readonly implementation: string;
  };
  readonly language_version: {
    readonly version: string;
    readonly dialect: string | null;
  };
  readonly parse_error_behavior: string;
  readonly source_span_support: string;
  readonly source_fragment_support: string;
  readonly render_strategies: readonly string[];
  readonly semantic_role_support: string;
  readonly normalized_tree_support: boolean;
  readonly native_node_access: boolean;
  readonly diagnostics: readonly string[];
}

interface SourceFragmentExtractionFixture {
  readonly source: string;
  readonly strategy: string;
  readonly span: {
    readonly range: { readonly start_byte: number; readonly end_byte: number };
    readonly start_point: { readonly row: number; readonly column: number };
    readonly end_point: { readonly row: number; readonly column: number };
  };
  readonly fragment: {
    readonly text: string;
    readonly available: boolean;
    readonly strategy: string;
    readonly byte_length: number;
    readonly diagnostics: readonly string[];
  };
}

interface ParseErrorToleranceFixture {
  readonly backend_ref: BackendReference;
  readonly language: string;
  readonly behavior: string;
  readonly tolerates_errors: boolean;
  readonly error_nodes: Array<{
    readonly kind: string;
    readonly span: SourceFragmentExtractionFixture['span'];
    readonly message: string;
  }>;
  readonly diagnostics: readonly string[];
}

interface NativeParserProviderFixture {
  readonly id: string;
  readonly family: string;
  readonly language: string;
  readonly operations: readonly string[];
  readonly retains_native_tree: boolean;
  readonly native_tree_visibility: string;
  readonly metadata_policy: string;
}

interface NormalizedParseResultFixture {
  readonly ok: boolean;
  readonly backend_capability: BackendCapabilityFixture;
  readonly root_id: string;
  readonly nodes: readonly NormalizedTreeNodeFixture[];
  readonly parse_error_tolerance: ParseErrorToleranceFixture;
  readonly source_fragments_available: boolean;
  readonly diagnostics: readonly string[];
  readonly metadata: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

interface TreeHaverProfileFixture {
  readonly profile_id: string;
  readonly language: string;
  readonly backend_ref: BackendReference;
  readonly provider_id: string;
  readonly node_roles: readonly NormalizedTreeNode['role'][];
  readonly normalized_node_fields: readonly string[];
  readonly optional_node_features: readonly string[];
  readonly unsupported_defaults: Readonly<Record<string, string>>;
  readonly capability: BackendCapabilityFixture;
  readonly fixture_slices: readonly string[];
  readonly diagnostics: readonly string[];
}

interface OrderedTreePrimitivesFixture {
  readonly root_id: string;
  readonly child_order: Readonly<Record<string, readonly string[]>>;
  readonly sibling_edges: readonly {
    readonly parent_id: string;
    readonly node_id: string;
    readonly previous_sibling_id: string | null;
    readonly next_sibling_id: string | null;
  }[];
  readonly diagnostics: readonly string[];
}

function readFixture<T>(...segments: string[]): T {
  const fixturePath = path.resolve(process.cwd(), '..', 'fixtures', ...segments);

  return JSON.parse(readFileSync(fixturePath, 'utf8')) as T;
}

function diagnosticsFixturePath(role: string): string[] {
  const manifest = readFixture<ConformanceManifest>(
    'conformance',
    'slice-24-manifest',
    'family-feature-profiles.json'
  );
  const entry = manifest.families.diagnostics?.find((candidate) => candidate.role === role);

  if (!entry) {
    throw new Error(`missing diagnostics fixture entry for ${role}`);
  }

  return [...entry.path];
}

function normalizedTreeNode(fixture: NormalizedTreeNodeFixture): NormalizedTreeNode {
  return {
    id: fixture.id,
    kind: fixture.kind,
    role: fixture.role,
    parentId: fixture.parent_id ?? undefined,
    childIds: fixture.child_ids,
    span: {
      range: {
        startByte: fixture.span.range.start_byte,
        endByte: fixture.span.range.end_byte
      },
      startPoint: fixture.span.start_point,
      endPoint: fixture.span.end_point
    },
    fieldName: fixture.field_name ?? undefined,
    named: fixture.named,
    anonymous: fixture.anonymous,
    hasSourceText: fixture.has_source_text,
    sourceFragment: fixture.source_fragment,
    backendKind: fixture.backend_kind,
    semanticRoles: fixture.semantic_roles ?? [],
    backendRoles: fixture.backend_roles ?? [],
    unsupportedFeatures: fixture.unsupported_features ?? [],
    metadata: fixture.metadata ?? {}
  };
}

function backendCapability(fixture: BackendCapabilityFixture): BackendCapability {
  return {
    backendRef: fixture.backend_ref,
    language: fixture.language,
    parserIdentity: fixture.parser_identity,
    languageVersion: {
      version: fixture.language_version.version,
      dialect: fixture.language_version.dialect ?? undefined
    },
    parseErrorBehavior: fixture.parse_error_behavior,
    sourceSpanSupport: fixture.source_span_support,
    sourceFragmentSupport: fixture.source_fragment_support,
    renderStrategies: fixture.render_strategies,
    semanticRoleSupport: fixture.semantic_role_support,
    normalizedTreeSupport: fixture.normalized_tree_support,
    nativeNodeAccess: fixture.native_node_access,
    diagnostics: fixture.diagnostics
  };
}

function sourceSpan(fixture: SourceFragmentExtractionFixture['span']): SourceSpan {
  return {
    range: {
      startByte: fixture.range.start_byte,
      endByte: fixture.range.end_byte
    },
    startPoint: fixture.start_point,
    endPoint: fixture.end_point
  };
}

function parseErrorTolerance(fixture: ParseErrorToleranceFixture): ParseErrorTolerance {
  return {
    backendRef: fixture.backend_ref,
    language: fixture.language,
    behavior: fixture.behavior,
    toleratesErrors: fixture.tolerates_errors,
    errorNodes: fixture.error_nodes.map((node) => ({
      kind: node.kind,
      span: sourceSpan(node.span),
      message: node.message
    })),
    diagnostics: fixture.diagnostics
  };
}

function nativeParserProvider(fixture: NativeParserProviderFixture): NativeParserProvider {
  return {
    id: fixture.id,
    family: fixture.family,
    language: fixture.language,
    operations: fixture.operations,
    retainsNativeTree: fixture.retains_native_tree,
    nativeTreeVisibility: fixture.native_tree_visibility,
    metadataPolicy: fixture.metadata_policy
  };
}

function normalizedParseResult(fixture: NormalizedParseResultFixture): NormalizedParseResult {
  return {
    ok: fixture.ok,
    backendCapability: backendCapability(fixture.backend_capability),
    rootId: fixture.root_id,
    nodes: fixture.nodes.map(normalizedTreeNode),
    parseErrorTolerance: parseErrorTolerance(fixture.parse_error_tolerance),
    sourceFragmentsAvailable: fixture.source_fragments_available,
    diagnostics: fixture.diagnostics,
    metadata: fixture.metadata
  };
}

function treeHaverProfile(fixture: TreeHaverProfileFixture): TreeHaverProfile {
  return {
    profileId: fixture.profile_id,
    language: fixture.language,
    backendRef: fixture.backend_ref,
    providerId: fixture.provider_id,
    nodeRoles: fixture.node_roles,
    normalizedNodeFields: fixture.normalized_node_fields,
    optionalNodeFeatures: fixture.optional_node_features,
    unsupportedDefaults: fixture.unsupported_defaults,
    capability: backendCapability(fixture.capability),
    fixtureSlices: fixture.fixture_slices,
    diagnostics: fixture.diagnostics
  };
}

function orderedTreePrimitives(fixture: OrderedTreePrimitivesFixture): OrderedTreePrimitives {
  return {
    rootId: fixture.root_id,
    childOrder: fixture.child_order,
    siblingEdges: fixture.sibling_edges.map((edge) => ({
      parentId: edge.parent_id,
      nodeId: edge.node_id,
      previousSiblingId: edge.previous_sibling_id ?? undefined,
      nextSiblingId: edge.next_sibling_id ?? undefined
    })),
    diagnostics: fixture.diagnostics
  };
}

describe('tree-haver shared fixtures', () => {
  it('conforms to the slice-06 parser request fixture', () => {
    const fixture = readFixture<ParserAdapterFixture>(...diagnosticsFixturePath('parser_request'));

    const request: ParserRequest = {
      source: fixture.request.source,
      language: fixture.request.language,
      dialect: fixture.request.dialect
    };

    const adapterInfo: AdapterInfo = {
      backend: fixture.adapter_info.backend,
      supportsDialects: fixture.adapter_info.supports_dialects
    };

    expect(request).toEqual(fixture.request);
    expect({
      backend: adapterInfo.backend,
      supports_dialects: adapterInfo.supportsDialects
    }).toEqual(fixture.adapter_info);
  });

  it('conforms to the slice-782 normalized tree node fixture', () => {
    const fixture = readFixture<{
      node_roles: string[];
      node: NormalizedTreeNodeFixture;
      child: NormalizedTreeNodeFixture;
    }>('diagnostics', 'slice-782-normalized-tree-node', 'normalized-tree-node.json');

    expect(nodeRoles()).toEqual(fixture.node_roles);
    const node = normalizedTreeNode(fixture.node);
    const child = normalizedTreeNode(fixture.child);

    expect(node.role).toBe('structural');
    expect(node.childIds[1]).toBe(child.id);
    expect(child.parentId).toBe(node.id);
    expect(child.fieldName).toBe('declaration');
    expect(child.hasSourceText).toBe(true);
  });

  it('conforms to the slice-786 progressive node metadata fixture', () => {
    const fixture = readFixture<{
      enhanced_node: NormalizedTreeNodeFixture;
      limited_node: NormalizedTreeNodeFixture;
    }>('diagnostics', 'slice-786-progressive-node-metadata', 'progressive-node-metadata.json');
    const enhanced = normalizedTreeNode(fixture.enhanced_node);
    const limited = normalizedTreeNode(fixture.limited_node);

    expect(enhanced.backendKind).toBe('FuncDecl');
    expect(enhanced.semanticRoles[0]).toBe('declaration');
    expect(enhanced.metadata.go_dst?.node_path).toBe('decls[0]');
    expect(limited.hasSourceText).toBe(false);
    expect(limited.unsupportedFeatures[1]).toBe('source_fragment');
    expect(limited.metadata.psych?.location_support).toBe('line_column_only');
  });

  it('conforms to the slice-787 native parser adapter contract fixture', () => {
    const fixture = readFixture<{
      provider: NativeParserProviderFixture;
      parse_result: NormalizedParseResultFixture;
    }>(
      'diagnostics',
      'slice-787-native-parser-adapter-contract',
      'native-parser-adapter-contract.json'
    );
    const provider = nativeParserProvider(fixture.provider);
    const result = normalizedParseResult(fixture.parse_result);

    expect(provider.id).toBe('go-dst');
    expect(provider.retainsNativeTree).toBe(true);
    expect(provider.nativeTreeVisibility).toBe('provider_internal');
    expect(result.rootId).toBe(result.nodes[0]?.id);
    expect(result.nodes[1]?.semanticRoles[1]).toBe('function');
    expect(result.metadata.go_dst?.native_tree_visibility).toBe('provider_internal');
    expect(result.sourceFragmentsAvailable).toBe(true);
  });

  it('conforms to the slice-822 native provider metadata fixture', () => {
    const fixture = readFixture<{
      provider_metadata: NativeProviderMetadata;
      expected: {
        provider_id: string;
        family: string;
        host_language: string;
        target_language: string;
        parser_name: string;
        parse_error_behavior: string;
        source_span_support: string;
        render_support: string;
        semantic_role_support: string;
        retains_native_tree: boolean;
        metadata_policy: string;
      };
    }>('diagnostics', 'slice-822-native-provider-metadata', 'native-provider-metadata.json');
    const metadata = fixture.provider_metadata;

    expect(metadata.provider_id).toBe(fixture.expected.provider_id);
    expect(metadata.family).toBe(fixture.expected.family);
    expect(metadata.host_language).toBe(fixture.expected.host_language);
    expect(metadata.target_language).toBe(fixture.expected.target_language);
    expect(metadata.parser_name).toBe(fixture.expected.parser_name);
    expect(metadata.parse_error_behavior).toBe(fixture.expected.parse_error_behavior);
    expect(metadata.source_span_support).toBe(fixture.expected.source_span_support);
    expect(metadata.render_support).toBe(fixture.expected.render_support);
    expect(metadata.semantic_role_support).toBe(fixture.expected.semantic_role_support);
    expect(metadata.retains_native_tree).toBe(fixture.expected.retains_native_tree);
    expect(metadata.metadata_policy).toBe(fixture.expected.metadata_policy);
  });

  it('conforms to the slice-788 tree-haver profile fixture', () => {
    const fixture = readFixture<{ profile: TreeHaverProfileFixture }>(
      'diagnostics',
      'slice-788-tree-haver-profile',
      'tree-haver-profile.json'
    );
    const profile = treeHaverProfile(fixture.profile);

    expect(profile.profileId).toBe('go-dst-normalized-tree-v1');
    expect(profile.backendRef.id).toBe('go-dst');
    expect(profile.nodeRoles[0]).toBe('structural');
    expect(profile.normalizedNodeFields.at(-1)).toBe('metadata');
    expect(profile.unsupportedDefaults.field_name).toBe('null');
    expect(profile.capability.parserIdentity.name).toBe('github.com/dave/dst');
    expect(profile.fixtureSlices[0]).toBe('slice-782-normalized-tree-node');
  });

  it('conforms to the slice-789 ordered tree primitives fixture', () => {
    const fixture = readFixture<{
      root_id: string;
      ordered_tree: OrderedTreePrimitivesFixture;
      forbidden_merge_terms: readonly string[];
    }>('diagnostics', 'slice-789-ordered-tree-primitives', 'ordered-tree-primitives.json');
    const ordered = orderedTreePrimitives(fixture.ordered_tree);

    for (const diagnostic of ordered.diagnostics) {
      for (const term of fixture.forbidden_merge_terms) {
        expect(diagnostic.toLowerCase()).not.toContain(term.toLowerCase());
      }
    }

    expect(ordered.rootId).toBe(fixture.root_id);
    expect(ordered.childOrder.file?.[0]).toBe('imports');
    expect(ordered.childOrder.imports?.[1]).toBe('import-strings');
    expect(ordered.siblingEdges[2]?.previousSiblingId).toBeUndefined();
    expect(ordered.siblingEdges[2]?.nextSiblingId).toBe('import-strings');
  });

  it('conforms to the slice-783 backend capability report fixture', () => {
    const fixture = readFixture<{ capability: BackendCapabilityFixture }>(
      'diagnostics',
      'slice-783-backend-capability-report',
      'backend-capability-report.json'
    );
    const capability = backendCapability(fixture.capability);

    expect(capability.backendRef).toEqual({ id: 'go-dst', family: 'native' });
    expect(capability.language).toBe('go');
    expect(capability.parserIdentity.name).toBe('github.com/dave/dst');
    expect(capability.parseErrorBehavior).toBe('diagnostic_and_partial_tree');
    expect(capability.renderStrategies[0]).toBe('source_fragment_reuse');
    expect(capability.normalizedTreeSupport).toBe(true);
    expect(capability.nativeNodeAccess).toBe(true);
  });

  it('conforms to the slice-784 source fragment extraction fixture', () => {
    const fixture = readFixture<SourceFragmentExtractionFixture>(
      'diagnostics',
      'slice-784-source-fragment-extraction',
      'source-fragment-extraction.json'
    );
    const fragment = extractSourceFragment(
      fixture.source,
      sourceSpan(fixture.span),
      fixture.strategy
    );

    expect(fragment.text).toBe(fixture.fragment.text);
    expect(fragment.available).toBe(fixture.fragment.available);
    expect(fragment.strategy).toBe(fixture.fragment.strategy);
    expect(fragment.byteLength).toBe(fixture.fragment.byte_length);
    expect(fragment.diagnostics).toHaveLength(fixture.fragment.diagnostics.length);
  });

  it('conforms to the slice-785 parse error tolerance fixture', () => {
    const fixture = readFixture<{ parse_error_tolerance: ParseErrorToleranceFixture }>(
      'diagnostics',
      'slice-785-parse-error-tolerance',
      'parse-error-tolerance.json'
    );
    const tolerance = parseErrorTolerance(fixture.parse_error_tolerance);

    expect(tolerance.backendRef.id).toBe('tree-sitter-go');
    expect(tolerance.behavior).toBe('diagnostic_and_partial_tree');
    expect(tolerance.toleratesErrors).toBe(true);
    expect(tolerance.errorNodes[0]?.span.range.startByte).toBe(27);
    expect(tolerance.diagnostics[0]).toBe('partial tree contains parser error nodes');
  });

  it('conforms to the slice-19 adapter policy support fixture', () => {
    const fixture = readFixture<ParserAdapterFixture>(
      ...diagnosticsFixturePath('adapter_policy_support')
    );

    const adapterInfo: AdapterInfo = {
      backend: fixture.adapter_info.backend,
      supportsDialects: fixture.adapter_info.supports_dialects,
      supportedPolicies: fixture.adapter_info.supported_policies
    };

    expect({
      backend: adapterInfo.backend,
      supports_dialects: adapterInfo.supportsDialects,
      supported_policies: adapterInfo.supportedPolicies
    }).toEqual(fixture.adapter_info);
  });

  it('conforms to the slice-20 adapter feature profile fixture', () => {
    const fixture = readFixture<FeatureProfileFixture>(
      ...diagnosticsFixturePath('adapter_feature_profile')
    );

    const profile: FeatureProfile = {
      backend: fixture.feature_profile.backend,
      supportsDialects: fixture.feature_profile.supports_dialects,
      supportedPolicies: fixture.feature_profile.supported_policies
    };

    expect({
      backend: profile.backend,
      supports_dialects: profile.supportsDialects,
      supported_policies: profile.supportedPolicies
    }).toEqual(fixture.feature_profile);
  });

  it('conforms to the slice-25 backend registry fixture', () => {
    const fixture = readFixture<BackendRegistryFixture>(
      ...diagnosticsFixturePath('backend_registry')
    );

    const backends: BackendReference[] = [
      {
        id: 'native',
        family: 'builtin'
      },
      {
        id: 'tree-sitter',
        family: 'tree-sitter'
      }
    ];

    const profile: FeatureProfile = {
      backend: 'tree-sitter',
      backendRef: backends[1],
      supportsDialects: true,
      supportedPolicies: []
    };

    expect(backends).toEqual(fixture.backends);
    expect(profile.backendRef).toEqual(fixture.backends[1]);
  });

  it('conforms to the slice-100 process baseline fixture', () => {
    const fixture = readFixture<{
      request: { language: string; source: string };
      expected: {
        language: string;
        structure: Array<{ kind: string; name?: string }>;
        imports: Array<{ source: string; items: string[] }>;
      };
    }>(...diagnosticsFixturePath('process_baseline'));

    const result = processWithLanguagePack(fixture.request);

    expect(result.ok).toBe(true);
    expect(result.analysis?.language).toBe(fixture.expected.language);
    expect(
      result.analysis?.structure.map((item) => ({
        kind: item.kind,
        ...(item.name ? { name: item.name } : {})
      }))
    ).toEqual(fixture.expected.structure);
    expect(
      result.analysis?.imports.map((item) => ({
        source: item.source,
        items: item.items
      }))
    ).toEqual(fixture.expected.imports);
  });

  it('exposes PEG backend references for parser-plurality slices', () => {
    expect(PEGGY_BACKEND).toEqual({ id: 'peggy', family: 'peg' });
    expect(peggyAdapterInfo.backendRef).toEqual({ id: 'peggy', family: 'peg' });
    expect(peggyFeatureProfile.backendRef).toEqual({ id: 'peggy', family: 'peg' });
  });

  it('conforms to the slice-721 Kaitai tree-haver substrate fixture', () => {
    const fixture = readFixture<KaitaiSubstrateFixture>(
      ...diagnosticsFixturePath('kaitai_tree_haver_substrate')
    );

    const toNode = (node: KaitaiSubstrateFixture['tree_node']): KaitaiTreeNode => ({
      kind: node.kind,
      schemaPath: node.schema_path,
      span: {
        startByte: node.span.start_byte,
        endByte: node.span.end_byte
      },
      fields: node.fields,
      children: node.children.map(toNode)
    });
    const analysis: KaitaiTreeAnalysis = {
      kind: 'kaitai-tree',
      schema: fixture.analysis.schema,
      sourceByteLength: fixture.analysis.source_byte_length,
      root: toNode(fixture.tree_node),
      backendRef: KAITAI_STRUCT_BACKEND,
      diagnostics: fixture.analysis.diagnostics.map((diagnostic) => ({
        severity: diagnostic.severity,
        category: diagnostic.category,
        message: diagnostic.message,
        schemaPath: diagnostic.schema_path,
        byteRange: {
          startByte: diagnostic.byte_range.start_byte,
          endByte: diagnostic.byte_range.end_byte
        }
      }))
    };

    expect(KAITAI_STRUCT_BACKEND).toEqual(fixture.backend);
    expect(kaitaiAdapterInfo).toEqual({
      backend: fixture.adapter_info.backend,
      backendRef: fixture.adapter_info.backend_ref,
      supportsDialects: fixture.adapter_info.supports_dialects
    });
    expect(kaitaiFeatureProfile).toEqual({
      backend: fixture.feature_profile.backend,
      backendRef: fixture.feature_profile.backend_ref,
      supportsDialects: fixture.feature_profile.supports_dialects
    });
    expect(analysis.sourceByteLength).toBe(fixture.analysis.source_byte_length);
    expect(analysis.diagnostics?.[0]?.schemaPath).toBe(
      fixture.analysis.diagnostics[0]?.schema_path
    );
    expect(analysis.root.schemaPath).toBe('/chunks/1');
    expect(analysis.root.children[0]?.fields.value).toBe('Template');
  });

  it('conforms to the slice-722 portable byte location contract fixture', () => {
    const fixture = readFixture<ByteLocationFixture>(
      ...diagnosticsFixturePath('portable_byte_location_contract')
    );
    const byteRange = {
      startByte: fixture.byte_range.start_byte,
      endByte: fixture.byte_range.end_byte
    };
    const point = {
      row: fixture.source_point.row,
      column: fixture.source_point.column
    };
    const editSpan: ByteEditSpan = {
      startByte: fixture.edit_span.start_byte,
      oldEndByte: fixture.edit_span.old_end_byte,
      newEndByte: fixture.edit_span.new_end_byte,
      startPoint: fixture.edit_span.start_point,
      oldEndPoint: fixture.edit_span.old_end_point,
      newEndPoint: fixture.edit_span.new_end_point
    };
    const overlappingRange = {
      startByte: fixture.comparison_ranges.overlapping.start_byte,
      endByte: fixture.comparison_ranges.overlapping.end_byte
    };
    const disjointRange = {
      startByte: fixture.comparison_ranges.disjoint.start_byte,
      endByte: fixture.comparison_ranges.disjoint.end_byte
    };

    expect(byteRangeLength(byteRange)).toBe(fixture.expected.length);
    expect(sliceByteRange(fixture.source, byteRange)).toBe(fixture.expected.slice);
    expect(byteRangeContainsByte(byteRange, byteRange.startByte)).toBe(
      fixture.expected.contains_start
    );
    expect(byteRangeContainsByte(byteRange, byteRange.endByte)).toBe(fixture.expected.contains_end);
    expect(byteRangeOverlaps(byteRange, overlappingRange)).toBe(fixture.expected.overlaps);
    expect(byteRangeOverlaps(byteRange, disjointRange)).toBe(fixture.expected.disjoint);
    expect(byteOffsetForPoint(fixture.source, point)).toBe(fixture.expected.line_column_offset);
    expect(byteRangeLength(byteEditOldRange(editSpan))).toBe(fixture.expected.old_edit_length);
    expect(byteRangeLength(byteEditNewRange(editSpan))).toBe(fixture.expected.new_edit_length);
    expect(byteEditDelta(editSpan)).toBe(fixture.expected.edit_delta);
    expect(sliceByteRange(fixture.source, byteEditOldRange(editSpan))).toBe(
      fixture.expected.old_edit_slice
    );
  });

  it('conforms to the slice-723 binary core contract fixture', () => {
    const fixture = readFixture<BinaryCoreFixture>(
      ...diagnosticsFixturePath('binary_core_contract')
    );
    const rawPayload: BinaryRawPayload = {
      encoding: fixture.raw_payload.encoding,
      value: fixture.raw_payload.value,
      byteLength: fixture.raw_payload.byte_length,
      regions: fixture.raw_payload.regions.map((region) => ({
        kind: region.kind,
        schemaPath: region.schema_path,
        byteRange: {
          startByte: region.byte_range.start_byte,
          endByte: region.byte_range.end_byte
        },
        expectedHex: region.expected_hex
      }))
    };
    const scalarValues: BinaryScalarValue[] = fixture.scalar_values.map((item) => {
      if (item.kind === 'enum') {
        return { kind: item.kind, symbol: item.symbol, rawValue: item.raw_value };
      }
      return item;
    });
    const renderPolicies: BinaryRenderPolicy[] = fixture.render_policies.map((item) => ({
      schemaPath: item.schema_path,
      byteRange: { startByte: item.byte_range.start_byte, endByte: item.byte_range.end_byte },
      operation: item.operation,
      disposition: item.disposition,
      reason: item.reason
    }));
    const report: BinaryMergeReport = {
      format: fixture.merge_report.format,
      schema: fixture.merge_report.schema,
      matchedSchemaPaths: fixture.merge_report.matched_schema_paths,
      preservedRanges: fixture.merge_report.preserved_ranges.map((range) => ({
        startByte: range.start_byte,
        endByte: range.end_byte
      })),
      rewrittenNodes: fixture.merge_report.rewritten_nodes,
      checksumUpdates: fixture.merge_report.checksum_updates,
      nestedDispatches: fixture.merge_report.nested_dispatches.map(
        (dispatch): BinaryNestedDispatch => ({
          schemaPath: dispatch.schema_path,
          family: dispatch.family,
          status: dispatch.status
        })
      ),
      diagnostics: fixture.merge_report.diagnostics.map(
        (diagnostic): BinaryDiagnostic => ({
          severity: diagnostic.severity,
          category: diagnostic.category,
          message: diagnostic.message,
          schemaPath: diagnostic.schema_path,
          byteRange: diagnostic.byte_range
            ? {
                startByte: diagnostic.byte_range.start_byte,
                endByte: diagnostic.byte_range.end_byte
              }
            : undefined
        })
      )
    };

    const rawBytes = Buffer.from(rawPayload.value, 'hex');
    const checksumRegion = rawPayload.regions[3]!;
    expect(rawPayload.encoding).toBe('hex');
    expect(rawBytes.byteLength).toBe(rawPayload.byteLength);
    expect(rawPayload.regions.map((region) => region.kind)).toEqual([
      'header',
      'length',
      'body',
      'checksum'
    ]);
    expect(rawPayload.regions[0]?.byteRange.endByte).toBe(8);
    expect(
      rawBytes
        .subarray(checksumRegion.byteRange.startByte, checksumRegion.byteRange.endByte)
        .toString('hex')
    ).toBe(checksumRegion.expectedHex);
    expect(scalarValues).toHaveLength(9);
    expect(scalarValues[0]?.kind).toBe('string');
    expect(scalarValues[8]?.kind).toBe('null');
    expect(renderPolicies[0]?.operation).toBe('preserve');
    expect(renderPolicies[1]?.disposition).toBe('requires_renderer');
    expect(renderPolicies[2]?.disposition).toBe('unsafe');
    expect(report.format).toBe('png');
    expect(byteRangeLength(report.preservedRanges[0]!)).toBe(25);
    expect(report.nestedDispatches[0]?.family).toBe('text');
    expect(report.diagnostics[0]?.category).toBe('unsupported_checksum_rewrite');
  });

  it('conforms to the slice-729 ZIP unsafe entries fixture', () => {
    const fixture = readFixture<ZipFamilyFixture>(...diagnosticsFixturePath('zip_family_contract'));
    const unsafeEntries: ZipUnsafeEntry[] = fixture.unsafe_entries.map((entry) => ({
      path: entry.path,
      normalizedPath: entry.normalized_path,
      category: entry.category,
      reason: entry.reason
    }));

    expect(unsafeEntries[0]?.category).toBe('path_traversal');
    expect(unsafeEntries[1]?.normalizedPath).toBe('config/settings.yml');
    expect(unsafeEntries[2]?.category).toBe('encrypted_member');
  });

  it('conforms to the slice-924 tree_haver edit projection support fixture', () => {
    const fixture = readFixture<{
      support: EditProjectionSupportFixture;
      unsupported: EditProjectionSupportFixture;
    }>(
      'diagnostics',
      'slice-924-tree-haver-edit-projection-support',
      'edit-projection-support.json'
    );
    const support = editProjectionSupport(fixture.support);
    const unsupported = editProjectionSupport(fixture.unsupported);

    expect(support.supportsEditProjection).toBe(true);
    expect(support.backendRef.id).toBe('go-dst');
    expect(support.supportedOperations[0]).toBe('replace_node');
    expect(support.correlationKeys[1]).toBe('metadata.go_dst.node_path');
    expect(support.preservesSourceFragments).toBe(true);
    expect(support.unsupportedReason).toBeUndefined();

    expect(unsupported.supportsEditProjection).toBe(false);
    expect(unsupported.backendRef.id).toBe('psych');
    expect(unsupported.unsupportedReason).toBe('backend_does_not_retain_native_tree');
    expect(unsupported.supportedOperations).toHaveLength(0);
    expect(unsupported.diagnostics[0]).toBe(
      'edit projection unavailable: native tree not retained'
    );
  });

  it('conforms to the slice-925 tree_haver path validation fixture', () => {
    const fixture = readFixture<PathValidationFixture>(
      'diagnostics',
      'slice-925-tree-haver-path-validation',
      'path-validation.json'
    );

    for (const testCase of fixture.library_path_cases) {
      const validation = validateLibraryPath(testCase.path);
      expect(validation.path).toBe(testCase.path);
      expect(validation.valid, testCase.name).toBe(testCase.expected_valid);
      expect(validation.errors, testCase.name).toEqual(testCase.expected_errors);
      expect(libraryPathErrors(testCase.path), testCase.name).toEqual(testCase.expected_errors);
    }

    for (const testCase of fixture.language_name_cases) {
      expect(safeLanguageName(testCase.value), testCase.name).toBe(testCase.expected_valid);
      expect(sanitizeLanguageName(testCase.value), testCase.name).toBe(
        testCase.expected_sanitized ?? undefined
      );
    }

    for (const testCase of fixture.symbol_name_cases) {
      expect(safeSymbolName(testCase.value), testCase.name).toBe(testCase.expected_valid);
    }

    for (const testCase of fixture.backend_name_cases) {
      expect(safeBackendName(testCase.value), testCase.name).toBe(testCase.expected_valid);
    }
  });

  it('conforms to the slice-926 tree_haver backend availability fixture', () => {
    const fixture = readFixture<Record<string, BackendAvailabilityReportFixture>>(
      'diagnostics',
      'slice-926-tree-haver-backend-availability',
      'backend-availability.json'
    );

    for (const name of ['available_report', 'unavailable_report', 'unknown_report']) {
      const expected = backendAvailabilityReport(fixture[name]!);
      expect(buildBackendAvailabilityReport(expected.backendRef, expected.checks)).toEqual(
        expected
      );
    }
  });

  it('conforms to the slice-927 tree_haver provider diagnostics fixture', () => {
    const fixture = readFixture<Record<string, ProviderDiagnosticsReportFixture>>(
      'diagnostics',
      'slice-927-tree-haver-provider-diagnostics',
      'provider-diagnostics.json'
    );

    for (const name of ['clean_report', 'warning_report', 'blocked_report']) {
      const expected = providerDiagnosticsReport(fixture[name]!);
      expect(
        buildProviderDiagnosticsReport(
          expected.providerId,
          expected.backendRef,
          expected.language,
          expected.diagnostics
        )
      ).toEqual(expected);
    }
  });

  it('supports temporary backend context selection', () => {
    expect(currentBackendId()).toBeUndefined();

    withBackend('peggy', () => {
      expect(currentBackendId()).toBe('peggy');
      withBackend('kreuzberg-language-pack', () => {
        expect(currentBackendId()).toBe('kreuzberg-language-pack');
      });
      expect(currentBackendId()).toBe('peggy');
    });

    expect(currentBackendId()).toBeUndefined();
  });

  it('supports runtime backend registration', () => {
    registerBackend({ id: 'custom-markdown', family: 'native' });

    expect(registeredBackends()).toContainEqual({ id: 'custom-markdown', family: 'native' });
    expect(withBackend('custom-markdown', () => currentBackendId())).toBe('custom-markdown');
    expect(currentBackendId()).toBeUndefined();
  });
});
