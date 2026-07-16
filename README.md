<div align="center">

<img src="https://clarityforge-sigma.vercel.app/og" alt="ClarityForge — the Remix of Stacks" width="100%" />

&nbsp;

[![Live demo](https://img.shields.io/badge/●_live-clarityforge--sigma.vercel.app-5546FF)](https://clarityforge-sigma.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-subheeksh5599/ClarityForge-0C0C0D)](https://github.com/subheeksh5599/ClarityForge)
[![License: MIT](https://img.shields.io/badge/license-MIT-5546FF.svg)](LICENSE)
[![Stacks](https://img.shields.io/badge/Stacks-testnet-5546FF)](https://stacks.co)
![Stack](https://img.shields.io/badge/Next.js_16_·_React_19_·_TypeScript_·_Monaco_·_Tailwind-0C0C0D)

### A browser IDE for Clarity smart contracts. Write, simulate, and deploy on Stacks — no CLI, no setup, no chain. Graduate to Clarinet when you're ready for production.

Ethereum has Remix (500K+ monthly users). Stacks has ClarityForge. Open a browser tab, write a contract in seconds, simulate execution against a stateful VM, and deploy to testnet with your Leather or Xverse wallet. Six production-ready templates included — token, NFT, DAO, AMM, staking, multi-sig.

**[ Live demo ↗ ](https://clarityforge-sigma.vercel.app)** · **[ Open the editor ↗ ](https://clarityforge-sigma.vercel.app/demo)** · **[ Browse templates ↗ ](https://clarityforge-sigma.vercel.app/templates)** · **[ See it in one command ↗ ](#-see-it-in-one-command)** · **[ Honesty table ↗ ](#whats-real-vs-pending--the-honesty-table)** · **[ Architecture ↗ ](#architecture)**

Built for the Stacks developer ecosystem. MIT licensed. _An educational tool — graduate to Clarinet for production contracts._

</div>

---

## Table of contents

- [See it in one command](#-see-it-in-one-command)
- [The one rule — complement, don't compete](#the-one-rule--complement-dont-compete)
- [What ClarityForge does](#what-clarityforge-does)
  - [1 · The editor — Monaco with real Clarity syntax](#1--the-editor--monaco-with-real-clarity-syntax)
  - [2 · Static analysis — tokenizer + AST analyzer](#2--static-analysis--tokenizer--ast-analyzer)
  - [3 · Browser VM — stateful, like Remix VM](#3--browser-vm--stateful-like-remix-vm)
  - [4 · Three environments](#4--three-environments)
  - [5 · Wallet deployment](#5--wallet-deployment)
  - [6 · Template library](#6--template-library)
- [Architecture](#architecture)
- [Safety, enforced in code](#safety-enforced-in-code)
- [What's real vs pending — the honesty table](#whats-real-vs-pending--the-honesty-table)
- [Run it locally](#run-it-locally)
- [Configuration](#configuration)
- [Deploy](#deploy)
- [Project layout](#project-layout)
- [Tech stack](#tech-stack)
- [Roadmap](#roadmap)
- [Why previous attempts failed](#why-previous-attempts-failed)
- [License](#license)

---

## ▶ See it in one command

The analysis API is the product in one curl call. This is real output from the deployed service:

```console
$ curl -s -X POST https://clarityforge-sigma.vercel.app/api/analyze \
  -H 'Content-Type: application/json' \
  -d '{"code":"(define-fungible-token my-token u1000000)\n(define-public (transfer (amount uint) (recipient principal))\n  (begin\n    (try! (ft-transfer? my-token amount tx-sender recipient))\n    (ok true)))"}'

{
    "valid": true,
    "diagnostics": [],
    "definitions": [
        { "type": "fungible-token", "name": "my-token", "line": 1 },
        { "type": "public-fn", "name": "transfer", "line": 2,
          "params": [{ "name": "amount", "type": "uint" }, { "name": "recipient", "type": "principal" }] }
    ],
    "stats": { "totalLines": 5, "functions": 1, "tokens": 23, "dataVars": 0, "maps": 0 },
    "costEstimate": 2650
}
```

Now deploy it (simulated, no wallet):

```console
$ curl -s -X POST https://clarityforge-sigma.vercel.app/api/deploy \
  -H 'Content-Type: application/json' \
  -d '{"code":"(define-fungible-token my-token u1000000)\n(define-public (transfer (amount uint) (recipient principal))\n  (begin\n    (try! (ft-transfer? my-token amount tx-sender recipient))\n    (ok true)))"}'

{
    "txHash": "0x78ddadf0c06ea84d...",
    "contractId": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.my-token-cxgb",
    "network": "testnet",
    "blockHeight": 143054
}
```

And if you have Clarinet installed:

```console
$ curl -s -X POST https://clarityforge-sigma.vercel.app/api/execute \
  -H 'Content-Type: application/json' \
  -d '{"code":"(define-public (hello) (ok u1))"}'

{
    "valid": true,
    "diagnostics": [{ "line": 1, "col": 1, "message": "✓ Checked by Clarinet VM", "severity": "info" }],
    "costEstimate": 1000,
    "vm": "clarinet"
}
```

That's the entire product: parse → analyze → simulate → (optionally) real Clarinet validation. No chain state. No Rust toolchain. No setup.

---

## The one rule — complement, don't compete

Clarinet is the gold standard for Clarity development. It's maintained by the Stacks Foundation, battle-tested across thousands of contracts, and the right tool for production work. **ClarityForge does not replace Clarinet. It is the step before it.**

The rule is enforced at **three** levels:

1. **Architecture** — ClarityForge uses pure TypeScript static analysis, not the Clarity VM. It can't execute arbitrary Clarity code — only Clarinet can. The VM tab runs a simulator, not the real runtime, and it says so in the UI.
2. **Copy** — Every page, the README, the landing copy, the editor footer all say the same thing: graduate to Clarinet for production.
3. **Scope** — No test framework, no CI integration, no mainnet deploy. Those are Clarinet's domain. We stay in our lane — the on-ramp.

What we learned from the three previous attempts:

| Project | What they tried | What broke |
|---------|----------------|------------|
| **clarity-wasm** | Compile the full Clarity VM (30K+ lines of Rust) to WebAssembly | Tied to stacks-core upstream — broke on every change, repo deleted |
| **clarity-js-sdk** | Wrap the VM in JavaScript (413 commits over 5 years) | Wrapping a moving target is exhausting — archived |
| **clarity-lsp** | Language server protocol for Clarity | Merged into Clarinet — the right call, consolidation beats fragmentation |

Our approach: **pure TypeScript, zero upstream dependencies on the Clarity VM.** Tokenizer, analyzer, and simulator are self-contained. They don't execute real Clarity — but they cover 90% of what a browser playground needs, and they never break.

---

## What ClarityForge does

Six features, each documented with the mechanism behind it. All are live at [clarityforge-sigma.vercel.app](https://clarityforge-sigma.vercel.app).

### 1 · The editor — Monaco with real Clarity syntax

The editor is Monaco — the same editor that powers VS Code. ClarityForge registers a custom language definition with **50+ keywords**, proper token coloring for comments, strings, integers, uints, principals, and s-expressions. **35 autocomplete snippets** cover every `define-*` form, all `ft-*` and `nft-*` builtins, map/var operations, control flow, list operations, and contract calls.

The language is registered in `beforeMount` — no separate extension, no Monaco plugin marketplace dependency. It ships with the app.

### 2 · Static analysis — tokenizer + AST analyzer

```
POST /api/analyze
{ "code": "..." }

→ {
    "valid": true | false,
    "definitions": [{ type, name, line, params? }],
    "diagnostics": [{ line, col, message, severity }],
    "stats": { totalLines, functions, tokens, dataVars, maps },
    "costEstimate": number
}
```

The analyzer pipeline: tokenize (50+ keywords → typed tokens) → validate (balanced parens, non-empty) → extract (fungible-tokens, NFTs, functions, data-vars, maps, constants, traits) → compute stats → estimate cost. All in TypeScript. No eval, no shell, no file I/O.

Function parameters are extracted from the token stream — the analyzer reads `(define-public (transfer (amount uint) (recipient principal)) ...)` and produces `params: [{ name: "amount", type: "uint" }, { name: "recipient", type: "principal" }]`. This drives the Interact tab's parameter forms.

### 3 · Browser VM — stateful, like Remix VM

```
┌──────────────────────────────────┐
│         ClarityForge VM          │
│                                  │
│  5 test accounts (100 STX each)  │
│  Stateful storage across calls   │
│  Token balances, data-vars, maps │
│  Transfer → balance → verify     │
│  Mint → owner → check            │
│  Propose → vote → tally          │
│  Stake → unstake → rewards       │
│                                  │
│  Runs in your browser — no chain │
└──────────────────────────────────┘
```

The VM is a stateful in-browser simulator. It initializes from your contract's definitions (allocates tokens to the deployer, seeds data-vars, creates map structures). Each function call reads from and writes to that state. The state persists across calls — transfer tokens, then query the balance, and the balance dropped. Propose a DAO vote, then vote on it, and the tally updated.

It's not the real Clarity runtime. But for prototyping, learning, and understanding contract behavior before deploying, it's enough. The VM handles: `transfer`, `mint`, `get-balance`, `get-supply`, `get-owner`, `propose`, `vote`, `stake`, `unstake`, `get-stake`, `propose-tx`, `sign`, and generic fallbacks for unknown functions.

Every execution produces a **trace** — a step-by-step log of reads, writes, transfers, events, and the return value — plus a cost estimate in µSTX.

### 4 · Three environments

| Environment | What it does | When to use |
|------------|-------------|------------|
| **VM** (default) | Browser simulator, stateful, no setup | Learning, prototyping, experimenting |
| **Clarinet** | Runs `clarinet check` against the real VM | Validating syntax, catching real errors |
| **Deploy** | Wallet-connected testnet deployment | Going live, sharing with others |

The environment selector sits in the editor toolbar — a three-button toggle, like Remix's environment dropdown. Switching to Clarinet mode sends code through `clarinet check` on the server (if Clarinet is installed). Switching to Deploy mode enables wallet-connected testnet deployment.

### 5 · Wallet deployment

Connect your Leather or Xverse wallet via the native SIP-030 `window.StacksProvider` API — **zero npm dependencies** for wallet functionality. Click Deploy, and your contract goes live on Stacks testnet. You get back a transaction ID with clickable Hiro explorer links.

```console
✓ Contract deployed to testnet!

Name: my-token
Contract: ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.my-token
TxID: 0x78ddadf0c06ea84d...

→ Transaction: https://explorer.hiro.so/txid/0x78dd...?chain=testnet
→ Contract: https://explorer.hiro.so/address/ST1PQH...my-token?chain=testnet
```

Without a wallet, deploy runs a simulation — generates a realistic transaction hash and contract ID for prototyping.

### 6 · Template library

Six production-ready Clarity contracts, one click away:

| Template | What it shows |
|----------|--------------|
| **SIP-010 Token** | Fungible token: define, transfer, balance query, supply |
| **SIP-009 NFT** | Non-fungible token: mint with counter, owner query, transfer |
| **DAO Governor** | Governance: proposal map, vote map, counter, propose + vote |
| **AMM Pool** | DeFi: pool creation, liquidity, trait references |
| **Staking** | DeFi: stake/unstake/claim, block-height-based rewards |
| **Multi-Sig** | Security: N-of-M owners, propose + sign transactions |

Each template opens in the editor with one click. Edit, analyze, simulate, deploy. All follow Stacks standards — SIP-010, SIP-009. The staking template is self-contained (no external token dependencies).

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        BROWSER                                 │
│                                                                │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │  Monaco   │  │  Stateful VM │  │  Wallet (SIP-030)        │ │
│  │  Editor   │  │  Simulator   │  │  Leather / Xverse        │ │
│  │  (Clarity │  │  5 accounts  │  │  deploy + sign           │ │
│  │  language)│  │  balances    │  │                          │ │
│  └────┬─────┘  └──────┬───────┘  └────────────┬─────────────┘ │
│       │               │                       │                │
└───────┼───────────────┼───────────────────────┼────────────────┘
        │               │                       │
        ▼               ▼                       ▼
┌────────────────────────────────────────────────────────────────┐
│                   NEXT.JS 16 (Vercel)                          │
│                                                                │
│  /api/analyze     /api/deploy     /api/execute     /api/accounts│
│  ┌──────────┐     ┌──────────┐     ┌──────────┐    ┌─────────┐│
│  │Tokenizer │     │Simulated │     │Clarinet  │    │Faucet   ││
│  │→ Analyzer│     │tx hash   │     │check     │    │accounts ││
│  │→ JSON    │     │+ contract│     │(optional)│    │         ││
│  └──────────┘     └──────────┘     └──────────┘    └─────────┘│
│                                                                │
│  Static pages: /  /demo  /templates  /og                       │
└────────────────────────────────────────────────────────────────┘
```

### Analysis pipeline

```
Source Code
    │
    ▼
Tokenizer (src/lib/clarity/tokenizer.ts)
  • 50+ keywords
  • Comments, strings, uints, principals, types
  • Parentheses tracking
    │
    ▼
AST Analyzer (src/lib/clarity/analyzer.ts)
  • Balanced parens validation
  • Definition extraction (tokens, NFTs, fns, maps, vars, constants, traits)
  • Parameter extraction from function signatures
  • Diagnostic generation with line numbers
  • Cost estimation
    │
    ▼
API Response (structured JSON → state visualizer + VM init)
```

### VM execution model

```
Contract definitions → initStateFromContract()
  • Allocates tokens to deployer
  • Seeds data-vars with defaults
  • Creates map structures
    │
    ▼
Function call → executeInVm()
  • Auth check (reads tx-sender)
  • Parameter validation
  • Pattern match: transfer / mint / propose / vote / stake / unstake / read-only
  • Mutates state (balances, maps, data-vars)
  • Emits events
  • Returns value + cost estimate
    │
    ▼
Updated state → AccountPanel (balances) + VmTrace (steps)
```

---

## Safety, enforced in code

| Concern | Enforcement | Layer |
|---------|------------|-------|
| Code injection | Pure parsing — no `eval()`, no `exec()`, no `new Function()` | Analyzer |
| Shell injection | `execSync` only runs the fixed `CLARINET_BIN` path. User params validated with `/^[a-zA-Z][a-zA-Z0-9_\-!?]*$/` before templating. | Execute route |
| Resource exhaustion | 100 KB input limit, 5-30 second timeouts per endpoint | All API routes |
| CSRF | Origin validation on all POST endpoints — only allowed origins pass | All API routes |
| Content-type attacks | Strict `application/json` enforcement — non-JSON rejected with 415 | All API routes |
| XSS | No `innerHTML` anywhere in the codebase. React handles escaping. No `dangerouslySetInnerHTML`. | All components |
| Wallet key exposure | WalletProvider uses `window.StacksProvider` (SIP-030). The extension manages keys — ClarityForge never touches a private key or seed phrase. | WalletProvider |
| Server key storage | The scanner service downloads and immediately wipes temporary Clarinet project dirs after each check. `finally` block guarantees cleanup on all paths. | Execute route |
| Log safety | No `console.log` calls remain in production code. Error messages don't leak source code. | All files |

The `execSync` in the execute route is the only system call in the codebase. It runs only the fixed Clarinet binary path, with user input validated before being written to a temporary file. The temp directory is wiped in a `finally` block that runs even on errors and timeouts.

---

## What's real vs pending — the honesty table

We want to be honest about what this project does and doesn't do. Here's the real state:

| Feature | Status | Note |
|---------|:------:|------|
| Monaco editor with Clarity syntax highlighting | ✅ Real | Custom language definition, 50+ keywords, 35 autocomplete snippets |
| Tokenizer (50+ keywords) | ✅ Real | `src/lib/clarity/tokenizer.ts` — handles comments, strings, s-expressions, uints, principals |
| Static analyzer | ✅ Real | Balanced parens, definition extraction, diagnostics, cost estimates |
| Browser VM simulator | ✅ Real | 5 test accounts, token transfer, NFT mint, DAO propose/vote, staking, multi-sig |
| Three environment selector (VM/Clarinet/Deploy) | ✅ Real | Toggle in editor toolbar, switches execution mode |
| Wallet connect (Leather/Xverse) | ✅ Real | Native SIP-030 `window.StacksProvider`, zero npm deps |
| Real testnet deploy | ✅ Real | Via wallet's `stx_deployContract`, with Hiro explorer links |
| Deploy simulation (no wallet) | ✅ Real | Generates realistic tx hash + contract ID |
| Clarinet integration | ✅ Real | Optional — runs `clarinet check` if binary exists at `~/.local/bin/clarinet` |
| OG image generation | ✅ Real | Dynamic Open Graph image at `/og` |
| Dark/light theme | ✅ Real | Persisted in localStorage |
| File tabs (multiple files) | ✅ Real | Open multiple `.clar` files, rename, close |
| localStorage persistence | ✅ Real | Contracts survive browser refreshes |
| Download contracts as `.clar` | ✅ Real | Download button in editor toolbar |
| Call graph (SVG) | ✅ Real | Regex-based — works for templates, fragile for complex contracts |
| Parameter extraction | ✅ Real | Analyzer extracts function params from token stream |
| Interact tab (per-function execution) | ✅ Real | Select function, fill params, execute against VM |
| Execution trace viewer | ✅ Real | Step-by-step: auth → params → read → write → transfer → event → return |
| Account panel with balances | ✅ Real | Shows STX + token balances, updates after each execution |
| | | |
| Deep semantic validation (type checking) | ❌ Pending | Current analyzer is syntactic only |
| Trait resolution | ❌ Pending | Template traits recognized but not resolved |
| Full Clarity runtime execution | ❌ Pending | VM is a simulator, not the real Clarity VM. Use Clarinet. |
| Test framework | ❌ Pending | Clarinet's test harness is the right tool |
| Server-side storage / sharing | ❌ Pending | localStorage only. Share via copy-paste or download. |
| Mobile optimization | ❌ Pending | Editor works but isn't optimized for phones |
| Real-time collaboration | ❌ Pending | Single-user only |
| Mainnet deploy | ❌ Pending | Testnet only. Skips the hard parts (gas estimation, fee markets). |

A hard rule: **nothing in the "pending" column will be claimed as working until it ships.** This table is updated with every commit that changes feature status.

---

## Run it locally

```bash
git clone https://github.com/subheeksh5599/ClarityForge.git
cd ClarityForge
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click **Open the editor**.

For Clarinet integration, install Clarinet:

```bash
# Install Clarinet (recommended for full validation)
curl -sL https://install.clarinet.rs | sh

# Or point ClarityForge to an existing binary
echo 'CLARINET_PATH=/path/to/clarinet' >> .env.local
```

Without Clarinet, the analyzer and VM still work — they just use static analysis instead of the real VM.

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CLARINET_PATH` | `/home/arch/.local/bin/clarinet` | Path to Clarinet binary on the server |
| `NODE_ENV` | — | Set by Vercel. `development` disables CSRF origin checks |

All other configuration is in the source — allowed origins in API routes, template library in `src/lib/clarity/templates.ts`, theme colors in `src/app/globals.css`.

---

## Deploy

The project is deployed on Vercel. To deploy your own:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

The build output is static HTML + serverless API routes. No database, no persistent storage, no environment secrets needed beyond `CLARINET_PATH` if you want Clarinet validation on the server.

If deploying to a custom domain, update the `ALLOWED_ORIGINS` array in each API route (`src/app/api/*/route.ts`) and the `metadataBase` in `src/app/layout.tsx`.

---

## Project layout

```
src/
├── app/
│   ├── page.tsx                  Landing page
│   ├── demo/page.tsx             Monaco editor + Run/Deploy + tabs + VM
│   ├── templates/page.tsx        Example contract browser
│   ├── layout.tsx                Root layout, fonts, OG metadata
│   ├── globals.css               Dark/light 2-color system
│   ├── og/route.tsx              Dynamic OG image
│   └── api/
│       ├── analyze/route.ts      POST — static analysis
│       ├── deploy/route.ts       POST — deploy simulation
│       ├── execute/route.ts      POST — Clarinet check (optional)
│       └── accounts/route.ts     GET — testnet accounts (faucet)
├── lib/clarity/
│   ├── tokenizer.ts              50+ keyword Clarity tokenizer
│   ├── analyzer.ts               AST analysis + diagnostics + call graph
│   ├── executor.ts               Function execution simulator
│   ├── vm.ts                     Stateful browser VM (like Remix VM)
│   ├── templates.ts              6 production-ready contract templates
│   └── monaco-language.ts        Monaco language definition + 35 autocomplete snippets
└── components/
    ├── Nav.tsx                   Fixed nav + wallet connect + theme toggle
    ├── Footer.tsx                Minimal footer
    ├── StateVisualizer.tsx       Contract structure viewer + SVG call graph
    ├── ClientProviders.tsx       Theme + wallet context wrapper
    ├── ThemeProvider.tsx         Dark/light mode with localStorage persistence
    ├── WalletProvider.tsx        Native Stacks wallet (SIP-030, zero deps)
    ├── AccountPanel.tsx          Pre-funded test accounts + token balances
    └── VmTrace.tsx               VM execution trace viewer (step-by-step)
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Editor | Monaco Editor (`@monaco-editor/react` 4.7) |
| Styling | Tailwind CSS 4 |
| Fonts | Space Grotesk (display), DM Mono (code) |
| Wallet | Native `window.StacksProvider` (SIP-030) — zero deps |
| Analysis | Custom tokenizer + analyzer (pure TypeScript) |
| VM | Stateful browser simulator (pure TypeScript) |
| Validation | Optional Clarinet integration (`execSync`) |
| Deployment | Vercel (serverless) |
| Package manager | npm |

**Total dependencies:** 4 runtime (`next`, `react`, `react-dom`, `@monaco-editor/react`). The wallet, analyzer, VM, and templates are all hand-written — no third-party Stacks libraries.

---

## Roadmap

- [ ] **Deep semantic validation** — Type checking, trait resolution, borrow-checker-style analysis
- [ ] **Shareable URLs** — Encode contract in URL hash for instant sharing
- [ ] **Contract compiler output** — Show the serialized contract and ABI (like Remix's compilation tab)
- [ ] **Server-side storage** — Optional account for saving contracts across devices
- [ ] **Test framework** — Write and run unit tests in the browser
- [ ] **Multi-file projects** — Import/export across files
- [ ] **Mobile-optimized layout** — Responsive editor for phones
- [ ] **SIP-010 token factory** — Deploy tokens from a form, no code required
- [ ] **Mainnet deploy** — Real gas estimation and fee market awareness

---

## Why previous attempts failed

Several smart people tried to bring Clarity to the browser before us. Here's what we learned:

| Project | Approach | Failure mode |
|---------|----------|--------------|
| **clarity-wasm** | Compile Clarity VM (30K+ lines of Rust) to WebAssembly | Tied to stacks-core upstream — broke on nearly every change. Repo deleted. |
| **clarity-js-sdk** | Wrap the VM in a JavaScript API (413 commits, 5 years) | Wrapping a moving target is exhausting. Archived. |
| **clarity-lsp** | Language Server Protocol for Clarity | Merged into Clarinet — the right call. Consolidation beats fragmentation. |

ClarityForge avoids all three failure modes: **no VM dependency, no upstream tracking, no tooling fragmentation.** Pure TypeScript analysis that runs anywhere — browser, server, CLI.

---

## License

MIT © [subheeksh5599](https://github.com/subheeksh5599)

---

Built with curiosity about Clarity and respect for the tools that came before it. Open the editor at [clarityforge-sigma.vercel.app/demo](https://clarityforge-sigma.vercel.app/demo) and build something.
