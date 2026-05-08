import { describe, expect, it } from 'vitest';
import {
  javaScriptFeatureProfile,
  matchJavaScriptOwners,
  mergeJavaScript,
  parseJavaScript
} from '../src/index';

describe('javascript-merge', () => {
  it('extracts module owners', () => {
    const result = parseJavaScript(
      "import { formatName } from './format-name';\nimport { trimName } from './trim-name';\n\nfunction greet(name) {\n  return trimName(formatName(name));\n}\n\nconst helper = (name) => name.toLowerCase();\n",
      'javascript'
    );

    expect(result.ok).toBe(true);
    expect(result.analysis?.owners).toEqual([
      { path: '/imports/0', ownerKind: 'import', matchKey: './format-name' },
      { path: '/imports/1', ownerKind: 'import', matchKey: './trim-name' },
      { path: '/declarations/greet', ownerKind: 'declaration', matchKey: 'greet' }
    ]);
  });

  it('matches module owners by path equality', () => {
    const template = parseJavaScript(
      "import { formatName } from './format-name';\n\nfunction greet(name) {\n  return formatName(name);\n}\n\nfunction helper(name) {\n  return name.toUpperCase();\n}\n",
      'javascript'
    );
    const destination = parseJavaScript(
      "import { formatName } from './format-name';\nimport { sanitizeName } from './sanitize-name';\n\nfunction greet(name) {\n  return sanitizeName(formatName(name));\n}\n",
      'javascript'
    );

    const result = matchJavaScriptOwners(template.analysis!, destination.analysis!);
    expect(result.matched).toEqual([
      { templatePath: '/imports/0', destinationPath: '/imports/0' },
      { templatePath: '/declarations/greet', destinationPath: '/declarations/greet' }
    ]);
    expect(result.unmatchedTemplate).toEqual(['/declarations/helper']);
    expect(result.unmatchedDestination).toEqual(['/imports/1']);
  });

  it('merges destination imports and declaration text', () => {
    const result = mergeJavaScript(
      "import { formatName } from './format-name';\n\nfunction greet(name) {\n  return formatName(name);\n}\n\nfunction helper(name) {\n  return name.toUpperCase();\n}\n",
      "import { formatName } from './format-name';\nimport { sanitizeName } from './sanitize-name';\n\nfunction greet(name) {\n  return sanitizeName(formatName(name));\n}\n",
      'javascript'
    );

    expect(result.ok).toBe(true);
    expect(result.output).toBe(
      "import { formatName } from './format-name';\nimport { sanitizeName } from './sanitize-name';\n\nfunction greet(name) {\n  return sanitizeName(formatName(name));\n}\n\nfunction helper(name) {\n  return name.toUpperCase();\n}\n"
    );
  });

  it('reports destination parse failures distinctly', () => {
    const result = mergeJavaScript(
      'function greet(name) {\n  return name;\n}\n',
      'function greet(name) {\n  return name\n',
      'javascript'
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.category).toBe('destination_parse_error');
  });

  it('exposes the JavaScript family profile', () => {
    expect(javaScriptFeatureProfile()).toEqual({
      family: 'javascript',
      supportedDialects: ['javascript'],
      supportedPolicies: [{ surface: 'array', name: 'destination_wins_array' }]
    });
  });
});
