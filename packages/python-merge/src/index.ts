export const packageName = '@structuredmerge/python-merge';

export {
  matchPythonOwners,
  mergePython,
  mergePythonAnalyses,
  mergePythonWithBackend,
  mergePythonWithParser,
  parsePython,
  parsePythonWithBackend,
  pythonBackendFeatureProfile,
  pythonBackends,
  pythonFeatureProfile,
  pythonPlanContext
} from './contracts';

export type {
  PythonAnalysis,
  PythonBackend,
  PythonBackendFeatureProfile,
  PythonDialect,
  PythonFeatureProfile,
  PythonOwner,
  PythonOwnerKind,
  PythonOwnerMatch,
  PythonOwnerMatchResult
} from './contracts';
