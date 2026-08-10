import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const PORTABLE_BENCHMARK_SCHEMA_MAJOR = 1;

export type PortableBenchmarkValidationCategory =
  | 'invalid_json'
  | 'invalid_structure'
  | 'invalid_schema'
  | 'invalid_enum'
  | 'invalid_reference'
  | 'invalid_digest'
  | 'invalid_eligibility'
  | 'invalid_safety'
  | 'prohibited_llm_gate'
  | 'prohibited_scalar_score';

export class PortableBenchmarkValidationError extends Error {
  readonly category: PortableBenchmarkValidationCategory;

  constructor(category: PortableBenchmarkValidationCategory, message: string) {
    super(`portable benchmark contract ${category}: ${message}`);
    this.name = 'PortableBenchmarkValidationError';
    this.category = category;
  }
}

type JsonObject = Record<string, unknown>;

export interface PortableBenchmarkContractDocument extends JsonObject {
  schema_version: string;
  contract: PortableBenchmarkEnumContract;
  cases: PortableBenchmarkCase[];
  run_manifest: PortableBenchmarkRunManifest;
  case_results: PortableBenchmarkCaseResult[];
  aggregate_report: PortableBenchmarkAggregateReport;
}

export interface PortableBenchmarkEnumContract extends JsonObject {
  operations: string[];
  partitions: string[];
  outcomes: string[];
}

export interface PortableBenchmarkCase extends JsonObject {
  schema_version: string;
  kind: string;
  id: string;
  operation: string;
  partition: string;
  capabilities: string[];
  oracle: { class: string; score_eligible: boolean };
}

export interface PortableBenchmarkRunManifest extends JsonObject {
  schema_version: string;
  kind: string;
  id: string;
  profile: string;
  unsupported_policy: string;
  candidate_adapter: PortableBenchmarkAdapter;
  base_adapter?: PortableBenchmarkAdapter;
  selection: {
    selected_case_ids: string[];
    excluded_case_ids: string[];
    explanation: Record<string, unknown>;
  };
}

export interface PortableBenchmarkAdapter extends JsonObject {
  id: string;
}

export interface PortableBenchmarkCaseResult extends JsonObject {
  schema_version: string;
  id: string;
  run_id: string;
  case_id: string;
  adapter_id: string;
  outcome: string;
  score_eligible: boolean;
}

export interface PortableBenchmarkAggregateReport extends JsonObject {
  schema_version: string;
  kind: string;
  run_id: string;
  raw_result_ids: string[];
}

export interface PortableBenchmarkSummaryCounts {
  adapters: number;
  cases: number;
  results: number;
  selected_cases: number;
  score_eligible_results: number;
  quality_denominator_excluded_results: number;
  eligible_false_auto_merges: number;
}

export interface PortableBenchmarkFalseAutoMergeSummary {
  id: string;
  severity: string;
}

export interface PortableBenchmarkSafetyGateSummary {
  status: 'pass' | 'fail';
  eligible_false_auto_merge_count: number;
  non_compensable: true;
}

export interface PortableBenchmarkCanonicalSummary {
  schema: string;
  counts: PortableBenchmarkSummaryCounts;
  case_ids_by_operation: Record<string, string[]>;
  case_ids_by_partition: Record<string, string[]>;
  score_eligible_result_ids: string[];
  quality_denominator_excluded_result_ids: string[];
  false_auto_merges: PortableBenchmarkFalseAutoMergeSummary[];
  safety_gate: PortableBenchmarkSafetyGateSummary;
  selection_reason_categories: string[];
  contract_digest: string;
}

const ENUM_KEYS = [
  'kinds',
  'operations',
  'partitions',
  'profiles',
  'outcomes',
  'oracle_classes',
  'equivalence_classes',
  'transformations',
  'false_auto_merge_severities',
  'preservation_requirements',
  'unsupported_policies',
  'budget_exceed_actions',
  'llm_hard_gate_forbidden_profiles',
  'quality_dimensions'
] as const;
const QUALITY_EXCLUDED_OUTCOMES = new Set(['unsupported', 'excluded_ambiguous']);
const HISTORY_FIELDS = ['slice', 'corpus_id', 'manifest', 'case_id', 'merge_commit'];
const HISTORY_MANIFEST = 'diagnostics/slice-1021-reviewed-git-history-corpus/manifest.json';
const SCHEMA_PATTERN = /^structuredmerge\.benchmark(?:\.[a-z_]+)?\/v(\d+)(?:\.\d+)?$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function failure(
  category: PortableBenchmarkValidationCategory,
  message: string
): PortableBenchmarkValidationError {
  return new PortableBenchmarkValidationError(category, message);
}

function object(value: unknown, label: string): JsonObject {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw failure('invalid_structure', `${label} must be an object`);
  }
  return value as JsonObject;
}

function fieldObject(parent: JsonObject, key: string, label: string): JsonObject {
  return object(parent[key], `${label}.${key}`);
}

function array(parent: JsonObject, key: string, label: string): unknown[] {
  const value = parent[key];
  if (!Array.isArray(value)) {
    throw failure('invalid_structure', `${label}.${key} must be an array`);
  }
  return value;
}

function strings(parent: JsonObject, key: string, label: string): string[] {
  const values = array(parent, key, label);
  if (!values.every((value): value is string => typeof value === 'string')) {
    throw failure('invalid_structure', `${label}.${key} must contain only strings`);
  }
  return values;
}

function records(parent: JsonObject, key: string, label: string): JsonObject[] {
  return array(parent, key, label).map((value, index) =>
    object(value, `${label}.${key}[${index}]`)
  );
}

function requiredFields(record: JsonObject, fields: readonly unknown[], label: string): void {
  for (const rawField of fields) {
    if (typeof rawField !== 'string') {
      throw failure('invalid_structure', `${label} required field names must be strings`);
    }
    const value = rawField
      .split('.')
      .reduce<unknown>(
        (current, part) =>
          current !== null && typeof current === 'object' && !Array.isArray(current)
            ? (current as JsonObject)[part]
            : undefined,
        record
      );
    if (value === undefined || value === null) {
      throw failure('invalid_structure', `${label} is missing required field ${rawField}`);
    }
  }
}

function uniqueIds(recordsToCheck: JsonObject[], label: string): string[] {
  const ids = recordsToCheck.map((record) => record.id);
  if (!ids.every((id): id is string => typeof id === 'string' && id.length > 0)) {
    throw failure('invalid_reference', `${label} IDs must be non-empty strings`);
  }
  if (new Set(ids).size !== ids.length) {
    throw failure('invalid_reference', `duplicate ${label} ID`);
  }
  return ids;
}

function reference(
  value: unknown,
  allowed: ReadonlySet<string>,
  label: string
): asserts value is string {
  if (typeof value !== 'string' || !allowed.has(value)) {
    throw failure('invalid_reference', `${label} is dangling: ${JSON.stringify(value)}`);
  }
}

function boolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== 'boolean') {
    throw failure('invalid_structure', `${label} must be boolean`);
  }
}

function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

function validateDigest(digest: unknown, content: string, label: string): void {
  if (typeof digest !== 'string' || !SHA256_PATTERN.test(digest)) {
    throw failure('invalid_digest', `${label} SHA-256 is malformed`);
  }
  if (digest !== sha256(Buffer.from(content, 'utf8'))) {
    throw failure('invalid_digest', `${label} SHA-256 does not match exact bytes`);
  }
}

function walkObjects(value: unknown, visit: (record: JsonObject) => void): void {
  if (Array.isArray(value)) {
    value.forEach((child) => walkObjects(child, visit));
  } else if (value !== null && typeof value === 'object') {
    const record = value as JsonObject;
    visit(record);
    Object.values(record).forEach((child) => walkObjects(child, visit));
  }
}

export class PortableBenchmarkContractConsumer {
  readonly document: PortableBenchmarkContractDocument;
  readonly contractDigest: string;

  static parse(source: string | Buffer): PortableBenchmarkContractConsumer {
    const bytes = Buffer.isBuffer(source) ? source : Buffer.from(source, 'utf8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(bytes.toString('utf8'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw failure('invalid_json', `invalid benchmark contract JSON: ${message}`);
    }
    return new PortableBenchmarkContractConsumer(parsed, sha256(bytes)).validate();
  }

  static loadFile(path: string): PortableBenchmarkContractConsumer {
    return PortableBenchmarkContractConsumer.parse(readFileSync(path));
  }

  constructor(document: unknown, contractDigest?: string) {
    this.document = object(document, 'contract') as PortableBenchmarkContractDocument;
    this.contractDigest = contractDigest ?? sha256(JSON.stringify(document));
  }

  validate(): this {
    this.validateSchemaVersions();
    this.validateEnums();
    this.validateCases();
    this.validateRun();
    this.validateResults();
    this.validateReport();
    return this;
  }

  canonicalSummary(): PortableBenchmarkCanonicalSummary {
    this.validate();
    const cases = this.caseRecords();
    const results = this.resultRecords();
    const excluded = results.filter((result) =>
      QUALITY_EXCLUDED_OUTCOMES.has(String(result.outcome))
    );
    const falseAutoMerges = results
      .filter((result) => result.outcome === 'false_auto_merge' && result.score_eligible === true)
      .map((result) => ({
        id: String(result.id),
        severity: String(
          fieldObject(
            fieldObject(result, 'dimensions', `result ${String(result.id)}`),
            'safety',
            `result ${String(result.id)}`
          ).severity
        )
      }))
      .sort((left, right) => left.id.localeCompare(right.id));
    const run = this.run();

    return {
      schema: String(this.document.schema_version),
      counts: {
        adapters: this.adapters().length,
        cases: cases.length,
        results: results.length,
        selected_cases: strings(
          fieldObject(run, 'selection', 'run manifest'),
          'selected_case_ids',
          'run selection'
        ).length,
        score_eligible_results: results.filter((result) => result.score_eligible === true).length,
        quality_denominator_excluded_results: excluded.length,
        eligible_false_auto_merges: falseAutoMerges.length
      },
      case_ids_by_operation: this.groupedCaseIds(cases, 'operations', 'operation'),
      case_ids_by_partition: this.groupedCaseIds(cases, 'partitions', 'partition'),
      score_eligible_result_ids: results
        .filter((result) => result.score_eligible === true)
        .map((result) => String(result.id))
        .sort(),
      quality_denominator_excluded_result_ids: excluded.map((result) => String(result.id)).sort(),
      false_auto_merges: falseAutoMerges,
      safety_gate: {
        status: falseAutoMerges.length === 0 ? 'pass' : 'fail',
        eligible_false_auto_merge_count: falseAutoMerges.length,
        non_compensable: true
      },
      selection_reason_categories: Object.keys(
        fieldObject(fieldObject(run, 'selection', 'run manifest'), 'explanation', 'run selection')
      ).sort(),
      contract_digest: this.contractDigest
    };
  }

  summary(): PortableBenchmarkCanonicalSummary {
    return this.canonicalSummary();
  }

  private enumContract(): JsonObject {
    return fieldObject(this.document, 'contract', 'contract');
  }

  private enumValues(key: string): string[] {
    return strings(this.enumContract(), key, 'contract enums');
  }

  private membership(value: unknown, enumKey: string, label: string): string {
    if (typeof value !== 'string' || !this.enumValues(enumKey).includes(value)) {
      throw failure(
        'invalid_enum',
        `${label} is not a declared ${enumKey} member: ${JSON.stringify(value)}`
      );
    }
    return value;
  }

  private caseRecords(): JsonObject[] {
    return records(this.document, 'cases', 'contract');
  }

  private resultRecords(): JsonObject[] {
    return records(this.document, 'case_results', 'contract');
  }

  private run(): JsonObject {
    return fieldObject(this.document, 'run_manifest', 'contract');
  }

  private report(): JsonObject {
    return fieldObject(this.document, 'aggregate_report', 'contract');
  }

  private adapters(): JsonObject[] {
    const run = this.run();
    return [run.candidate_adapter, run.base_adapter]
      .filter((value) => value !== undefined && value !== null)
      .map((value, index) => object(value, `adapter ${index}`));
  }

  private validateSchemaVersions(): void {
    const values = [
      this.document.schema_version,
      ...this.caseRecords().map((entry) => entry.schema_version),
      this.run().schema_version,
      this.report().schema_version
    ];
    values.forEach((value, index) => {
      const match = typeof value === 'string' ? SCHEMA_PATTERN.exec(value) : null;
      if (match === null) {
        throw failure(
          'invalid_schema',
          `schema version ${index} is invalid: ${JSON.stringify(value)}`
        );
      }
      if (Number(match[1]) !== PORTABLE_BENCHMARK_SCHEMA_MAJOR) {
        throw failure('invalid_schema', `unsupported benchmark schema major v${match[1]}`);
      }
    });
  }

  private validateEnums(): void {
    const contract = this.enumContract();
    for (const key of ENUM_KEYS) {
      const values = strings(contract, key, 'contract enums');
      if (new Set(values).size !== values.length) {
        throw failure('invalid_enum', `${key} contains duplicate values`);
      }
      if (values.some((value) => value.length === 0)) {
        throw failure('invalid_enum', `${key} must contain only non-empty strings`);
      }
    }
    if (contract.scalar_score_allowed !== false) {
      throw failure('prohibited_scalar_score', 'scalar scores must be prohibited');
    }
    if (contract.false_auto_merge_compensable !== false) {
      throw failure('invalid_safety', 'false auto-merges must be non-compensable');
    }
  }

  private validateCases(): void {
    const cases = this.caseRecords();
    const caseIds = new Set(uniqueIds(cases, 'case'));
    const schema = fieldObject(this.document, 'case_schema', 'contract');
    const required = array(schema, 'required', 'case schema');
    const operationFields = fieldObject(schema, 'operation_required_fields', 'case schema');
    const inputPolicy = fieldObject(schema, 'input_policy', 'case schema');
    const inlineLimit = inputPolicy.inline_max_bytes;
    if (typeof inlineLimit !== 'number') {
      throw failure('invalid_structure', 'case schema inline_max_bytes must be a number');
    }

    for (const benchmarkCase of cases) {
      const id = String(benchmarkCase.id);
      requiredFields(benchmarkCase, required, `case ${id}`);
      this.membership(benchmarkCase.kind, 'kinds', `case ${id} kind`);
      if (benchmarkCase.kind !== 'benchmark_case') {
        throw failure('invalid_structure', `case ${id} kind must be benchmark_case`);
      }
      const operation = this.membership(
        benchmarkCase.operation,
        'operations',
        `case ${id} operation`
      );
      this.membership(benchmarkCase.partition, 'partitions', `case ${id} partition`);
      const oracle = fieldObject(benchmarkCase, 'oracle', `case ${id}`);
      this.membership(oracle.class, 'oracle_classes', `case ${id} oracle`);
      boolean(oracle.score_eligible, `case ${id} oracle score eligibility`);
      this.membership(
        benchmarkCase.false_auto_merge_severity,
        'false_auto_merge_severities',
        `case ${id} severity`
      );

      const capabilities = strings(benchmarkCase, 'capabilities', `case ${id}`);
      if (
        new Set(capabilities).size !== capabilities.length ||
        capabilities.join('\0') !== [...capabilities].sort().join('\0')
      ) {
        throw failure('invalid_enum', `case ${id} capabilities must be unique and sorted`);
      }
      for (const equivalence of records(benchmarkCase, 'acceptable_equivalence', `case ${id}`)) {
        this.membership(equivalence.class, 'equivalence_classes', `case ${id} equivalence`);
      }
      const preservation = fieldObject(benchmarkCase, 'preservation_policy', `case ${id}`);
      Object.values(preservation).forEach((requirement) =>
        this.membership(requirement, 'preservation_requirements', `case ${id} preservation`)
      );
      requiredFields(
        benchmarkCase,
        array(operationFields, operation, 'case schema operation fields'),
        `case ${id} ${operation}`
      );

      walkObjects(benchmarkCase, (record) => {
        if (record.mode === 'inline') {
          if (typeof record.bytes !== 'string') {
            throw failure('invalid_structure', `case ${id} inline bytes must be a string`);
          }
          if (Buffer.byteLength(record.bytes, 'utf8') > inlineLimit) {
            throw failure('invalid_structure', `case ${id} inline bytes exceed ${inlineLimit}`);
          }
          validateDigest(record.sha256, record.bytes, `case ${id} inline input`);
        }
      });

      if (operation === 'history_replay') {
        const history = fieldObject(benchmarkCase, 'history_reference', `case ${id}`);
        requiredFields(history, HISTORY_FIELDS, `case ${id} history reference`);
        if (history.slice !== 1021) {
          throw failure('invalid_reference', `case ${id} history reference must target Slice 1021`);
        }
        if (history.manifest !== HISTORY_MANIFEST) {
          throw failure('invalid_reference', `case ${id} history manifest must target Slice 1021`);
        }
        if ('inputs' in benchmarkCase) {
          throw failure(
            'invalid_reference',
            `case ${id} history reference must not inline source bytes`
          );
        }
      }
      if (operation === 'metamorphic') {
        for (const transformation of records(benchmarkCase, 'transformations', `case ${id}`)) {
          this.membership(transformation.type, 'transformations', `case ${id} transformation`);
        }
        reference(benchmarkCase.parent_case_id, caseIds, `case ${id} parent_case_id`);
      }
    }
  }

  private validateRun(): void {
    const run = this.run();
    const schema = fieldObject(this.document, 'run_manifest_schema', 'contract');
    requiredFields(run, array(schema, 'required', 'run schema'), 'run manifest');
    if (run.kind !== 'run_manifest') {
      throw failure('invalid_structure', 'run manifest kind must be run_manifest');
    }
    this.membership(run.profile, 'profiles', 'run profile');
    this.membership(run.unsupported_policy, 'unsupported_policies', 'unsupported policy');

    const adapterRequired = array(schema, 'adapter_identity_required', 'run schema');
    const adapters = this.adapters();
    for (const adapter of adapters) {
      requiredFields(adapter, ['id', ...adapterRequired], `adapter ${String(adapter.id)}`);
    }
    uniqueIds(adapters, 'adapter');

    const caseIds = new Set(this.caseRecords().map((entry) => String(entry.id)));
    const selection = fieldObject(run, 'selection', 'run manifest');
    const selected = strings(selection, 'selected_case_ids', 'run selection');
    const excluded = strings(selection, 'excluded_case_ids', 'run selection');
    if (new Set(selected).size !== selected.length) {
      throw failure('invalid_reference', 'selected case IDs contain duplicates');
    }
    if (new Set(excluded).size !== excluded.length) {
      throw failure('invalid_reference', 'excluded case IDs contain duplicates');
    }
    if (selected.some((id) => excluded.includes(id))) {
      throw failure('invalid_reference', 'selected and excluded case IDs overlap');
    }
    [...selected, ...excluded].forEach((id) => reference(id, caseIds, 'run selection case_id'));

    const explanation = fieldObject(selection, 'explanation', 'run selection');
    requiredFields(
      explanation,
      array(schema, 'fast_selection_required', 'run schema'),
      'selection explanation'
    );
    records(explanation, 'direct_cases', 'selection explanation').forEach((reason) =>
      strings(reason, 'case_ids', 'direct selection').forEach((id) =>
        reference(id, caseIds, 'direct selection case_id')
      )
    );
    records(explanation, 'sentinels', 'selection explanation').forEach((sentinel) =>
      reference(sentinel.case_id, caseIds, 'sentinel selection case_id')
    );
    records(explanation, 'neighbor_samples', 'selection explanation').forEach((sample) =>
      [
        ...strings(sample, 'population', 'neighbor sample'),
        ...strings(sample, 'selected_case_ids', 'neighbor sample')
      ].forEach((id) => reference(id, caseIds, 'neighbor selection case_id'))
    );
    const budget = fieldObject(explanation, 'budget_exceed', 'selection explanation');
    this.membership(budget.action, 'budget_exceed_actions', 'budget exceed action');
    if (budget.regenerate_explanation !== true) {
      throw failure('invalid_structure', 'budget exceed must regenerate the explanation');
    }
    if (budget.silent_extension !== false) {
      throw failure('invalid_structure', 'silent budget extension is prohibited');
    }

    if (this.enumValues('llm_hard_gate_forbidden_profiles').includes(String(run.profile))) {
      const selectedSet = new Set(selected);
      const hasEligibleLlm = this.caseRecords().some((benchmarkCase) => {
        if (!selectedSet.has(String(benchmarkCase.id))) return false;
        const oracle = fieldObject(benchmarkCase, 'oracle', `case ${String(benchmarkCase.id)}`);
        return oracle.class === 'llm' && oracle.score_eligible === true;
      });
      if (hasEligibleLlm) {
        throw failure(
          'prohibited_llm_gate',
          `LLM oracle cannot participate in ${String(run.profile)} hard gates`
        );
      }
    }
  }

  private validateResults(): void {
    const results = this.resultRecords();
    uniqueIds(results, 'result');
    const required = array(
      fieldObject(this.document, 'case_result_schema', 'contract'),
      'required',
      'result schema'
    );
    const run = this.run();
    const cases = new Map(this.caseRecords().map((entry) => [String(entry.id), entry]));
    const adapterIds = new Set(this.adapters().map((entry) => String(entry.id)));

    for (const result of results) {
      const id = String(result.id);
      requiredFields(result, required, `result ${id}`);
      reference(result.run_id, new Set([String(run.id)]), `result ${id} run_id`);
      reference(result.case_id, new Set(cases.keys()), `result ${id} case_id`);
      reference(result.adapter_id, adapterIds, `result ${id} adapter_id`);
      const outcome = this.membership(result.outcome, 'outcomes', `result ${id} outcome`);
      boolean(result.score_eligible, `result ${id} score eligibility`);
      const benchmarkCase = cases.get(result.case_id);
      if (benchmarkCase === undefined) {
        throw failure('invalid_reference', `result ${id} case_id is dangling`);
      }
      const oracle = fieldObject(benchmarkCase, 'oracle', `case ${String(benchmarkCase.id)}`);
      const expected =
        oracle.score_eligible === true && !QUALITY_EXCLUDED_OUTCOMES.has(String(result.outcome));
      if (result.score_eligible !== expected) {
        throw failure(
          'invalid_eligibility',
          `result ${id} score eligibility conflicts with case/outcome`
        );
      }

      const raw = fieldObject(result, 'raw', `result ${id}`);
      for (const [name, value] of Object.entries(raw)) {
        if (value === null || typeof value !== 'object' || Array.isArray(value)) continue;
        const record = value as JsonObject;
        if (!('inline' in record)) continue;
        if (typeof record.inline !== 'string') {
          throw failure(
            'invalid_structure',
            `result ${id} raw ${name} inline content must be a string`
          );
        }
        if (record.bytes !== Buffer.byteLength(record.inline, 'utf8')) {
          throw failure('invalid_digest', `result ${id} raw ${name} byte length is not exact`);
        }
        validateDigest(record.sha256, record.inline, `result ${id} raw ${name}`);
      }

      const safety = fieldObject(
        fieldObject(result, 'dimensions', `result ${id}`),
        'safety',
        `result ${id}`
      );
      if (outcome === 'false_auto_merge') {
        if (safety.false_auto_merge !== true) {
          throw failure('invalid_safety', `result ${id} must identify a false auto-merge`);
        }
        if (safety.compensable !== false) {
          throw failure('invalid_safety', `result ${id} false auto-merge cannot be compensable`);
        }
        this.membership(safety.severity, 'false_auto_merge_severities', `result ${id} severity`);
      } else if (safety.false_auto_merge === true) {
        throw failure(
          'invalid_safety',
          `result ${id} safety classification conflicts with outcome`
        );
      }
    }
  }

  private validateReport(): void {
    const report = this.report();
    const schema = fieldObject(this.document, 'aggregate_report_schema', 'contract');
    const run = this.run();
    const results = this.resultRecords();
    const resultIds = results.map((entry) => String(entry.id));
    if (report.kind !== 'aggregate_report') {
      throw failure('invalid_structure', 'aggregate report kind must be aggregate_report');
    }
    reference(report.run_id, new Set([String(run.id)]), 'aggregate report run_id');
    const reportResultIds = strings(report, 'raw_result_ids', 'aggregate report');
    if (new Set(reportResultIds).size !== reportResultIds.length) {
      throw failure('invalid_reference', 'aggregate raw result IDs contain duplicates');
    }
    if ([...reportResultIds].sort().join('\0') !== [...resultIds].sort().join('\0')) {
      throw failure('invalid_reference', 'aggregate raw result IDs must exactly cover results');
    }
    requiredFields(
      fieldObject(report, 'stratification', 'aggregate report'),
      array(schema, 'required_strata', 'report schema'),
      'report stratification'
    );

    const expectedCounts = Object.fromEntries(
      this.enumValues('outcomes').map((outcome) => [
        outcome,
        results.filter((result) => result.outcome === outcome).length
      ])
    );
    if (JSON.stringify(report.outcome_counts) !== JSON.stringify(expectedCounts)) {
      throw failure('invalid_eligibility', 'aggregate outcome counts do not match raw results');
    }
    const eligibleCount = results.filter((result) => result.score_eligible === true).length;
    const dimensions = fieldObject(report, 'dimensions', 'aggregate report');
    for (const dimension of ['effectiveness', 'safety', 'preservation']) {
      if (fieldObject(dimensions, dimension, 'aggregate dimensions').eligible !== eligibleCount) {
        throw failure('invalid_eligibility', `aggregate ${dimension} denominator is incorrect`);
      }
    }
    if (
      run.unsupported_policy === 'coverage_only' &&
      fieldObject(dimensions, 'coverage', 'aggregate dimensions').unsupported_is_quality_failure !==
        false
    ) {
      throw failure(
        'invalid_eligibility',
        'coverage-only unsupported results cannot be quality failures'
      );
    }

    const byId = new Map(results.map((entry) => [String(entry.id), entry]));
    for (const pair of records(report, 'paired_deltas', 'aggregate report')) {
      const caseId = String(pair.case_id);
      const base = byId.get(String(pair.base_result_id));
      const candidate = byId.get(String(pair.candidate_result_id));
      if (base === undefined) {
        throw failure('invalid_reference', `paired delta ${caseId} has dangling base result`);
      }
      if (candidate === undefined) {
        throw failure('invalid_reference', `paired delta ${caseId} has dangling candidate result`);
      }
      if (base.case_id !== pair.case_id || candidate.case_id !== pair.case_id) {
        throw failure('invalid_reference', `paired delta ${caseId} mixes cases`);
      }
      if (base.adapter_id !== fieldObject(run, 'base_adapter', 'run manifest').id) {
        throw failure('invalid_reference', `paired delta ${caseId} base adapter is incorrect`);
      }
      if (candidate.adapter_id !== fieldObject(run, 'candidate_adapter', 'run manifest').id) {
        throw failure('invalid_reference', `paired delta ${caseId} candidate adapter is incorrect`);
      }
    }

    if (schema.scalar_score_allowed !== false) {
      throw failure('prohibited_scalar_score', 'report schema must prohibit scalar scores');
    }
    if (report.scalar_score !== null) {
      throw failure('prohibited_scalar_score', 'aggregate scalar score is prohibited');
    }
    const falseAutoMergeCount = results.filter(
      (result) => result.score_eligible === true && result.outcome === 'false_auto_merge'
    ).length;
    const gate = fieldObject(
      fieldObject(report, 'gates', 'aggregate report'),
      'safety',
      'aggregate gates'
    );
    if (gate.status !== (falseAutoMergeCount === 0 ? 'pass' : 'fail')) {
      throw failure(
        'invalid_safety',
        'safety gate status does not reflect eligible false auto-merges'
      );
    }
    if (gate.eligible_false_auto_merge_count !== falseAutoMergeCount) {
      throw failure('invalid_safety', 'safety gate false-auto-merge count is incorrect');
    }
    if (gate.non_compensable !== true) {
      throw failure('invalid_safety', 'safety gate must be non-compensable');
    }
    if (!Array.isArray(gate.offsets_allowed) || gate.offsets_allowed.length !== 0) {
      throw failure('invalid_safety', 'safety gate must prohibit offsets');
    }
  }

  private groupedCaseIds(
    cases: JsonObject[],
    enumKey: string,
    field: string
  ): Record<string, string[]> {
    return Object.fromEntries(
      this.enumValues(enumKey).map((value) => [
        value,
        cases
          .filter((entry) => entry[field] === value)
          .map((entry) => String(entry.id))
          .sort()
      ])
    );
  }
}

export function parsePortableBenchmarkContract(
  source: string | Buffer
): PortableBenchmarkContractConsumer {
  return PortableBenchmarkContractConsumer.parse(source);
}

export function loadPortableBenchmarkContract(path: string): PortableBenchmarkContractConsumer {
  return PortableBenchmarkContractConsumer.loadFile(path);
}
