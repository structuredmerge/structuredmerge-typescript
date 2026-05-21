import { describe, expect, it } from 'vitest';
import { goFeatureProfile, matchGoOwners, mergeGo, parseGo } from '../src/index';

describe('go-merge', () => {
  it('extracts module owners', () => {
    const result = parseGo(
      'func FormatName(name string) string {\n  return name\n}\n\nfunc Greet(name string) string {\n  return FormatName(name)\n}\n',
      'go'
    );

    expect(result.ok).toBe(true);
    expect(result.analysis?.owners).toEqual([
      { path: '/declarations/FormatName', ownerKind: 'declaration', matchKey: 'FormatName' },
      { path: '/declarations/Greet', ownerKind: 'declaration', matchKey: 'Greet' }
    ]);
  });

  it('fails closed when import records are raw source text', () => {
    const result = parseGo(
      'import "fmt"\n\nfunc Greet(name string) string {\n  return name\n}\n',
      'go'
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.message).toContain('structured import module fields');
  });

  it('matches module owners by path equality', () => {
    const template = parseGo(
      'func FormatName(name string) string {\n  return name\n}\n\nfunc Greet(name string) string {\n  return FormatName(name)\n}\n',
      'go'
    );
    const destination = parseGo('func Greet(name string) string {\n  return name\n}\n', 'go');

    const result = matchGoOwners(template.analysis!, destination.analysis!);
    expect(result.matched).toEqual([
      { templatePath: '/declarations/Greet', destinationPath: '/declarations/Greet' }
    ]);
    expect(result.unmatchedTemplate).toEqual(['/declarations/FormatName']);
    expect(result.unmatchedDestination).toEqual([]);
  });

  it('merges destination imports and declaration text', () => {
    const result = mergeGo(
      'func FormatName(name string) string {\n  return name\n}\n\nfunc Greet(name string) string {\n  return FormatName(name)\n}\n',
      'func Greet(name string) string {\n  return name\n}\n',
      'go'
    );

    expect(result.ok).toBe(true);
    expect(result.output).toBe(
      'func Greet(name string) string {\n  return name\n}\n\nfunc FormatName(name string) string {\n  return name\n}\n'
    );
  });

  it('reports destination parse failures distinctly', () => {
    const result = mergeGo(
      'func Greet(name string) string {\n  return name\n}\n',
      'func Greet(name string) string {\n  return name\n',
      'go'
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.category).toBe('destination_parse_error');
  });

  it('exposes the Go family profile', () => {
    expect(goFeatureProfile()).toEqual({
      family: 'go',
      supportedDialects: ['go'],
      supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
    });
  });
});
