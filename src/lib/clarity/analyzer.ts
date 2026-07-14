import { tokenize, Token } from "./tokenizer";

export interface Diagnostic {
  line: number;
  col: number;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface ParamDef {
  name: string;
  type: string;
}

export interface Definition {
  type: "fungible-token" | "non-fungible-token" | "data-var" | "map" | "public-fn" | "read-only-fn" | "private-fn" | "constant" | "trait";
  name: string;
  line: number;
  params?: ParamDef[];
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

// Extract parameters from tokens after a function definition keyword
// Looks for (param-name param-type) pairs inside the function signature parens
function extractFnParams(tokens: Token[], startIdx: number): ParamDef[] {
  const params: ParamDef[] = [];
  let i = startIdx;
  // Skip the function name token and opening paren
  // Pattern: keyword fn-name ( param-name param-type ) ( param-name param-type ) ... )
  // We're positioned at the keyword, need to skip to first param list
  
  // Find opening paren after function name
  let parenDepth = 0;
  let inParamList = false;
  let currentParam: Partial<ParamDef> = {};
  
  for (let j = startIdx; j < tokens.length && j < startIdx + 30; j++) {
    const t = tokens[j];
    
    if (t.type === "lparen") {
      parenDepth++;
      if (parenDepth === 2) {
        // This is the start of the function body, stop looking for params
        // Actually params are in the FIRST level of parens after fn name
        // Pattern: define-public ( fn-name (param type) (param type) ) body...
      }
    }
    if (t.type === "rparen") {
      parenDepth--;
      if (parenDepth === 0 && inParamList) {
        // End of function signature
        break;
      }
    }
    
    // We're looking for (name type) pairs in the param section
    // The first lparen after the function keyword+name starts the overall signature
    // Inside, each (name type) is a parameter
    if (t.type === "lparen" && parenDepth === 1) {
      inParamList = true;
      currentParam = {};
      continue;
    }
    
    if (t.type === "rparen" && inParamList) {
      if (currentParam.name) {
        params.push({ name: currentParam.name, type: currentParam.type || "unknown" });
      }
      inParamList = false;
      currentParam = {};
      continue;
    }
    
    if (inParamList && (t.type === "identifier" || t.type === "type" || t.type === "keyword")) {
      if (!currentParam.name) {
        currentParam.name = t.value;
      } else if (!currentParam.type) {
        currentParam.type = t.value;
      }
    }
  }
  
  return params;
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
          const params = extractFnParams(nonWhitespace, i);
          definitions.push({ type: "public-fn", name: nameTok.value, line: t.line, params });
        }
        continue;
      }

      // define-read-only ( <name> ... )
      if (t.value === "define-read-only") {
        const next = nonWhitespace[i + 1];
        const nameTok = nonWhitespace[i + 2];
        if (nameTok && nameTok.type === "identifier") {
          const params = extractFnParams(nonWhitespace, i);
          definitions.push({ type: "read-only-fn", name: nameTok.value, line: t.line, params });
        }
        continue;
      }

      // define-private ( <name> ... )
      if (t.value === "define-private") {
        const next = nonWhitespace[i + 1];
        const nameTok = nonWhitespace[i + 2];
        if (nameTok && nameTok.type === "identifier") {
          const params = extractFnParams(nonWhitespace, i);
          definitions.push({ type: "private-fn", name: nameTok.value, line: t.line, params });
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
  const lines = _source.split("\n").length;
  const parens = (_source.match(/\(/g) || []).length;
  return Math.max(500, lines * 300 + parens * 50);
}

// Build a call graph from definitions and source code
// Returns nodes and edges showing which functions reference which
export interface CallGraphNode {
  name: string;
  type: string;
  calls: string[];
}

export function buildCallGraph(source: string, definitions: Definition[]): CallGraphNode[] {
  const fnDefs = definitions.filter(
    (d) => d.type === "public-fn" || d.type === "read-only-fn" || d.type === "private-fn"
  );
  
  if (fnDefs.length === 0) return [];
  
  const fnNames = new Set(fnDefs.map((d) => d.name));
  const nodes: CallGraphNode[] = [];
  
  // For each function, find what other functions it references
  for (const fn of fnDefs) {
    const calls: string[] = [];
    
    // Simple heuristic: find the function body and look for other function names
    // Look for the pattern: (fn-name in the source after the function definition
    const fnRegex = new RegExp(`define-(?:public|read-only|private)\\s*\\(\\s*${fn.name}[\\s\\S]*?\\)\\s*([\\s\\S]*?)(?:\\(define-|$)`, 'm');
    const match = source.match(fnRegex);
    
    if (match && match[1]) {
      const body = match[1];
      for (const otherFn of fnNames) {
        if (otherFn !== fn.name) {
          // Check if the function name appears in the body
          const escaped = otherFn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const refRegex = new RegExp(`\\b${escaped}\\b`);
          if (refRegex.test(body)) {
            calls.push(otherFn);
          }
        }
      }
    }
    
    nodes.push({
      name: fn.name,
      type: fn.type,
      calls,
    });
  }
  
  return nodes;
}
