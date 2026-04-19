import type { AnalysisHandle, ParserAdapter, ParserRequest } from "@structuredmerge/tree-haver";
import type { Diagnostic, MergeResult, ParseResult } from "@structuredmerge/ast-merge";

export type JsonDialect = "json" | "jsonc";

export interface JsonAnalysis extends AnalysisHandle {
  readonly kind: "json";
  readonly dialect: JsonDialect;
  readonly allowsComments: boolean;
  readonly normalizedSource: string;
}

export interface JsonMerger {
  merge(template: JsonAnalysis, destination: JsonAnalysis): MergeResult<string>;
}

export interface JsonParserAdapter extends ParserAdapter<JsonAnalysis> {}

export interface JsonAnalyzer {
  parse(source: string, dialect: JsonDialect): ParseResult<JsonAnalysis>;
}

export function jsonParseRequest(source: string, dialect: JsonDialect): ParserRequest {
  return {
    source,
    language: "json",
    dialect
  };
}

function detectTrailingComma(source: string): boolean {
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (char === "\n") inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === "\"") inString = false;
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "/" && next === "/") {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      i += 1;
      continue;
    }

    if (char === ",") {
      let j = i + 1;
      while (j < source.length && /\s/.test(source[j])) j += 1;
      if (source[j] === "]" || source[j] === "}") return true;
    }
  }

  return false;
}

function stripJsonComments(source: string): string {
  let result = "";
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        result += "\n";
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      result += char;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === "\"") inString = false;
      continue;
    }

    if (char === "\"") {
      inString = true;
      result += char;
      continue;
    }

    if (char === "/" && next === "/") {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      i += 1;
      continue;
    }

    result += char;
  }

  return result;
}

function parseError(message: string): Diagnostic {
  return {
    severity: "error",
    category: "parse_error",
    message
  };
}

export function parseJson(source: string, dialect: JsonDialect): ParseResult<JsonAnalysis> {
  const diagnostics: Diagnostic[] = [];

  if (detectTrailingComma(source)) {
    diagnostics.push(parseError("Trailing commas are not supported."));
    return { ok: false, diagnostics };
  }

  const normalizedSource = dialect === "jsonc" ? stripJsonComments(source) : source;

  if (dialect === "json" && normalizedSource !== stripJsonComments(source)) {
    diagnostics.push(parseError("Comments are not supported in strict JSON."));
    return { ok: false, diagnostics };
  }

  try {
    JSON.parse(normalizedSource);
  } catch (error) {
    diagnostics.push(parseError(error instanceof Error ? error.message : "JSON parse failed."));
    return { ok: false, diagnostics };
  }

  return {
    ok: true,
    diagnostics,
    analysis: {
      kind: "json",
      dialect,
      allowsComments: dialect === "jsonc",
      normalizedSource
    }
  };
}
