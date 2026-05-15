import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { exitSuccess, exitUnresolvedConflict, run } from '../src/cli';

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
    expect(stderr.output()).toContain('destination_parse_error');
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
