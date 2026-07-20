import { Definition, ParamDef } from "./analyzer";

export interface ExecutionStep {
  type: "check" | "read" | "write" | "transfer" | "emit" | "return" | "error";
  detail: string;
  storageAfter?: Record<string, string>;
}

export interface ExecutionResult {
  functionName: string;
  params: string[];
  steps: ExecutionStep[];
  returnValue: string;
  costEstimate: number;
}

// Generic simulator that generates sensible execution traces for any function
function simulateExecution(
  fn: Definition,
  definitions: Definition[],
  paramValues: string[]
): ExecutionResult {
  const steps: ExecutionStep[] = [];
  const fnType = fn.type === "public-fn" ? "public" : fn.type === "read-only-fn" ? "read-only" : "private";
  const fnParams = fn.params || [];

  // 1. Authorization check for public functions
  if (fn.type === "public-fn") {
    steps.push({
      type: "check",
      detail: `Verifying caller authorization for ${fn.name}...`,
    });
  }

  // 2. Parameter validation
  if (fnParams.length > 0) {
    const paramDescs = fnParams
      .map((p: ParamDef, i: number) => `${p.name}: ${p.type}${paramValues[i] ? ` = ${paramValues[i]}` : ""}`)
      .join(", ");
    steps.push({
      type: "check",
      detail: `Validating parameters: ${paramDescs}`,
    });
  }

  // 3. Read operations (for read-only functions)
  if (fn.type === "read-only-fn") {
    const dataVars = definitions.filter((d) => d.type === "data-var");
    const maps = definitions.filter((d) => d.type === "map");
    if (dataVars.length > 0) {
      steps.push({
        type: "read",
        detail: `Reading data-var: ${dataVars[0].name}`,
      });
    }
    if (maps.length > 0) {
      steps.push({
        type: "read",
        detail: `Looking up map: ${maps[0].name}`,
      });
    }
    if (dataVars.length === 0 && maps.length === 0) {
      const tokens = definitions.filter(
        (d) => d.type === "fungible-token" || d.type === "non-fungible-token"
      );
      if (tokens.length > 0) {
        steps.push({
          type: "read",
          detail: `Reading token state: ${tokens[0].name}`,
        });
      }
    }
  }

  // 4. Write operations (for public functions)
  if (fn.type === "public-fn") {
    // Check for data-var modifications
    const dataVars = definitions.filter((d) => d.type === "data-var");
    if (dataVars.length > 0) {
      steps.push({
        type: "write",
        detail: `Updating data-var: ${dataVars[0].name}`,
      });
    }

    // Check for map modifications
    const maps = definitions.filter((d) => d.type === "map");
    if (maps.length > 0) {
      steps.push({
        type: "write",
        detail: `Inserting into map: ${maps[0].name}`,
      });
    }

    // Token transfers
    const tokens = definitions.filter(
      (d) => d.type === "fungible-token" || d.type === "non-fungible-token"
    );
    if (tokens.length > 0) {
      steps.push({
        type: "transfer",
        detail: `Executing token operation on ${tokens[0].name}`,
      });
    }
  }

  // 5. Events
  steps.push({
    type: "emit",
    detail: `Event: ${fn.name}-executed`,
  });

  // 6. Return value
  const returnValue = fn.type === "read-only-fn"
    ? `(ok (some {result: true}))`
    : fn.type === "public-fn"
    ? `(ok true)`
    : `true`;

  steps.push({
    type: "return",
    detail: returnValue,
  });

  // Cost estimation
  const costBase = fn.type === "public-fn" ? 2000 : fn.type === "read-only-fn" ? 500 : 1000;
  const costParams = fnParams.length * 200;
  const costStorage = definitions.filter((d) => d.type === "data-var" || d.type === "map").length * 300;

  return {
    functionName: fn.name,
    params: paramValues,
    steps,
    returnValue: steps[steps.length - 1]?.detail ?? "(ok true)",
    costEstimate: costBase + costParams + costStorage + Math.floor(Math.random() * 1000),
  };
}

export function getExecutableFunctions(definitions: Definition[]): Definition[] {
  return definitions.filter(
    (d) => d.type === "public-fn" || d.type === "read-only-fn"
  );
}

export function getDefaultParams(fn: Definition): string[] {
  const params = fn.params || [];
  if (params.length === 0) return [];
  
  return params.map((p: ParamDef) => {
    // Generate sensible defaults based on type
    switch (p.type) {
      case "uint": return "u1";
      case "int": return "0";
      case "bool": return "true";
      case "principal": return "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
      case "string-utf8":
      case "string-ascii":
      case "(string-utf8 256)":
      case "(string-ascii 256)":
        return '"hello"';
      default:
        if (p.type?.startsWith("(string-utf8") || p.type?.startsWith("(string-ascii")) {
          return '"value"';
        }
        if (p.type?.startsWith("(buff")) {
          return "0x00";
        }
        return "u1";
    }
  });
}

export function executeFunction(
  fn: Definition,
  definitions: Definition[],
  params: string[]
): ExecutionResult {
  return simulateExecution(fn, definitions, params);
}
