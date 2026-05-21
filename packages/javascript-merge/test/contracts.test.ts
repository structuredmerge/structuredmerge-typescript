import { describe, expect, it } from 'vitest';
import {
  javaScriptFeatureProfile,
  matchJavaScriptOwners,
  mergeJavaScript,
  parseJavaScript
} from '../src/index';

describe('javascript-merge', () => {
  it('extracts module owners', () => {
    const result = parseJavaScript(
      'function greet(name) {\n  return name;\n}\n\nfunction helper(name) {\n  return name.toLowerCase();\n}\n',
      'javascript'
    );

    expect(result.ok).toBe(true);
    expect(result.analysis?.owners).toEqual([
      { path: '/declarations/greet', ownerKind: 'declaration', matchKey: 'greet' },
      { path: '/declarations/helper', ownerKind: 'declaration', matchKey: 'helper' }
    ]);
  });

  it('fails closed when import records are raw source text', () => {
    const result = parseJavaScript(
      "import { formatName } from './format-name';\n\nfunction greet() {}\n",
      'javascript'
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.message).toContain('structured import module fields');
  });

  it('matches module owners by path equality', () => {
    const template = parseJavaScript(
      'function greet(name) {\n  return name;\n}\n\nfunction helper(name) {\n  return name.toUpperCase();\n}\n',
      'javascript'
    );
    const destination = parseJavaScript(
      'function greet(name) {\n  return name.trim();\n}\n',
      'javascript'
    );

    const result = matchJavaScriptOwners(template.analysis!, destination.analysis!);
    expect(result.matched).toEqual([
      { templatePath: '/declarations/greet', destinationPath: '/declarations/greet' }
    ]);
    expect(result.unmatchedTemplate).toEqual(['/declarations/helper']);
    expect(result.unmatchedDestination).toEqual([]);
  });

  it('merges destination imports and declaration text', () => {
    const result = mergeJavaScript(
      'function greet(name) {\n  return name;\n}\n\nfunction helper(name) {\n  return name.toUpperCase();\n}\n',
      'function greet(name) {\n  return name.trim();\n}\n',
      'javascript'
    );

    expect(result.ok).toBe(true);
    expect(result.output).toBe(
      'function greet(name) {\n  return name.trim();\n}\n\nfunction helper(name) {\n  return name.toUpperCase();\n}\n'
    );
  });

  it('reports destination parse failures distinctly', () => {
    const result = mergeJavaScript(
      'function greet(name) {\n  return name;\n}\n',
      'function greet(name) {\n  return name\n',
      'javascript'
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.category).toBe('destination_parse_error');
  });

  it('exposes the JavaScript family profile', () => {
    expect(javaScriptFeatureProfile()).toEqual({
      family: 'javascript',
      supportedDialects: ['javascript'],
      supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
    });
  });
});
