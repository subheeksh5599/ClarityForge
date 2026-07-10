"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Scroll progress bar */}
      <ScrollProgress />

      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-bg/90 backdrop-blur-md border-b border-border"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="w-8 h-8 rounded-md bg-accent flex items-center justify-center group-hover:scale-105 transition-transform">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 13L8 3L13 13H3Z"
                  stroke="#fff"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="font-bold text-lg tracking-tight text-text">
              Clarity<span className="text-accent">Forge</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted hover:text-text transition-colors">
              Features
            </a>
            <a href="#demo" className="text-sm text-muted hover:text-text transition-colors">
              Demo
            </a>
            <a href="#templates" className="text-sm text-muted hover:text-text transition-colors">
              Templates
            </a>
            <a
              href="#demo"
              className="text-sm px-4 py-2 rounded-md bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
            >
              Try It →
            </a>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-text p-2"
          >
            {mobileOpen ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 5h14M3 10h14M3 15h14" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-bg/95 backdrop-blur-md">
            <div className="flex flex-col gap-1 px-6 py-4">
              <a
                href="#features"
                onClick={() => setMobileOpen(false)}
                className="py-2 text-sm text-muted hover:text-text transition-colors"
              >
                Features
              </a>
              <a
                href="#demo"
                onClick={() => setMobileOpen(false)}
                className="py-2 text-sm text-muted hover:text-text transition-colors"
              >
                Demo
              </a>
              <a
                href="#templates"
                onClick={() => setMobileOpen(false)}
                className="py-2 text-sm text-muted hover:text-text transition-colors"
              >
                Templates
              </a>
              <a
                href="#demo"
                onClick={() => setMobileOpen(false)}
                className="mt-2 text-sm px-4 py-2 rounded-md bg-accent text-white font-medium text-center"
              >
                Try It →
              </a>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}

function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? scrollTop / docHeight : 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-px z-[60] bg-border">
      <div
        className="h-full bg-accent transition-[width] duration-150 ease-out"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}
