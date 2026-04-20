import type {
  FamilyFeatureProfile,
  MergeResult,
  ParseResult,
  PolicyReference
} from '@structuredmerge/ast-merge';
import {
  parseWithLanguagePack,
  processWithLanguagePack,
  type ParserRequest,
  type ProcessRequest,
  type ProcessSpan
} from '@structuredmerge/tree-haver';

export type TypeScriptDialect = 'typescript';
export type TypeScriptOwnerKind = 'import' | 'declaration';

interface ModuleImport {
  readonly path: string;
  readonly matchKey: string;
  readonly text: string;
}

interface ModuleDeclaration {
  readonly path: string;
  readonly matchKey: string;
  readonly text: string;
}

export interface TypeScriptOwner {
  readonly path: string;
  readonly ownerKind: TypeScriptOwnerKind;
  readonly matchKey?: string;
}

export interface TypeScriptOwnerMatch {
  readonly templatePath: string;
  readonly destinationPath: string;
}

export interface TypeScriptOwnerMatchResult {
  readonly matched: readonly TypeScriptOwnerMatch[];
  readonly unmatchedTemplate: readonly string[];
  readonly unmatchedDestination: readonly string[];
}

export interface TypeScriptAnalysis {
  readonly kind: 'typescript';
  readonly dialect: TypeScriptDialect;
  readonly source: string;
  readonly owners: readonly TypeScriptOwner[];
  readonly imports: readonly ModuleImport[];
  readonly declarations: readonly ModuleDeclaration[];
}

export interface TypeScriptFeatureProfile extends FamilyFeatureProfile {
  readonly family: 'typescript';
  readonly supportedDialects: readonly TypeScriptDialect[];
  readonly supportedPolicies: readonly PolicyReference[];
}

const destinationWinsArrayPolicy: PolicyReference = {
  surface: 'array',
  name: 'destination_wins_array'
};

function typeScriptParseRequest(source: string): ParserRequest {
  return { source, language: 'typescript', dialect: 'typescript' };
}

function typeScriptProcessRequest(source: string): ProcessRequest {
  return { source, language: 'typescript' };
}

function sliceSpan(source: string, span: ProcessSpan): string {
  return source.slice(span.startByte, span.endByte).trim();
}

function lineAnchoredSlice(source: string, span: ProcessSpan): string {
  const lineStart = source.lastIndexOf('\n', Math.max(0, span.startByte - 1)) + 1;
  return source.slice(lineStart, span.endByte).trim();
}

function declarationText(source: string, span: ProcessSpan): string {
  return `${lineAnchoredSlice(source, span)}\n`;
}

function importText(source: string, span: ProcessSpan): string {
  return `${sliceSpan(source, span)}\n`;
}

function analyzeTypeScriptModule(source: string): ParseResult<TypeScriptAnalysis> {
  const parsed = parseWithLanguagePack(typeScriptParseRequest(source));
  if (!parsed.ok) {
    return { ok: false, diagnostics: parsed.diagnostics };
  }

  const processed = processWithLanguagePack(typeScriptProcessRequest(source));
  if (!processed.ok || !processed.analysis) {
    return { ok: false, diagnostics: processed.diagnostics };
  }

  const imports = processed.analysis.imports.map((item, index) => {
    return {
      path: `/imports/${index}`,
      matchKey: item.source,
      text: importText(source, item.span)
    };
  });

  const declarations = processed.analysis.structure
    .filter((item) => item.name)
    .map((item) => ({
      path: `/declarations/${item.name!}`,
      matchKey: item.name!,
      text: declarationText(source, item.span)
    }))
    .sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));

  return {
    ok: true,
    diagnostics: [],
    analysis: {
      kind: 'typescript',
      dialect: 'typescript',
      source,
      owners: [
        ...imports.map((item) => ({
          path: item.path,
          ownerKind: 'import' as const,
          matchKey: item.matchKey
        })),
        ...declarations.map((item) => ({
          path: item.path,
          ownerKind: 'declaration' as const,
          matchKey: item.matchKey
        }))
      ],
      imports,
      declarations
    },
    policies: []
  };
}

export function typeScriptFeatureProfile(): TypeScriptFeatureProfile {
  return {
    family: 'typescript',
    supportedDialects: ['typescript'],
    supportedPolicies: [destinationWinsArrayPolicy]
  };
}

export function parseTypeScript(
  source: string,
  dialect: TypeScriptDialect
): ParseResult<TypeScriptAnalysis> {
  void dialect;
  return analyzeTypeScriptModule(source);
}

export function matchTypeScriptOwners(
  template: TypeScriptAnalysis,
  destination: TypeScriptAnalysis
): TypeScriptOwnerMatchResult {
  const destinationOwners = new Set(destination.owners.map((owner) => owner.path));
  const templateOwners = new Set(template.owners.map((owner) => owner.path));

  return {
    matched: template.owners
      .filter((owner) => destinationOwners.has(owner.path))
      .map((owner) => ({ templatePath: owner.path, destinationPath: owner.path })),
    unmatchedTemplate: template.owners
      .map((owner) => owner.path)
      .filter((path) => !destinationOwners.has(path)),
    unmatchedDestination: destination.owners
      .map((owner) => owner.path)
      .filter((path) => !templateOwners.has(path))
  };
}

export function mergeTypeScript(
  templateSource: string,
  destinationSource: string,
  dialect: TypeScriptDialect
): MergeResult<string> {
  const template = parseTypeScript(templateSource, dialect);
  if (!template.ok || !template.analysis) {
    return { ok: false, diagnostics: template.diagnostics, policies: [] };
  }

  const destination = parseTypeScript(destinationSource, dialect);
  if (!destination.ok || !destination.analysis) {
    return {
      ok: false,
      diagnostics: destination.diagnostics.map((diagnostic) => ({
        ...diagnostic,
        category:
          diagnostic.category === 'parse_error' ? 'destination_parse_error' : diagnostic.category
      })),
      policies: []
    };
  }

  const destinationDeclarations = new Map(
    destination.analysis.declarations.map((item) => [item.path, item])
  );
  const mergedDeclarationTexts = [
    ...destination.analysis.declarations.map((item) => item.text),
    ...template.analysis.declarations
      .filter((item) => !destinationDeclarations.has(item.path))
      .map((item) => item.text)
  ];
  const importBlock = destination.analysis.imports.map((item) => item.text).join('');
  const declarationBlock = mergedDeclarationTexts.join('\n').trimEnd();
  const sections = [importBlock.trimEnd(), declarationBlock].filter(
    (section) => section.length > 0
  );

  return {
    ok: true,
    diagnostics: [],
    output: `${sections.join('\n\n').trimEnd()}\n`,
    policies: [destinationWinsArrayPolicy]
  };
}
