"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-bg/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
        <Link href="/" className="text-sm font-medium tracking-tight">
          Clarity<span className="text-muted">Forge</span>
        </Link>

        <div className="flex items-center gap-8">
          <Link
            href="/demo"
            className={`text-sm transition-colors ${
              pathname === "/demo" ? "text-text" : "text-muted hover:text-text"
            }`}
          >
            Demo
          </Link>
          <Link
            href="/templates"
            className={`text-sm transition-colors ${
              pathname === "/templates" ? "text-text" : "text-muted hover:text-text"
            }`}
          >
            Templates
          </Link>
          <Link
            href="/demo"
            className="text-sm text-text hover:text-muted transition-colors"
          >
            Try it →
          </Link>
        </div>
      </div>
    </nav>
  );
}
