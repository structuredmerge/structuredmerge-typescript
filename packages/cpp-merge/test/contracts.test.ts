import { describe, expect, it } from 'vitest';
import { cppFeatureProfile, matchCppOwners, mergeCpp, parseCpp } from '../src/index';

describe('cpp-merge', () => {
  it('fails closed when import records are missing', () => {
    const result = parseCpp(
      '#include <stdio.h>\n#include "math.h"\n\nint add(int a, int b) {\n  return a + b;\n}\n\nstatic int format_name(int value) {\n  return value;\n}\n',
      'cpp'
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.category).toBe('unsupported_feature');
    expect(result.diagnostics[0]?.message).toContain('structured import records');
  });

  it('fails closed before matching when imports are unsupported', () => {
    const template = parseCpp(
      '#include <stdio.h>\n\nint add(int a, int b) {\n  return a + b;\n}\n',
      'cpp'
    );
    const destination = parseCpp(
      '#include <stdio.h>\n#include <stdint.h>\n\nint add(int a, int b) {\n  return a + b;\n}\n',
      'cpp'
    );

    expect(template.ok || destination.ok).toBe(false);
  });

  it('fails closed before merging when imports are unsupported', () => {
    const result = mergeCpp(
      '#include <stdio.h>\n\nint add(int a, int b) {\n  return a + b;\n}\n\nint max(int a, int b) {\n  return a > b ? a : b;\n}\n',
      '#include <stdio.h>\n#include <stdint.h>\n\nint add(int a, int b) {\n  return a + b;\n}\n',
      'cpp'
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.category).toBe('unsupported_feature');
  });

  it('fails closed before destination parse classification when function names are missing', () => {
    const result = mergeCpp(
      'int add(int a, int b) {\n  return a + b;\n}\n',
      'int add(int a, int b {\n  return a + b;\n}\n',
      'cpp'
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.category).toBe('unsupported_feature');
  });

  it('exposes the C family profile', () => {
    expect(cppFeatureProfile()).toEqual({
      family: 'cpp',
      supportedDialects: ['cpp'],
      supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
    });
  });
});
