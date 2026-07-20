"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { useWallet } from "./WalletProvider";

export default function Nav() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const wallet = useWallet();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-bg/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
        <Link href="/" className="text-sm font-medium tracking-tight">
          Clarity<span className="text-muted">Forge</span>
        </Link>

        <div className="flex items-center gap-6">
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
            className={`text-sm transition-colors ${
              pathname === "/demo" ? "text-text" : "text-muted hover:text-text"
            }`}
          >
            Editor
          </Link>
          <Link
            href="/dashboard"
            className={`text-sm transition-colors ${
              pathname === "/dashboard" ? "text-text" : "text-muted hover:text-text"
            }`}
          >
            Dashboard
          </Link>
          <button
            onClick={toggleTheme}
            className="text-sm text-muted hover:text-text transition-colors"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          {wallet.connected ? (
            <button
              onClick={wallet.disconnectWallet}
              className="text-xs text-text font-mono border border-line px-2.5 py-1 rounded-sm hover:bg-text/5 transition-colors"
              title="Click to disconnect"
            >
              ◉ {wallet.address?.slice(0, 10)}…
            </button>
          ) : (
            <button
              onClick={wallet.connectWallet}
              disabled={wallet.connecting}
              className="text-xs font-medium text-bg bg-text hover:bg-text/90 px-3 py-1 transition-colors disabled:opacity-50"
            >
              {wallet.connecting ? "Connecting…" : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
