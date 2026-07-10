<p align="center">
  <img src="https://img.shields.io/badge/Stacks-5546FF?style=for-the-badge&logo=stacks&logoColor=white" alt="Stacks">
  <img src="https://img.shields.io/badge/Clarity-Smart_Contracts-5546FF?style=for-the-badge" alt="Clarity">
  <img src="https://img.shields.io/badge/License-MIT-0C0C0D?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/Applying_for-DeGrants-5546FF?style=for-the-badge" alt="DeGrants">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind">
  <img src="https://img.shields.io/badge/Monaco-Editor-007ACC?style=flat-square&logo=visualstudio" alt="Monaco">
  <img src="https://img.shields.io/badge/GSAP-ScrollTrigger-88CE02?style=flat-square&logo=greensock" alt="GSAP">
</p>

<h1 align="center">ClarityForge</h1>
<h3 align="center"><em>The Remix of Stacks.<br>Write Clarity. In your browser. No CLI.</em></h3>

<p align="center">
  <strong>Browser-based IDE for Clarity smart contracts.<br>Real tokenizer + AST analyzer + state visualizer + one-click deploy.<br>Applying for Stacks Community DeGrants.</strong>
</p>

<p align="center">
  <a href="#the-problem">Problem</a> &bull;
  <a href="#the-solution">Solution</a> &bull;
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#features">Features</a> &bull;
  <a href="#how-it-works">How It Works</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#faq">FAQ</a> &bull;
  <a href="#degrant-application">DeGrants</a>
</p>

---

## The Problem

Stacks has Clarinet — the professional CLI framework for Clarity development. But there's no fast, zero-install way to write and test Clarity code. Every new developer hits the same wall.

| Problem | Impact |
|---------|--------|
| **Clarinet requires local install** | `brew install clarinet` + Rust toolchain — 20 minutes before first line of code |
| **No browser playground exists** | Ethereum has Remix (500K+ monthly users). Stacks has nothing equivalent |
| **Onboarding takes hours** | New Stacks devs spend their first session installing tooling, not writing contracts |
| **No visual contract breakdown** | Devs read raw Clarity source to understand structure — no storage tables, no call graphs |
| **Template fragmentation** | Reference contracts scattered across docs, GitHub, and Discord — no single curated library |
| **Previous attempts failed** | clarity-wasm (moved), clarity-js-sdk (archived 2023), clarity-lsp (archived 2023, merged) — nobody cracked browser Clarity |

---

## The Solution

ClarityForge is the Remix of Stacks. Open a browser tab, type Clarity, see results in 10 seconds. Graduate to Clarinet when you're ready for production.

```
Browser Tab ──> Monaco Editor ──> Clarity Analyzer ──> Visual Breakdown
                      │                   │                  │
              6 contract           Real tokenizer       State tables
              templates            + AST parser         + call graph
```

### What you get

- **Zero-install editor** — Monaco-powered with Clarity syntax highlighting and autocomplete
- **Real analysis engine** — Tokenizer + AST analyzer written in TypeScript. No WASM, no Clarinet dependency, no server-side VM
- **State visualizer** — Contracts rendered as token cards, function lists, storage tables, and call graphs. Switch between Visual and Text views
- **6 production templates** — SIP-010 Token, SIP-009 NFT, DAO Governor, AMM Pool, Staking, Multi-Sig Wallet — one click to open in editor
- **One-click deploy simulation** — Validates contract, generates Stacks-format tx hash and contract ID, links to explorer
- **Shareable URLs** — `/demo?template=dao` opens that template directly. Send links, not screenshots
- **30+ Clarity keywords** — Tokenizer recognizes every define-* form, ft/nft builtins, map/var operations, control flow, and type constructors

---

## Why This Wins DeGrants

### The Remix/Hardhat analogy

| | Ethereum | Stacks |
|---|---|---|
| **Professional framework** | Hardhat | Clarinet |
| **Browser IDE** | Remix (500K users/mo) | **ClarityForge** ← this |

Remix didn't replace Hardhat. It complemented it. ClarityForge doesn't replace Clarinet — it feeds developers into it.

### What we learned from the failures

Hiro (funded company) tried clarity-wasm, clarity-js-sdk, and clarity-lsp. All were archived or merged. Why?

- **clarity-wasm** — Clarity VM is 30K+ lines of Rust tied to chain state. WASM compilation broke on every upstream change
- **clarity-js-sdk** — Wrapped a moving target in JavaScript. 413 commits, archived after 5 years
- **clarity-lsp** — Merged into Clarinet (the right call — consolidation)

**ClarityForge avoids all three failure modes:**
1. No VM dependency — pure TypeScript analysis, no chain state required
2. No upstream tracking — our analyzer is self-contained
3. Complements Clarinet — doesn't compete with it

---

## Quick Start

```bash
git clone https://github.com/subheeksh5599/ClarityForge.git
cd ClarityForge
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click **Open the editor** to try the demo.

---

## Features

### In-browser Clarity editor

Monaco editor with Clarity-customized theme. Real-time editing. Six contract templates pre-loaded.

### Live analysis engine

```
POST /api/analyze
{ "code": "(define-fungible-token my-token u1000000)..." }

→ {
    "valid": true,
    "definitions": [
      { "type": "fungible-token", "name": "my-token", "line": 1 },
      { "type": "public-fn", "name": "transfer", "line": 3 }
    ],
    "stats": { "totalLines": 6, "functions": 1, "dataVars": 0, "maps": 0 },
    "diagnostics": [],
    "costEstimate": 2250
  }
```

### State visualizer

Two views. Toggle between them:

| Visual | Text |
|--------|------|
| Token cards with icons | Raw diagnostic output |
| Function list (public/read-only/private) | Line-by-line errors |
| Storage tables (data vars + maps) | Stats summary |
| Call graph with typed nodes | Cost estimate |

### Deploy simulation

```
POST /api/deploy
{ "code": "..." }

→ {
    "txHash": "0x78ddadf0c06ea84d...",
    "contractId": "ST1PQHQKV0RJXZFY1DGX8MNS...my-token-cxgb",
    "network": "testnet",
    "blockHeight": 143054
  }
```

Rejects invalid contracts with specific diagnostics. Links to explorer for deployed contracts.

### Template library

| Template | Type | Lines | Functions | Data Vars | Maps |
|----------|------|-------|-----------|-----------|------|
| SIP-010 Token | Fungible Token | 12 | 2 | 0 | 0 |
| SIP-009 NFT | NFT | 12 | 2 | 1 | 0 |
| DAO Governor | Governance | 25 | 2 | 1 | 2 |
| AMM Pool | DeFi | 22 | 2 | 2 | 1 |
| Staking | DeFi | 25 | 2 | 2 | 1 |
| Multi-Sig | Security | 22 | 2 | 2 | 2 |

---

## How It Works

### Clarity analysis pipeline

```
Source Code
    │
    ▼
Tokenizer (src/lib/clarity/tokenizer.ts)
  • 30+ Clarity keywords recognized
  • Comments, strings, uints, principals, types
  • Parentheses tracking
    │
    ▼
AST Analyzer (src/lib/clarity/analyzer.ts)
  • Balanced parentheses validation
  • Definition extraction (tokens, NFTs, functions, maps, vars)
  • Diagnostic generation with line numbers
  • Cost estimation based on code complexity
    │
    ▼
API Response (/api/analyze)
  • Structured JSON with definitions, stats, diagnostics
  • Ready for state visualizer consumption
```

### Security design

| Concern | Mitigation |
|---------|-----------|
| Code injection | Pure parsing — zero eval, zero shell, zero file I/O |
| Resource exhaustion | 100KB input limit, 5-second timeout |
| CSRF | Origin validation on all POST endpoints |
| Content-type attacks | Strict JSON enforcement |

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                  Landing — Fig-labeled, statement-driven
│   ├── demo/page.tsx             Monaco editor + Run/Deploy + tabs
│   ├── templates/page.tsx        6 templates → opens demo pre-loaded
│   ├── layout.tsx                Root layout, fonts, OG metadata
│   ├── globals.css               2-color system (#0C0C0D + #EBEBE5)
│   ├── og/route.tsx              Dynamic OG image for social cards
│   └── api/
│       ├── analyze/route.ts      POST — validate + analyze Clarity
│       └── deploy/route.ts       POST — validate + simulate deploy
├── lib/clarity/
│   ├── tokenizer.ts              Clarity tokenizer (30+ keywords)
│   ├── analyzer.ts               AST analysis + diagnostics
│   └── templates.ts              6 full Clarity contracts
└── components/
    ├── Nav.tsx                   Fixed nav with scroll progress
    ├── Footer.tsx                Minimal footer
    ├── FadeIn.tsx                GSAP scroll reveal
    └── StateVisualizer.tsx       Visual contract breakdown
```

### Page routes

| Route | Purpose |
|-------|---------|
| `/` | Landing — one statement, Fig-labeled sections |
| `/demo` | Editor with Run/Deploy and Visual/Text tabs |
| `/demo?template=dao` | Open specific template directly |
| `/templates` | All 6 contracts with descriptions |
| `/api/analyze` | POST — analyze Clarity code |
| `/api/deploy` | POST — simulate testnet deployment |
| `/og` | Dynamic OG image for social sharing |

---

## FAQ

<details>
<summary><strong>Does ClarityForge actually execute Clarity code?</strong></summary>

No. ClarityForge performs static analysis — tokenization, syntax validation, definition extraction, and diagnostics. It does not execute code against chain state. For full execution, use Clarinet's VM.
</details>

<details>
<summary><strong>Why not use clarity-wasm for real execution?</strong></summary>

clarity-wasm (stx-labs/clarity-wasm, 26★) compiles Clarity to WebAssembly. It's an official project but ties directly to stacks-core's Rust VM — meaning it breaks on upstream changes. Our pure-TypeScript approach is simpler, self-contained, and never needs upstream sync. For the Remix comparison: Remix also doesn't embed geth — it uses a lightweight simulation layer.
</details>

<details>
<summary><strong>How does this compare to the Stacks Explorer Sandbox?</strong></summary>

The Explorer Sandbox requires wallet connection and is designed for deployment. ClarityForge requires no wallet and is designed for prototyping. Different use cases, complementary tools.
</details>

<details>
<summary><strong>Can I use this instead of Clarinet?</strong></summary>

For learning and prototyping — yes. For production contracts with full test suites — use Clarinet. ClarityForge is the on-ramp. Clarinet is the highway.
</details>

<details>
<summary><strong>Is the deploy feature real?</strong></summary>

The deploy endpoint simulates testnet deployment. It validates the contract, generates a realistic Stacks-format transaction hash and contract ID, and provides an explorer link. Real wallet-connected deployment is planned for Phase 2.
</details>

<details>
<summary><strong>What Clarity syntax does the analyzer support?</strong></summary>

All define-* forms (fungible-token, non-fungible-token, public, read-only, private, data-var, map, constant, trait), all ft-* and nft-* builtins, map operations, var operations, control flow (let, begin, if, match), error handling (try!, unwrap!, asserts!), and type annotations.
</details>

<details>
<summary><strong>Can I add my own templates?</strong></summary>

Yes. Edit `src/lib/clarity/templates.ts` and add entries following the `Template` interface. Templates appear automatically in the editor and templates page.
</details>

---

## DeGrants Application

### Program fit

DeGrants funds small, practical projects that strengthen Stacks through education, tooling, public goods, and community engagement.

| DeGrants criteria | ClarityForge alignment |
|---|---|
| **Clear relevance to Stacks** | Built entirely for the Clarity/Stacks developer ecosystem |
| **Community or ecosystem value** | Removes the single biggest onboarding barrier — CLI setup |
| **Defined deliverables** | Browser editor, analysis engine, 6 templates, deploy simulation, visualizer |
| **Feasible scope & timeline** | All agents built (A–E). Demo live. 8-week delivery window |
| **Credible ability to execute** | Working prototype with real analysis, not mockups |
| **Public goods contribution** | Open source (MIT), no monetization, feeds developers into Clarinet |

### Award requested

$5,000 — the maximum DeGrants award.

### Why we should be selected

ClarityForge fills the single biggest gap in the Stacks developer toolchain. Ethereum has had Remix since 2016. Stacks still requires every new developer to install a CLI before writing their first line of Clarity. We've built the Remix of Stacks. The demo is live. The analysis is real. The templates are comprehensive.

---

**Built for Stacks. Applying for DeGrants.**
