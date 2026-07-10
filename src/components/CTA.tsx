"use client";

import ScrollReveal from "./ScrollReveal";

export default function CTA() {
  return (
    <section className="relative py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <ScrollReveal>
          <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-6">
            Start Building
          </p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.03em] leading-tight mb-6 max-w-3xl mx-auto">
            The Stacks ecosystem deserves a{" "}
            <span className="text-accent">world-class IDE.</span>
          </h2>
          <p className="text-lg text-muted max-w-xl mx-auto mb-10 leading-relaxed">
            ClarityForge is open source. Funded by DeGrants. Built for the community.
            Try the demo or contribute on GitHub.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#demo"
              className="inline-flex items-center justify-center h-12 px-8 rounded-md bg-accent text-white font-medium hover:bg-accent/90 transition-colors text-sm"
            >
              Try the demo →
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-12 px-8 rounded-md border border-border text-text font-medium hover:bg-surface transition-colors text-sm"
            >
              View on GitHub
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
