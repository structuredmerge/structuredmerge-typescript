export const packageName = '@structuredmerge/yaml-merge';

export {
  analyzeYamlParsedDocument,
  availableYamlBackends,
  matchYamlOwners,
  mergeYamlAnalyses,
  mergeYaml,
  mergeYamlWithParser,
  parseYaml,
  yamlBackendFeatureProfile,
  yamlFeatureProfile,
  yamlPlanContext
} from './contracts';

export type {
  YamlAnalysis,
  YamlAnalyzer,
  YamlBackend,
  YamlBackendFeatureProfile,
  YamlDialect,
  YamlFeatureProfile,
  YamlMergeResolution,
  YamlMerger,
  YamlOwner,
  YamlOwnerKind,
  YamlOwnerMatch,
  YamlOwnerMatchResult,
  YamlOwnerMatcher,
  YamlRootKind,
  YamlStructureAnalyzer
} from './contracts';
