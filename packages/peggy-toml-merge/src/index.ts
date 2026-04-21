import type {
  ConformanceFamilyPlanContext,
  Diagnostic,
  ParseResult
} from '@structuredmerge/ast-merge';
import { registerBackend } from '@structuredmerge/tree-haver';
import {
  analyzeTomlSource,
  matchTomlOwners as matchTomlOwnersWithSubstrate,
  mergeTomlWithParser,
  tomlFeatureProfile,
  type TomlAnalysis,
  type TomlDialect,
  type TomlFeatureProfile
} from '@structuredmerge/toml-merge';
import { createPeggyParser, parseWithPeggy } from '@structuredmerge/tree-haver';

export const packageName = '@structuredmerge/peggy-toml-merge';
export const backendId = 'peggy';

registerBackend({ id: backendId, family: 'peg' });

const TOML_PEGGY_GRAMMAR = String.raw`
{
  function text() { return input.substring(location().start.offset, location().end.offset); }
}

start = spacing document:document spacing EOF { return document; }
document = (table / keyValue / blankLine / commentLine)*
table = "[" keyPath "]" entryEnd
keyValue = keyPath spacing "=" spacing value entryEnd
keyPath = bareKey ("." bareKey)*
value = array / string / boolean / number
array = "[" spacing arrayValues? spacing "]"
arrayValues = value (spacing "," spacing value)*
string = "\"" chars:([^"\\] / "\\\"" / "\\\\" / "\\n" / "\\t")* "\""
boolean = "true" / "false"
number = "-"? [0-9]+ ("." [0-9]+)?
bareKey = [A-Za-z0-9_-]+
commentLine = spacing "#" [^\n\r]* newline
blankLine = spacing newline
entryEnd = spacing comment? (newline / EOF)
comment = "#" [^\n\r]*
newline = "\r\n" / "\n" / "\r"
spacing = [ \t]*
EOF = !.
`;
const tomlPeggyParser = createPeggyParser(TOML_PEGGY_GRAMMAR);

function unsupportedFeature(message: string): Diagnostic {
  return { severity: 'error', category: 'unsupported_feature', message };
}

export function availableTomlBackends(): readonly ['peggy'] {
  return ['peggy'];
}

export function tomlBackendFeatureProfile(): TomlFeatureProfile & {
  readonly backend: 'peggy';
} {
  return {
    ...tomlFeatureProfile(),
    backend: 'peggy'
  };
}

export function tomlPlanContext(): ConformanceFamilyPlanContext {
  return {
    familyProfile: tomlFeatureProfile(),
    featureProfile: {
      backend: 'peggy',
      supportsDialects: false,
      supportedPolicies: tomlFeatureProfile().supportedPolicies
    }
  };
}

export function parseToml(
  source: string,
  dialect: TomlDialect,
  backend?: string
): ParseResult<TomlAnalysis> {
  const requested = backend ?? 'peggy';
  if (requested !== 'peggy') {
    return {
      ok: false,
      diagnostics: [unsupportedFeature(`Unsupported TOML backend ${requested}.`)]
    };
  }

  const syntax = parseWithPeggy(source, tomlPeggyParser);
  if (!syntax.ok) {
    return { ok: false, diagnostics: syntax.diagnostics };
  }

  return analyzeTomlSource(source, dialect);
}

export function mergeToml(
  templateSource: string,
  destinationSource: string,
  dialect: TomlDialect,
  backend?: string
) {
  const requested = backend ?? 'peggy';
  if (requested !== 'peggy') {
    return {
      ok: false,
      diagnostics: [unsupportedFeature(`Unsupported TOML backend ${requested}.`)],
      policies: []
    };
  }

  return mergeTomlWithParser(templateSource, destinationSource, dialect, parseToml);
}

export const matchTomlOwners = matchTomlOwnersWithSubstrate;
export { tomlFeatureProfile };
