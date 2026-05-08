import { describe, expect, it } from 'vitest';
import { cppFeatureProfile, matchCppOwners, mergeCpp, parseCpp } from '../src/index';

describe('cpp-merge', () => {
  it('extracts module owners', () => {
    const result = parseCpp(
      '#include <stdio.h>\n#include "math.h"\n\nint add(int a, int b) {\n  return a + b;\n}\n\nstatic int format_name(int value) {\n  return value;\n}\n',
      'cpp'
    );

    expect(result.ok).toBe(true);
    expect(result.analysis?.owners).toEqual([
      { path: '/imports/0', ownerKind: 'import', matchKey: 'stdio.h' },
      { path: '/imports/1', ownerKind: 'import', matchKey: 'math.h' },
      { path: '/declarations/add', ownerKind: 'declaration', matchKey: 'add' },
      { path: '/declarations/format_name', ownerKind: 'declaration', matchKey: 'format_name' }
    ]);
  });

  it('matches module owners by path equality', () => {
    const template = parseCpp(
      '#include <stdio.h>\n\nint add(int a, int b) {\n  return a + b;\n}\n',
      'cpp'
    );
    const destination = parseCpp(
      '#include <stdio.h>\n#include <stdint.h>\n\nint add(int a, int b) {\n  return a + b;\n}\n',
      'cpp'
    );

    const result = matchCppOwners(template.analysis!, destination.analysis!);
    expect(result.matched).toEqual([
      { templatePath: '/imports/0', destinationPath: '/imports/0' },
      { templatePath: '/declarations/add', destinationPath: '/declarations/add' }
    ]);
    expect(result.unmatchedTemplate).toEqual([]);
    expect(result.unmatchedDestination).toEqual(['/imports/1']);
  });

  it('merges destination imports and declaration text', () => {
    const result = mergeCpp(
      '#include <stdio.h>\n\nint add(int a, int b) {\n  return a + b;\n}\n\nint max(int a, int b) {\n  return a > b ? a : b;\n}\n',
      '#include <stdio.h>\n#include <stdint.h>\n\nint add(int a, int b) {\n  return a + b;\n}\n',
      'cpp'
    );

    expect(result.ok).toBe(true);
    expect(result.output).toBe(
      '#include <stdio.h>\n#include <stdint.h>\n\nint add(int a, int b) {\n  return a + b;\n}\n\nint max(int a, int b) {\n  return a > b ? a : b;\n}\n'
    );
  });

  it('reports destination parse failures distinctly', () => {
    const result = mergeCpp(
      'int add(int a, int b) {\n  return a + b;\n}\n',
      'int add(int a, int b {\n  return a + b;\n}\n',
      'cpp'
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.category).toBe('destination_parse_error');
  });

  it('exposes the C family profile', () => {
    expect(cppFeatureProfile()).toEqual({
      family: 'cpp',
      supportedDialects: ['cpp'],
      supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
    });
  });
});
