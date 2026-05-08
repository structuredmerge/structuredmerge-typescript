import { describe, expect, it } from 'vitest';
import { csharpFeatureProfile, matchCSharpOwners, mergeCSharp, parseCSharp } from '../src/index';

describe('csharp-merge', () => {
  it('extracts module owners', () => {
    const result = parseCSharp(
      'using System;\nusing System.Collections.Generic;\n\nnamespace Demo {\n  public class Shape {\n    public int Area(int a) => a;\n  }\n}\n\ninternal sealed class FormatName { }\n',
      'csharp'
    );

    expect(result.ok).toBe(true);
    expect(result.analysis?.owners).toEqual([
      { path: '/imports/0', ownerKind: 'import', matchKey: 'System' },
      { path: '/imports/1', ownerKind: 'import', matchKey: 'System.Collections.Generic' },
      { path: '/declarations/FormatName', ownerKind: 'declaration', matchKey: 'FormatName' },
      { path: '/declarations/Shape', ownerKind: 'declaration', matchKey: 'Shape' }
    ]);
  });

  it('matches module owners by path equality', () => {
    const template = parseCSharp(
      'using System;\n\npublic class Shape {\n  public int Area(int a) => a;\n}\n',
      'csharp'
    );
    const destination = parseCSharp(
      'using System;\nusing System.Text;\n\npublic class Shape {\n  public int Area(int a) => a;\n}\n',
      'csharp'
    );

    const result = matchCSharpOwners(template.analysis!, destination.analysis!);
    expect(result.matched).toEqual([
      { templatePath: '/imports/0', destinationPath: '/imports/0' },
      { templatePath: '/declarations/Shape', destinationPath: '/declarations/Shape' }
    ]);
    expect(result.unmatchedTemplate).toEqual([]);
    expect(result.unmatchedDestination).toEqual(['/imports/1']);
  });

  it('merges destination imports and declaration text', () => {
    const result = mergeCSharp(
      'using System;\n\npublic class Shape {\n  public int Area(int a) => a;\n}\n\npublic class Point {\n  public int X { get; set; }\n}\n',
      'using System;\nusing System.Text;\n\npublic class Shape {\n  public int Area(int a) => a;\n}\n',
      'csharp'
    );

    expect(result.ok).toBe(true);
    expect(result.output).toBe(
      'using System;\nusing System.Text;\n\npublic class Shape {\n  public int Area(int a) => a;\n}\n\npublic class Point {\n  public int X { get; set; }\n}\n'
    );
  });

  it('reports destination parse failures distinctly', () => {
    const result = mergeCSharp(
      'public class Shape { public int Area(int a) => a; }\n',
      'public class Shape { public int Area(int a) => a\n',
      'csharp'
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.category).toBe('destination_parse_error');
  });
});
