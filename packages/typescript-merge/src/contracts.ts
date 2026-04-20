import type {
  FamilyFeatureProfile,
  MergeResult,
  ParseResult,
  PolicyReference
} from '@structuredmerge/ast-merge';
import ts from 'typescript';
import {
  parseWithLanguagePack,
  processWithLanguagePack,
  type ParserRequest,
  type ProcessRequest,
  type ProcessSpan
} from '@structuredmerge/tree-haver';

export type TypeScriptDialect = 'typescript';
export type TypeScriptBackend = 'tree-sitter' | 'native';
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
  return analyzeTypeScriptModuleWithBackend(source, 'tree-sitter');
}

function normalizeModuleSpecifier(moduleText: string): string {
  return moduleText.replace(/^['"]|['"]$/g, '');
}

function nativeAnalyzeTypeScriptModule(source: string): ParseResult<TypeScriptAnalysis> {
  const sourceFile = ts.createSourceFile(
    'input.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  const parseDiagnostics =
    (
      sourceFile as ts.SourceFile & {
        parseDiagnostics?: readonly ts.DiagnosticWithLocation[];
      }
    ).parseDiagnostics ?? [];
  if (parseDiagnostics.length > 0) {
    return {
      ok: false,
      diagnostics: parseDiagnostics.map((diagnostic: ts.DiagnosticWithLocation) => ({
        severity: 'error',
        category: 'parse_error',
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
      }))
    };
  }

  const imports: ModuleImport[] = [];
  const declarations: ModuleDeclaration[] = [];
  sourceFile.forEachChild((node) => {
    if (ts.isImportDeclaration(node)) {
      imports.push({
        path: `/imports/${imports.length}`,
        matchKey: normalizeModuleSpecifier(node.moduleSpecifier.getText(sourceFile)),
        text: `${node.getText(sourceFile)}\n`
      });
      return;
    }

    if (
      ts.isFunctionDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node)
    ) {
      const name = node.name?.getText(sourceFile);
      if (!name) {
        return;
      }

      declarations.push({
        path: `/declarations/${name}`,
        matchKey: name,
        text: `${node.getText(sourceFile)}\n`
      });
    }
  });

  declarations.sort((left, right) =>
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0
  );

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

function analyzeTypeScriptModuleWithBackend(
  source: string,
  backend: TypeScriptBackend
): ParseResult<TypeScriptAnalysis> {
  if (backend === 'native') {
    return nativeAnalyzeTypeScriptModule(source);
  }

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

export function typeScriptBackends(): readonly TypeScriptBackend[] {
  return ['tree-sitter', 'native'];
}

export function parseTypeScriptWithBackend(
  source: string,
  dialect: TypeScriptDialect,
  backend: TypeScriptBackend
): ParseResult<TypeScriptAnalysis> {
  void dialect;
  return analyzeTypeScriptModuleWithBackend(source, backend);
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
  return mergeTypeScriptWithBackend(templateSource, destinationSource, dialect, 'tree-sitter');
}

export function mergeTypeScriptWithBackend(
  templateSource: string,
  destinationSource: string,
  dialect: TypeScriptDialect,
  backend: TypeScriptBackend
): MergeResult<string> {
  const template = parseTypeScriptWithBackend(templateSource, dialect, backend);
  if (!template.ok || !template.analysis) {
    return { ok: false, diagnostics: template.diagnostics, policies: [] };
  }

  const destination = parseTypeScriptWithBackend(destinationSource, dialect, backend);
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
