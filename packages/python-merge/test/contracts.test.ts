import { describe, expect, it } from 'vitest';
import { matchPythonOwners, mergePython, parsePython, pythonFeatureProfile } from '../src/index';

describe('python-merge', () => {
  it('extracts module owners', () => {
    const result = parsePython(
      'class Greeter:\n    def __init__(self, name):\n        self.name = name\n\n\ndef format_name(name):\n    return name.title()\n',
      'python'
    );

    expect(result.ok).toBe(true);
    expect(result.analysis?.owners).toEqual([
      { path: '/declarations/Greeter', ownerKind: 'declaration', matchKey: 'Greeter' },
      { path: '/declarations/format_name', ownerKind: 'declaration', matchKey: 'format_name' }
    ]);
  });

  it('fails closed when import records are raw source text', () => {
    const result = parsePython('import os\n\nclass Greeter:\n    pass\n', 'python');

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.message).toContain('structured import module fields');
  });

  it('matches module owners by path equality', () => {
    const template = parsePython(
      'class Greeter:\n    pass\n\ndef format_name(name):\n    return name\n\ndef greet(name):\n    return name\n',
      'python'
    );
    const destination = parsePython(
      'class Greeter:\n    pass\n\ndef greet(name):\n    return name.title()\n',
      'python'
    );

    const result = matchPythonOwners(template.analysis!, destination.analysis!);
    expect(result.matched).toEqual([
      { templatePath: '/declarations/Greeter', destinationPath: '/declarations/Greeter' },
      { templatePath: '/declarations/greet', destinationPath: '/declarations/greet' }
    ]);
    expect(result.unmatchedTemplate).toEqual(['/declarations/format_name']);
    expect(result.unmatchedDestination).toEqual([]);
  });

  it('merges destination imports and declaration text', () => {
    const result = mergePython(
      'class Greeter:\n    pass\n\ndef format_name(name):\n    return name.title()\n',
      'def format_name(name):\n    return name\n',
      'python'
    );

    expect(result.ok).toBe(true);
    expect(result.output).toBe(
      'def format_name(name):\n    return name\n\nclass Greeter:\n    pass\n'
    );
  });

  it('reports destination parse failures distinctly', () => {
    const result = mergePython('def greet(name):\n  return name\n', 'def greet(name)\n', 'python');
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.category).toBe('destination_parse_error');
  });

  it('exposes the Python family profile', () => {
    expect(pythonFeatureProfile()).toEqual({
      family: 'python',
      supportedDialects: ['python'],
      supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
    });
  });
});
