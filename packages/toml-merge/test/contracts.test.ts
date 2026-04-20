import { describe, expect, it } from 'vitest';
import { matchTomlOwners, mergeToml, parseToml, tomlFeatureProfile } from '../src/index';

describe('toml-merge', () => {
  it('parses valid toml documents', () => {
    const result = parseToml(
      '# project metadata\nname = "structuredmerge"\nenabled = true\n\n[package]\nversion = "0.1.0"\n',
      'toml'
    );

    expect(result.ok).toBe(true);
    expect(result.analysis?.rootKind).toBe('table');
  });

  it('reports invalid toml input as parse_error', () => {
    const result = parseToml('name = "structuredmerge"\n[package\nversion = "0.1.0"\n', 'toml');

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.category).toBe('parse_error');
  });

  it('extracts stable owners for tables and arrays', () => {
    const result = parseToml(
      'title = "Structured Merge"\nenabled = true\ntags = ["merge", "toml"]\n\n[package]\nname = "structuredmerge"\nversion = "0.1.0"\n',
      'toml'
    );

    expect(result.ok).toBe(true);
    expect(result.analysis?.owners).toEqual([
      { path: '/enabled', ownerKind: 'key_value', matchKey: 'enabled' },
      { path: '/package', ownerKind: 'table', matchKey: 'package' },
      { path: '/package/name', ownerKind: 'key_value', matchKey: 'name' },
      { path: '/package/version', ownerKind: 'key_value', matchKey: 'version' },
      { path: '/tags', ownerKind: 'key_value', matchKey: 'tags' },
      { path: '/tags/0', ownerKind: 'array_item' },
      { path: '/tags/1', ownerKind: 'array_item' },
      { path: '/title', ownerKind: 'key_value', matchKey: 'title' }
    ]);
  });

  it('matches owners by stable path equality', () => {
    const template = parseToml(
      'title = "Structured Merge"\ntags = ["merge", "toml"]\n\n[package]\nname = "structuredmerge"\nversion = "0.1.0"\n',
      'toml'
    );
    const destination = parseToml(
      'title = "Structured Merge"\ntags = ["merge"]\nextra = 1\n\n[package]\nname = "structuredmerge"\nversion = "0.2.0"\n',
      'toml'
    );

    const result = matchTomlOwners(template.analysis!, destination.analysis!);
    expect(result.matched).toEqual([
      { templatePath: '/package', destinationPath: '/package' },
      { templatePath: '/package/name', destinationPath: '/package/name' },
      { templatePath: '/package/version', destinationPath: '/package/version' },
      { templatePath: '/tags', destinationPath: '/tags' },
      { templatePath: '/tags/0', destinationPath: '/tags/0' },
      { templatePath: '/title', destinationPath: '/title' }
    ]);
    expect(result.unmatchedTemplate).toEqual(['/tags/1']);
    expect(result.unmatchedDestination).toEqual(['/extra']);
  });

  it('merges tables recursively with destination-wins arrays', () => {
    const result = mergeToml(
      'title = "Structured Merge"\n\n[package]\nname = "structuredmerge"\ntags = ["template"]\nversion = "0.1.0"\n\n[package.meta]\nenabled = false\n',
      '[package]\ntags = ["destination"]\nversion = "0.2.0"\n\n[package.meta]\nauthors = ["pb"]\nrelease = true\n',
      'toml'
    );

    expect(result.ok).toBe(true);
    expect(result.output).toBe(
      'title = "Structured Merge"\n\n[package]\nname = "structuredmerge"\ntags = ["destination"]\nversion = "0.2.0"\n\n[package.meta]\nauthors = ["pb"]\nenabled = false\nrelease = true\n'
    );
    expect(result.policies).toEqual([{ surface: 'array', name: 'destination_wins_array' }]);
  });

  it('reports destination parse failures distinctly during merge', () => {
    const result = mergeToml(
      'title = "Structured Merge"\n',
      'title = "Structured Merge"\n[package\nname = "structuredmerge"\n',
      'toml'
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.category).toBe('destination_parse_error');
  });

  it('exposes the TOML family profile', () => {
    expect(tomlFeatureProfile()).toEqual({
      family: 'toml',
      supportedDialects: ['toml'],
      supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
    });
  });
});
