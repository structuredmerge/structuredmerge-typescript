#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  evaluateProfileSelectionRequirement,
  initialProfilePromotionPolicy,
  promotionProfileJsonKeyedObject
} from '@structuredmerge/ast-merge';
import type { Diagnostic, MergeResult, ProfilePromotionStatus } from '@structuredmerge/ast-merge';
import { merge3 } from '@structuredmerge/ast-merge-git';
import { mergeGo } from '@structuredmerge/go-merge';
import { mergeJson } from '@structuredmerge/json-merge';
import { mergeText } from '@structuredmerge/plain-merge';
import type { Merge3Response } from '@structuredmerge/ast-merge-git';

export const exitSuccess = 0;
export const exitUnresolvedConflict = 1;
export const exitUserError = 2;
export const exitInternalError = 3;

interface MergeDriverOptions {
  readonly ancestor: string;
  readonly current: string;
  readonly other: string;
  readonly pathName?: string;
  readonly output?: string;
  readonly strict: boolean;
  readonly fallback: string;
  readonly checkOnly: boolean;
  readonly exitCode: boolean;
  readonly report?: string;
  readonly profileId?: string;
  readonly profileReport: boolean;
  readonly requireProfileStatus?: string;
}

interface DiffDriverOptions {
  readonly pathName?: string;
  readonly oldPath: string;
  readonly newPath: string;
}

interface ConflictDiffOptions {
  readonly pathName?: string;
  readonly filePath: string;
  readonly exitCode: boolean;
}

interface PathSettings {
  language?: string;
  conflictMarkerSize: number;
  profileId?: string;
  requireProfileStatus?: string;
}

interface ConflictRegion {
  readonly startLine: number;
  readonly separatorLine: number;
  readonly endLine: number;
}

type MergeDriverResult = MergeResult<string> & {
  readonly owned_regions?: Merge3Response['owned_regions'];
  readonly render_report?: Merge3Response['render_report'];
  readonly profile?: Merge3Response['profile'];
};

export function run(
  args: readonly string[],
  stdout: Pick<NodeJS.WriteStream, 'write'>,
  stderr: Pick<NodeJS.WriteStream, 'write'>
): number {
  const [command, ...rest] = args;
  switch (command) {
    case 'merge-driver':
      return runMergeDriver(rest, stdout, stderr);
    case 'diff-driver':
      return runDiffDriver(rest, stdout, stderr);
    case 'conflicts':
      return runConflicts(rest, stdout, stderr);
    case 'languages':
      return runLanguages(rest, stdout, stderr);
    case 'help':
    case '-h':
    case '--help':
      printUsage(stdout);
      return exitSuccess;
    default:
      if (command) {
        stderr.write(`unknown command ${JSON.stringify(command)}\n`);
      }
      printUsage(stderr);
      return exitUserError;
  }
}

function printUsage(out: Pick<NodeJS.WriteStream, 'write'>): void {
  out.write(
    [
      'usage: smorg-ts merge-driver [--path-name PATH] [--output PATH] [--report PATH] [--strict] [--fallback=none|line|local|full-file] %O %A %B [%P]',
      '       smorg-ts merge-driver --ancestor %O --current %A --other %B --path-name %P',
      '       smorg-ts diff-driver [--path-name PATH] OLD NEW',
      '       smorg-ts diff-driver PATH OLD-FILE OLD-HEX OLD-MODE NEW-FILE NEW-HEX NEW-MODE [OLD-PREFIX NEW-PREFIX]',
      '       smorg-ts conflicts diff [--path-name PATH] [--exit-code] FILE',
      '       smorg-ts languages --gitattributes'
    ].join('\n') + '\n'
  );
}

function runMergeDriver(
  args: readonly string[],
  stdout: Pick<NodeJS.WriteStream, 'write'>,
  stderr: Pick<NodeJS.WriteStream, 'write'>
): number {
  const options = parseMergeDriverOptions(args, stderr);
  if (!options) return exitUserError;

  let ancestorSource: string;
  let currentSource: string;
  let otherSource: string;
  try {
    ancestorSource = readFileSync(options.ancestor, 'utf8');
    currentSource = readFileSync(options.current, 'utf8');
    otherSource = readFileSync(options.other, 'utf8');
  } catch (error) {
    stderr.write(`read merge input: ${String(error)}\n`);
    return exitUserError;
  }
  const effectivePath = options.pathName ?? options.current;
  const settings = loadPathSettings(effectivePath);
  const profileExit = reportAndEnforceProfile(
    options.profileId ?? settings.profileId,
    options.profileReport,
    options.requireProfileStatus ?? settings.requireProfileStatus,
    stdout,
    stderr
  );
  if (profileExit !== exitSuccess) return profileExit;
  const result = mergeByPath(
    effectivePath,
    settings.language,
    settings.conflictMarkerSize,
    ancestorSource,
    currentSource,
    otherSource
  );
  let output = result.output;
  if (!result.ok) {
    printDiagnostics(stderr, result);
    const fallbacks: Array<Record<string, unknown>> = [];
    if (output === undefined && !options.strict && options.fallback !== 'none') {
      fallbacks.push({
        mode: 'full_file',
        requested_mode: options.fallback,
        reason: fallbackReason(result.diagnostics),
        applied: true
      });
      output = fullFileConflictOutput(
        settings.conflictMarkerSize,
        ancestorSource,
        currentSource,
        otherSource
      );
    }
    const reportExit = writeMergeDriverMachineReport(
      options.report,
      effectivePath,
      false,
      exitUnresolvedConflict,
      fallbacks,
      result.owned_regions ?? [],
      result.render_report,
      result.profile,
      result.diagnostics,
      stderr
    );
    if (reportExit !== exitSuccess) return reportExit;
    if (options.checkOnly) return exitUnresolvedConflict;
    if (output !== undefined) {
      try {
        writeFileSync(options.output ?? options.current, output);
      } catch (error) {
        stderr.write(`write output: ${String(error)}\n`);
        return exitInternalError;
      }
    }
    return exitUnresolvedConflict;
  }
  if (output === undefined) {
    stderr.write('merge completed without output\n');
    return exitInternalError;
  }

  if (options.checkOnly) {
    const exit = options.exitCode && output !== currentSource ? exitUnresolvedConflict : exitSuccess;
    const reportExit = writeMergeDriverMachineReport(
      options.report,
      effectivePath,
      true,
      exit,
      [],
      result.owned_regions ?? [],
      result.render_report,
      result.profile,
      result.diagnostics,
      stderr
    );
    if (reportExit !== exitSuccess) return reportExit;
    return exit;
  }

  try {
    writeFileSync(options.output ?? options.current, output);
  } catch (error) {
    stderr.write(`write output: ${String(error)}\n`);
    return exitInternalError;
  }
  const reportExit = writeMergeDriverMachineReport(
    options.report,
    effectivePath,
    true,
    exitSuccess,
    [],
    result.owned_regions ?? [],
    result.render_report,
    result.profile,
    result.diagnostics,
    stderr
  );
  if (reportExit !== exitSuccess) return reportExit;
  return exitSuccess;
}

function writeMergeDriverMachineReport(
  reportPath: string | undefined,
  pathName: string,
  ok: boolean,
  exitCode: number,
  fallbacks: Array<Record<string, unknown>>,
  ownedRegions: Merge3Response['owned_regions'],
  renderReport: Merge3Response['render_report'] | undefined,
  profile: Merge3Response['profile'] | undefined,
  diagnostics: readonly Diagnostic[],
  stderr: Pick<NodeJS.WriteStream, 'write'>
): number {
  if (!reportPath) return exitSuccess;
  try {
    writeFileSync(
      reportPath,
      `${JSON.stringify(
        {
          command: 'merge-driver',
          path_name: pathName,
          ok,
          exit_code: exitCode,
          fallbacks,
          owned_regions: ownedRegions,
          render_report: renderReport,
          profile,
          diagnostics
        },
        undefined,
        2
      )}\n`
    );
    return exitSuccess;
  } catch (error) {
    stderr.write(`write report: ${String(error)}\n`);
    return exitInternalError;
  }
}

function fallbackReason(diagnostics: readonly Diagnostic[]): string {
  return diagnostics[0]?.category ?? 'structured_merge_failed';
}

function fullFileConflictOutput(
  markerSize: number,
  ancestorSource: string,
  currentSource: string,
  otherSource: string
): string {
  const size = Math.max(markerSize, 1);
  return [
    `${'<'.repeat(size)} ours`,
    currentSource,
    `${'|'.repeat(size)} base`,
    ancestorSource,
    '='.repeat(size),
    otherSource,
    `${'>'.repeat(size)} theirs`,
    ''
  ].join('\n');
}

function parseMergeDriverOptions(
  args: readonly string[],
  stderr: Pick<NodeJS.WriteStream, 'write'>
): MergeDriverOptions | undefined {
  let ancestor: string | undefined;
  let current: string | undefined;
  let other: string | undefined;
  let pathName: string | undefined;
  let output: string | undefined;
  let strict = false;
  let fallback = 'full-file';
  let checkOnly = false;
  let exitCode = false;
  let report: string | undefined;
  let profileId: string | undefined;
  let profileReport = false;
  let requireProfileStatus: string | undefined;
  const positionals: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    switch (value) {
      case '--ancestor':
        ancestor = args[++index];
        break;
      case '--current':
        current = args[++index];
        break;
      case '--other':
        other = args[++index];
        break;
      case '--path-name':
        pathName = args[++index];
        break;
      case '--output':
        output = args[++index];
        break;
      case '--report':
        report = args[++index];
        break;
      case '--strict':
        strict = true;
        break;
      case '--check-only':
        checkOnly = true;
        break;
      case '--exit-code':
        exitCode = true;
        break;
      case '--profile':
        profileId = args[++index];
        break;
      case '--profile-report':
        profileReport = true;
        break;
      case '--require-profile-status':
        requireProfileStatus = args[++index];
        break;
      case '--fallback':
        fallback = args[++index] ?? '';
        break;
      default:
        if (value.startsWith('--fallback=')) {
          fallback = value.slice('--fallback='.length);
        } else if (value.startsWith('--')) {
          stderr.write(`unknown merge-driver option ${JSON.stringify(value)}\n`);
          return undefined;
        } else {
          positionals.push(value);
        }
    }
  }

  ancestor ??= positionals[0];
  current ??= positionals[1];
  other ??= positionals[2];
  pathName ??= positionals[3];

  if (!ancestor || !current || !other) {
    stderr.write('merge-driver requires ancestor, current, and other paths\n');
    return undefined;
  }
  if (!['none', 'line', 'local', 'full-file'].includes(fallback)) {
    stderr.write(`unsupported fallback mode ${JSON.stringify(fallback)}\n`);
    return undefined;
  }
  return {
    ancestor,
    current,
    other,
    pathName,
    output,
    strict,
    fallback,
    checkOnly,
    exitCode,
    report,
    profileId,
    profileReport,
    requireProfileStatus
  };
}

function reportAndEnforceProfile(
  profileId: string | undefined,
  profileReport: boolean,
  requireStatus: string | undefined,
  stdout: Pick<NodeJS.WriteStream, 'write'>,
  stderr: Pick<NodeJS.WriteStream, 'write'>
): number {
  if (!profileId && !profileReport && !requireStatus) return exitSuccess;
  const selectedProfile = profileId ?? promotionProfileJsonKeyedObject;
  const evaluation = {
    profile_id: selectedProfile,
    status: 'available' as ProfilePromotionStatus,
    blocking_reasons: ['profile promotion evidence is not loaded by this CLI command'],
    diagnostics: []
  };
  const decision = evaluateProfileSelectionRequirement(
    {
      profile_id: selectedProfile,
      promotion_policy_id: initialProfilePromotionPolicy().policy_id,
      minimum_profile_status: (requireStatus ?? 'available') as ProfilePromotionStatus,
      enforcement_mode: requireStatus ? 'required' : 'advisory'
    },
    undefined,
    evaluation
  );
  if (profileReport) stdout.write(`${JSON.stringify(decision)}\n`);
  if (!decision.allowed) {
    stderr.write(`${decision.blocking_reasons[0]}\n`);
    return exitUserError;
  }
  return exitSuccess;
}

function runDiffDriver(
  args: readonly string[],
  stdout: Pick<NodeJS.WriteStream, 'write'>,
  stderr: Pick<NodeJS.WriteStream, 'write'>
): number {
  const options = parseDiffDriverOptions(args, stderr);
  if (!options) return exitUserError;
  try {
    printStructuredDiff(
      stdout,
      options.pathName ?? options.newPath,
      readFileSync(options.oldPath, 'utf8'),
      readFileSync(options.newPath, 'utf8')
    );
  } catch (error) {
    stderr.write(`read diff input: ${String(error)}\n`);
    return exitUserError;
  }
  return exitSuccess;
}

function parseDiffDriverOptions(
  args: readonly string[],
  stderr: Pick<NodeJS.WriteStream, 'write'>
): DiffDriverOptions | undefined {
  let pathName: string | undefined;
  const positionals: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === '--path-name') {
      pathName = args[++index];
    } else if (value.startsWith('--')) {
      stderr.write(`unknown diff-driver option ${JSON.stringify(value)}\n`);
      return undefined;
    } else {
      positionals.push(value);
    }
  }

  if (positionals.length === 2) {
    return { pathName, oldPath: positionals[0], newPath: positionals[1] };
  }
  if (positionals.length === 7 || positionals.length === 9) {
    return {
      pathName: pathName ?? positionals[0],
      oldPath: positionals[1],
      newPath: positionals[4]
    };
  }
  stderr.write('diff-driver requires either 2, 7, or 9 positional arguments\n');
  return undefined;
}

function printStructuredDiff(
  stdout: Pick<NodeJS.WriteStream, 'write'>,
  pathName: string,
  oldSource: string,
  newSource: string
): void {
  stdout.write(`structured-diff ${pathName}\n`);
  if (oldSource === newSource) {
    stdout.write('status unchanged\n');
    return;
  }
  stdout.write(
    `status changed\nold-lines ${lineCount(oldSource)}\nnew-lines ${lineCount(newSource)}\n`
  );
}

function runConflicts(
  args: readonly string[],
  stdout: Pick<NodeJS.WriteStream, 'write'>,
  stderr: Pick<NodeJS.WriteStream, 'write'>
): number {
  const [subcommand, ...rest] = args;
  if (subcommand !== 'diff') {
    stderr.write('conflicts requires the diff subcommand\n');
    return exitUserError;
  }
  return runConflictsDiff(rest, stdout, stderr);
}

function runConflictsDiff(
  args: readonly string[],
  stdout: Pick<NodeJS.WriteStream, 'write'>,
  stderr: Pick<NodeJS.WriteStream, 'write'>
): number {
  const options = parseConflictsDiffOptions(args, stderr);
  if (!options) return exitUserError;
  const effectivePath = options.pathName ?? options.filePath;
  try {
    const settings = loadPathSettings(effectivePath);
    const regions = findConflictRegions(
      readFileSync(options.filePath, 'utf8'),
      settings.conflictMarkerSize
    );
    printConflictDiff(stdout, effectivePath, regions);
    return options.exitCode && regions.length > 0 ? exitUnresolvedConflict : exitSuccess;
  } catch (error) {
    stderr.write(`read conflicted file: ${String(error)}\n`);
    return exitUserError;
  }
}

function parseConflictsDiffOptions(
  args: readonly string[],
  stderr: Pick<NodeJS.WriteStream, 'write'>
): ConflictDiffOptions | undefined {
  let pathName: string | undefined;
  let exitCode = false;
  const positionals: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === '--path-name') {
      pathName = args[++index];
    } else if (value === '--exit-code') {
      exitCode = true;
    } else if (value.startsWith('--')) {
      stderr.write(`unknown conflicts diff option ${JSON.stringify(value)}\n`);
      return undefined;
    } else {
      positionals.push(value);
    }
  }
  if (positionals.length !== 1) {
    stderr.write('conflicts diff requires exactly one file path\n');
    return undefined;
  }
  return { pathName, filePath: positionals[0], exitCode };
}

function runLanguages(
  args: readonly string[],
  stdout: Pick<NodeJS.WriteStream, 'write'>,
  stderr: Pick<NodeJS.WriteStream, 'write'>
): number {
  if (args.length !== 1 || args[0] !== '--gitattributes') {
    stderr.write('languages currently requires --gitattributes\n');
    return exitUserError;
  }
  for (const line of [
    '*.go merge=smorg-ts diff=smorg-ts smorg.language=go',
    '*.json merge=smorg-ts diff=smorg-ts smorg.language=json',
    '*.jsonc merge=smorg-ts diff=smorg-ts smorg.language=jsonc'
  ]) {
    stdout.write(`${line}\n`);
  }
  return exitSuccess;
}

function mergeByPath(
  pathName: string,
  language: string | undefined,
  conflictMarkerSize: number,
  ancestorSource: string,
  currentSource: string,
  otherSource: string
): MergeDriverResult {
  switch (normalizeLanguage(language, pathName)) {
    case 'go':
      return mergeGo(otherSource, currentSource, 'go');
    case 'json':
      return merge3Result(
        merge3({
          base_source: ancestorSource,
          ours_source: currentSource,
          theirs_source: otherSource,
          path_name: pathName,
          language: 'json',
          dialect: 'json',
          profile_id: 'json.keyed-object',
          fallback_policy: 'none',
          conflict_marker_size: conflictMarkerSize,
          render_policy: 'canonical'
        })
      );
    case 'jsonc':
      return mergeJson(otherSource, currentSource, 'jsonc');
    default:
      return mergeText(otherSource, currentSource);
  }
}

function merge3Result(result: ReturnType<typeof merge3>): MergeDriverResult {
  if (result.ok && result.merged_source !== undefined) {
    return {
      ok: true,
      diagnostics: result.diagnostics,
      output: result.merged_source,
      owned_regions: result.owned_regions,
      render_report: result.render_report,
      profile: result.profile,
      policies: []
    };
  }
  if (!result.ok && result.conflicted_source !== undefined) {
    return {
      ok: false,
      diagnostics: result.diagnostics,
      output: result.conflicted_source,
      owned_regions: result.owned_regions,
      render_report: result.render_report,
      profile: result.profile,
      policies: []
    };
  }
  return {
    ok: false,
    diagnostics: result.diagnostics,
    owned_regions: result.owned_regions,
    render_report: result.render_report,
    profile: result.profile,
    policies: []
  };
}

function normalizeLanguage(language: string | undefined, pathName: string): string {
  switch (language?.trim().toLowerCase()) {
    case 'go':
    case 'golang':
      return 'go';
    case 'json':
      return 'json';
    case 'jsonc':
    case 'json with comments':
      return 'jsonc';
    case 'plain':
    case 'text':
    case 'plaintext':
    case 'text/plain':
      return 'text';
  }
  switch (path.extname(pathName).toLowerCase()) {
    case '.go':
      return 'go';
    case '.json':
      return 'json';
    case '.jsonc':
      return 'jsonc';
    default:
      return 'text';
  }
}

function loadPathSettings(pathName: string): PathSettings {
  const settings: PathSettings = { conflictMarkerSize: 7 };
  for (const attributesPath of attributeFilesForPath(pathName)) {
    try {
      applyAttributes(settings, pathName, readFileSync(attributesPath, 'utf8'));
    } catch {
      // Missing .gitattributes files are expected.
    }
  }
  return settings;
}

function attributeFilesForPath(pathName: string): string[] {
  const cleanPath = path.normalize(pathName);
  const dir = path.dirname(cleanPath);
  if (dir === '.' || path.isAbsolute(cleanPath) || cleanPath.startsWith('..')) {
    return ['.gitattributes'];
  }
  const files = ['.gitattributes'];
  const parts = dir.split(path.sep).filter(Boolean);
  for (let index = 0; index < parts.length; index += 1) {
    files.push(path.join(...parts.slice(0, index + 1), '.gitattributes'));
  }
  return files;
}

function applyAttributes(settings: PathSettings, pathName: string, source: string): void {
  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const [pattern, ...fields] = line.split(/\s+/u);
    if (!pattern || fields.length === 0 || !attributePatternMatches(pattern, pathName)) continue;
    for (const field of fields) {
      const [key, value] = field.split('=', 2);
      if (!value) continue;
      if (key === 'smorg.language' || key === 'linguist-language') {
        settings.language = value;
      } else if (key === 'smorg.profile') {
        settings.profileId = value;
      } else if (key === 'smorg.requireProfileStatus') {
        settings.requireProfileStatus = value;
      } else if (key === 'conflict-marker-size') {
        const markerSize = Number.parseInt(value, 10);
        if (markerSize > 0) settings.conflictMarkerSize = markerSize;
      }
    }
  }
}

function attributePatternMatches(pattern: string, pathName: string): boolean {
  if (pattern === pathName) return true;
  if (!pattern.includes('/')) {
    return simpleGlobMatches(pattern, path.basename(pathName));
  }
  return simpleGlobMatches(pattern, pathName);
}

function simpleGlobMatches(pattern: string, value: string): boolean {
  if (pattern === '*') return true;
  const wildcard = pattern.indexOf('*');
  if (wildcard < 0) return pattern === value;
  return (
    value.startsWith(pattern.slice(0, wildcard)) && value.endsWith(pattern.slice(wildcard + 1))
  );
}

function findConflictRegions(source: string, markerSize: number): ConflictRegion[] {
  const width = Math.max(1, markerSize);
  const startPrefix = '<'.repeat(width);
  const separatorPrefix = '='.repeat(width);
  const endPrefix = '>'.repeat(width);
  const regions: ConflictRegion[] = [];
  let current: { startLine: number; separatorLine: number } | undefined;

  source.split('\n').forEach((line, index) => {
    const lineNumber = index + 1;
    if (line.startsWith(startPrefix)) {
      current = { startLine: lineNumber, separatorLine: 0 };
    } else if (current && current.separatorLine === 0 && line.startsWith(separatorPrefix)) {
      current.separatorLine = lineNumber;
    } else if (current && line.startsWith(endPrefix)) {
      regions.push({ ...current, endLine: lineNumber });
      current = undefined;
    }
  });
  return regions;
}

function printConflictDiff(
  stdout: Pick<NodeJS.WriteStream, 'write'>,
  pathName: string,
  regions: readonly ConflictRegion[]
): void {
  stdout.write(`conflicts ${pathName}\n`);
  stdout.write(`count ${regions.length}\n`);
  regions.forEach((region, index) => {
    stdout.write(
      `conflict ${index + 1} lines ${region.startLine}-${region.endLine} separator ${region.separatorLine}\n`
    );
  });
}

function lineCount(source: string): number {
  if (source.length === 0) return 0;
  return source.endsWith('\n') ? source.split('\n').length - 1 : source.split('\n').length;
}

function printDiagnostics(
  stderr: Pick<NodeJS.WriteStream, 'write'>,
  result: MergeResult<string>
): void {
  result.diagnostics.forEach((diagnostic) => {
    stderr.write(`${diagnostic.category}: ${diagnostic.message}\n`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(run(process.argv.slice(2), process.stdout, process.stderr));
}
