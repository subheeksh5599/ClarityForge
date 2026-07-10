"use client";

import ScrollReveal from "./ScrollReveal";

const templates = [
  {
    name: "SIP-010 Token",
    desc: "Fungible token standard. Deploy your own cryptocurrency on Stacks.",
    tag: "Most popular",
  },
  {
    name: "SIP-009 NFT",
    desc: "Non-fungible token standard. Mint unique digital collectibles.",
    tag: "Creator",
  },
  {
    name: "DAO Governor",
    desc: "On-chain governance with proposals, voting, and execution.",
    tag: "Governance",
  },
  {
    name: "AMM Pool",
    desc: "Automated market maker. Create liquidity pools and enable swaps.",
    tag: "DeFi",
  },
  {
    name: "Staking Contract",
    desc: "Lock tokens, earn rewards. Configurable lock periods and APY.",
    tag: "DeFi",
  },
  {
    name: "Multi-Sig Wallet",
    desc: "Shared custody. Require N-of-M signatures to execute transactions.",
    tag: "Security",
  },
];

export default function Templates() {
  return (
    <section id="templates" className="relative py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6">
        <ScrollReveal className="mb-16">
          <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-4">
            Templates
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] leading-tight max-w-2xl">
            Start from production-ready{" "}
            <span className="text-accent">templates.</span>
          </h2>
          <p className="text-muted mt-4 max-w-lg leading-relaxed">
            Not starting from scratch. Pick a template, customize it, and deploy.
            Every template follows Stacks standards.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((t, i) => (
            <ScrollReveal key={t.name} delay={i * 0.06}>
              <div className="group p-6 rounded-lg border border-border bg-surface hover:border-accent/40 transition-all duration-300 cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-md bg-accent/10 text-accent flex items-center justify-center font-mono text-lg font-bold">
                    {"{"}
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted px-2 py-1 rounded border border-border bg-bg">
                    {t.tag}
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-2 tracking-[-0.02em] group-hover:text-accent transition-colors">
                  {t.name}
                </h3>
                <p className="text-sm text-muted leading-relaxed">{t.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
