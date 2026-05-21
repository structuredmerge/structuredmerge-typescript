import { describe, expect, it } from 'vitest';
import { cFeatureProfile, matchCOwners, mergeC, parseC } from '../src/index';

describe('c-merge', () => {
  it('fails closed when import records are missing', () => {
    const result = parseC(
      '#include <stdio.h>\n#include "math.h"\n\nint add(int a, int b) {\n  return a + b;\n}\n\nstatic int format_name(int value) {\n  return value;\n}\n',
      'c'
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.category).toBe('unsupported_feature');
    expect(result.diagnostics[0]?.message).toContain('structured import records');
  });

  it('fails closed before matching when imports are unsupported', () => {
    const template = parseC(
      '#include <stdio.h>\n\nint add(int a, int b) {\n  return a + b;\n}\n',
      'c'
    );
    const destination = parseC(
      '#include <stdio.h>\n#include <stdint.h>\n\nint add(int a, int b) {\n  return a + b;\n}\n',
      'c'
    );

    expect(template.ok || destination.ok).toBe(false);
  });

  it('fails closed before merging when imports are unsupported', () => {
    const result = mergeC(
      '#include <stdio.h>\n\nint add(int a, int b) {\n  return a + b;\n}\n\nint max(int a, int b) {\n  return a > b ? a : b;\n}\n',
      '#include <stdio.h>\n#include <stdint.h>\n\nint add(int a, int b) {\n  return a + b;\n}\n',
      'c'
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.category).toBe('unsupported_feature');
  });

  it('fails closed before destination parse classification when function names are missing', () => {
    const result = mergeC(
      'int add(int a, int b) {\n  return a + b;\n}\n',
      'int add(int a, int b {\n  return a + b;\n}\n',
      'c'
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.category).toBe('unsupported_feature');
  });

  it('exposes the C family profile', () => {
    expect(cFeatureProfile()).toEqual({
      family: 'c',
      supportedDialects: ['c'],
      supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
    });
  });
});
