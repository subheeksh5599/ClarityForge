"use client";

import { SimAccount } from "@/lib/clarity/vm";

interface Props {
  accounts: SimAccount[];
  selectedAccount: string;
  onSelectAccount: (address: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export default function AccountPanel({ accounts, selectedAccount, onSelectAccount, onRefresh, loading }: Props) {
  return (
    <div className="border-t border-line p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted font-mono uppercase tracking-wider">Accounts</p>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-[10px] text-muted hover:text-text font-mono"
        >
          {loading ? "…" : "↻"}
        </button>
      </div>

      <div className="space-y-1">
        {accounts.map((acc) => {
          const isSelected = acc.address === selectedAccount;
          const bal = typeof acc.balance === "number"
            ? `${(acc.balance / 1_000_000).toFixed(2)} STX`
            : acc.balance;
          
          return (
            <button
              key={acc.address}
              onClick={() => onSelectAccount(acc.address)}
              className={`w-full text-left px-2.5 py-2 rounded-sm transition-colors ${
                isSelected
                  ? "bg-text/10 border border-text/20"
                  : "border border-transparent hover:bg-text/[0.03]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted font-mono">{acc.label}</span>
                <span className="text-[11px] font-mono text-text">{bal}</span>
              </div>
              <div className="text-[9px] text-muted/60 font-mono mt-0.5 truncate">
                {acc.address.slice(0, 16)}…
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[9px] text-muted/40 font-mono leading-relaxed">
        Test accounts with pre-funded STX for development. Like{" "}
        <span className="text-muted/60">Remix VM</span> accounts.
      </p>
    </div>
  );
}
