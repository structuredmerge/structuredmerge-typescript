import type { PolicyReference } from '@structuredmerge/ast-merge';
import type {
  BinaryDiagnostic,
  BinaryMergeReport,
  BinaryRenderPolicy,
  ByteRange
} from '@structuredmerge/tree-haver';

export const packageName = '@structuredmerge/binary-merge';

export interface BinaryFeatureProfile {
  readonly family: 'binary';
  readonly supportedDialects: readonly string[];
  readonly supportedPolicies: readonly PolicyReference[];
}

export function binaryFeatureProfile(): BinaryFeatureProfile {
  return {
    family: 'binary',
    supportedDialects: [],
    supportedPolicies: []
  };
}

export function renderPolicy(
  schemaPath: string,
  byteRange: ByteRange,
  operation: string,
  disposition: string,
  reason: string
): BinaryRenderPolicy {
  return {
    schemaPath,
    byteRange,
    operation,
    disposition,
    reason
  };
}

export function unsafeDiagnostic(
  schemaPath: string,
  byteRange: ByteRange,
  message: string
): BinaryDiagnostic {
  return {
    severity: 'error',
    category: 'unsafe_binary_mutation',
    message,
    schemaPath,
    byteRange
  };
}

export function preservationReport(
  format: string,
  schema: string,
  matchedSchemaPaths: readonly string[],
  preservedRanges: readonly ByteRange[]
): BinaryMergeReport {
  return {
    format,
    schema,
    matchedSchemaPaths,
    preservedRanges,
    rewrittenNodes: [],
    checksumUpdates: [],
    nestedDispatches: [],
    diagnostics: []
  };
}
