<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/Stacks-5546FF?style=for-the-badge&logo=stacks&logoColor=white">
    <img alt="Stacks" src="https://img.shields.io/badge/Stacks-5546FF?style=for-the-badge&logo=stacks&logoColor=white">
  </picture>
  <img alt="License" src="https://img.shields.io/github/license/subheeksh5599/ClarityForge?style=for-the-badge&color=0C0C0D">
  <img alt="Status" src="https://img.shields.io/badge/status-applying%20for%20DeGrants-5546FF?style=for-the-badge">
</p>

<h1 align="center">ClarityForge</h1>
<p align="center"><strong>The Remix of Stacks.</strong></p>
<p align="center">A browser-based IDE for Clarity smart contracts. Write, simulate, and deploy — no CLI, no setup, no waiting.</p>

---

## Why ClarityForge

Stacks has Clarinet — the professional development framework (think Hardhat for Stacks). But it has no Remix equivalent. No fast, browser-based way to write and test Clarity without installing anything.

ClarityForge fills that gap.

| Tool | Role | Install | Best For |
|---|---|---|---|
| **ClarityForge** | Browser IDE | None — open a tab | Learning, prototyping, quick experiments |
| **Clarinet** | CLI framework | `brew install clarinet` | Production contracts, testing, CI/CD |

## Features

- **Browser Editor** — Monaco-powered with Clarity syntax highlighting, autocomplete, and error diagnostics
- **Live Analysis** — Real Clarity tokenizer and AST analyzer that validates syntax, extracts definitions, and estimates costs
- **State Visualizer** — Contract breakdown with token cards, function lists, storage tables, and call graph — switch between Visual and Text views
- **Template Library** — 6 production-ready contracts: SIP-010 Token, SIP-009 NFT, DAO Governor, AMM Pool, Staking, Multi-Sig Wallet
- **One-Click Deploy** — Simulated testnet deployment with transaction hash generation and explorer links
- **Shareable** — Link directly to any template with URL params (`/demo?template=dao`)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| Animation | GSAP ScrollTrigger |
| Fonts | Space Grotesk + DM Mono |
| Analysis | Custom Clarity tokenizer + AST analyzer |
| Deployment | Vercel |

## Architecture

```
src/
├── app/
│   ├── page.tsx                  Landing — statement-driven, Fig-labeled sections
│   ├── demo/page.tsx             Monaco editor + Run/Deploy + Visual/Text tabs
│   ├── templates/page.tsx        6 templates → opens demo pre-loaded
│   ├── layout.tsx                Root layout with fonts + metadata
│   ├── globals.css               2-color system (#0C0C0D + #EBEBE5)
│   └── api/
│       ├── analyze/route.ts      POST — validate + analyze Clarity code
│       └── deploy/route.ts       POST — validate + simulate testnet deployment
├── lib/clarity/
│   ├── tokenizer.ts              30+ keyword Clarity tokenizer
│   ├── analyzer.ts               AST analysis, definition extraction, diagnostics
│   └── templates.ts              6 full Clarity contract templates
└── components/
    ├── Nav.tsx                   Fixed navigation with scroll progress
    ├── Footer.tsx                Minimal footer with links
    ├── FadeIn.tsx                GSAP scroll-triggered reveal wrapper
    └── StateVisualizer.tsx       Visual contract breakdown component
```

## Getting Started

```bash
git clone https://github.com/subheeksh5599/ClarityForge.git
cd ClarityForge
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API

### `POST /api/analyze`

Analyze Clarity code and return structured diagnostics.

```json
{
  "code": "(define-fungible-token my-token u1000000)\n(define-public (transfer (amount uint) (recipient principal))\n  (begin (try! (ft-transfer? my-token amount tx-sender recipient)) (ok true)))"
}
```

Returns definitions, stats, diagnostics, and cost estimates.

### `POST /api/deploy`

Validate and simulate testnet deployment. Returns transaction hash, contract ID, and explorer link.

## DeGrants

ClarityForge is applying for [Stacks Community DeGrants](https://zeroauthoritydao.com/funding/degrants) — a community-led microgrant program funded by the Stacks Endowment. DeGrants supports small, practical projects that create value for the Stacks ecosystem through education, tooling, public goods, and community engagement.

---

**Built for the Stacks ecosystem. Applying for DeGrants.**
