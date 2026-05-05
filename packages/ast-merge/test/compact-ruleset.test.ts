import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCompactRuleset } from '../src/index';

function rulesetFixtures(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const child = path.join(root, entry);
    if (statSync(child).isDirectory()) return rulesetFixtures(child);
    return child.endsWith('.smrules') ? [child] : [];
  });
}

describe('parseCompactRuleset', () => {
  it('parses shared compact ruleset fixtures', () => {
    const root = path.resolve(import.meta.dirname, '..', '..', '..', '..', 'fixtures', 'rulesets');
    const fixtures = rulesetFixtures(root);
    expect(fixtures.length).toBeGreaterThan(0);
    for (const fixture of fixtures) {
      const result = parseCompactRuleset(readFileSync(fixture, 'utf8'));
      expect(result.ok, `${fixture}: ${JSON.stringify(result.diagnostics)}`).toBe(true);
      expect(result.analysis?.directives.length).toBeGreaterThan(0);
    }
  });

  it('rejects malformed compact ruleset edges', () => {
    const cases = {
      'missing-required':
        'format json\nowners line_bound_statements\nmatch stable_path\nread native_read_portable_write\n',
      'repeated-format':
        'format json\nformat yaml\nowners line_bound_statements\nmatch stable_path\nread native_read_portable_write\nattach layout_only\n',
      'unknown-read':
        'format json\nowners line_bound_statements\nmatch stable_path\nread imaginary\nattach layout_only\n',
      'unknown-directive':
        'format json\nowners line_bound_statements\nmatch stable_path\nread native_read_portable_write\nattach layout_only\nmystery value\n'
    };
    for (const [name, source] of Object.entries(cases)) {
      const result = parseCompactRuleset(source);
      expect(result.ok, name).toBe(false);
      expect(result.diagnostics.length, name).toBeGreaterThan(0);
    }
  });
});
