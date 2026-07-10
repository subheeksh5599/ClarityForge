"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import FadeIn from "../components/FadeIn";

export default function Home() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    gsap.fromTo(
      ".hero-line",
      { autoAlpha: 0, y: 48 },
      { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.15, ease: "power3.out", delay: 0.3 }
    );

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <>
      <Nav />

      <main>
        <section className="relative min-h-screen flex flex-col justify-center px-8 pt-16 pb-12">
          <div className="max-w-5xl mx-auto w-full">
            <div className="max-w-3xl">
              <h1 className="hero-line text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.04] tracking-[-0.03em] mb-8">
                Write Clarity contracts
                <br />
                in your browser.
              </h1>

              <p className="hero-line text-lg sm:text-xl text-muted max-w-xl leading-relaxed mb-12">
                No CLI. No setup. Syntax highlighting, live simulation, template
                library, and one-click testnet deployment.
              </p>

              <div className="hero-line flex items-center gap-6">
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
          </div>
        </section>

        <section className="pb-40 px-8">
          <div className="max-w-5xl mx-auto">
            <FadeIn>
              <div className="rounded-sm border border-line overflow-hidden bg-[#0A0A0B]">
                <div className="flex items-center gap-2 px-5 h-10 border-b border-line">
                  <span className="w-2.5 h-2.5 rounded-full bg-text/20" />
                  <span className="w-2.5 h-2.5 rounded-full bg-text/20" />
                  <span className="w-2.5 h-2.5 rounded-full bg-text/20" />
                </div>
                <div className="flex">
                  <div className="hidden sm:block select-none py-8 pl-6 pr-4 text-right font-mono text-xs leading-[1.9] text-muted border-r border-line">
                    {Array.from({ length: 14 }, (_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  <div className="flex-1 py-8 px-6 font-mono text-sm sm:text-base leading-[1.9]">
                    <div className="text-muted">;; SIP-010 Fungible Token</div>
                    <div className="text-muted">;; Deploy in minutes</div>
                    <div>&nbsp;</div>
                    <div>
                      <span className="text-text/70">(define-fungible-token</span>{" "}
                      <span className="text-text">my-token</span>{" "}
                      <span className="text-text/60">u1000000</span>
                      <span className="text-text/70">)</span>
                    </div>
                    <div>&nbsp;</div>
                    <div>
                      <span className="text-text/70">(define-public</span>{" "}
                      <span className="text-text/60">(transfer</span>{" "}
                      <span className="text-text">(amount uint)</span>
                    </div>
                    <div>
                      <span className="text-text">  (recipient principal)</span>
                      <span className="text-text/70">)</span>
                    </div>
                    <div>
                      <span className="text-text/70">  (begin</span>
                    </div>
                    <div>
                      <span className="text-muted">    (try! (ft-transfer?</span>
                    </div>
                    <div>
                      <span className="text-muted">      my-token amount</span>
                    </div>
                    <div>
                      <span className="text-muted">      tx-sender recipient))</span>
                    </div>
                    <div>
                      <span className="text-text/60">    (ok</span>{" "}
                      <span className="text-text">true</span>
                      <span className="text-text/60">)</span>
                    </div>
                    <div>
                      <span className="text-text/70">  )</span>
                    </div>
                    <div>
                      <span className="text-text/70">)</span>
                    </div>
                    <div className="flex items-center mt-0.5">
                      <span className="inline-block w-2 h-[1.2em] bg-text animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="pb-40 px-8">
          <div className="max-w-5xl mx-auto">
            <FadeIn>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.08] tracking-[-0.03em] mb-10 max-w-3xl">
                The Stacks ecosystem deserves a world-class IDE.
              </h2>
              <div className="flex items-center gap-6">
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
            </FadeIn>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
