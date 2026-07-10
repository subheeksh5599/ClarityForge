"use client";

import ScrollReveal from "./ScrollReveal";

const steps = [
  {
    step: "01",
    title: "Write",
    desc: "Open the browser IDE and write your Clarity contract — or start from a template. Syntax highlighting and autocomplete guide you.",
  },
  {
    step: "02",
    title: "Simulate",
    desc: "Run your contract in the browser. See execution results, storage maps, and event emissions instantly. No Clarinet setup required.",
  },
  {
    step: "03",
    title: "Deploy",
    desc: "Connect your Leather or Xverse wallet and deploy to Stacks testnet with one click. Mainnet support coming in Phase 2.",
  },
];

export default function HowItWorks() {
  return (
    <section className="relative py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6">
        <ScrollReveal className="mb-20">
          <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-4">
            How It Works
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] leading-tight max-w-2xl">
            From idea to on-chain in{" "}
            <span className="text-accent">three steps.</span>
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-12 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px bg-border" />

          {steps.map((s, i) => (
            <ScrollReveal key={s.step} delay={i * 0.15}>
              <div className="relative text-center">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-bg border-2 border-accent text-accent font-mono text-sm font-bold mb-6 relative z-10">
                  {s.step}
                </span>
                <h3 className="text-2xl font-bold mb-3 tracking-[-0.02em]">{s.title}</h3>
                <p className="text-muted leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
