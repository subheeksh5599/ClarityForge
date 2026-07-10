import { tokenize, Token } from "./tokenizer";

export interface Diagnostic {
  line: number;
  col: number;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface Definition {
  type: "fungible-token" | "non-fungible-token" | "data-var" | "map" | "public-fn" | "read-only-fn" | "private-fn" | "constant" | "trait";
  name: string;
  line: number;
}

export interface AnalysisResult {
  valid: boolean;
  diagnostics: Diagnostic[];
  definitions: Definition[];
  stats: {
    totalLines: number;
    functions: number;
    tokens: number;
    dataVars: number;
    maps: number;
  };
}

export function analyze(source: string): AnalysisResult {
  const diagnostics: Diagnostic[] = [];
  const definitions: Definition[] = [];

  // 1. Tokenize
  let tokens: Token[];
  try {
    tokens = tokenize(source);
  } catch {
    return {
      valid: false,
      diagnostics: [{ line: 1, col: 1, message: "Failed to tokenize source", severity: "error" }],
      definitions: [],
      stats: { totalLines: 0, functions: 0, tokens: 0, dataVars: 0, maps: 0 },
    };
  }

  // 2. Check balanced parentheses
  let depth = 0;
  for (const t of tokens) {
    if (t.type === "lparen") depth++;
    if (t.type === "rparen") depth--;
    if (depth < 0) {
      diagnostics.push({
        line: t.line,
        col: t.col,
        message: "Unexpected closing parenthesis — nothing to close",
        severity: "error",
      });
      depth = 0;
    }
  }
  if (depth > 0) {
    const last = tokens[tokens.length - 1];
    diagnostics.push({
      line: last?.line ?? 1,
      col: last?.col ?? 1,
      message: `${depth} unclosed parentheses`,
      severity: "error",
    });
  }

  // 3. Extract definitions by walking tokens
  const nonWhitespace = tokens.filter((t) => t.type !== "whitespace");

  for (let i = 0; i < nonWhitespace.length; i++) {
    const t = nonWhitespace[i];

    if (t.type === "keyword") {
      // define-fungible-token <name> <amount>
      if (t.value === "define-fungible-token") {
        const nameTok = nonWhitespace[i + 1];
        if (nameTok && nameTok.type === "identifier") {
          definitions.push({ type: "fungible-token", name: nameTok.value, line: t.line });
        }
        continue;
      }

      // define-non-fungible-token <name> <type>
      if (t.value === "define-non-fungible-token") {
        const nameTok = nonWhitespace[i + 1];
        if (nameTok && nameTok.type === "identifier") {
          definitions.push({ type: "non-fungible-token", name: nameTok.value, line: t.line });
        }
        continue;
      }

      // define-data-var <name> <type> <default>
      if (t.value === "define-data-var") {
        const nameTok = nonWhitespace[i + 1];
        if (nameTok && nameTok.type === "identifier") {
          definitions.push({ type: "data-var", name: nameTok.value, line: t.line });
        }
        continue;
      }

      // define-map <name> <key-type> <value-type>
      if (t.value === "define-map") {
        const nameTok = nonWhitespace[i + 1];
        if (nameTok && nameTok.type === "identifier") {
          definitions.push({ type: "map", name: nameTok.value, line: t.line });
        }
        continue;
      }

      // define-public ( <name> ... )
      if (t.value === "define-public") {
        const next = nonWhitespace[i + 1]; // (
        const nameTok = nonWhitespace[i + 2]; // name
        if (nameTok && nameTok.type === "identifier") {
          definitions.push({ type: "public-fn", name: nameTok.value, line: t.line });
        }
        continue;
      }

      // define-read-only ( <name> ... )
      if (t.value === "define-read-only") {
        const next = nonWhitespace[i + 1];
        const nameTok = nonWhitespace[i + 2];
        if (nameTok && nameTok.type === "identifier") {
          definitions.push({ type: "read-only-fn", name: nameTok.value, line: t.line });
        }
        continue;
      }

      // define-private ( <name> ... )
      if (t.value === "define-private") {
        const next = nonWhitespace[i + 1];
        const nameTok = nonWhitespace[i + 2];
        if (nameTok && nameTok.type === "identifier") {
          definitions.push({ type: "private-fn", name: nameTok.value, line: t.line });
        }
        continue;
      }

      // define-constant <name> <value>
      if (t.value === "define-constant") {
        const nameTok = nonWhitespace[i + 1];
        if (nameTok && nameTok.type === "identifier") {
          definitions.push({ type: "constant", name: nameTok.value, line: t.line });
        }
        continue;
      }

      // define-trait <name> (...)
      if (t.value === "define-trait") {
        const nameTok = nonWhitespace[i + 1];
        if (nameTok && nameTok.type === "identifier") {
          definitions.push({ type: "trait", name: nameTok.value, line: t.line });
        }
        continue;
      }
    }
  }

  // 4. Check for common issues
  if (nonWhitespace.length === 0) {
    diagnostics.push({ line: 1, col: 1, message: "Contract is empty", severity: "warning" });
  }

  // 5. Compute stats
  const totalLines = source.split("\n").length;
  const fnDefs = definitions.filter((d) =>
    d.type === "public-fn" || d.type === "read-only-fn" || d.type === "private-fn"
  );
  const dataVars = definitions.filter((d) => d.type === "data-var").length;
  const maps = definitions.filter((d) => d.type === "map").length;

  // If no errors from paren-matching but code is non-empty, it's valid
  const hasErrors = diagnostics.some((d) => d.severity === "error");
  const valid = !hasErrors && nonWhitespace.length > 0;

  return {
    valid,
    diagnostics,
    definitions,
    stats: {
      totalLines,
      functions: fnDefs.length,
      tokens: nonWhitespace.length,
      dataVars,
      maps,
    },
  };
}

export function analyzeCost(_source: string): number {
  // Rough cost estimation based on code size
  // Clarity costs scale with execution complexity
  // For the demo we return a reasonable estimate
  const lines = _source.split("\n").length;
  const parens = (_source.match(/\(/g) || []).length;
  return Math.max(500, lines * 300 + parens * 50);
}
