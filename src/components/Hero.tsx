"use client";

import ScrollReveal from "./ScrollReveal";

const CODE_LINES = [
  { n: 1, t: ";; SIP-010 Fungible Token", c: "text-muted" },
  { n: 2, t: ";; Deploy your first token in minutes", c: "text-muted" },
  { n: 3, t: "", c: "" },
  { n: 4, t: "(define-fungible-token", c: "text-[#C792EA]" },
  { n: 5, t: "  my-token", c: "text-[#FFD580]" },
  { n: 6, t: "  u1000000", c: "text-[#82AAFF]" },
  { n: 7, t: ")", c: "text-[#C792EA]" },
  { n: 8, t: "", c: "" },
  { n: 9, t: "(define-public (transfer", c: "text-[#C792EA]" },
  { n: 10, t: "    (amount uint)", c: "text-[#FFD580]" },
  { n: 11, t: "    (recipient principal)", c: "text-[#FFD580]" },
  { n: 12, t: "  )", c: "text-[#C792EA]" },
  { n: 13, t: "  (begin", c: "text-[#C792EA]" },
  { n: 14, t: "    (try! (ft-transfer? my-token amount", c: "text-muted" },
  { n: 15, t: "      tx-sender recipient))", c: "text-muted" },
  { n: 16, t: "    (ok true)", c: "text-[#82AAFF]" },
  { n: 17, t: "  )", c: "text-[#C792EA]" },
  { n: 18, t: ")", c: "text-[#C792EA]" },
] as const;

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden">
      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#3B82F6 1px, transparent 1px), linear-gradient(90deg, #3B82F6 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 w-full">
        <div className="max-w-3xl">
          <ScrollReveal>
            <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-6">
              Browser-Based Clarity IDE
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-[-0.03em] mb-6">
              Build Stacks smart contracts{" "}
              <span className="text-accent">visually.</span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <p className="text-lg text-muted max-w-xl leading-relaxed mb-10">
              Write, simulate, and deploy Clarity contracts directly in your browser.
              No CLI. No setup. Just open and build.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#demo"
                className="inline-flex items-center justify-center h-12 px-8 rounded-md bg-accent text-white font-medium hover:bg-accent/90 transition-colors text-sm"
              >
                Try the demo
              </a>
              <a
                href="#features"
                className="inline-flex items-center justify-center h-12 px-8 rounded-md border border-border text-text font-medium hover:bg-surface transition-colors text-sm"
              >
                See features
              </a>
            </div>
          </ScrollReveal>
        </div>

        {/* IDE Mockup */}
        <ScrollReveal delay={0.4} className="mt-20">
          <div className="rounded-lg border border-border bg-[#0D0D0F] overflow-hidden shadow-2xl shadow-black/50">
            {/* Title bar */}
            <div className="flex items-center px-4 h-10 border-b border-border bg-bg">
              <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E] ml-2" />
              <span className="w-3 h-3 rounded-full bg-[#27CA40] ml-2" />
              {/* Tabs */}
              <div className="flex items-center ml-6 -mb-px">
                <span className="px-4 py-2 text-xs font-mono text-text bg-[#0D0D0F] border border-border border-b-[#0D0D0F] rounded-t">
                  token.clar
                </span>
                <span className="px-4 py-2 text-xs font-mono text-muted border-b border-border">
                  nft.clar
                </span>
                <span className="px-4 py-2 text-xs font-mono text-muted border-b border-border">
                  dao.clar
                </span>
              </div>
            </div>

            {/* Editor body */}
            <div className="flex">
              {/* Line numbers */}
              <div className="select-none py-4 pl-4 pr-3 text-right font-mono text-xs leading-[1.85] text-[#3B3B3B] border-r border-border bg-[#0A0A0B]">
                {CODE_LINES.map((l) => (
                  <div key={l.n}>{l.n}</div>
                ))}
              </div>

              {/* Code */}
              <div className="flex-1 py-4 px-4 font-mono text-sm leading-[1.85] overflow-x-auto">
                {CODE_LINES.map((l) => (
                  <div key={l.n} className={l.c || "text-[#EDEDE8]"}>
                    {l.t || "\u00A0"}
                  </div>
                ))}
                {/* Cursor */}
                <div className="flex items-center">
                  <span className="inline-block w-2 h-[1.15em] bg-accent animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
