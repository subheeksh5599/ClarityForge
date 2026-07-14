"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";

export default function Nav() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-bg/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
        <Link href="/" className="text-sm font-medium tracking-tight">
          Clarity<span className="text-muted">Forge</span>
        </Link>

        <div className="flex items-center gap-6">
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
          <button
            onClick={toggleTheme}
            className="text-sm text-muted hover:text-text transition-colors"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
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
