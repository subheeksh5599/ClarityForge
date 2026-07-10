import { Definition } from "./analyzer";

export interface ExecutionStep {
  type: "check" | "read" | "write" | "transfer" | "emit" | "return";
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

interface SimState {
  balances: Record<string, number>;
  vars: Record<string, string>;
  maps: Record<string, Record<string, string>>;
  tokens: string[];
  nfts: string[];
  events: string[];
}

function simulateExecution(
  fn: Definition,
  definitions: Definition[],
  _params: string[]
): ExecutionResult {
  const steps: ExecutionStep[] = [];
  const state: SimState = {
    balances: { "tx-sender": 10_000_000, "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM": 5_000_000 },
    vars: {},
    maps: {},
    tokens: definitions.filter((d) => d.type === "fungible-token").map((d) => d.name),
    nfts: definitions.filter((d) => d.type === "non-fungible-token").map((d) => d.name),
    events: [],
  };

  // Initialize data vars from definitions
  for (const d of definitions) {
    if (d.type === "data-var") state.vars[d.name] = "u0";
  }

  if (fn.type === "public-fn") {
    const name = fn.name;

    switch (name) {
      case "transfer": {
        steps.push({ type: "check", detail: "Asserting caller has sufficient balance..." });
        steps.push({
          type: "read",
          detail: `Balance of tx-sender: ${state.balances["tx-sender"]?.toLocaleString() ?? "0"} µSTX`,
        });
        steps.push({
          type: "transfer",
          detail: `Transferring tokens from tx-sender to ${_params[1] ?? "recipient"}`,
        });
        steps.push({
          type: "write",
          detail: `Updated balance: tx-sender -${_params[0] ?? "amount"}, ${_params[1] ?? "recipient"} +${_params[0] ?? "amount"}`,
        });
        steps.push({
          type: "emit",
          detail: "Event: ft-transfer-event (sender, recipient, amount)",
        });
        steps.push({ type: "return", detail: "(ok true)" });
        break;
      }

      case "mint": {
        const nftName = state.nfts[0] ?? "nft-collection";
        steps.push({ type: "check", detail: "Checking caller authorization..." });
        steps.push({
          type: "write",
          detail: `Minting new ${nftName} token ID #1`,
        });
        steps.push({
          type: "write",
          detail: `Assigning ownership to ${_params[0] ?? "recipient"}`,
        });
        steps.push({ type: "emit", detail: "Event: nft-mint-event (id, recipient)" });
        steps.push({ type: "return", detail: "(ok u1)" });
        break;
      }

      case "propose": {
        steps.push({ type: "check", detail: "Validating proposal description length..." });
        steps.push({
          type: "write",
          detail: "Creating proposal #1 in proposals map",
        });
        steps.push({
          type: "write",
          detail: `Stored: proposer=tx-sender, description="${_params[0]?.slice(0, 20) ?? "..."}...", votes-for=0, executed=false`,
        });
        steps.push({ type: "emit", detail: "Event: proposal-created (id=u1)" });
        steps.push({ type: "return", detail: "(ok u1)" });
        break;
      }

      case "stake": {
        steps.push({ type: "check", detail: "Checking token approval..." });
        steps.push({
          type: "transfer",
          detail: `Transferring ${_params[0] ?? "amount"} tokens from caller to contract`,
        });
        steps.push({
          type: "write",
          detail: `Recording stake: amount=${_params[0] ?? "amount"}, since=block-height, rewards=0`,
        });
        steps.push({
          type: "write",
          detail: `Updated total-staked: +${_params[0] ?? "amount"}`,
        });
        steps.push({ type: "emit", detail: "Event: stake-event (user, amount)" });
        steps.push({ type: "return", detail: "(ok true)" });
        break;
      }

      case "unstake": {
        steps.push({ type: "check", detail: "Verifying stake exists and amount is sufficient..." });
        steps.push({
          type: "read",
          detail: `Current stake: amount=${_params[0] ?? "amount"}, rewards accrued`,
        });
        steps.push({
          type: "write",
          detail: `Reducing stake by ${_params[0] ?? "amount"}`,
        });
        steps.push({
          type: "transfer",
          detail: `Returning ${_params[0] ?? "amount"} tokens to caller`,
        });
        steps.push({ type: "emit", detail: "Event: unstake-event (user, amount)" });
        steps.push({ type: "return", detail: "(ok true)" });
        break;
      }

      case "create-pool": {
        steps.push({ type: "check", detail: "Validating token trait references..." });
        steps.push({
          type: "write",
          detail: "Creating new pool #1 in pools map",
        });
        steps.push({
          type: "write",
          detail: "Pool initialized: reserve-x=0, reserve-y=0, lp-supply=0",
        });
        steps.push({ type: "emit", detail: "Event: pool-created (id=u1)" });
        steps.push({ type: "return", detail: "(ok u1)" });
        break;
      }

      case "propose-tx": {
        steps.push({ type: "check", detail: "Verifying proposer is an owner..." });
        steps.push({
          type: "write",
          detail: "Creating transaction #1 in transactions map",
        });
        steps.push({
          type: "write",
          detail: `Stored: to=${_params[0] ?? "recipient"}, amount=${_params[1] ?? "0"}, executed=false`,
        });
        steps.push({ type: "emit", detail: "Event: tx-proposed (id=u1)" });
        steps.push({ type: "return", detail: "(ok u1)" });
        break;
      }

      case "vote": {
        steps.push({ type: "check", detail: "Checking caller hasn't already voted..." });
        steps.push({
          type: "write",
          detail: `Recording vote: proposal=${_params[0] ?? "0"}, voter=tx-sender, support=true`,
        });
        steps.push({
          type: "write",
          detail: `Updated tally: votes-for increased by 1`,
        });
        steps.push({ type: "emit", detail: "Event: vote-cast (proposal, voter, support)" });
        steps.push({ type: "return", detail: "(ok true)" });
        break;
      }

      case "sign": {
        steps.push({ type: "check", detail: "Verifying signer is an owner..." });
        steps.push({
          type: "write",
          detail: `Recording signature: tx=${_params[0] ?? "0"}, signer=tx-sender`,
        });
        steps.push({
          type: "check",
          detail: "Checking if required signatures reached...",
        });
        steps.push({ type: "return", detail: "(ok true)" });
        break;
      }

      case "add-liquidity": {
        steps.push({ type: "check", detail: "Validating pool exists and amounts > 0..." });
        steps.push({
          type: "transfer",
          detail: `Transferring ${_params[1] ?? "amount-x"} token-x to pool`,
        });
        steps.push({
          type: "transfer",
          detail: `Transferring ${_params[2] ?? "amount-y"} token-y to pool`,
        });
        steps.push({
          type: "write",
          detail: "Minting LP tokens proportional to contribution",
        });
        steps.push({
          type: "write",
          detail: "Updated reserves and LP supply",
        });
        steps.push({ type: "emit", detail: "Event: liquidity-added (pool, provider, amounts)" });
        steps.push({ type: "return", detail: "(ok true)" });
        break;
      }

      case "increment": {
        steps.push({ type: "read", detail: "Reading current counter value: u0" });
        steps.push({ type: "write", detail: "Setting counter to u1" });
        steps.push({ type: "return", detail: "(ok u1)" });
        break;
      }

      default: {
        steps.push({ type: "check", detail: `Executing ${name} with provided parameters...` });
        steps.push({
          type: "read",
          detail: "Reading contract state...",
        });
        steps.push({
          type: "write",
          detail: "Updating contract storage...",
        });
        steps.push({ type: "emit", detail: `Event: ${name}-completed` });
        steps.push({ type: "return", detail: "(ok true)" });
      }
    }
  }

  if (fn.type === "read-only-fn") {
    const name = fn.name;

    switch (name) {
      case "get-balance": {
        steps.push({
          type: "read",
          detail: `Reading balance of ${_params[0] ?? "who"}: 1,000,000 µSTX`,
        });
        steps.push({ type: "return", detail: "(ok u1000000)" });
        break;
      }
      case "get-total-supply": {
        steps.push({
          type: "read",
          detail: "Reading total supply: 1,000,000",
        });
        steps.push({ type: "return", detail: "(ok u1000000)" });
        break;
      }
      case "get-owner": {
        steps.push({
          type: "read",
          detail: `Looking up owner of token #${_params[0] ?? "0"}`,
        });
        steps.push({ type: "return", detail: "(ok (some ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM))" });
        break;
      }
      case "get-stake": {
        steps.push({
          type: "read",
          detail: `Reading stake data for ${_params[0] ?? "who"}`,
        });
        steps.push({ type: "return", detail: "(ok (some {amount: u1000, since: u142000, rewards: u50}))" });
        break;
      }
      case "get-counter": {
        steps.push({ type: "read", detail: "Reading counter: u1" });
        steps.push({ type: "return", detail: "(ok u1)" });
        break;
      }
      default: {
        steps.push({
          type: "read",
          detail: `Reading ${name}...`,
        });
        steps.push({ type: "return", detail: "(ok true)" });
      }
    }
  }

  return {
    functionName: fn.name,
    params: _params,
    steps,
    returnValue: steps[steps.length - 1]?.detail ?? "(ok true)",
    costEstimate: steps.length * 1_500 + Math.floor(Math.random() * 3_000),
  };
}

export function getExecutableFunctions(definitions: Definition[]): Definition[] {
  return definitions.filter(
    (d) => d.type === "public-fn" || d.type === "read-only-fn"
  );
}

export function getDefaultParams(fn: Definition): string[] {
  if (fn.type === "read-only-fn") {
    return ["ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"];
  }
  switch (fn.name) {
    case "transfer": return ["u100", "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"];
    case "mint": return ["ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"];
    case "propose": return ["\"Upgrade protocol to v2\""];
    case "stake": return ["u500"];
    case "unstake": return ["u200"];
    case "create-pool": return ["token-x", "token-y"];
    case "add-liquidity": return ["u1", "u1000", "u1000"];
    case "propose-tx": return ["ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", "u500"];
    case "vote": return ["u1", "true"];
    case "sign": return ["u1"];
    case "increment": return [];
    default: return [];
  }
}

export function executeFunction(
  fn: Definition,
  definitions: Definition[],
  params: string[]
): ExecutionResult {
  return simulateExecution(fn, definitions, params);
}
