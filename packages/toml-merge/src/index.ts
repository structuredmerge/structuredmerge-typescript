export const packageName = '@structuredmerge/toml-merge';

export {
  availableTomlBackends,
  matchTomlOwners,
  mergeToml,
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
