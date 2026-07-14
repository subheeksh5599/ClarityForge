// ClarityForge VM — stateful in-browser Clarity contract simulator
// Like Remix VM: tracks storage, balances, tokens across multiple calls
// No chain state required — pure TypeScript simulation

import { Definition, ParamDef } from "./analyzer";

export interface SimAccount {
  address: string;
  privateKey?: string;
  balance: number; // in microSTX
  label: string;
}

export interface VmState {
  accounts: SimAccount[];
  dataVars: Record<string, string>;  // var-name → clarity-value (e.g., "u5")
  maps: Record<string, Record<string, Record<string, string>>>; // map-name → key → field → value
  fungibleTokens: Record<string, Record<string, number>>; // token-name → address → balance
  nonFungibleTokens: Record<string, Record<string, string>>; // nft-name → id → owner
  events: string[];
  blockHeight: number;
  caller: string; // current tx-sender
}

export interface VmStep {
  type: "read" | "write" | "transfer" | "emit" | "return" | "error";
  detail: string;
  storageChange?: string;
}

export interface VmResult {
  success: boolean;
  steps: VmStep[];
  returnValue: string;
  costEstimate: number;
  state: VmState; // state after execution
}

// Generate a random Stacks testnet address
function randomAddress(): string {
  const chars = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let addr = "ST";
  for (let i = 0; i < 38; i++) addr += chars[Math.floor(Math.random() * chars.length)];
  return addr;
}

// Generate the initial VM state with test accounts
export function createVmState(): VmState {
  const accounts: SimAccount[] = [
    { address: randomAddress(), balance: 100_000_000, label: "Account 1" },
    { address: randomAddress(), balance: 100_000_000, label: "Account 2" },
    { address: randomAddress(), balance: 100_000_000, label: "Account 3" },
    { address: randomAddress(), balance: 100_000_000, label: "Account 4" },
    { address: randomAddress(), balance: 100_000_000, label: "Account 5" },
  ];

  return {
    accounts,
    dataVars: {},
    maps: {},
    fungibleTokens: {},
    nonFungibleTokens: {},
    events: [],
    blockHeight: 150_000,
    caller: accounts[0].address,
  };
}

// Initialize state from contract definitions
export function initStateFromContract(state: VmState, definitions: Definition[]): VmState {
  const s = { ...state, dataVars: { ...state.dataVars }, maps: { ...state.maps }, fungibleTokens: { ...state.fungibleTokens } };

  for (const def of definitions) {
    switch (def.type) {
      case "data-var":
        if (!(def.name in s.dataVars)) s.dataVars[def.name] = "u0";
        break;
      case "map":
        if (!(def.name in s.maps)) s.maps[def.name] = {};
        break;
      case "fungible-token":
        if (!(def.name in s.fungibleTokens)) {
          s.fungibleTokens[def.name] = {};
          // Mint initial supply to contract deployer
          const deployer = s.accounts[0]?.address ?? "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
          s.fungibleTokens[def.name][deployer] = 1_000_000;
        }
        break;
      case "non-fungible-token":
        if (!(def.name in s.nonFungibleTokens)) s.nonFungibleTokens[def.name] = {};
        break;
    }
  }

  return s;
}

// Parse a Clarity uint value like "u123" → 123
function parseUint(val: string): number {
  if (val.startsWith("u")) return parseInt(val.slice(1), 10);
  return parseInt(val, 10) || 0;
}

// Format a number as a Clarity uint
function toUint(n: number): string {
  return `u${n}`;
}

// Execute a function against the current VM state
export function executeInVm(
  fn: Definition,
  definitions: Definition[],
  params: string[],
  state: VmState
): VmResult {
  const steps: VmStep[] = [];
  const newState = JSON.parse(JSON.stringify(state)) as VmState;
  newState.events = [...state.events];
  
  const caller = state.caller;
  const fnName = fn.name;
  const fnParams = fn.params || [];

  // 1. Auth check for public functions
  if (fn.type === "public-fn") {
    steps.push({ type: "read", detail: `tx-sender: ${caller.slice(0, 10)}…` });
  }

  // 2. Log parameters
  if (fnParams.length > 0) {
    const paramStr = fnParams.map((p, i) => `${p.name}: ${p.type} = ${params[i] ?? "none"}`).join(", ");
    steps.push({ type: "read", detail: `params: ${paramStr}` });
  }

  // 3. Simulate based on function name patterns and contract structure
  const tokens = definitions.filter(d => d.type === "fungible-token" || d.type === "non-fungible-token");
  const dataVars = definitions.filter(d => d.type === "data-var");
  const maps = definitions.filter(d => d.type === "map");

  // --- Transfer pattern ---
  if (fnName === "transfer" && tokens.length > 0) {
    const token = tokens[0];
    const amount = parseUint(params[0] || "u0");
    const recipient = params[1] || state.accounts[1]?.address || "recipient";

    steps.push({ type: "read", detail: `Balance of ${caller.slice(0, 8)}…: ${toUint(state.fungibleTokens[token.name]?.[caller] ?? 0)}` });

    if ((state.fungibleTokens[token.name]?.[caller] ?? 0) < amount) {
      steps.push({ type: "error", detail: `Insufficient balance: have ${state.fungibleTokens[token.name]?.[caller] ?? 0}, need ${amount}` });
      return { success: false, steps, returnValue: "(err u1)", costEstimate: 500, state: newState };
    }

    // Execute transfer
    newState.fungibleTokens[token.name] ??= {};
    newState.fungibleTokens[token.name][caller] = (newState.fungibleTokens[token.name][caller] ?? 0) - amount;
    newState.fungibleTokens[token.name][recipient] = (newState.fungibleTokens[token.name][recipient] ?? 0) + amount;
    
    steps.push({ type: "transfer", detail: `${token.name}: ${toUint(amount)} → ${recipient.slice(0, 8)}…`, storageChange: `-${amount} | +${amount}` });
    steps.push({ type: "emit", detail: `Event: ft-transfer (${token.name}, ${caller.slice(0, 6)}…, ${recipient.slice(0, 6)}…, ${toUint(amount)})` });
    steps.push({ type: "return", detail: "(ok true)" });
    return { success: true, steps, returnValue: "(ok true)", costEstimate: 2000, state: newState };
  }

  // --- Mint pattern ---
  if (fnName === "mint" && tokens.length > 0) {
    const nftToken = tokens.find(d => d.type === "non-fungible-token") || tokens[0];
    const recipient = params[0] || caller;
    const tokenId = toUint(Object.keys(newState.nonFungibleTokens[nftToken.name] || {}).length + 1);

    newState.nonFungibleTokens[nftToken.name] ??= {};
    newState.nonFungibleTokens[nftToken.name][tokenId] = recipient;

    steps.push({ type: "write", detail: `Minted ${nftToken.name} #${tokenId}`, storageChange: `new token` });
    if (dataVars.length > 0) {
      const lastIdVar = dataVars[0];
      newState.dataVars[lastIdVar.name] = tokenId;
      steps.push({ type: "write", detail: `Updated ${lastIdVar.name} = ${tokenId}`, storageChange: `${lastIdVar.name}: u0 → ${tokenId}` });
    }
    steps.push({ type: "emit", detail: `Event: nft-mint (${nftToken.name}, ${tokenId}, ${recipient.slice(0, 8)}…)` });
    steps.push({ type: "return", detail: `(ok ${tokenId})` });
    return { success: true, steps, returnValue: `(ok ${tokenId})`, costEstimate: 3000, state: newState };
  }

  // --- Propose pattern (governance) ---
  if ((fnName === "propose" || fnName === "propose-tx") && maps.length > 0) {
    const proposalMap = maps[0];
    const proposalId = toUint((parseInt(newState.dataVars[dataVars[0]?.name]?.replace("u", "") || "0") + 1));

    // Update counter
    if (dataVars.length > 0) {
      newState.dataVars[dataVars[0].name] = proposalId;
      steps.push({ type: "write", detail: `Updated ${dataVars[0].name} = ${proposalId}`, storageChange: `${dataVars[0].name}: incremented` });
    }

    // Store proposal
    newState.maps[proposalMap.name] ??= {};
    newState.maps[proposalMap.name][proposalId] = {
      proposer: caller,
      description: params[0]?.replace(/"/g, "") || "proposal",
      votes_for: "u0",
      votes_against: "u0",
      executed: "false",
    };

    steps.push({ type: "write", detail: `Created proposal #${proposalId} in ${proposalMap.name}`, storageChange: `map: ${proposalMap.name}[${proposalId}]` });
    steps.push({ type: "emit", detail: `Event: proposal-created (id=${proposalId})` });
    steps.push({ type: "return", detail: `(ok ${proposalId})` });
    return { success: true, steps, returnValue: `(ok ${proposalId})`, costEstimate: 2500, state: newState };
  }

  // --- Vote pattern ---
  if (fnName === "vote" && maps.length > 0) {
    const voteMap = maps.length > 1 ? maps[1] : maps[0];
    const proposalMap = maps[0];
    const propId = params[0] || "u1";
    const support = params[1] === "true";

    // Record vote
    const voteKey = `${propId}-${caller}`;
    newState.maps[voteMap.name] ??= {};
    newState.maps[voteMap.name][voteKey] = { voted: "true", support: support ? "true" : "false" };

    // Update tally
    const prop = newState.maps[proposalMap.name]?.[propId];
    if (prop) {
      const field = support ? "votes_for" : "votes_against";
      prop[field] = toUint(parseUint(prop[field]) + 1);
    }

    steps.push({ type: "write", detail: `Vote recorded: ${support ? "FOR" : "AGAINST"} proposal ${propId}`, storageChange: `vote cast` });
    steps.push({ type: "emit", detail: `Event: vote-cast (proposal=${propId}, voter=${caller.slice(0, 8)}…)` });
    steps.push({ type: "return", detail: "(ok true)" });
    return { success: true, steps, returnValue: "(ok true)", costEstimate: 2000, state: newState };
  }

  // --- Stake pattern ---
  if (fnName === "stake" && tokens.length > 0) {
    const amount = parseUint(params[0] || "u100");
    const token = tokens[0];

    // Transfer tokens to contract
    newState.fungibleTokens[token.name] ??= {};
    newState.fungibleTokens[token.name][caller] = (newState.fungibleTokens[token.name][caller] ?? 0) - amount;

    // Record stake
    const stakeMap = maps[0];
    if (stakeMap) {
      newState.maps[stakeMap.name] ??= {};
      newState.maps[stakeMap.name][caller] = {
        amount: toUint(amount),
        since: toUint(newState.blockHeight),
        rewards: "u0",
      };
    }

    // Update total staked
    if (dataVars.length > 1) {
      const totalStaked = dataVars[1];
      newState.dataVars[totalStaked.name] = toUint(parseUint(newState.dataVars[totalStaked.name]) + amount);
    }

    steps.push({ type: "transfer", detail: `Staked ${toUint(amount)} tokens`, storageChange: `stake recorded` });
    steps.push({ type: "emit", detail: `Event: stake-event (${caller.slice(0, 8)}…, ${toUint(amount)})` });
    steps.push({ type: "return", detail: "(ok true)" });
    return { success: true, steps, returnValue: "(ok true)", costEstimate: 3000, state: newState };
  }

  // --- Unstake pattern ---
  if (fnName === "unstake" && maps.length > 0) {
    const amount = parseUint(params[0] || "u50");
    const stakeMap = maps[0];
    const stake = newState.maps[stakeMap.name]?.[caller];

    if (!stake || parseUint(stake.amount) < amount) {
      steps.push({ type: "error", detail: "Insufficient stake" });
      return { success: false, steps, returnValue: "(err u2)", costEstimate: 500, state: newState };
    }

    // Reduce stake
    stake.amount = toUint(parseUint(stake.amount) - amount);

    // Return tokens
    const token = tokens[0];
    if (token) {
      newState.fungibleTokens[token.name] ??= {};
      newState.fungibleTokens[token.name][caller] = (newState.fungibleTokens[token.name][caller] ?? 0) + amount;
    }

    steps.push({ type: "transfer", detail: `Unstaked ${toUint(amount)} tokens`, storageChange: `stake reduced` });
    steps.push({ type: "emit", detail: `Event: unstake-event (${caller.slice(0, 8)}…, ${toUint(amount)})` });
    steps.push({ type: "return", detail: "(ok true)" });
    return { success: true, steps, returnValue: "(ok true)", costEstimate: 2500, state: newState };
  }

  // --- Read-only functions ---
  if (fn.type === "read-only-fn") {
    // get-balance
    if (fnName.toLowerCase().includes("balance") && tokens.length > 0) {
      const who = params[0] || caller;
      const balance = state.fungibleTokens[tokens[0].name]?.[who] ?? 0;
      steps.push({ type: "read", detail: `Balance of ${who.slice(0, 8)}…: ${toUint(balance)}` });
      steps.push({ type: "return", detail: `(ok ${toUint(balance)})` });
      return { success: true, steps, returnValue: `(ok ${toUint(balance)})`, costEstimate: 500, state: newState };
    }

    // get-total-supply
    if (fnName.toLowerCase().includes("supply") && tokens.length > 0) {
      const supply = Object.values(state.fungibleTokens[tokens[0].name] || {}).reduce((a, b) => a + b, 0);
      steps.push({ type: "read", detail: `Total supply: ${toUint(supply)}` });
      steps.push({ type: "return", detail: `(ok ${toUint(supply)})` });
      return { success: true, steps, returnValue: `(ok ${toUint(supply)})`, costEstimate: 300, state: newState };
    }

    // get-owner
    if (fnName.toLowerCase().includes("owner") && tokens.length > 0) {
      const nftToken = tokens.find(d => d.type === "non-fungible-token") || tokens[0];
      const tokenId = params[0] || "u1";
      const owner = state.nonFungibleTokens[nftToken.name]?.[tokenId] || "none";
      steps.push({ type: "read", detail: `Owner of ${nftToken.name} #${tokenId}: ${owner.slice(0, 10)}…` });
      steps.push({ type: "return", detail: `(ok (some ${owner}))` });
      return { success: true, steps, returnValue: `(ok (some ${owner}))`, costEstimate: 500, state: newState };
    }

    // get-stake
    if (fnName.toLowerCase().includes("stake") && maps.length > 0) {
      const who = params[0] || caller;
      const stake = state.maps[maps[0].name]?.[who];
      if (stake) {
        steps.push({ type: "read", detail: `Stake of ${who.slice(0, 8)}…: amount=${stake.amount}, rewards=${stake.rewards}` });
        steps.push({ type: "return", detail: `(ok (some {amount: ${stake.amount}, since: ${stake.since}, rewards: ${stake.rewards}}))` });
        return { success: true, steps, returnValue: `(ok (some ...))`, costEstimate: 500, state: newState };
      }
      steps.push({ type: "read", detail: `No stake found for ${who.slice(0, 8)}…` });
      steps.push({ type: "return", detail: "(ok none)" });
      return { success: true, steps, returnValue: "(ok none)", costEstimate: 300, state: newState };
    }

    // Generic read-only
    steps.push({ type: "read", detail: `Reading ${fnName}...` });
    if (dataVars.length > 0) {
      steps.push({ type: "read", detail: `${dataVars[0].name} = ${state.dataVars[dataVars[0].name] || "u0"}` });
    }
    steps.push({ type: "return", detail: "(ok true)" });
    return { success: true, steps, returnValue: "(ok true)", costEstimate: 300, state: newState };
  }

  // --- Generic write (for unknown public functions) ---
  if (fn.type === "public-fn") {
    steps.push({ type: "write", detail: `Executing ${fnName}` });

    // Update a data var if it exists
    if (dataVars.length > 0) {
      const oldVal = newState.dataVars[dataVars[0].name] || "u0";
      const newVal = toUint(parseUint(oldVal) + 1);
      newState.dataVars[dataVars[0].name] = newVal;
      steps.push({ type: "write", detail: `Updated ${dataVars[0].name}: ${oldVal} → ${newVal}`, storageChange: `${dataVars[0].name}: incremented` });
    }

    steps.push({ type: "emit", detail: `Event: ${fnName}-executed` });
    steps.push({ type: "return", detail: "(ok true)" });
    return { success: true, steps, returnValue: "(ok true)", costEstimate: 1500, state: newState };
  }

  // Fallback
  steps.push({ type: "return", detail: "(ok true)" });
  return { success: true, steps, returnValue: "(ok true)", costEstimate: 200, state: newState };
}
