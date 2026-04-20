export const packageName = '@structuredmerge/yaml-merge';

export {
  availableYamlBackends,
  matchYamlOwners,
  mergeYaml,
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
