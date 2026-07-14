"use client";

import { SimAccount, VmState } from "@/lib/clarity/vm";

interface Props {
  accounts: SimAccount[];
  selectedAccount: string;
  onSelectAccount: (address: string) => void;
  onRefresh: () => void;
  loading: boolean;
  vmState?: VmState;
}

export default function AccountPanel({ accounts, selectedAccount, onSelectAccount, onRefresh, loading, vmState }: Props) {
  // Get token balances for each account from VM state
  const getTokenBalances = (address: string): { name: string; balance: number }[] => {
    if (!vmState) return [];
    const result: { name: string; balance: number }[] = [];
    for (const [tokenName, balances] of Object.entries(vmState.fungibleTokens)) {
      const bal = balances[address];
      if (bal !== undefined) {
        result.push({ name: tokenName, balance: bal });
      }
    }
    return result;
  };

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
            ? `${(acc.balance / 1_000_000).toFixed(1)} STX`
            : String(acc.balance);
          const tokenBals = getTokenBalances(acc.address);

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
              {tokenBals.length > 0 && (
                <div className="mt-1 pt-1 border-t border-line/50">
                  {tokenBals.map((tb) => (
                    <div key={tb.name} className="flex items-center justify-between text-[9px]">
                      <span className="text-muted/60 font-mono">{tb.name}</span>
                      <span className="text-text/70 font-mono">{(tb.balance / 1_000_000).toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-[9px] text-muted/40 font-mono leading-relaxed">
        Test accounts with pre-funded STX. Token balances update after each VM execution.
      </p>
    </div>
  );
}
