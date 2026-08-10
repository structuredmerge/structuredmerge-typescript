import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PortableBenchmarkValidationError,
  loadPortableBenchmarkContract,
  parsePortableBenchmarkContract,
  type PortableBenchmarkCanonicalSummary,
  type PortableBenchmarkValidationCategory
} from '../src/index';

const fixturePath = path.resolve(
  process.cwd(),
  '..',
  'fixtures',
  'diagnostics',
  'slice-1022-portable-benchmark-contract',
  'contract.json'
);
const fixtureSource = readFileSync(fixturePath);

const expectedSummary: PortableBenchmarkCanonicalSummary = {
  schema: 'structuredmerge.benchmark/v1',
  counts: {
    adapters: 2,
    cases: 5,
    results: 7,
    selected_cases: 5,
    score_eligible_results: 5,
    quality_denominator_excluded_results: 2,
    eligible_false_auto_merges: 1
  },
  case_ids_by_operation: {
    diff: ['case.diff.json.object-update.v1'],
    merge3: ['case.merge3.json.independent-fields.v1', 'case.merge3.json.region-conflict.v1'],
    history_replay: ['case.history.ruby.release-events-dotenv-provider.v1'],
    metamorphic: ['case.metamorphic.json.reorder-format.v1']
  },
  case_ids_by_partition: {
    sentinel: ['case.diff.json.object-update.v1'],
    gold: ['case.merge3.json.independent-fields.v1', 'case.merge3.json.region-conflict.v1'],
    metamorphic: ['case.metamorphic.json.reorder-format.v1'],
    history: ['case.history.ruby.release-events-dotenv-provider.v1'],
    holdout: []
  },
  score_eligible_result_ids: [
    'result.base.clean.false-conflict',
    'result.base.conflict.true',
    'result.candidate.clean.correct',
    'result.candidate.conflict.false-auto-merge',
    'result.candidate.diff.error'
  ],
  quality_denominator_excluded_result_ids: [
    'result.candidate.history.excluded-ambiguous',
    'result.candidate.metamorphic.unsupported'
  ],
  false_auto_merges: [{ id: 'result.candidate.conflict.false-auto-merge', severity: 'critical' }],
  safety_gate: {
    status: 'fail',
    eligible_false_auto_merge_count: 1,
    non_compensable: true
  },
  selection_reason_categories: [
    'budget_exceed',
    'changed_paths',
    'direct_cases',
    'inferred_capabilities',
    'neighbor_samples',
    'sentinels'
  ],
  contract_digest: '1015727c1a9c4f132dfb8bb51118a594f6ad170459e2af9c73cdb586ec02ce22'
};

interface MutableContract {
  cases: Array<{
    id: string;
    inputs: { before: { sha256: string } };
    oracle: { class: string };
  }>;
  run_manifest: { profile: string };
  case_results: Array<{
    case_id: string;
    outcome: string;
    score_eligible: boolean;
    dimensions: { safety: { compensable: boolean } };
  }>;
}

function expectMutationError(
  mutate: (contract: MutableContract) => void,
  category: PortableBenchmarkValidationCategory,
  message: string
): void {
  const contract = JSON.parse(fixtureSource.toString('utf8')) as MutableContract;
  mutate(contract);
  try {
    parsePortableBenchmarkContract(JSON.stringify(contract));
    throw new Error('expected contract mutation to fail');
  } catch (error) {
    expect(error).toBeInstanceOf(PortableBenchmarkValidationError);
    expect((error as PortableBenchmarkValidationError).category).toBe(category);
    expect((error as Error).message).toContain(message);
  }
}

describe('portable benchmark contract consumer', () => {
  it('reads and summarizes the exact shared fixture bytes', () => {
    const consumer = loadPortableBenchmarkContract(fixturePath);

    expect(consumer.canonicalSummary()).toEqual(expectedSummary);
    expect(consumer.contractDigest).toBe(expectedSummary.contract_digest);
  });

  it('rejects a bad inline digest', () => {
    expectMutationError(
      (contract) => {
        contract.cases[0].inputs.before.sha256 = '0'.repeat(64);
      },
      'invalid_digest',
      'SHA-256 does not match exact bytes'
    );
  });

  it('rejects a duplicate case ID', () => {
    expectMutationError(
      (contract) => {
        contract.cases[1].id = contract.cases[0].id;
      },
      'invalid_reference',
      'duplicate case ID'
    );
  });

  it('rejects a dangling result case reference', () => {
    expectMutationError(
      (contract) => {
        contract.case_results[0].case_id = 'case.missing';
      },
      'invalid_reference',
      'case_id is dangling'
    );
  });

  it('rejects an eligible excluded result', () => {
    expectMutationError(
      (contract) => {
        contract.case_results.find(
          (result) => result.outcome === 'excluded_ambiguous'
        )!.score_eligible = true;
      },
      'invalid_eligibility',
      'score eligibility conflicts'
    );
  });

  it('rejects a compensable false auto-merge', () => {
    expectMutationError(
      (contract) => {
        contract.case_results.find(
          (result) => result.outcome === 'false_auto_merge'
        )!.dimensions.safety.compensable = true;
      },
      'invalid_safety',
      'cannot be compensable'
    );
  });

  it('rejects an LLM oracle participating in a micro hard gate', () => {
    expectMutationError(
      (contract) => {
        contract.run_manifest.profile = 'micro';
        contract.cases[0].oracle.class = 'llm';
      },
      'prohibited_llm_gate',
      'LLM oracle cannot participate in micro hard gates'
    );
  });
});
