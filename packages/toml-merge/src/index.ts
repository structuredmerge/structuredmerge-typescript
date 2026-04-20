export const packageName = '@structuredmerge/toml-merge';

export { matchTomlOwners, mergeToml, parseToml, tomlFeatureProfile } from './contracts';

export type {
  TomlAnalysis,
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
