import { describe, expect, it } from 'vitest';
import { javaFeatureProfile, matchJavaOwners, mergeJava, parseJava } from '../src/index';

describe('java-merge', () => {
  it('extracts module owners', () => {
    const result = parseJava(
      `package com.example;\n\nimport java.util.List;\nimport java.util.Map;\n\npublic class Greeter {\n  private final String name;\n\n  public String greet(String suffix) {\n    return name + suffix;\n  }\n}\n`,
      'java'
    );

    expect(result.ok).toBe(true);
    expect(result.analysis?.owners).toEqual([
      { path: '/imports/0', ownerKind: 'import', matchKey: 'java.util.List' },
      { path: '/imports/1', ownerKind: 'import', matchKey: 'java.util.Map' },
      { path: '/declarations/Greeter', ownerKind: 'declaration', matchKey: 'Greeter' }
    ]);
  });

  it('matches module owners by path equality', () => {
    const template = parseJava(
      `import java.util.List;\nimport java.util.Map;\n\npublic class Greeter {\n  public String greet(String suffix) {\n    return name + suffix;\n  }\n}\n`,
      'java'
    );
    const destination = parseJava(
      `import java.util.List;\n\npublic class Greeter {\n  public String greet(String suffix) {\n    return name + suffix;\n  }\n}\n`,
      'java'
    );

    const result = matchJavaOwners(template.analysis!, destination.analysis!);
    expect(result.matched).toEqual([
      { templatePath: '/imports/0', destinationPath: '/imports/0' },
      { templatePath: '/declarations/Greeter', destinationPath: '/declarations/Greeter' }
    ]);
    expect(result.unmatchedTemplate).toEqual(['/imports/1']);
    expect(result.unmatchedDestination).toEqual([]);
  });

  it('merges destination imports and declaration text', () => {
    const result = mergeJava(
      `import java.util.Map;\nimport java.util.Set;\n\npublic class Greeter {\n  private final String name;\n\n  public Greeter(String name) {\n    this.name = name;\n  }\n}\n\nclass Utility {\n  public static int score(String value) {\n    return value.length();\n  }\n}\n`,
      `import java.util.Map;\n\npublic class Greeter {\n  private final String name;\n\n  public Greeter(String name) {\n    this.name = name;\n  }\n}\n`,
      'java'
    );

    expect(result.ok).toBe(true);
    expect(result.output).toBe(
      `import java.util.Map;\n\npublic class Greeter {\n  private final String name;\n\n  public Greeter(String name) {\n    this.name = name;\n  }\n}\n\nclass Utility {\n  public static int score(String value) {\n    return value.length();\n  }\n}\n`
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
