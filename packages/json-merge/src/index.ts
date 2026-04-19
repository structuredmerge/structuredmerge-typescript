export const packageName = '@structuredmerge/json-merge';

export { jsonParseRequest, matchJsonOwners, mergeJson, parseJson } from './contracts';
export type {
  JsonAnalysis,
  JsonAnalyzer,
  JsonDialect,
  JsonMergeResolution,
  JsonMerger,
  JsonOwnerMatch,
  JsonOwnerMatchResult,
  JsonOwnerMatcher,
  JsonOwner,
  JsonOwnerKind,
  JsonParserAdapter,
  JsonRootKind,
  JsonStructureAnalyzer
} from './contracts';
