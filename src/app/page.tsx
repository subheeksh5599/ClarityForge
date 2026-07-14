"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

function useFadeIn() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    document.querySelectorAll("[data-fade]").forEach((el) => {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: 60 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 82%",
            toggleActions: "play none none none",
          },
        }
      );
    });

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, []);
}

export default function Home() {
  useFadeIn();

  useEffect(() => {
    gsap.fromTo(
      ".hero-enter",
      { autoAlpha: 0, y: 60 },
      { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.2, ease: "power3.out", delay: 0.4 }
    );
  }, []);

  return (
    <>
      <Nav />

      <main>
        {/* HERO */}
        <section className="min-h-screen flex flex-col justify-center px-8 pt-16 pb-20">
          <div className="max-w-6xl mx-auto w-full">
            <h1 className="hero-enter text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.96] tracking-[-0.04em] max-w-5xl">
              Smart contracts
              <br />
              shouldn&apos;t need
              <br />a terminal.
            </h1>

            <p className="hero-enter text-lg sm:text-xl text-muted max-w-lg mt-10 leading-relaxed">
              The Remix of Stacks. Write, simulate, and deploy Clarity contracts
              in your browser. No CLI, no setup. Graduate to Clarinet when
              you&apos;re ready for production.
            </p>

            <div className="hero-enter flex items-center gap-6 mt-12">
              <Link
                href="/demo"
                className="inline-flex items-center h-12 px-8 text-sm font-medium text-bg bg-text hover:bg-text/90 transition-colors"
              >
                Open the editor
              </Link>
              <Link
                href="/templates"
                className="text-sm text-muted hover:text-text transition-colors"
              >
                Browse templates →
              </Link>
            </div>
          </div>
        </section>

        {/* FIG 1 — The Editor */}
        <section className="pb-36 px-8">
          <div className="max-w-6xl mx-auto">
            <p data-fade className="text-xs text-muted font-mono tracking-[0.2em] uppercase mb-8">
              Fig 1 — The editor
            </p>

            <div data-fade className="border border-line overflow-hidden bg-surface-alt">
              <div className="flex items-center gap-2 px-6 h-12 border-b border-line">
                <span className="w-3 h-3 rounded-full bg-text/15" />
                <span className="w-3 h-3 rounded-full bg-text/15" />
                <span className="w-3 h-3 rounded-full bg-text/15" />
                <span className="ml-4 text-xs text-muted font-mono">token.clar</span>
              </div>
              <div className="flex">
                <div className="hidden sm:block select-none py-10 pl-8 pr-5 text-right font-mono text-xs leading-[2] text-muted/30 border-r border-line">
                  {Array.from({ length: 16 }, (_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <div className="flex-1 py-10 px-8 font-mono text-sm sm:text-base leading-[2] overflow-x-auto">
                  <div className="text-muted/60">;; SIP-010 Fungible Token</div>
                  <div className="text-muted/60">;; Deploy your first token in minutes</div>
                  <div>&nbsp;</div>
                  <div>
                    <span className="text-text/60">(define-fungible-token</span>
                    {" "}<span className="text-text">my-token</span>
                    {" "}<span className="text-text/40">u1000000</span>
                    <span className="text-text/60">)</span>
                  </div>
                  <div>&nbsp;</div>
                  <div>
                    <span className="text-text/60">(define-public</span>
                    {" "}<span className="text-text/40">(transfer</span>
                  </div>
                  <div>
                    <span className="text-text">  (amount uint)</span>
                  </div>
                  <div>
                    <span className="text-text">  (recipient principal)</span>
                    <span className="text-text/60">)</span>
                  </div>
                  <div><span className="text-text/60">  (begin</span></div>
                  <div><span className="text-muted/50">    (try! (ft-transfer?</span></div>
                  <div><span className="text-muted/50">      my-token amount</span></div>
                  <div><span className="text-muted/50">      tx-sender recipient))</span></div>
                  <div>
                    <span className="text-text/40">    (ok</span>
                    {" "}<span className="text-text">true</span>
                    <span className="text-text/40">)</span>
                  </div>
                  <div><span className="text-text/60">  )</span></div>
                  <div><span className="text-text/60">)</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FIG 2 — Write. Simulate. Deploy. */}
        <section className="pb-36 px-8">
          <div className="max-w-6xl mx-auto">
            <p data-fade className="text-xs text-muted font-mono tracking-[0.2em] uppercase mb-16">
              Fig 2 — The workflow
            </p>

            <div className="space-y-24">
              {[
                { step: "01", word: "Write", desc: "Open the browser. Start typing. Syntax highlighting and autocomplete guide you. No Clarinet. No config files." },
                { step: "02", word: "Simulate", desc: "Hit run. See execution results, storage changes, and event emissions instantly. No local node required." },
                { step: "03", word: "Deploy", desc: "Connect your wallet. One click. Your contract is live on Stacks testnet." },
              ].map((s, i) => (
                <div key={s.step} data-fade className="group">
                  <div className="text-xs text-muted/40 font-mono mb-4">{s.step}</div>
                  <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-[-0.03em] mb-6 text-muted group-hover:text-text transition-colors duration-500">
                    {s.word}
                  </h2>
                  <p className="text-lg text-muted max-w-xl leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FIG 3 — Templates */}
        <section className="pb-36 px-8">
          <div className="max-w-6xl mx-auto">
            <p data-fade className="text-xs text-muted font-mono tracking-[0.2em] uppercase mb-8">
              Fig 3 — Templates
            </p>

            <div data-fade className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-line">
              {[
                ["token", "SIP-010 Token", "Fungible token standard"],
                ["nft", "SIP-009 NFT", "Digital collectibles"],
                ["dao", "DAO Governor", "On-chain governance"],
                ["amm", "AMM Pool", "Liquidity pools & swaps"],
                ["staking", "Staking", "Lock tokens, earn rewards"],
                ["multisig", "Multi-Sig", "Shared treasury custody"],
              ].map(([slug, name, desc]) => (
                <Link key={slug} href={`/demo?template=${slug}`} className="bg-bg p-8 hover:bg-text/[0.02] transition-colors cursor-pointer block">
                  <h3 className="text-lg font-bold mb-1.5">{name}</h3>
                  <p className="text-sm text-muted">{desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-40 px-8">
          <div className="max-w-6xl mx-auto">
            <h2 data-fade className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.08] tracking-[-0.03em] max-w-4xl">
              The Stacks ecosystem deserves
              <br />a world-class IDE.
            </h2>
            <div data-fade className="flex items-center gap-6 mt-12">
              <Link
                href="/demo"
                className="inline-flex items-center h-12 px-8 text-sm font-medium text-bg bg-text hover:bg-text/90 transition-colors"
              >
                Open the editor
              </Link>
              <a
                href="https://github.com/subheeksh5599/ClarityForge"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted hover:text-text transition-colors"
              >
                View on GitHub →
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
