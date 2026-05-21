import { describe, expect, it } from 'vitest';
import {
  matchTypeScriptOwners,
  mergeTypeScript,
  parseTypeScript,
  typeScriptFeatureProfile
} from '../src/index';

describe('typescript-merge', () => {
  it('extracts module owners', () => {
    const result = parseTypeScript(
      'export function greet(name: string) {\n  return name;\n}\n\nexport interface Person {\n  name: string;\n}\n',
      'typescript'
    );

    expect(result.ok).toBe(true);
    expect(result.analysis?.owners).toEqual([
      { path: '/declarations/Person', ownerKind: 'declaration', matchKey: 'Person' },
      { path: '/declarations/greet', ownerKind: 'declaration', matchKey: 'greet' }
    ]);
  });

  it('fails closed when import records are raw source text', () => {
    const result = parseTypeScript(
      "import { foo } from './foo';\n\nexport function greet() {}\n",
      'typescript'
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.message).toContain('structured import module fields');
  });

  it('matches module owners by path equality', () => {
    const template = parseTypeScript(
      'export function greet(name: string) {\n  return name;\n}\n\nexport interface Person {\n  name: string;\n}\n',
      'typescript'
    );
    const destination = parseTypeScript(
      'export function greet(name: string) {\n  return name.toUpperCase();\n}\n',
      'typescript'
    );

    const result = matchTypeScriptOwners(template.analysis!, destination.analysis!);
    expect(result.matched).toEqual([
      { templatePath: '/declarations/greet', destinationPath: '/declarations/greet' }
    ]);
    expect(result.unmatchedTemplate).toEqual(['/declarations/Person']);
    expect(result.unmatchedDestination).toEqual([]);
  });

  it('merges destination imports and declaration text', () => {
    const result = mergeTypeScript(
      'export function greet(name: string) {\n  return name;\n}\n\nexport interface Person {\n  name: string;\n}\n',
      'export function greet(name: string) {\n  return name.toUpperCase();\n}\n',
      'typescript'
    );

    expect(result.ok).toBe(true);
    expect(result.output).toBe(
      'export function greet(name: string) {\n  return name.toUpperCase();\n}\n\nexport interface Person {\n  name: string;\n}\n'
    );
  });

  it('reports destination parse failures distinctly', () => {
    const result = mergeTypeScript(
      'export function greet(name: string) {\n  return name;\n}\n',
      'export function greet(name: string) {\n  return name.toUpperCase();\n',
      'typescript'
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.category).toBe('destination_parse_error');
  });

  it('exposes the TypeScript family profile', () => {
    expect(typeScriptFeatureProfile()).toEqual({
      family: 'typescript',
      supportedDialects: ['typescript'],
      supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
    });
  });
});
