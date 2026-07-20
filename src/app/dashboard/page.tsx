"use client";

import Link from "next/link";
import {
  Code2,
  FileCode2,
  Globe,
  Wallet,
  Layers,
  Zap,
  ArrowUpRight,
  Blocks,
} from "lucide-react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { StatCard } from "@/components/ui/stat-card";
import { TEMPLATES } from "@/lib/clarity/templates";

export default function DashboardPage() {
  return (
    <>
      <Nav />
      <main className="pt-24 pb-20 px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] mb-3">
              Project overview
            </h1>
            <p className="text-muted max-w-xl leading-relaxed">
              ClarityForge — browser IDE for writing, simulating, and deploying
              Clarity smart contracts on Stacks.
            </p>
          </div>

          {/* Stat cards — 4-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px bg-line mb-16">
            <StatCard
              label="Templates"
              value="11"
              description="Production-ready smart contract templates covering tokens, DeFi, governance, and more."
              icon={FileCode2}
            />
            <StatCard
              label="Coverage"
              value="6 categories"
              description="Tokens · NFTs · DeFi · Governance · Payments · Identity"
              icon={Layers}
            />
            <StatCard
              label="Environment"
              value="3 modes"
              description="In-browser VM simulator, local Clarinet check, and wallet-connected testnet deploy."
              icon={Blocks}
            />
            <StatCard
              label="Zero install"
              value="Browser"
              description="No CLI, no Clarinet, no chain state. Open the browser and start building."
              icon={Globe}
            />
          </div>

          {/* Features grid */}
          <div className="mb-16">
            <h2 className="text-xs text-muted font-mono tracking-[0.2em] uppercase mb-8">
              Core features
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-line">
              {[
                {
                  icon: Code2,
                  title: "Syntax engine",
                  desc: "Real Clarity tokenizer + AST analyzer in TypeScript. 30+ keywords, definition extraction, cost estimation.",
                },
                {
                  icon: Zap,
                  title: "Stateful VM",
                  desc: "In-browser simulator tracks storage, balances, and tokens across multiple calls. Execute and see results instantly.",
                },
                {
                  icon: Wallet,
                  title: "One-click deploy",
                  desc: "Connect Leather or Xverse wallet. Deploy contracts to Stacks testnet. Explorer links verify on-chain results.",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="bg-bg p-8 hover:bg-text/[0.02] transition-colors"
                >
                  <f.icon className="w-5 h-5 text-muted/40 mb-4" />
                  <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Template library table */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs text-muted font-mono tracking-[0.2em] uppercase">
                Template library
              </h2>
              <Link
                href="/templates"
                className="text-xs text-muted/60 hover:text-text transition-colors flex items-center gap-1"
              >
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="border border-line">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left text-xs text-muted/50 font-mono font-normal px-6 py-3 uppercase tracking-[0.1em]">
                      Template
                    </th>
                    <th className="text-left text-xs text-muted/50 font-mono font-normal px-6 py-3 uppercase tracking-[0.1em]">
                      Category
                    </th>
                    <th className="text-left text-xs text-muted/50 font-mono font-normal px-6 py-3 uppercase tracking-[0.1em]">
                      Description
                    </th>
                    <th className="text-right text-xs text-muted/50 font-mono font-normal px-6 py-3 uppercase tracking-[0.1em]">
                      Open
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {TEMPLATES.map((t, i) => (
                    <tr
                      key={t.slug}
                      className={`${
                        i < TEMPLATES.length - 1 ? "border-b border-line" : ""
                      } hover:bg-text/[0.02] transition-colors`}
                    >
                      <td className="px-6 py-4">
                        <span className="font-medium text-sm">{t.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-muted/60 font-mono">
                          {t.tag}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-muted/70 leading-relaxed">
                          {t.description}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/demo?template=${t.slug}`}
                          className="text-xs text-muted/50 hover:text-text transition-colors"
                        >
                          Open →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
