import { describe, expect, it } from 'vitest';
import { matchRustOwners, mergeRust, parseRust, rustFeatureProfile } from '../src/index';

describe('rust-merge', () => {
  it('extracts module owners', () => {
    const result = parseRust(
      'use std::fmt::Debug;\nuse std::fmt::Display;\n\npub struct Greeter;\n\npub fn greet(name: &str) -> String {\n  name.to_string()\n}\n',
      'rust'
    );

    expect(result.ok).toBe(true);
    expect(result.analysis?.owners).toEqual([
      { path: '/imports/0', ownerKind: 'import', matchKey: 'std::fmt::Debug' },
      { path: '/imports/1', ownerKind: 'import', matchKey: 'std::fmt::Display' },
      { path: '/declarations/Greeter', ownerKind: 'declaration', matchKey: 'Greeter' },
      { path: '/declarations/greet', ownerKind: 'declaration', matchKey: 'greet' }
    ]);
  });

  it('matches module owners by path equality', () => {
    const template = parseRust(
      'use std::fmt::Debug;\n\npub struct Greeter;\n\npub fn greet(name: &str) -> String {\n  name.to_string()\n}\n',
      'rust'
    );
    const destination = parseRust(
      'use std::fmt::Debug;\nuse std::fmt::Display;\n\npub fn greet(name: &str) -> String {\n  name.to_uppercase()\n}\n',
      'rust'
    );

    const result = matchRustOwners(template.analysis!, destination.analysis!);
    expect(result.matched).toEqual([
      { templatePath: '/imports/0', destinationPath: '/imports/0' },
      { templatePath: '/declarations/greet', destinationPath: '/declarations/greet' }
    ]);
    expect(result.unmatchedTemplate).toEqual(['/declarations/Greeter']);
    expect(result.unmatchedDestination).toEqual(['/imports/1']);
  });

  it('merges destination imports and declaration text', () => {
    const result = mergeRust(
      'use std::fmt::Debug;\n\npub struct Greeter;\n\npub fn greet(name: &str) -> String {\n  name.to_string()\n}\n',
      'use std::fmt::Display;\nuse std::fmt::Debug;\n\npub fn greet(name: &str) -> String {\n  name.to_uppercase()\n}\n',
      'rust'
    );

    expect(result.ok).toBe(true);
    expect(result.output).toBe(
      'use std::fmt::Display;\nuse std::fmt::Debug;\n\npub fn greet(name: &str) -> String {\n  name.to_uppercase()\n}\n\npub struct Greeter;\n'
    );
  });

  it('reports destination parse failures distinctly', () => {
    const result = mergeRust(
      'pub fn greet(name: &str) -> String {\n  name.to_string()\n}\n',
      'pub fn greet(name: &str) -> String {\n  name.to_string()\n',
      'rust'
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.category).toBe('destination_parse_error');
  });

  it('exposes the Rust family profile', () => {
    expect(rustFeatureProfile()).toEqual({
      family: 'rust',
      supportedDialects: ['rust'],
      supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
    });
  });
});
