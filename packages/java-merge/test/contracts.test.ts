import { describe, expect, it } from 'vitest';
import { matchJavaOwners, mergeJava, parseJava } from '../src/index';

describe('java-merge', () => {
  it('extracts module owners', () => {
    const result = parseJava(
      `public class Greeter {\n  private final String name;\n\n  public String greet(String suffix) {\n    return name + suffix;\n  }\n}\n`,
      'java'
    );

    expect(result.ok).toBe(true);
    expect(result.analysis?.owners).toEqual([
      { path: '/declarations/Greeter', ownerKind: 'declaration', matchKey: 'Greeter' }
    ]);
  });

  it('fails closed when import records are raw source text', () => {
    const result = parseJava('import java.util.List;\n\npublic class Greeter {}\n', 'java');

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.message).toContain('structured import module fields');
  });

  it('matches module owners by path equality', () => {
    const template = parseJava(
      `public class Greeter {\n  public String greet(String suffix) {\n    return name + suffix;\n  }\n}\n\nclass Utility {}\n`,
      'java'
    );
    const destination = parseJava(
      `public class Greeter {\n  public String greet(String suffix) {\n    return name + suffix;\n  }\n}\n`,
      'java'
    );

    const result = matchJavaOwners(template.analysis!, destination.analysis!);
    expect(result.matched).toEqual([
      { templatePath: '/declarations/Greeter', destinationPath: '/declarations/Greeter' }
    ]);
    expect(result.unmatchedTemplate).toEqual(['/declarations/Utility']);
    expect(result.unmatchedDestination).toEqual([]);
  });

  it('merges destination imports and declaration text', () => {
    const result = mergeJava(
      `public class Greeter {\n  private final String name;\n\n  public Greeter(String name) {\n    this.name = name;\n  }\n}\n\nclass Utility {\n  public static int score(String value) {\n    return value.length();\n  }\n}\n`,
      `public class Greeter {\n  private final String name;\n\n  public Greeter(String name) {\n    this.name = name;\n  }\n}\n`,
      'java'
    );

    expect(result.ok).toBe(true);
    expect(result.output).toBe(
      `public class Greeter {\n  private final String name;\n\n  public Greeter(String name) {\n    this.name = name;\n  }\n}\n\nclass Utility {\n  public static int score(String value) {\n    return value.length();\n  }\n}\n`
    );
  });

  it('reports destination parse failures distinctly', () => {
    const result = mergeJava(
      'package com.example;\n\npublic class Greeter {}\n',
      'package com.example;\npublic class Greeter {\n',
      'java'
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.category).toBe('destination_parse_error');
  });
});
