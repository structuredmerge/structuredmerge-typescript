import type { StructuredEditCrisprExampleParityReport } from '@structuredmerge/ast-merge';

export const packageName = '@structuredmerge/ast-crispr';

export class AstCrisprError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AstCrisprError';
    this.code = code;
  }
}

type Predicate = (count: number) => boolean;

interface LimitConstraint {
  readonly description: string;
  readonly predicate: Predicate;
}

export class Limit {
  private readonly constraints: readonly LimitConstraint[];

  constructor(spec: unknown = null) {
    this.constraints = normalizeLimit(spec === null || spec === undefined ? { exactly: 1 } : spec);
  }

  allows(count: number): boolean {
    return this.constraints.every((constraint) => constraint.predicate(count));
  }

  describe(): string {
    return this.constraints.map((constraint) => constraint.description).join(' and ');
  }
}

export function limit(spec: unknown = null): Limit {
  return spec instanceof Limit ? spec : new Limit(spec);
}

function normalizeLimit(spec: unknown): readonly LimitConstraint[] {
  if (spec instanceof Limit) {
    return normalizeLimit({ exactly: 1 });
  }
  if (Array.isArray(spec)) {
    return spec.flatMap((entry) => normalizeLimit(entry));
  }
  if (typeof spec === 'string') {
    return [constraintForOperator(spec)];
  }
  if (spec && typeof spec === 'object') {
    return normalizeLimitRecord(spec as Readonly<Record<string, unknown>>);
  }
  throw new AstCrisprError(
    'Unsupported ast-crispr limit specification',
    'ast_crispr_limit_unsupported'
  );
}

function normalizeLimitRecord(spec: Readonly<Record<string, unknown>>): readonly LimitConstraint[] {
  const constraints: LimitConstraint[] = [];
  if (typeof spec.exactly === 'number') {
    const value = spec.exactly;
    constraints.push({ description: `== ${value}`, predicate: (count) => count === value });
  }
  if (typeof spec.at_most === 'number') {
    const value = spec.at_most;
    constraints.push({ description: `<= ${value}`, predicate: (count) => count <= value });
  }
  if (typeof spec.at_least === 'number') {
    const value = spec.at_least;
    constraints.push({ description: `>= ${value}`, predicate: (count) => count >= value });
  }
  if (spec.none_or_one === true) {
    constraints.push({ description: '<= 1', predicate: (count) => count <= 1 });
  }
  if (constraints.length === 0) {
    throw new AstCrisprError(
      'ast-crispr limit must define at least one constraint',
      'ast_crispr_limit_empty'
    );
  }

  return constraints;
}

function constraintForOperator(spec: string): LimitConstraint {
  const match = /^(==|!=|<=|>=|<|>)\s*(\d+)$/u.exec(spec.trim());
  if (!match) {
    throw new AstCrisprError(
      'Invalid ast-crispr limit expression',
      'ast_crispr_limit_invalid_expression'
    );
  }
  const operator = match[1];
  const value = Number.parseInt(match[2], 10);
  return {
    description: `${operator} ${value}`,
    predicate: (count) => {
      switch (operator) {
        case '==':
          return count === value;
        case '!=':
          return count !== value;
        case '<=':
          return count <= value;
        case '>=':
          return count >= value;
        case '<':
          return count < value;
        case '>':
          return count > value;
        default:
          return false;
      }
    }
  };
}

export function astMergeContractAnchor(): string {
  const _anchor: StructuredEditCrisprExampleParityReport | null = null;
  void _anchor;
  return 'StructuredEditCrisprExampleParityReport';
}

export function boundaryReport(): Readonly<Record<string, unknown>> {
  return {
    package: 'ast-crispr',
    layer: 'structural_edit_tool',
    status: 'active_thin_package',
    base_contract_package: 'ast-merge',
    relationship: {
      ast_merge: [
        'owns portable structured-edit envelope contracts',
        'owns transport, report, replay, review, and provider handoff vocabulary',
        'remains the substrate for provider-neutral fixtures'
      ],
      ast_crispr: [
        'owns ergonomic structural-edit selectors, profiles, and operation helpers',
        'wraps ast-merge contracts instead of forking them',
        'may grow compatibility helpers for old ast-crispr concepts after fixture-backed review'
      ],
      provider_packages: [
        'own parser-specific execution and metadata projection',
        'may expose provider adapters consumed by ast-crispr',
        'keep raw parser details behind normalized tree metadata or semantic sidecars'
      ],
      ast_template: [
        'orchestrates template and directory workflows',
        'invokes structural edits through ast-merge or ast-crispr registries/envelopes',
        'does not own parser-specific selectors'
      ]
    },
    implementations: [
      {
        language: 'go',
        package_name: 'astcrispr',
        import: 'github.com/structuredmerge/structuredmerge-go/astcrispr'
      },
      {
        language: 'ruby',
        package_name: 'ast-crispr',
        require: 'ast/crispr'
      },
      {
        language: 'rust',
        package_name: 'ast-crispr',
        crate: 'ast_crispr'
      },
      {
        language: 'typescript',
        package_name: '@structuredmerge/ast-crispr',
        import: '@structuredmerge/ast-crispr'
      }
    ],
    initial_exports: [
      'package identity',
      'boundary report',
      'ast-merge structured-edit contract anchor',
      'limit helpers'
    ],
    future_exports: [
      'match profile helpers',
      'selection profile helpers',
      'destination profile helpers',
      'operation profile helpers',
      'replace/delete/insert/move helpers',
      'batch operation helpers'
    ],
    metadata: {
      source: 'legacy_crispr_reference',
      decision:
        'Keep ast-merge as the base contract layer and revive ast-crispr as a separate thin package in every implementation.'
    }
  };
}
