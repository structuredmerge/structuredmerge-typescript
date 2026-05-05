import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type {
  AdapterInfo,
  BackendReference,
  BinaryDiagnostic,
  BinaryMergeReport,
  BinaryNestedDispatch,
  BinaryRenderPolicy,
  BinaryScalarValue,
  FeatureProfile,
  ParserRequest
} from '../src/index';
import {
  conformanceFixturePath,
  type ConformanceManifest,
  type PolicyReference
} from '@structuredmerge/ast-merge';
import { processWithLanguagePack } from '../src/index';
import {
  byteOffsetForPoint,
  byteRangeContainsByte,
  byteRangeLength,
  byteRangeOverlaps,
  currentBackendId,
  kaitaiAdapterInfo,
  kaitaiFeatureProfile,
  KAITAI_STRUCT_BACKEND,
  type KaitaiTreeAnalysis,
  type KaitaiTreeNode,
  PEGGY_BACKEND,
  peggyAdapterInfo,
  peggyFeatureProfile,
  registerBackend,
  registeredBackends,
  sliceByteRange,
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
}

interface ByteLocationFixture {
  source: string;
  byte_range: { start_byte: number; end_byte: number };
  source_point: { row: number; column: number };
  expected: {
    length: number;
    slice: string;
    contains_start: boolean;
    contains_end: boolean;
    overlaps: boolean;
    disjoint: boolean;
    line_column_offset: number;
  };
  comparison_ranges: {
    overlapping: { start_byte: number; end_byte: number };
    disjoint: { start_byte: number; end_byte: number };
  };
}

interface BinaryCoreFixture {
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
  const entry = conformanceFixturePath(manifest, 'diagnostics', role);

  if (!entry) {
    throw new Error(`missing diagnostics fixture entry for ${role}`);
  }

  return [...entry];
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
      schema: 'png.ksy',
      root: toNode(fixture.tree_node),
      backendRef: KAITAI_STRUCT_BACKEND
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
  });

  it('conforms to the slice-723 binary core contract fixture', () => {
    const fixture = readFixture<BinaryCoreFixture>(
      ...diagnosticsFixturePath('binary_core_contract')
    );
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
