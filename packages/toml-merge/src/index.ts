export const packageName = '@structuredmerge/toml-merge';

export {
  analyzeTomlSource,
  availableTomlBackends,
  matchTomlOwners,
  mergeToml,
  mergeTomlWithParser,
  parseToml,
  tomlBackendFeatureProfile,
  tomlFeatureProfile,
  tomlPlanContext
} from './contracts';

export type {
  TomlAnalysis,
  TomlBackend,
  TomlBackendFeatureProfile,
  TomlAnalyzer,
  TomlDialect,
  TomlFeatureProfile,
  TomlMergeResolution,
  TomlMerger,
  TomlOwner,
  TomlOwnerKind,
  TomlOwnerMatch,
  TomlOwnerMatchResult,
  TomlOwnerMatcher,
  TomlRootKind,
  TomlStructureAnalyzer
} from './contracts';
