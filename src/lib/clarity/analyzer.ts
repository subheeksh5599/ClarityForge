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

// ── Trait resolution types ──

export interface TraitFnSig {
  name: string;
  params: ParamDef[];
  returnType: string;
}

export interface TraitDef {
  name: string;
  line: number;
  functions: TraitFnSig[];
}

export interface ImplTraitRef {
  traitRef: string;   // raw: '.my-trait' or ''STADDR.contract.trait'
  line: number;
  isExternal: boolean; // true if starts with ' (external principal reference)
}

// Extract parameters from a function definition.
function extractFnParams(tokens: Token[], startIdx: number): ParamDef[] {
  const params: ParamDef[] = [];

  let j = startIdx + 1;
  while (j < tokens.length && tokens[j].type !== "lparen") j++;
  if (j >= tokens.length) return params;

  j++;

  if (j < tokens.length && tokens[j].type !== "lparen" && tokens[j].type !== "rparen") j++;

  let depth = 1;
  while (j < tokens.length && depth > 0) {
    const t = tokens[j];

    if (t.type === "rparen") { depth--; j++; continue; }

    if (t.type === "lparen") {
      j++;
      let pd = 1;
      let name: string | undefined;
      const typeParts: string[] = [];
      while (j < tokens.length && pd > 0) {
        const pt = tokens[j];
        if (pt.type === "lparen") { pd++; typeParts.push("("); j++; continue; }
        if (pt.type === "rparen") {
          pd--;
          if (pd === 0) { j++; break; }
          typeParts.push(")");
          j++;
          continue;
        }
        if (name === undefined) {
          name = pt.value;
        } else {
          typeParts.push(pt.value);
        }
        j++;
      }
      if (name) {
        const type = typeParts
          .join(" ")
          .replace(/\(\s+/g, "(")
          .replace(/\s+\)/g, ")")
          .trim();
        params.push({ name, type: type || "unknown" });
      }
      continue;
    }

    j++;
  }

  return params;
}

// Parse trait function signatures from tokens inside a define-trait body.
// The body looks like: ((fn1 (p1 t1) (response ok err)) (fn2 ...))
function parseTraitFunctions(tokens: Token[], startIdx: number): TraitFnSig[] {
  const functions: TraitFnSig[] = [];

  // Find the opening paren of the trait body (after the trait name)
  let j = startIdx + 1; // skip 'define-trait'
  while (j < tokens.length && tokens[j].type !== "identifier") j++;
  if (j >= tokens.length) return functions;
  j++; // skip trait name

  // Find the wrapper paren: the ( that wraps all function signatures
  while (j < tokens.length && tokens[j].type !== "lparen") j++;
  if (j >= tokens.length) return functions;

  // We're at the wrapper ( — now each top-level inner ( is a function signature
  j++; // step into wrapper
  let depth = 1;
  while (j < tokens.length && depth > 0) {
    const t = tokens[j];

    if (t.type === "rparen") { depth--; j++; continue; }

    if (t.type === "lparen") {
      // This is a function signature: (fn-name (p1 t1) (p2 t2) (response ok err))
      const sigStart = j;
      j++;
      let sd = 1;
      const sigTokens: Token[] = [];

      while (j < tokens.length && sd > 0) {
        const st = tokens[j];
        if (st.type === "lparen") sd++;
        if (st.type === "rparen") sd--;
        if (sd > 0) sigTokens.push(st);
        j++;
      }

      // Parse the signature tokens
      if (sigTokens.length > 0) {
        const fnName = sigTokens[0].value;
        const params: ParamDef[] = [];
        let returnType = "unknown";

        // Walk rest of tokens: each ( is either a param or response
        let k = 1;
        while (k < sigTokens.length) {
          if (sigTokens[k].type === "lparen") {
            // Parse this paren group
            k++;
            const groupParts: string[] = [];
            let gd = 1;
            while (k < sigTokens.length && gd > 0) {
              const gt = sigTokens[k];
              if (gt.type === "lparen") gd++;
              if (gt.type === "rparen") { gd--; if (gd === 0) { k++; break; } }
              if (gd > 0) groupParts.push(gt.value);
              k++;
            }

            const groupStr = groupParts.join(" ");
            if (groupParts[0] === "response") {
              returnType = `(response ${groupParts.slice(1).join(" ")})`;
            } else {
              // It's a param: (name type)
              const pName = groupParts[0];
              const pType = groupParts.slice(1).join(" ") || "unknown";
              params.push({ name: pName, type: pType });
            }
          } else {
            k++;
          }
        }

        functions.push({ name: fnName, params, returnType });
      }
      continue;
    }

    j++;
  }

  return functions;
}

export function analyze(source: string): AnalysisResult {
  const diagnostics: Diagnostic[] = [];
  const definitions: Definition[] = [];
  const traitDefs: TraitDef[] = [];
  const implTraits: ImplTraitRef[] = [];

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
      if (t.value === "define-fungible-token") {
        const nameTok = nonWhitespace[i + 1];
        if (nameTok && nameTok.type === "identifier") {
          definitions.push({ type: "fungible-token", name: nameTok.value, line: t.line });
        }
        continue;
      }

      if (t.value === "define-non-fungible-token") {
        const nameTok = nonWhitespace[i + 1];
        if (nameTok && nameTok.type === "identifier") {
          definitions.push({ type: "non-fungible-token", name: nameTok.value, line: t.line });
        }
        continue;
      }

      if (t.value === "define-data-var") {
        const nameTok = nonWhitespace[i + 1];
        if (nameTok && nameTok.type === "identifier") {
          definitions.push({ type: "data-var", name: nameTok.value, line: t.line });
        }
        continue;
      }

      if (t.value === "define-map") {
        const nameTok = nonWhitespace[i + 1];
        if (nameTok && nameTok.type === "identifier") {
          definitions.push({ type: "map", name: nameTok.value, line: t.line });
        }
        continue;
      }

      if (t.value === "define-public") {
        const nameTok = nonWhitespace[i + 2];
        if (nameTok && nameTok.type === "identifier") {
          const params = extractFnParams(nonWhitespace, i);
          definitions.push({ type: "public-fn", name: nameTok.value, line: t.line, params });
        }
        continue;
      }

      if (t.value === "define-read-only") {
        const nameTok = nonWhitespace[i + 2];
        if (nameTok && nameTok.type === "identifier") {
          const params = extractFnParams(nonWhitespace, i);
          definitions.push({ type: "read-only-fn", name: nameTok.value, line: t.line, params });
        }
        continue;
      }

      if (t.value === "define-private") {
        const nameTok = nonWhitespace[i + 2];
        if (nameTok && nameTok.type === "identifier") {
          const params = extractFnParams(nonWhitespace, i);
          definitions.push({ type: "private-fn", name: nameTok.value, line: t.line, params });
        }
        continue;
      }

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
          // Parse trait function signatures
          const traitFns = parseTraitFunctions(nonWhitespace, i);
          traitDefs.push({
            name: nameTok.value,
            line: t.line,
            functions: traitFns,
          });
          // Add info diagnostic showing what functions were parsed
          if (traitFns.length > 0) {
            diagnostics.push({
              line: t.line,
              col: t.col,
              message: `Trait '${nameTok.value}' requires ${traitFns.length} function(s): ${traitFns.map(f => f.name).join(", ")}`,
              severity: "info",
            });
          }
        }
        continue;
      }

      // impl-trait <trait-ref>
      if (t.value === "impl-trait") {
        const refTok = nonWhitespace[i + 1];
        if (refTok) {
          const isExternal = refTok.value.startsWith("'");
          implTraits.push({
            traitRef: refTok.value,
            line: t.line,
            isExternal,
          });
        }
        continue;
      }
    }
  }

  // ── 4. Trait resolution — check impl-trait conformance ──
  for (const impl of implTraits) {
    // Resolve trait reference
    let targetTrait: TraitDef | undefined;

    if (impl.isExternal) {
      // External trait: 'STADDR.contract.trait — cannot verify locally
      diagnostics.push({
        line: impl.line,
        col: 1,
        message: `impl-trait references external trait ${impl.traitRef} — conformance cannot be verified locally`,
        severity: "info",
      });
      continue;
    }

    // Local trait reference: .trait-name or .contract.trait-name
    // Strip leading dot(s), take the last segment as trait name
    const ref = impl.traitRef.replace(/^\.+/, "");
    // If dotted, take the last part as the trait name
    const traitName = ref.includes(".") ? ref.split(".").pop()! : ref;

    targetTrait = traitDefs.find((td) => td.name === traitName);

    if (!targetTrait) {
      diagnostics.push({
        line: impl.line,
        col: 1,
        message: `Cannot resolve trait '${impl.traitRef}' — no define-trait with name '${traitName}' found in this contract`,
        severity: "error",
      });
      continue;
    }

    // Check that all required trait functions exist in the contract
    const contractFnNames = new Set(
      definitions
        .filter((d) => d.type === "public-fn" || d.type === "read-only-fn" || d.type === "private-fn")
        .map((d) => d.name)
    );

    for (const reqFn of targetTrait.functions) {
      if (!contractFnNames.has(reqFn.name)) {
        diagnostics.push({
          line: impl.line,
          col: 1,
          message: `Trait '${targetTrait.name}' requires function '${reqFn.name}' but it is not defined in this contract`,
          severity: "error",
        });
        continue;
      }

      // Check signature match
      const contractFn = definitions.find(
        (d) =>
          (d.type === "public-fn" || d.type === "read-only-fn" || d.type === "private-fn") &&
          d.name === reqFn.name
      );

      if (contractFn && contractFn.params) {
        // Compare params
        if (contractFn.params.length !== reqFn.params.length) {
          diagnostics.push({
            line: impl.line,
            col: 1,
            message: `Function '${reqFn.name}': trait expects ${reqFn.params.length} param(s) but contract provides ${contractFn.params.length}`,
            severity: "error",
          });
        } else {
          for (let pi = 0; pi < reqFn.params.length; pi++) {
            const reqP = reqFn.params[pi];
            const gotP = contractFn.params[pi];
            if (reqP.type !== gotP.type && gotP.type !== "unknown" && reqP.type !== "unknown") {
              diagnostics.push({
                line: impl.line,
                col: 1,
                message: `Function '${reqFn.name}' param '${reqP.name}': trait expects type '${reqP.type}' but contract has '${gotP.type}'`,
                severity: "error",
              });
            }
          }
        }
      }
    }

    // Check no extra functions: only needed if strict mode — skip for now.
  }

  // 5. Check for common issues
  if (nonWhitespace.length === 0) {
    diagnostics.push({ line: 1, col: 1, message: "Contract is empty", severity: "warning" });
  }

  // 6. Compute stats
  const totalLines = source.split("\n").length;
  const fnDefs = definitions.filter((d) =>
    d.type === "public-fn" || d.type === "read-only-fn" || d.type === "private-fn"
  );
  const dataVars = definitions.filter((d) => d.type === "data-var").length;
  const maps = definitions.filter((d) => d.type === "map").length;

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

  for (const fn of fnDefs) {
    const calls: string[] = [];

    const fnRegex = new RegExp(`define-(?:public|read-only|private)\\s*\\(\\s*${fn.name}[\\s\\S]*?\\)\\s*([\\s\\S]*?)(?:\\(define-|$)`, 'm');
    const match = source.match(fnRegex);

    if (match && match[1]) {
      const body = match[1];
      for (const otherFn of fnNames) {
        if (otherFn !== fn.name) {
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
