import ts from 'typescript';
import { registerBackend } from '@structuredmerge/tree-haver';
import type {
  ConformanceFamilyPlanContext,
  Diagnostic,
  MergeResult,
  ParseResult
} from '@structuredmerge/ast-merge';
import {
  matchTypeScriptOwners as matchTypeScriptOwnersWithSubstrate,
  mergeTypeScriptWithParser,
  type TypeScriptAnalysis,
  type TypeScriptDialect,
  type TypeScriptFeatureProfile,
  type TypeScriptOwnerMatchResult,
  typeScriptFeatureProfile
} from '@structuredmerge/typescript-merge';

export const packageName = '@structuredmerge/typescript-compiler-merge';
export const backendId = 'typescript-compiler';

registerBackend({ id: backendId, family: 'native' });

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

function normalizeModuleSpecifier(moduleText: string): string {
  return moduleText.replace(/^['"]|['"]$/g, '');
}

function parseError(message: string): Diagnostic {
  return { severity: 'error', category: 'parse_error', message };
}

function unsupportedFeature(message: string): Diagnostic {
  return { severity: 'error', category: 'unsupported_feature', message };
}

function analyzeTypeScriptModule(source: string): ParseResult<TypeScriptAnalysis> {
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
      diagnostics: parseDiagnostics.map((diagnostic: ts.DiagnosticWithLocation) =>
        parseError(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
      )
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

export function availableTypeScriptBackends(): readonly ['typescript-compiler'] {
  return ['typescript-compiler'];
}

export function typeScriptBackendFeatureProfile(): TypeScriptFeatureProfile & {
  readonly backend: 'typescript-compiler';
} {
  return {
    ...typeScriptFeatureProfile(),
    backend: 'typescript-compiler'
  };
}

export function typeScriptPlanContext(): ConformanceFamilyPlanContext {
  return {
    familyProfile: typeScriptFeatureProfile(),
    featureProfile: {
      backend: 'typescript-compiler',
      supportsDialects: true,
      supportedPolicies: typeScriptFeatureProfile().supportedPolicies
    }
  };
}

export function parseTypeScript(
  source: string,
  dialect: TypeScriptDialect,
  backend?: string
): ParseResult<TypeScriptAnalysis> {
  const requested = backend ?? 'typescript-compiler';
  if (requested !== 'typescript-compiler') {
    return {
      ok: false,
      diagnostics: [unsupportedFeature(`Unsupported TypeScript backend ${requested}.`)]
    };
  }

  if (dialect !== 'typescript') {
    return {
      ok: false,
      diagnostics: [unsupportedFeature(`Unsupported TypeScript dialect ${dialect}.`)]
    };
  }

  return analyzeTypeScriptModule(source);
}

export function mergeTypeScript(
  templateSource: string,
  destinationSource: string,
  dialect: TypeScriptDialect,
  backend?: string
): MergeResult<string> {
  const requested = backend ?? 'typescript-compiler';
  if (requested !== 'typescript-compiler') {
    return {
      ok: false,
      diagnostics: [unsupportedFeature(`Unsupported TypeScript backend ${requested}.`)],
      policies: []
    };
  }

  return mergeTypeScriptWithParser(templateSource, destinationSource, dialect, parseTypeScript);
}

export const matchTypeScriptOwners = matchTypeScriptOwnersWithSubstrate;
export type { TypeScriptAnalysis, TypeScriptDialect, TypeScriptOwnerMatchResult };
export { typeScriptFeatureProfile };
