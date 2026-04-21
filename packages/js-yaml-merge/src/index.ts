import { load as loadJsYaml } from 'js-yaml';
import { registerBackend } from '@structuredmerge/tree-haver';
import type {
  ConformanceFamilyPlanContext,
  Diagnostic,
  MergeResult,
  ParseResult
} from '@structuredmerge/ast-merge';
import {
  analyzeYamlParsedDocument,
  matchYamlOwners as matchYamlOwnersWithSubstrate,
  mergeYamlWithParser,
  type YamlAnalysis,
  type YamlDialect,
  type YamlFeatureProfile,
  yamlFeatureProfile
} from '@structuredmerge/yaml-merge';

export const packageName = '@structuredmerge/js-yaml-merge';
export const backendId = 'js-yaml';

registerBackend({ id: backendId, family: 'native' });

function parseError(message: string): Diagnostic {
  return { severity: 'error', category: 'parse_error', message };
}

function unsupportedFeature(message: string): Diagnostic {
  return { severity: 'error', category: 'unsupported_feature', message };
}

export function availableYamlBackends(): readonly ['js-yaml'] {
  return ['js-yaml'];
}

export function yamlBackendFeatureProfile(): YamlFeatureProfile & {
  readonly backend: 'js-yaml';
} {
  return {
    ...yamlFeatureProfile(),
    backend: 'js-yaml'
  };
}

export function yamlPlanContext(): ConformanceFamilyPlanContext {
  return {
    familyProfile: yamlFeatureProfile(),
    featureProfile: {
      backend: 'js-yaml',
      supportsDialects: true,
      supportedPolicies: yamlFeatureProfile().supportedPolicies
    }
  };
}

export function parseYaml(
  source: string,
  dialect: YamlDialect,
  backend?: string
): ParseResult<YamlAnalysis> {
  const requested = backend ?? 'js-yaml';
  if (requested !== 'js-yaml') {
    return {
      ok: false,
      diagnostics: [unsupportedFeature(`Unsupported YAML backend ${requested}.`)]
    };
  }

  if (dialect !== 'yaml') {
    return {
      ok: false,
      diagnostics: [unsupportedFeature(`Unsupported YAML dialect ${dialect}.`)]
    };
  }

  try {
    return analyzeYamlParsedDocument(loadJsYaml(source));
  } catch (error) {
    return {
      ok: false,
      diagnostics: [parseError(error instanceof Error ? error.message : 'YAML parse failed.')]
    };
  }
}

export function mergeYaml(
  templateSource: string,
  destinationSource: string,
  dialect: YamlDialect,
  backend?: string
): MergeResult<string> {
  const requested = backend ?? 'js-yaml';
  if (requested !== 'js-yaml') {
    return {
      ok: false,
      diagnostics: [unsupportedFeature(`Unsupported YAML backend ${requested}.`)],
      policies: []
    };
  }

  return mergeYamlWithParser(templateSource, destinationSource, dialect, parseYaml);
}

export const matchYamlOwners = matchYamlOwnersWithSubstrate;
export { yamlFeatureProfile };
export type { YamlAnalysis, YamlDialect };
