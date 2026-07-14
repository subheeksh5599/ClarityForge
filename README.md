<p align="center">
  <img src="https://img.shields.io/badge/Stacks-5546FF?style=for-the-badge&logo=stacks&logoColor=white" alt="Stacks">
  <img src="https://img.shields.io/badge/Clarity-Smart_Contracts-5546FF?style=for-the-badge" alt="Clarity">
  <img src="https://img.shields.io/badge/License-MIT-0C0C0D?style=for-the-badge" alt="License">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind">
  <img src="https://img.shields.io/badge/Monaco-Editor-007ACC?style=flat-square&logo=visualstudio" alt="Monaco">
  <img src="https://img.shields.io/badge/GSAP-ScrollTrigger-88CE02?style=flat-square&logo=greensock" alt="GSAP">
</p>

<h1 align="center">ClarityForge</h1>
<h3 align="center"><em>A browser playground for trying out Clarity ideas — no setup, no CLI. Graduate to Clarinet when you're ready to build for real.</em></h3>

<p align="center">
  <strong>Browser-based editor for Clarity smart contracts.<br>Real tokenizer + AST analyzer + state visualizer + deploy simulation.</strong>
</p>

<p align="center">
  <a href="#why-this-exists">Why</a> &bull;
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#features">Features</a> &bull;
  <a href="#how-it-works">How It Works</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#current-limitations">Limitations</a> &bull;
  <a href="#faq">FAQ</a>
</p>

---

## Why This Exists

Clarinet is the gold standard for Clarity development — and that's a good thing. It's well-maintained by the Stacks Foundation, battle-tested across thousands of contracts, and the right tool for production work.

But there's a missing step before Clarinet: the "I just want to try this" step. Ethereum developers can open Remix in a browser tab and write a contract in seconds. Stacks developers need to install a Rust toolchain first. That initial friction can discourage people from even trying Clarity.

We built ClarityForge as a small on-ramp — not a replacement for Clarinet, not a competitor. Just a quick way to experiment with Clarity syntax, browse example contracts, and get a feel for the language before committing to a full local setup.

### What we learned from previous attempts

Several smart people have tried to bring Clarity to the browser before us. Their work taught us a lot:

| Project | What they tried | What we learned |
|---------|----------------|-----------------|
| **clarity-wasm** | Compile the full Clarity VM (30K+ lines of Rust) to WebAssembly | Tying to the Rust VM's upstream is fragile — it broke on nearly every core change |
| **clarity-js-sdk** | Wrap the VM in a JavaScript API layer (413 commits over 5 years) | Wrapping a moving target is exhausting — eventually archived |
| **clarity-lsp** | Build language server protocol support for Clarity | Merged into Clarinet — the right call, consolidation is better than fragmentation |

Our approach is much narrower: we do static analysis (tokenization, syntax validation, definition extraction) in pure TypeScript. No VM dependency, no chain state, no upstream tracking. It can't execute code — only Clarinet can do that properly. But it can tell you whether your syntax is valid, show you the structure, and give you a rough idea of what you're building.

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

Monaco editor with syntax highlighting for Clarity. Six example contracts included to get started.

### Static analysis

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

Two views for understanding your contract structure:

| Visual | Text |
|--------|------|
| Token cards | Raw diagnostic output |
| Function list (public/read-only/private) | Line-by-line errors |
| Storage tables (data vars + maps) | Stats summary |
| Simple call graph | Cost estimate |

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

Note: this is a simulation for prototyping. Real wallet-connected deployment requires additional work (see limitations below).

### Optional Clarinet integration

If you have Clarinet installed locally at `~/.local/bin/clarinet`, ClarityForge can pass your code through `clarinet check` for real validation. The static analyzer runs as a fallback when Clarinet isn't available.

### Example contracts

| Template | Lines | What it shows |
|----------|-------|--------------|
| SIP-010 Token | 12 | Fungible token basics |
| SIP-009 NFT | 12 | NFT minting and transfers |
| DAO Governor | 25 | Maps, proposals, voting |
| AMM Pool | 22 | Trait references, pool logic |
| Staking | 25 | Time-based reward mechanics |
| Multi-Sig | 22 | Owner maps and signature tracking |

---

## How It Works

### Analysis pipeline

```
Source Code
    │
    ▼
Tokenizer (src/lib/clarity/tokenizer.ts)
  • 50+ Clarity keywords recognized
  • Comments, strings, uints, principals, types
  • Parentheses tracking
    │
    ▼
AST Analyzer (src/lib/clarity/analyzer.ts)
  • Balanced parentheses validation
  • Definition extraction (tokens, NFTs, functions, maps, vars)
  • Diagnostic generation with line numbers
  • Simple cost estimation
    │
    ▼
API Response (/api/analyze)
  • Structured JSON with definitions, stats, diagnostics
```

### Security considerations

| Concern | Approach |
|---------|----------|
| Code injection | Pure parsing — no eval, no shell, no file I/O |
| Resource exhaustion | 100KB input limit, timeout on requests |
| CSRF | Origin validation on POST endpoints |
| Content-type attacks | Strict JSON enforcement |

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                  Landing page
│   ├── demo/page.tsx             Monaco editor + Run/Deploy + tabs
│   ├── templates/page.tsx        Example contract browser
│   ├── layout.tsx                Root layout, fonts, OG metadata
│   ├── globals.css               2-color system (#0C0C0D + #EBEBE5)
│   ├── og/route.tsx              Dynamic OG image
│   └── api/
│       ├── analyze/route.ts      POST — static analysis
│       ├── deploy/route.ts       POST — deploy simulation
│       └── execute/route.ts      POST — Clarinet check (optional)
├── lib/clarity/
│   ├── tokenizer.ts              Clarity tokenizer (50+ keywords)
│   ├── analyzer.ts               AST analysis + diagnostics
│   ├── executor.ts               Function execution simulator
│   └── templates.ts              Example contracts
└── components/
    ├── Nav.tsx                   Fixed navigation
    ├── Footer.tsx                Minimal footer
    ├── FadeIn.tsx                GSAP scroll reveal
    └── StateVisualizer.tsx       Contract structure viewer
```

### Routes

| Route | What it does |
|-------|-------------|
| `/` | Landing page |
| `/demo` | Editor with Run/Deploy and Visual/Interact/Text tabs |
| `/demo?template=dao` | Open a specific example contract |
| `/templates` | Browse all example contracts |
| `/api/analyze` | POST — analyze Clarity code |
| `/api/deploy` | POST — simulate testnet deployment |
| `/api/execute` | POST — run through Clarinet if available |
| `/og` | Dynamic OG image for social sharing |

---

## The Browser VM (like Remix VM)

ClarityForge has a built-in stateful simulator — like Remix VM for Ethereum. It runs entirely in your browser with no chain, no wallet, and no backend.

```
┌──────────────────────────────────┐
│         ClarityForge VM          │
│                                  │
│  5 test accounts (100 STX each)  │
│  Stateful storage across calls   │
│  Token balances, data-vars, maps │
│  Transfer → balance → verify     │
│                                  │
│  Runs in your browser — no setup │
└──────────────────────────────────┘
```

**What you can do:**
- Open a template (e.g. SIP-010 Token) and hit **Run** — the VM initializes the token with 1M supply on Account 1
- Switch to the **Interact** tab, select `transfer`, enter `u100` and Account 2's address, click Execute — the balance transfers
- Switch to `get-balance` and see the updated balance — the VM remembers state across calls
- Same works for NFTs (mint → check owner), DAOs (propose → vote), staking (stake → unstake), multi-sig (propose → sign)

**How it works under the hood:**
The VM reads your contract's structure (tokens, data-vars, maps, functions) and initializes a simulated state. Each function call reads from and writes to that state. It's not the full Clarity runtime — for that, graduate to Clarinet. But it's enough to prototype and understand your contract's behavior before deploying for real.

**Three environments, like Remix:**

| Environment | What it does | When to use |
|------------|-------------|------------|
| **VM** (default) | Browser simulator, stateful, no setup | Learning, prototyping, experimenting |
| **Clarinet** | Runs `clarinet check` locally if installed | Validating syntax against the real VM |
| **Deploy** | Wallet-connected testnet deployment via Leather/Xverse | Going live, sharing with others |

---

## Current Limitations

We want to be honest about what this project does and doesn't do. It's improving rapidly, but here's what you should know:

1. **The VM is a simulator, not the Clarity runtime** — It handles common patterns (transfers, mints, proposals, staking) but doesn't execute arbitrary Clarity code. For full execution, use Clarinet's VM.

2. **Deploy requires a wallet** — Real testnet deployment works via Leather or Xverse. Without a wallet connected, deploy generates a realistic simulation.

3. **No persistent backend** — Contracts save to your browser's localStorage (survive refreshes), but there's no server-side storage or sharing yet.

4. **No test framework** — You can't write or run tests in the browser. Clarinet's test harness remains the right tool for that.

5. **Static analysis is basic** — We check parentheses balance, extract definitions, and catch obvious issues. We don't do type-checking, trait resolution, or deep semantic validation.

6. **The execution simulator is hardcoded** — The interactive function executor in the "Interact" tab only works for the specific function names from example contracts. It doesn't parse your custom code.

7. **No export/download** — You can't download contracts as `.clar` files from the browser. Copy-paste works, but that's not great.

8. **No real call graph** — The "Call Graph" view is a flat list of function names, not an actual dependency graph.

9. **Desktop-focused** — The editor works on mobile but isn't optimized for it.

If any of these matter to you, contributions are very welcome — see the open issues.

---

## FAQ

<details>
<summary><strong>Does ClarityForge execute Clarity code?</strong></summary>

No. It performs static analysis — tokenization, syntax validation, and definition extraction. It does not execute code against chain state. For execution, use Clarinet.
</details>

<details>
<summary><strong>Why not use clarity-wasm for real execution?</strong></summary>

clarity-wasm ties directly to the stacks-core Rust VM, which means it needs constant updates to track upstream changes. We chose a simpler static-analysis approach that's self-contained. For the browser use case (experimenting, learning, prototyping), static analysis covers most of what you need — and Clarinet is always there when you need the real VM.
</details>

<details>
<summary><strong>How does this compare to the Stacks Explorer Sandbox?</strong></summary>

The Explorer Sandbox requires wallet connection and is designed for deployment. ClarityForge requires no wallet and is designed for quick experimentation. Different tools, different use cases.
</details>

<details>
<summary><strong>Should I use this instead of Clarinet?</strong></summary>

For trying things out and learning — sure. For production contracts — use Clarinet. ClarityForge is a playground, not a replacement.
</details>

<details>
<summary><strong>How do I add my own example contracts?</strong></summary>

Edit `src/lib/clarity/templates.ts` — each entry needs a slug, name, description, tag, and code. They'll appear automatically in the editor and templates page.
</details>

<details>
<summary><strong>What Clarity syntax does the analyzer understand?</strong></summary>

All `define-*` forms (fungible-token, non-fungible-token, public, read-only, private, data-var, map, constant, trait), all `ft-*` and `nft-*` builtins, map operations, var operations, control flow (`let`, `begin`, `if`, `match`), error handling (`try!`, `unwrap!`, `asserts!`), and type annotations.
</details>

---

Built with curiosity about Clarity and respect for the tools that came before it.
