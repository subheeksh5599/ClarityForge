"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import { TEMPLATES, Template } from "../../lib/clarity/templates";

const CUSTOM_KEY = "clarityforge-custom-templates";

export default function TemplatesPage() {
  const [customTemplates, setCustomTemplates] = useState<Template[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_KEY);
      if (raw) setCustomTemplates(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const allTemplates = [...TEMPLATES, ...customTemplates];

  return (
    <>
      <Nav />
      <main className="pt-24 pb-20 px-8 animate-fade-in">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] mb-6">
            Start from production-ready contracts.
          </h1>
          <p className="text-lg text-muted max-w-xl leading-relaxed mb-16">
            Every template follows Stacks standards. Pick one, customize in the
            editor, analyze, and deploy.
            {customTemplates.length > 0 && (
              <span className="text-muted/60">
                {" "}
                {customTemplates.length} custom template{customTemplates.length !== 1 ? "s" : ""} included.
              </span>
            )}
          </p>

          <div className="space-y-2">
            {allTemplates.map((t, i) => {
              const isCustom = customTemplates.some((ct) => ct.slug === t.slug);
              return (
                <Link
                  key={t.slug}
                  href={`/demo?template=${t.slug}`}
                  className="group flex items-start justify-between py-8 border-t border-line hover:bg-text/[0.02] transition-colors -mx-4 px-4 rounded-sm"
                >
                  <div className="max-w-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold tracking-[-0.02em] group-hover:text-text/80 transition-colors">
                        {t.name}
                      </h3>
                      {isCustom && (
                        <span className="text-[9px] text-muted/40 font-mono bg-text/[0.04] px-1.5 py-0.5 rounded-sm">
                          custom
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted leading-relaxed">{t.description}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-8">
                    <span className="text-xs text-muted font-mono">{t.tag}</span>
                    <span className="text-muted group-hover:translate-x-1 transition-transform text-sm">
                      →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
