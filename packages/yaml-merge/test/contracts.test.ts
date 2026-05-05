import { describe, expect, it } from 'vitest';
import { registeredBackends } from '@structuredmerge/tree-haver';
import { matchYamlOwners, mergeYaml, parseYaml, yamlFeatureProfile } from '../src/index';

describe('yaml-merge', () => {
  it('parses valid yaml documents', () => {
    const result = parseYaml(
      '# project metadata\nname: structuredmerge\nenabled: true\n\npackage:\n  version: 0.1.0\n',
      'yaml'
    );

    expect(result.ok).toBe(true);
    expect(result.analysis?.rootKind).toBe('mapping');
  });

  it('reports invalid yaml input as parse_error', () => {
    const result = parseYaml(
      'name: structuredmerge\npackage:\n  version: 0.1.0\n   bad_indent: true\n',
      'yaml'
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.category).toBe('parse_error');
  });

  it('extracts stable owners for mappings and sequences', () => {
    const result = parseYaml(
      'title: Structured Merge\nenabled: true\ntags:\n  - merge\n  - yaml\npackage:\n  name: structuredmerge\n  version: 0.1.0\n',
      'yaml'
    );

    expect(result.ok).toBe(true);
    expect(result.analysis?.owners).toEqual([
      { path: '/enabled', ownerKind: 'key_value', matchKey: 'enabled' },
      { path: '/package', ownerKind: 'mapping', matchKey: 'package' },
      { path: '/package/name', ownerKind: 'key_value', matchKey: 'name' },
      { path: '/package/version', ownerKind: 'key_value', matchKey: 'version' },
      { path: '/tags', ownerKind: 'key_value', matchKey: 'tags' },
      { path: '/tags/0', ownerKind: 'sequence_item' },
      { path: '/tags/1', ownerKind: 'sequence_item' },
      { path: '/title', ownerKind: 'key_value', matchKey: 'title' }
    ]);
  });

  it('matches owners by stable path equality', () => {
    const template = parseYaml(
      'title: Structured Merge\ntags:\n  - merge\n  - yaml\npackage:\n  name: structuredmerge\n  version: 0.1.0\n',
      'yaml'
    );
    const destination = parseYaml(
      'title: Structured Merge\ntags:\n  - merge\nextra: 1\npackage:\n  name: structuredmerge\n  version: 0.2.0\n',
      'yaml'
    );

    const result = matchYamlOwners(template.analysis!, destination.analysis!);
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

  it('merges mappings recursively with destination-wins sequences', () => {
    const result = mergeYaml(
      'title: Structured Merge\npackage:\n  name: structuredmerge\n  tags:\n    - template\n  version: 0.1.0\n  meta:\n    enabled: false\n',
      'package:\n  tags:\n    - destination\n  version: 0.2.0\n  meta:\n    authors:\n      - pb\n    release: true\n',
      'yaml'
    );

    expect(result.ok).toBe(true);
    expect(result.output).toBe(
      'title: "Structured Merge"\npackage:\n  name: structuredmerge\n  tags:\n    - destination\n  version: 0.2.0\n  meta:\n    enabled: false\n    authors:\n      - pb\n    release: true\n'
    );
    expect(result.policies).toEqual([{ surface: 'array', name: 'destination_wins_array' }]);
  });

  it('reports destination parse failures distinctly during merge', () => {
    const result = mergeYaml(
      'title: Structured Merge\n',
      'title: Structured Merge\npackage:\n  name: structuredmerge\n    version: 0.1.0\n',
      'yaml'
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.category).toBe('destination_parse_error');
  });

  it('exposes the YAML family profile', () => {
    expect(yamlFeatureProfile()).toEqual({
      family: 'yaml',
      supportedDialects: ['yaml'],
      supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
    });
    expect(registeredBackends()).toContainEqual({
      id: 'kreuzberg-language-pack',
      family: 'tree-sitter'
    });
  });
});
