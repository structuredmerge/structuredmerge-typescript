import type {
  BinaryDiagnostic,
  BinaryMergeReport,
  BinaryNestedDispatch,
  ByteRange,
  ZipArchiveEntry,
  ZipFamilyReport,
  ZipMemberDecision,
  ZipUnsafeEntry
} from '@structuredmerge/tree-haver';

const LOCAL = 0x04034b50;
const CENTRAL = 0x02014b50;
const EOCD = 0x06054b50;
const DOS_EPOCH = Buffer.from([0, 0, 0x21, 0]);

export class RenderError extends Error {
  constructor(readonly diagnostic: BinaryDiagnostic) {
    super(diagnostic.message);
  }
}

interface CentralInfo {
  range: ByteRange;
  flags: number;
  method: number;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  extraLength: number;
  commentLength: number;
  localOffset: number;
}

interface CentralScan {
  range: ByteRange;
  records: Map<string, CentralInfo>;
  archiveComment: boolean;
}

type MutableReport = ZipFamilyReport & {
  memberDecisions: ZipMemberDecision[];
  mergeReport: BinaryMergeReport & {
    matchedSchemaPaths: string[];
    preservedRanges: ByteRange[];
    rewrittenNodes: string[];
    checksumUpdates: string[];
    nestedDispatches: BinaryNestedDispatch[];
    diagnostics: BinaryDiagnostic[];
  };
};

export function parseZipInventory(source: Buffer): ZipFamilyReport {
  const central = scanCentralDirectory(source);
  const entries = [...central.records.entries()]
    .map(([name, record]) => {
      const dataStart = localDataStart(source, record.localOffset);
      return {
        path: name,
        normalizedPath: normalizeZipPath(name),
        directory: name.endsWith('/'),
        compression: compressionName(record.method),
        compressedSize: record.compressedSize,
        uncompressedSize: record.uncompressedSize,
        crc32: record.crc32.toString(16).padStart(8, '0'),
        localHeaderRange: { startByte: record.localOffset, endByte: dataStart },
        dataRange: { startByte: dataStart, endByte: dataStart + record.compressedSize },
        centralDirectoryRange: record.range
      } satisfies ZipArchiveEntry;
    })
    .sort((left, right) => left.localHeaderRange.startByte - right.localHeaderRange.startByte);

  return {
    archive: {
      format: 'zip',
      schema: 'zip.ksy',
      entryCount: entries.length,
      centralDirectoryRange: central.range
    },
    entries,
    memberDecisions: [],
    unsafeEntries: unsafeEntries(entries, central.records),
    mergeReport: emptyMutableReport()
  };
}

export function planZipMerge(
  ancestor: ZipFamilyReport,
  current: ZipFamilyReport,
  incoming: ZipFamilyReport
): ZipFamilyReport {
  const ancestorEntries = entriesByPath(ancestor.entries);
  const currentEntries = entriesByPath(current.entries);
  const incomingEntries = entriesByPath(incoming.entries);
  const unsafeByPath = new Map((incoming.unsafeEntries ?? []).map((entry) => [entry.normalizedPath, entry]));
  const paths = [...new Set([...ancestorEntries.keys(), ...currentEntries.keys(), ...incomingEntries.keys()])].sort();
  const report: MutableReport = {
    archive: incoming.archive,
    entries: incoming.entries,
    memberDecisions: [],
    unsafeEntries: incoming.unsafeEntries ?? [],
    mergeReport: emptyMutableReport()
  };

  for (const path of paths) {
    const ancestorEntry = ancestorEntries.get(path);
    const currentEntry = currentEntries.get(path);
    const incomingEntry = incomingEntries.get(path);
    const unsafe = unsafeByPath.get(path);
    if (unsafe) {
      report.memberDecisions.push({ normalizedPath: path, operation: 'reject', disposition: 'unsafe', reason: unsafe.reason });
      report.mergeReport.diagnostics.push(diagnostic(unsafe.category, schemaPath(path), unsafe.reason));
    } else if (!currentEntry && incomingEntry) {
      decision(report, path, 'add', 'requires_renderer', 'member exists only in incoming archive');
    } else if (currentEntry && !incomingEntry) {
      decision(report, path, 'delete', 'requires_renderer', 'member was removed from incoming archive');
    } else if (ancestorEntry && currentEntry && incomingEntry && sameEntry(currentEntry, ancestorEntry) && sameEntry(incomingEntry, ancestorEntry)) {
      report.memberDecisions.push({ normalizedPath: path, operation: 'preserve', disposition: 'safe', reason: 'member is unchanged from ancestor' });
      report.mergeReport.preservedRanges.push(currentEntry.localHeaderRange, currentEntry.dataRange);
    } else {
      const family = nestedFamily(path);
      if (family) {
        report.memberDecisions.push({ normalizedPath: path, operation: 'delegate', disposition: 'requires_renderer', nestedFamily: family, reason: 'structured member can be merged by a nested family before ZIP rendering' });
        report.mergeReport.nestedDispatches.push({ schemaPath: `${schemaPath(path)}/data`, family, status: 'planned' } satisfies BinaryNestedDispatch);
        report.mergeReport.rewrittenNodes.push(schemaPath(path));
        report.mergeReport.checksumUpdates.push(`${schemaPath(path)}/crc32`);
      } else {
        decision(report, path, 'rewrite', 'requires_renderer', 'member bytes or metadata changed');
        report.mergeReport.checksumUpdates.push(`${schemaPath(path)}/crc32`);
      }
    }
    report.mergeReport.matchedSchemaPaths.push(schemaPath(path));
  }
  if (report.mergeReport.rewrittenNodes.length > 0 || report.mergeReport.checksumUpdates.length > 0) {
    report.mergeReport.rewrittenNodes.push('/central_directory');
    report.mergeReport.checksumUpdates.push('/central_directory/size', '/central_directory/offset');
  }
  return report;
}

export function renderWithRawPreservation(
  source: Buffer,
  plan: ZipFamilyReport,
  memberBytes: ReadonlyMap<string, Buffer>
): { bytes: Buffer; inventory: ZipFamilyReport; report: BinaryMergeReport } {
  const sourceInventory = parseZipInventory(source);
  const central = scanCentralDirectory(source);
  const sourceEntries = entriesByPath(sourceInventory.entries);
  const ranges = rawLocalRecordRanges(sourceEntries);
  const plannedEntries = entriesByPath(plan.entries);
  const chunks: Buffer[] = [];
  const records: CentralRecord[] = [];
  let offset = 0;

  for (const member of plan.memberDecisions) {
    if (member.operation === 'reject') {
      throw renderError('rejected_member', schemaPath(member.normalizedPath), member.reason);
    }
    if (member.operation === 'delete') continue;
    if (member.operation === 'preserve') {
      const entry = sourceEntries.get(member.normalizedPath)!;
      validateRawPreserveEntry(central, entry);
      const range = ranges.get(member.normalizedPath)!;
      const local = source.subarray(range.startByte, range.endByte);
      chunks.push(local);
      records.push(recordFromEntry(entry, offset));
      offset += local.length;
    } else {
      const entry = plannedEntries.get(member.normalizedPath)!;
      const content = memberBytes.get(member.normalizedPath);
      if (!content) throw renderError('missing_member_bytes', schemaPath(member.normalizedPath), 'missing rendered ZIP member bytes');
      const local = renderedLocalRecord(entry, content, offset);
      chunks.push(local.bytes);
      records.push(local.record);
      offset += local.bytes.length;
    }
  }
  const centralStart = offset;
  for (const record of records) {
    const centralRecord = centralDirectoryRecord(record);
    chunks.push(centralRecord);
    offset += centralRecord.length;
  }
  chunks.push(eocdRecord(records.length, offset - centralStart, centralStart));
  const bytes = Buffer.concat(chunks);
  const report = { ...plan.mergeReport, preservedRanges: plan.memberDecisions.flatMap((member) => (member.operation === 'preserve' ? [ranges.get(member.normalizedPath)!] : [])) };
  return { bytes, inventory: parseZipInventory(bytes), report };
}

export function newStoredZip(entries: Record<string, string>): Buffer {
  const chunks: Buffer[] = [];
  const records: CentralRecord[] = [];
  let offset = 0;
  for (const name of Object.keys(entries).sort()) {
    const content = Buffer.from(entries[name]!, 'utf8');
    const entry = minimalEntry(name, content);
    const local = renderedLocalRecord(entry, content, offset);
    chunks.push(local.bytes);
    records.push(local.record);
    offset += local.bytes.length;
  }
  const centralStart = offset;
  for (const record of records) {
    const centralRecord = centralDirectoryRecord(record);
    chunks.push(centralRecord);
    offset += centralRecord.length;
  }
  chunks.push(eocdRecord(records.length, offset - centralStart, centralStart));
  return Buffer.concat(chunks);
}

interface CentralRecord {
  name: string;
  method: number;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  offset: number;
  flags: number;
}

function scanCentralDirectory(source: Buffer): CentralScan {
  let eocd = source.length - 22;
  while (eocd >= 0 && source.readUInt32LE(eocd) !== EOCD) eocd -= 1;
  if (eocd < 0) throw new Error('missing ZIP end of central directory');
  const size = source.readUInt32LE(eocd + 12);
  const offset = source.readUInt32LE(eocd + 16);
  const commentLength = source.readUInt16LE(eocd + 20);
  const records = new Map<string, CentralInfo>();
  let cursor = offset;
  while (cursor < offset + size) {
    if (source.readUInt32LE(cursor) !== CENTRAL) throw new Error('unexpected central directory record');
    const nameLength = source.readUInt16LE(cursor + 28);
    const extraLength = source.readUInt16LE(cursor + 30);
    const commentLength = source.readUInt16LE(cursor + 32);
    const name = source.subarray(cursor + 46, cursor + 46 + nameLength).toString();
    const endByte = cursor + 46 + nameLength + extraLength + commentLength;
    records.set(name, {
      range: { startByte: cursor, endByte },
      flags: source.readUInt16LE(cursor + 8),
      method: source.readUInt16LE(cursor + 10),
      crc32: source.readUInt32LE(cursor + 16),
      compressedSize: source.readUInt32LE(cursor + 20),
      uncompressedSize: source.readUInt32LE(cursor + 24),
      extraLength,
      commentLength,
      localOffset: source.readUInt32LE(cursor + 42)
    });
    cursor = endByte;
  }
  return { range: { startByte: offset, endByte: offset + size }, records, archiveComment: commentLength > 0 };
}

function localDataStart(source: Buffer, offset: number): number {
  if (source.readUInt32LE(offset) !== LOCAL) throw new Error('unexpected ZIP local header');
  return offset + 30 + source.readUInt16LE(offset + 26) + source.readUInt16LE(offset + 28);
}

function validateRawPreserveEntry(central: CentralScan, entry: ZipArchiveEntry): void {
  if (central.archiveComment) throw renderError('archive_comment', '/archive/comment', 'raw-preserving ZIP renderer does not yet preserve archive comments');
  const record = central.records.get(entry.path)!;
  if ((record.flags & 0x1) !== 0) throw renderError('encrypted_member', schemaPath(entry.normalizedPath), 'raw-preserving ZIP renderer rejects encrypted member');
  if (![0, 8].includes(record.method)) throw renderError('unsupported_compression', schemaPath(entry.normalizedPath), 'raw-preserving ZIP renderer rejects unsupported compression');
  if (record.extraLength !== 0) throw renderError('central_directory_extra_field', schemaPath(entry.normalizedPath), 'raw-preserving ZIP renderer does not yet preserve central-directory extra fields');
  if (record.commentLength !== 0) throw renderError('member_comment', schemaPath(entry.normalizedPath), 'raw-preserving ZIP renderer does not yet preserve member comments');
}

function renderedLocalRecord(entry: ZipArchiveEntry, content: Buffer, offset: number): { bytes: Buffer; record: CentralRecord } {
  const crc = crc32(content);
  const name = Buffer.from(entry.path);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(LOCAL, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(0, 8);
  DOS_EPOCH.copy(header, 10);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(content.length, 18);
  header.writeUInt32LE(content.length, 22);
  header.writeUInt16LE(name.length, 26);
  header.writeUInt16LE(0, 28);
  return {
    bytes: Buffer.concat([header, name, content]),
    record: { name: entry.path, method: 0, crc32: crc, compressedSize: content.length, uncompressedSize: content.length, offset, flags: 0 }
  };
}

function centralDirectoryRecord(record: CentralRecord): Buffer {
  const name = Buffer.from(record.name);
  const header = Buffer.alloc(46);
  header.writeUInt32LE(CENTRAL, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(record.flags, 8);
  header.writeUInt16LE(record.method, 10);
  DOS_EPOCH.copy(header, 12);
  header.writeUInt32LE(record.crc32, 16);
  header.writeUInt32LE(record.compressedSize, 20);
  header.writeUInt32LE(record.uncompressedSize, 24);
  header.writeUInt16LE(name.length, 28);
  header.writeUInt32LE(record.offset, 42);
  return Buffer.concat([header, name]);
}

function eocdRecord(entries: number, size: number, offset: number): Buffer {
  const buffer = Buffer.alloc(22);
  buffer.writeUInt32LE(EOCD, 0);
  buffer.writeUInt16LE(entries, 8);
  buffer.writeUInt16LE(entries, 10);
  buffer.writeUInt32LE(size, 12);
  buffer.writeUInt32LE(offset, 16);
  return buffer;
}

function rawLocalRecordRanges(entries: Map<string, ZipArchiveEntry>): Map<string, ByteRange> {
  const ordered = [...entries.values()].sort((left, right) => left.localHeaderRange.startByte - right.localHeaderRange.startByte);
  return new Map(ordered.map((entry, index) => [entry.normalizedPath, { startByte: entry.localHeaderRange.startByte, endByte: ordered[index + 1]?.localHeaderRange.startByte ?? entry.centralDirectoryRange.startByte }]));
}

function unsafeEntries(entries: readonly ZipArchiveEntry[], records: Map<string, CentralInfo>): ZipUnsafeEntry[] {
  const seen = new Map<string, string>();
  const result: ZipUnsafeEntry[] = [];
  for (const entry of entries) {
    if (escapesRoot(entry.path)) result.push(unsafeEntry(entry, 'path_traversal', 'entry escapes the archive root'));
    if (seen.has(entry.normalizedPath) && seen.get(entry.normalizedPath) !== entry.path) result.push(unsafeEntry(entry, 'duplicate_normalized_path', 'normalized path collides with an existing entry'));
    seen.set(entry.normalizedPath, entry.path);
    if ((records.get(entry.path)!.flags & 0x1) !== 0) result.push(unsafeEntry(entry, 'encrypted_member', 'encrypted member cannot be rendered by the default provider'));
    if (signingSensitive(entry.normalizedPath)) result.push(unsafeEntry(entry, 'signing_sensitive_member', 'signature-bearing member mutation is not enabled'));
  }
  return result;
}

function emptyReport(): BinaryMergeReport {
  return { format: 'zip', schema: 'zip.ksy', matchedSchemaPaths: [], preservedRanges: [], rewrittenNodes: [], checksumUpdates: [], nestedDispatches: [], diagnostics: [] };
}

function emptyMutableReport(): MutableReport['mergeReport'] {
  return { format: 'zip', schema: 'zip.ksy', matchedSchemaPaths: [], preservedRanges: [], rewrittenNodes: [], checksumUpdates: [], nestedDispatches: [], diagnostics: [] };
}

function decision(report: MutableReport, path: string, operation: string, disposition: string, reason: string): void {
  report.memberDecisions.push({ normalizedPath: path, operation, disposition, reason });
  report.mergeReport.rewrittenNodes.push(schemaPath(path));
}

function entriesByPath(entries: readonly ZipArchiveEntry[]): Map<string, ZipArchiveEntry> {
  return new Map(entries.map((entry) => [entry.normalizedPath, entry]));
}

function sameEntry(left: ZipArchiveEntry, right: ZipArchiveEntry): boolean {
  return left.path === right.path && left.compression === right.compression && left.compressedSize === right.compressedSize && left.uncompressedSize === right.uncompressedSize && left.crc32 === right.crc32;
}

function normalizeZipPath(zipPath: string): string {
  const stack: string[] = [];
  for (const part of zipPath.replaceAll('\\', '/').split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return stack.join('/');
}

function escapesRoot(zipPath: string): boolean {
  if (zipPath.startsWith('/')) return true;
  let depth = 0;
  for (const part of zipPath.replaceAll('\\', '/').split('/')) {
    if (part === '..') depth -= 1;
    else if (part !== '' && part !== '.') depth += 1;
    if (depth < 0) return true;
  }
  return false;
}

function signingSensitive(zipPath: string): boolean {
  const upper = zipPath.toUpperCase();
  return upper.startsWith('META-INF/') && ['.RSA', '.DSA', '.EC', '.SF'].some((suffix) => upper.endsWith(suffix));
}

function nestedFamily(zipPath: string): string | undefined {
  const lower = zipPath.toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'markdown';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.yml') || lower.endsWith('.yaml')) return 'yaml';
  if (lower.endsWith('.xml')) return 'xml';
  return undefined;
}

function compressionName(method: number): string {
  if (method === 0) return 'stored';
  if (method === 8) return 'deflate';
  return `method-${method}`;
}

function recordFromEntry(entry: ZipArchiveEntry, offset: number): CentralRecord {
  return { name: entry.path, method: entry.compression === 'deflate' ? 8 : 0, crc32: Number.parseInt(entry.crc32, 16), compressedSize: entry.compressedSize, uncompressedSize: entry.uncompressedSize, offset, flags: 0 };
}

function minimalEntry(name: string, content: Buffer): ZipArchiveEntry {
  return { path: name, normalizedPath: normalizeZipPath(name), directory: name.endsWith('/'), compression: 'stored', compressedSize: content.length, uncompressedSize: content.length, crc32: crc32(content).toString(16).padStart(8, '0'), localHeaderRange: { startByte: 0, endByte: 0 }, dataRange: { startByte: 0, endByte: 0 }, centralDirectoryRange: { startByte: 0, endByte: 0 } };
}

function unsafeEntry(entry: ZipArchiveEntry, category: string, reason: string): ZipUnsafeEntry {
  return { path: entry.path, normalizedPath: entry.normalizedPath, category, reason };
}

function diagnostic(category: string, schemaPathValue: string, message: string): BinaryDiagnostic {
  return { severity: 'error', category, message, schemaPath: schemaPathValue };
}

function renderError(category: string, schemaPathValue: string, message: string): RenderError {
  return new RenderError(diagnostic(category, schemaPathValue, message));
}

function schemaPath(zipPath: string): string {
  return `/entries/by_path/${zipPath}`;
}

function crc32(source: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of source) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc & 1) !== 0 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
