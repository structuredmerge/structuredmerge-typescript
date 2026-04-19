import { describe, expect, it } from 'vitest';
import { matchJsonOwners, mergeJson, parseJson } from '../src/index';

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
    expect(result.output).toBe('{"items":[9],"meta":{"mode":"template","tags":["destination"]}}');
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
});
