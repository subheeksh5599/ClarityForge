"use client";

import Link from "next/link";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import FadeIn from "../../components/FadeIn";

const TEMPLATES = [
  {
    slug: "token",
    name: "SIP-010 Token",
    desc: "Fungible token standard. Deploy your own cryptocurrency on Stacks. Includes mint, transfer, and balance-checking functions.",
    tag: "Fungible Token",
  },
  {
    slug: "nft",
    name: "SIP-009 NFT",
    desc: "Non-fungible token standard for digital collectibles. Mint unique assets with metadata and royalty support.",
    tag: "NFT",
  },
  {
    slug: "dao",
    name: "DAO Governor",
    desc: "On-chain governance framework. Create proposals, vote with tokens, and execute approved actions automatically.",
    tag: "Governance",
  },
  {
    slug: "amm",
    name: "AMM Liquidity Pool",
    desc: "Automated market maker. Create trading pairs, provide liquidity, and enable trustless swaps between SIP-010 tokens.",
    tag: "DeFi",
  },
  {
    slug: "staking",
    name: "Staking Contract",
    desc: "Lock tokens to earn rewards. Configurable lock periods, APY rates, and auto-compounding reward distribution.",
    tag: "DeFi",
  },
  {
    slug: "multisig",
    name: "Multi-Sig Wallet",
    desc: "Shared custody requiring N-of-M signatures. Secure treasury management for teams, DAOs, and protocols.",
    tag: "Security",
  },
];

export default function Templates() {
  return (
    <>
      <Nav />
      <main className="pt-24 pb-20 px-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm text-muted font-mono tracking-[0.15em] uppercase mb-4">
            Templates
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] mb-6">
            Start from production-ready contracts.
          </h1>
          <p className="text-lg text-muted max-w-xl leading-relaxed mb-16">
            Every template follows Stacks standards. Pick one, customize it in
            the editor, and deploy.
          </p>

          <div className="space-y-2">
            {TEMPLATES.map((t, i) => (
              <FadeIn key={t.slug} delay={i * 0.06}>
                <Link
                  href={`/demo`}
                  className="group flex items-start justify-between py-8 border-t border-line hover:bg-text/[0.02] transition-colors -mx-4 px-4 rounded-sm"
                >
                  <div className="max-w-xl">
                    <h3 className="text-xl font-bold mb-2 tracking-[-0.02em] group-hover:text-text/80 transition-colors">
                      {t.name}
                    </h3>
                    <p className="text-sm text-muted leading-relaxed">{t.desc}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-8">
                    <span className="text-xs text-muted font-mono">{t.tag}</span>
                    <span className="text-muted group-hover:translate-x-1 transition-transform text-sm">
                      →
                    </span>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
