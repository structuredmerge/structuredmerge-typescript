import { describe, expect, it } from 'vitest';
import {
  KREUZBERG_LANGUAGE_PACK_BACKEND,
  parseWithLanguagePack,
  type ParserRequest
} from '../src/index';

describe('tree-haver language pack', () => {
  it('parses valid json through the kreuzberg language pack', () => {
    const request: ParserRequest = {
      source: '{"alpha":1}',
      language: 'json'
    };

    const result = parseWithLanguagePack(request);

    expect(result.ok).toBe(true);
    expect(result.analysis).toEqual({
      kind: 'json',
      language: 'json',
      dialect: undefined,
      rootType: 'document',
      hasError: false,
      backendRef: KREUZBERG_LANGUAGE_PACK_BACKEND
    });
    expect(result.diagnostics).toEqual([]);
  });

  it('reports syntax errors for invalid json through the kreuzberg language pack', () => {
    const result = parseWithLanguagePack({
      source: '{"alpha":1,}',
      language: 'json'
    });

    expect(result.ok).toBe(false);
    expect(result.analysis).toBeUndefined();
    expect(result.diagnostics).toEqual([
      {
        severity: 'error',
        category: 'parse_error',
        message: 'tree-sitter-language-pack reported syntax errors for json.'
      }
    ]);
  });
});
