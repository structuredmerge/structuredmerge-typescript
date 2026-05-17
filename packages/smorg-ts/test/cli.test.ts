import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { exitSuccess, exitUnresolvedConflict, exitUserError, run } from '../src/cli';

const repoRoot = process.cwd();

function writer() {
  let output = '';
  return {
    stream: {
      write: (chunk: string) => {
        output += chunk;
        return true;
      }
    },
    output: () => output
  };
}

interface GitDriverJsonFixture {
  readonly cases: readonly GitDriverJsonCase[];
}

interface GitDriverJsonCase {
  readonly case_id: string;
  readonly path_name: string;
  readonly base_source: string;
  readonly ours_source: string;
  readonly theirs_source: string;
  readonly expected: {
    readonly exit_code: number;
    readonly merged_json?: unknown;
    readonly merged_source?: string;
    readonly conflicted_source_contains?: readonly string[];
    readonly stderr_contains: readonly string[];
  };
}

interface GitDriverFallbackFixture {
  readonly cases: readonly GitDriverFallbackCase[];
}

interface GitDriverFallbackCase {
  readonly case_id: string;
  readonly path_name: string;
  readonly base_source: string;
  readonly ours_source: string;
  readonly theirs_source: string;
  readonly options: {
    readonly strict?: boolean;
    readonly fallback?: string;
  };
  readonly expected: {
    readonly exit_code: number;
    readonly merged_source?: string;
    readonly source_contains?: readonly string[];
    readonly stderr_contains: readonly string[];
  };
}

function readGitDriverJsonFixture(): GitDriverJsonFixture {
  const source = readFileSync(
    path.join(
      repoRoot,
      '..',
      'fixtures',
      'diagnostics',
      'slice-951-git-driver-json-integration',
      'git-driver-json-integration.json'
    ),
    'utf8'
  );
  return JSON.parse(source) as GitDriverJsonFixture;
}

function readGitDriverFallbackFixture(): GitDriverFallbackFixture {
  const source = readFileSync(
    path.join(
      repoRoot,
      '..',
      'fixtures',
      'diagnostics',
      'slice-954-git-driver-fallback',
      'git-driver-fallback.json'
    ),
    'utf8'
  );
  return JSON.parse(source) as GitDriverFallbackFixture;
}

function runGit(dir: string, ...args: readonly string[]): void {
  execFileSync('git', args, {
    cwd: dir,
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1' },
    stdio: 'pipe'
  });
}

describe('smorg-ts cli', () => {
  let previousCwd: string;
  let dir: string;

  beforeEach(() => {
    previousCwd = process.cwd();
    dir = mkdtempSync(path.join(tmpdir(), 'smorg-ts-test-'));
    process.chdir(dir);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    rmSync(dir, { force: true, recursive: true });
  });

  function write(name: string, source: string): string {
    const filePath = path.join(dir, name);
    writeFileSync(filePath, source);
    return filePath;
  }

  it('updates the current file in merge-driver mode', () => {
    const ancestor = write('ancestor.json', '{"name":"structuredmerge"}');
    const current = write('current.tmp', '{"name":"structuredmerge","current":true}');
    const other = write('other.tmp', '{"name":"structuredmerge","other":true}');
    const stdout = writer();
    const stderr = writer();

    const exit = run(
      ['merge-driver', '--path-name', 'package.json', ancestor, current, other],
      stdout.stream,
      stderr.stream
    );

    expect(exit, stderr.output()).toBe(exitSuccess);
    const merged = readFileSync(current, 'utf8');
    expect(merged).toContain('"current":true');
    expect(merged).toContain('"other":true');
    expect(stdout.output()).toBe('');
  });

  it('uses smorg.language from gitattributes', () => {
    writeFileSync('.gitattributes', '*.data smorg.language=json\n');
    const ancestor = write('ancestor.tmp', '{"name":"structuredmerge"}');
    const current = write('current.tmp', '{"name":"structuredmerge","current":true}');
    const other = write('other.tmp', '{"name":"structuredmerge","other":true}');
    const stdout = writer();
    const stderr = writer();

    const exit = run(
      ['merge-driver', ancestor, current, other, 'package.data'],
      stdout.stream,
      stderr.stream
    );

    expect(exit, stderr.output()).toBe(exitSuccess);
    const merged = readFileSync(current, 'utf8');
    expect(merged).toContain('"current":true');
    expect(merged).toContain('"other":true');
  });

  it('returns conflict exit code for strict merge failures', () => {
    const ancestor = write('ancestor.json', '{"name":"structuredmerge"}');
    const current = write('current.json', '{"name":');
    const other = write('other.json', '{"other":true}');
    const stdout = writer();
    const stderr = writer();

    const exit = run(
      ['merge-driver', '--strict', ancestor, current, other, 'package.json'],
      stdout.stream,
      stderr.stream
    );

    expect(exit).toBe(exitUnresolvedConflict);
    expect(stderr.output()).toContain('parse_error');
    expect(stderr.output()).toContain('ours parse error');
  });

  it('writes full-file conflict markers for non-strict fallback failures', () => {
    const ancestor = write('ancestor.json', '{"name":"structuredmerge"}');
    const current = write('current.json', '{"name":');
    const other = write('other.json', '{"other":true}');
    const stdout = writer();
    const stderr = writer();

    const exit = run(
      ['merge-driver', ancestor, current, other, 'package.json'],
      stdout.stream,
      stderr.stream
    );

    expect(exit).toBe(exitUnresolvedConflict);
    const currentSource = readFileSync(current, 'utf8');
    for (const needle of ['<<<<<<< ours', '||||||| base', '=======', '>>>>>>> theirs']) {
      expect(currentSource).toContain(needle);
    }
    expect(stderr.output()).toContain('parse_error');
  });

  it('conforms to the git-driver fallback fixture', () => {
    const fixture = readGitDriverFallbackFixture();
    for (const testCase of fixture.cases) {
      const ancestor = write('ancestor.json', testCase.base_source);
      const current = write('current.json', testCase.ours_source);
      const other = write('other.json', testCase.theirs_source);
      const args = ['merge-driver'];
      if (testCase.options.strict) args.push('--strict');
      if (testCase.options.fallback && testCase.options.fallback !== 'full-file') {
        args.push('--fallback', testCase.options.fallback);
      }
      args.push(ancestor, current, other, testCase.path_name);
      const stdout = writer();
      const stderr = writer();

      const exit = run(args, stdout.stream, stderr.stream);
      const currentSource = readFileSync(current, 'utf8');
      expect(exit, `${testCase.case_id} stderr=${stderr.output()}`).toBe(
        testCase.expected.exit_code
      );
      if (testCase.expected.merged_source !== undefined) {
        expect(currentSource, testCase.case_id).toBe(testCase.expected.merged_source);
      }
      for (const needle of testCase.expected.source_contains ?? []) {
        expect(currentSource, testCase.case_id).toContain(needle);
      }
      for (const needle of testCase.expected.stderr_contains) {
        expect(stderr.output(), testCase.case_id).toContain(needle);
      }
    }
  });

  it('uses the ancestor for JSON same-key conflicts', () => {
    const ancestor = write('ancestor.json', '{"name":"structuredmerge"}');
    const current = write('current.json', '{"name":"ours"}');
    const other = write('other.json', '{"name":"theirs"}');
    const stdout = writer();
    const stderr = writer();

    const exit = run(
      ['merge-driver', '--strict', ancestor, current, other, 'package.json'],
      stdout.stream,
      stderr.stream
    );

    expect(exit).toBe(exitUnresolvedConflict);
    expect(stderr.output()).toContain('merge_conflict');
    const currentSource = readFileSync(current, 'utf8');
    for (const needle of ['<<<<<<< ours', '||||||| base', '=======', '>>>>>>> theirs']) {
      expect(currentSource).toContain(needle);
    }
  });

  it('conforms to the git-driver JSON integration fixture in a repository', () => {
    try {
      execFileSync('git', ['--version'], { stdio: 'pipe' });
    } catch {
      return;
    }
    const fixture = readGitDriverJsonFixture();
    for (const testCase of fixture.cases) {
      const caseDir = mkdtempSync(path.join(tmpdir(), 'smorg-ts-git-driver-'));
      try {
        runGit(caseDir, 'init');
        runGit(caseDir, 'config', 'user.email', 'smorg-ts@example.invalid');
        runGit(caseDir, 'config', 'user.name', 'smorg-ts test');
        writeFileSync(path.join(caseDir, '.gitattributes'), '*.json merge=smorg-ts smorg.language=json\n');
        writeFileSync(path.join(caseDir, testCase.path_name), testCase.base_source);
        runGit(caseDir, 'add', '.');
        runGit(caseDir, 'commit', '-m', 'base');

        const ancestor = path.join(caseDir, 'ancestor.tmp');
        const current = path.join(caseDir, testCase.path_name);
        const other = path.join(caseDir, 'other.tmp');
        writeFileSync(ancestor, testCase.base_source);
        writeFileSync(current, testCase.ours_source);
        writeFileSync(other, testCase.theirs_source);
        const stdout = writer();
        const stderr = writer();

        const exit = run(
          ['merge-driver', '--strict', ancestor, current, other, testCase.path_name],
          stdout.stream,
          stderr.stream
        );

        expect(exit, `${testCase.case_id} stderr=${stderr.output()}`).toBe(
          testCase.expected.exit_code
        );
        for (const expected of testCase.expected.stderr_contains) {
          expect(stderr.output(), testCase.case_id).toContain(expected);
        }
        const mergedSource = readFileSync(current, 'utf8');
        if (testCase.expected.merged_json !== undefined) {
          expect(JSON.parse(mergedSource), testCase.case_id).toEqual(testCase.expected.merged_json);
        } else if (testCase.expected.merged_source !== undefined) {
          expect(mergedSource, testCase.case_id).toBe(testCase.expected.merged_source);
        }
        for (const expected of testCase.expected.conflicted_source_contains ?? []) {
          expect(mergedSource, testCase.case_id).toContain(expected);
        }
      } finally {
        rmSync(caseDir, { force: true, recursive: true });
      }
    }
  });

  it('supports check-only exit-code without writing', () => {
    const ancestor = write('ancestor.json', '{"name":"structuredmerge"}');
    const current = write('current.json', '{"name":"structuredmerge","current":true}');
    const other = write('other.json', '{"name":"structuredmerge","other":true}');
    const stdout = writer();
    const stderr = writer();

    const exit = run(
      ['merge-driver', '--check-only', '--exit-code', ancestor, current, other, 'package.json'],
      stdout.stream,
      stderr.stream
    );

    expect(exit).toBe(exitUnresolvedConflict);
    expect(readFileSync(current, 'utf8')).not.toContain('"other":true');
  });

  it('prints profile report and blocks unmet required profile status', () => {
    const ancestor = write('ancestor.json', '{"name":"structuredmerge"}');
    const current = write('current.json', '{"name":"structuredmerge","current":true}');
    const other = write('other.json', '{"name":"structuredmerge","other":true}');
    const stdout = writer();
    const stderr = writer();

    const exit = run(
      [
        'merge-driver',
        '--profile',
        'json.keyed-object',
        '--profile-report',
        '--require-profile-status',
        'recommended',
        ancestor,
        current,
        other,
        'package.json'
      ],
      stdout.stream,
      stderr.stream
    );

    expect(exit).toBe(exitUserError);
    expect(stdout.output()).toContain('"rejection_code":"profile_status_unmet"');
    expect(stderr.output()).toContain('profile status available is below required recommended');
  });

  it('uses smorg profile attributes', () => {
    writeFileSync(
      '.gitattributes',
      '*.json smorg.profile=json.keyed-object smorg.requireProfileStatus=recommended\n'
    );
    const ancestor = write('ancestor.json', '{"name":"structuredmerge"}');
    const current = write('current.json', '{"name":"structuredmerge","current":true}');
    const other = write('other.json', '{"name":"structuredmerge","other":true}');
    const stdout = writer();
    const stderr = writer();

    const exit = run(
      ['merge-driver', '--profile-report', ancestor, current, other, 'package.json'],
      stdout.stream,
      stderr.stream
    );

    expect(exit).toBe(exitUserError);
    expect(stdout.output()).toContain('"profile_id":"json.keyed-object"');
    expect(stdout.output()).toContain('"rejection_code":"profile_status_unmet"');
  });

  it('supports diff-driver git arities', () => {
    for (const argumentCount of [7, 9]) {
      const oldPath = write(`old-${argumentCount}.json`, '{"old":true}');
      const newPath = write(`new-${argumentCount}.json`, '{"new":true}');
      const args = [
        'diff-driver',
        'package.json',
        oldPath,
        'abc123',
        '100644',
        newPath,
        'def456',
        '100644'
      ];
      if (argumentCount === 9) args.push('a/', 'b/');
      const stdout = writer();
      const stderr = writer();

      const exit = run(args, stdout.stream, stderr.stream);

      expect(exit, stderr.output()).toBe(exitSuccess);
      expect(stdout.output()).toContain('structured-diff package.json');
    }
  });

  it('reports conflict regions', () => {
    const conflicted = write(
      'conflicted.go',
      'package main\n<<<<<<< ours\nfunc Current() {}\n=======\nfunc Other() {}\n>>>>>>> theirs\n'
    );
    const stdout = writer();
    const stderr = writer();

    const exit = run(
      ['conflicts', 'diff', '--path-name', 'main.go', '--exit-code', conflicted],
      stdout.stream,
      stderr.stream
    );

    expect(exit).toBe(exitUnresolvedConflict);
    expect(stdout.output()).toContain('conflicts main.go');
    expect(stdout.output()).toContain('conflict 1 lines 2-6 separator 4');
  });

  it('prints gitattributes', () => {
    const stdout = writer();
    const stderr = writer();

    const exit = run(['languages', '--gitattributes'], stdout.stream, stderr.stream);

    expect(exit, stderr.output()).toBe(exitSuccess);
    expect(stdout.output()).toContain('*.go merge=smorg-ts diff=smorg-ts smorg.language=go');
  });
});
