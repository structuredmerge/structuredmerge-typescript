import { describe, expect, it } from 'vitest';
import { matchJsonOwners, mergeJson, parseJson, parseJsonWithLanguagePack } from '../src/index';

describe('json-merge', () => {
  it('rejects trailing commas in jsonc', () => {
    const result = parseJson('{\n  // note\n  "alpha": 1,\n}\n', 'jsonc');

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual([
      {
        severity: 'error',
        category: 'parse_error',
        message: 'Trailing commas are not supported.'
      }
    ]);
  });

  it('matches owners by stable path equality', () => {
    const template = parseJson('{"alpha":{"beta":1},"gamma":[true]}', 'json');
    const destination = parseJson('{"alpha":{"beta":2},"gamma":[false],"delta":3}', 'json');

    expect(template.ok).toBe(true);
    expect(destination.ok).toBe(true);

    const result = matchJsonOwners(template.analysis!, destination.analysis!);
    expect(result.matched).toEqual([
      { templatePath: '/alpha', destinationPath: '/alpha' },
      { templatePath: '/alpha/beta', destinationPath: '/alpha/beta' },
      { templatePath: '/gamma', destinationPath: '/gamma' },
      { templatePath: '/gamma/0', destinationPath: '/gamma/0' }
    ]);
    expect(result.unmatchedTemplate).toEqual([]);
    expect(result.unmatchedDestination).toEqual(['/delta']);
  });

  it('merges objects with destination-preferred scalar values', () => {
    const result = mergeJson(
      '{"alpha":{"beta":1,"gamma":2},"delta":4}',
      '{"alpha":{"beta":9},"epsilon":5}',
      'json'
    );

    expect(result.ok).toBe(true);
    expect(result.output).toBe('{"alpha":{"beta":9,"gamma":2},"delta":4,"epsilon":5}');
  });

  it('preserves the destination array as the baseline array policy', () => {
    const result = mergeJson(
      '{"items":[1,2,3],"meta":{"tags":["template"],"mode":"template"}}',
      '{"items":[9],"meta":{"tags":["destination"]}}',
      'json'
    );

    expect(result.ok).toBe(true);
    expect(result.output).toBe('{"items":[9],"meta":{"tags":["destination"],"mode":"template"}}');
    expect(result.policies).toEqual([
      {
        surface: 'array',
        name: 'destination_wins_array'
      }
    ]);
  });

  it('reports destination parse failures distinctly', () => {
    const result = mergeJson('{"alpha":1}', '{"alpha":', 'json');

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.category).toBe('destination_parse_error');
  });

  it('applies trailing-comma fallback for destination merge input', () => {
    const result = mergeJson('{"alpha":1}', '{"beta":[1,2,],}', 'json');

    expect(result.ok).toBe(true);
    expect(result.output).toBe('{"alpha":1,"beta":[1,2]}');
    expect(result.diagnostics).toEqual([
      {
        severity: 'warning',
        category: 'fallback_applied',
        message: 'Applied destination trailing-comma fallback during merge.'
      }
    ]);
    expect(result.policies).toEqual([
      {
        surface: 'array',
        name: 'destination_wins_array'
      },
      {
        surface: 'fallback',
        name: 'trailing_comma_destination_fallback'
      }
    ]);
  });

  it('does not apply fallback to template trailing-comma input', () => {
    const result = mergeJson('{"alpha":1,}', '{"beta":2}', 'json');

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.category).toBe('parse_error');
  });

  it('does not apply fallback to strict-json comment violations', () => {
    const result = mergeJson('{"alpha":1}', '{\n  // note\n  "beta":2\n}', 'json');

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.category).toBe('destination_parse_error');
  });

  it('parses strict json through tree-sitter-language-pack and preserves observable analysis', () => {
    const result = parseJsonWithLanguagePack('{"alpha":{"beta":1}}', 'json');

    expect(result.ok).toBe(true);
    expect(result.analysis?.rootKind).toBe('object');
    expect(result.analysis?.owners).toEqual([
      { path: '/alpha', ownerKind: 'member', matchKey: 'alpha' },
      { path: '/alpha/beta', ownerKind: 'member', matchKey: 'beta' }
    ]);
  });

  it('reports strict json syntax errors through tree-sitter-language-pack', () => {
    const result = parseJsonWithLanguagePack('{"alpha":1,}', 'json');

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual([
      {
        severity: 'error',
        category: 'parse_error',
        message: 'tree-sitter-language-pack reported syntax errors for json.'
      }
    ]);
  });

  it('rejects jsonc through tree-sitter-language-pack for now', () => {
    const result = parseJsonWithLanguagePack('{\n  // note\n  "alpha":1\n}', 'jsonc');

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual([
      {
        severity: 'error',
        category: 'unsupported_feature',
        message: 'tree-sitter-language-pack json parsing currently supports only the json dialect.'
      }
    ]);
  });
});
