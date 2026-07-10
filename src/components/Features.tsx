"use client";

import ScrollReveal from "./ScrollReveal";

const features = [
  {
    title: "Visual Editor",
    desc: "Write Clarity with syntax highlighting, autocomplete, and real-time error diagnostics — all in your browser.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    title: "Live Simulation",
    desc: "Run your contracts instantly. See execution results, storage changes, and event emissions without leaving the browser.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
  {
    title: "One-Click Deploy",
    desc: "Connect your wallet and deploy to testnet with a single click. No CLI commands. No Clarinet setup.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
];

export default function Features() {
  return (
    <section id="features" className="relative py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6">
        <ScrollReveal className="mb-16">
          <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-4">
            Why ClarityForge
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] leading-tight max-w-2xl">
            Everything you need to build on Stacks —{" "}
            <span className="text-accent">zero setup.</span>
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 0.1}>
              <div className="p-8 rounded-lg border border-border bg-surface hover:border-accent/30 transition-colors duration-300">
                <div className="w-12 h-12 rounded-md bg-accent/10 text-accent flex items-center justify-center mb-6">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 tracking-[-0.02em]">{f.title}</h3>
                <p className="text-muted leading-relaxed">{f.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
