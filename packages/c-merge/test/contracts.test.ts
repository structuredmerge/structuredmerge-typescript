import { describe, expect, it } from 'vitest';
import { cFeatureProfile, matchCOwners, mergeC, parseC } from '../src/index';

describe('c-merge', () => {
  it('extracts module owners', () => {
    const result = parseC(
      '#include <stdio.h>\n#include "math.h"\n\nint add(int a, int b) {\n  return a + b;\n}\n\nstatic int format_name(int value) {\n  return value;\n}\n',
      'c'
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
    const template = parseC(
      '#include <stdio.h>\n\nint add(int a, int b) {\n  return a + b;\n}\n',
      'c'
    );
    const destination = parseC(
      '#include <stdio.h>\n#include <stdint.h>\n\nint add(int a, int b) {\n  return a + b;\n}\n',
      'c'
    );

    const result = matchCOwners(template.analysis!, destination.analysis!);
    expect(result.matched).toEqual([
      { templatePath: '/imports/0', destinationPath: '/imports/0' },
      { templatePath: '/declarations/add', destinationPath: '/declarations/add' }
    ]);
    expect(result.unmatchedTemplate).toEqual([]);
    expect(result.unmatchedDestination).toEqual(['/imports/1']);
  });

  it('merges destination imports and declaration text', () => {
    const result = mergeC(
      '#include <stdio.h>\n\nint add(int a, int b) {\n  return a + b;\n}\n\nint max(int a, int b) {\n  return a > b ? a : b;\n}\n',
      '#include <stdio.h>\n#include <stdint.h>\n\nint add(int a, int b) {\n  return a + b;\n}\n',
      'c'
    );

    expect(result.ok).toBe(true);
    expect(result.output).toBe(
      '#include <stdio.h>\n#include <stdint.h>\n\nint add(int a, int b) {\n  return a + b;\n}\n\nint max(int a, int b) {\n  return a > b ? a : b;\n}\n'
    );
  });

  it('reports destination parse failures distinctly', () => {
    const result = mergeC(
      'int add(int a, int b) {\n  return a + b;\n}\n',
      'int add(int a, int b {\n  return a + b;\n}\n',
      'c'
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.category).toBe('destination_parse_error');
  });

  it('exposes the C family profile', () => {
    expect(cFeatureProfile()).toEqual({
      family: 'c',
      supportedDialects: ['c'],
      supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
    });
  });
});
