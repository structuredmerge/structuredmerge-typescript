import { describe, expect, it } from 'vitest';
import { matchCSharpOwners, mergeCSharp, parseCSharp } from '../src/index';

describe('csharp-merge', () => {
  it('fails closed when import records are missing', () => {
    const result = parseCSharp(
      'using System;\nusing System.Collections.Generic;\n\nnamespace Demo {\n  public class Shape {\n    public int Area(int a) => a;\n  }\n}\n\ninternal sealed class FormatName { }\n',
      'csharp'
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.category).toBe('unsupported_feature');
    expect(result.diagnostics[0]?.message).toContain('structured import records');
  });

  it('matches declaration owners when imports are absent', () => {
    const template = parseCSharp(
      'public class Shape {\n  public int Area(int a) => a;\n}\n',
      'csharp'
    );
    const destination = parseCSharp(
      'public class Shape {\n  public int Area(int a) => a;\n}\n',
      'csharp'
    );

    const result = matchCSharpOwners(template.analysis!, destination.analysis!);
    expect(result.matched).toEqual([
      { templatePath: '/declarations/Shape', destinationPath: '/declarations/Shape' }
    ]);
    expect(result.unmatchedTemplate).toEqual([]);
    expect(result.unmatchedDestination).toEqual([]);
  });

  it('merges declaration text when imports are absent', () => {
    const result = mergeCSharp(
      'public class Shape {\n  public int Area(int a) => a;\n}\n\npublic class Point {\n  public int X { get; set; }\n}\n',
      'public class Shape {\n  public int Area(int a) => a;\n}\n',
      'csharp'
    );

    expect(result.ok).toBe(true);
    expect(result.output).toBe(
      'public class Shape {\n  public int Area(int a) => a;\n}\n\npublic class Point {\n  public int X { get; set; }\n}\n'
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
