"use client";

import { AnalysisResult, Definition } from "@/lib/clarity/analyzer";

interface Props {
  result: AnalysisResult;
  costEstimate?: number;
}

function DefIcon({ type }: { type: Definition["type"] }) {
  switch (type) {
    case "fungible-token": return "💰";
    case "non-fungible-token": return "🖼";
    case "public-fn": return "→";
    case "read-only-fn": return "👁";
    case "private-fn": return "🔒";
    case "data-var": return "📦";
    case "map": return "🗺";
    case "constant": return "📌";
    case "trait": return "🔷";
    default: return "•";
  }
}

function DefLabel({ type }: { type: Definition["type"] }) {
  switch (type) {
    case "fungible-token": return "Token";
    case "non-fungible-token": return "NFT";
    case "public-fn": return "Public";
    case "read-only-fn": return "Read-only";
    case "private-fn": return "Private";
    case "data-var": return "Variable";
    case "map": return "Map";
    case "constant": return "Constant";
    case "trait": return "Trait";
    default: return type;
  }
}

export default function StateVisualizer({ result, costEstimate }: Props) {
  const tokens = result.definitions.filter((d) =>
    d.type === "fungible-token" || d.type === "non-fungible-token"
  );
  const fns = result.definitions.filter((d) =>
    d.type === "public-fn" || d.type === "read-only-fn" || d.type === "private-fn"
  );
  const storage = result.definitions.filter((d) =>
    d.type === "data-var" || d.type === "map" || d.type === "constant"
  );

  return (
    <div className="space-y-8">
      {/* Status bar */}
      <div className="flex items-center gap-6 text-xs">
        <span className={result.valid ? "text-text" : "text-red-400"}>
          {result.valid ? "✓ Valid" : "✗ Errors"}
        </span>
        {costEstimate && (
          <span className="text-muted">
            {costEstimate.toLocaleString()} μSTX
          </span>
        )}
        <span className="text-muted">
          {result.stats.totalLines} lines
        </span>
      </div>

      {/* Tokens */}
      {tokens.length > 0 && (
        <div>
          <p className="text-xs text-muted font-mono uppercase tracking-wider mb-3">Tokens</p>
          <div className="space-y-2">
            {tokens.map((t) => (
              <div key={t.name} className="flex items-center gap-3 p-3 border border-line rounded-sm">
                <span className="text-lg">{DefIcon({ type: t.type })}</span>
                <div>
                  <p className="text-sm font-bold">{t.name}</p>
                  <p className="text-xs text-muted font-mono">{DefLabel({ type: t.type })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Functions */}
      {fns.length > 0 && (
        <div>
          <p className="text-xs text-muted font-mono uppercase tracking-wider mb-3">
            Functions ({fns.length})
          </p>
          <div className="space-y-1">
            {fns.map((f) => (
              <div key={f.name} className="flex items-center justify-between py-2 px-3 hover:bg-text/[0.02] transition-colors rounded-sm">
                <div className="flex items-center gap-3">
                  <span className="text-xs w-5 text-center">{DefIcon({ type: f.type })}</span>
                  <span className="text-sm font-mono">{f.name}</span>
                </div>
                <span className="text-xs text-muted font-mono">{DefLabel({ type: f.type })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Storage */}
      {storage.length > 0 && (
        <div>
          <p className="text-xs text-muted font-mono uppercase tracking-wider mb-3">Storage</p>
          <div className="border border-line rounded-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left p-3 text-muted font-normal font-mono">Name</th>
                  <th className="text-left p-3 text-muted font-normal font-mono">Type</th>
                </tr>
              </thead>
              <tbody>
                {storage.map((s) => (
                  <tr key={s.name} className="border-b border-line last:border-0">
                    <td className="p-3 font-mono">{s.name}</td>
                    <td className="p-3 text-muted font-mono">{DefLabel({ type: s.type })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Call graph (simplified) */}
      {fns.length > 1 && (
        <div>
          <p className="text-xs text-muted font-mono uppercase tracking-wider mb-3">Call Graph</p>
          <div className="flex flex-wrap gap-4">
            {fns.map((f, i) => (
              <div key={f.name} className="flex items-center gap-2">
                <div className={`px-3 py-1.5 border rounded-sm text-xs font-mono ${
                  f.type === "public-fn" ? "border-text/40 text-text" :
                  f.type === "read-only-fn" ? "border-text/20 text-muted" :
                  "border-text/10 text-muted/60"
                }`}>
                  {f.name}
                </div>
                {i < fns.length - 1 && (
                  <span className="text-muted/30 text-xs">—</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diagnostics */}
      {result.diagnostics.length > 0 && (
        <div>
          <p className="text-xs text-muted font-mono uppercase tracking-wider mb-3">Diagnostics</p>
          <div className="space-y-1">
            {result.diagnostics.map((d, i) => (
              <div key={i} className={`text-xs font-mono py-1.5 px-3 rounded-sm ${
                d.severity === "error" ? "text-red-400/80 bg-red-400/5" :
                d.severity === "warning" ? "text-yellow-400/80 bg-yellow-400/5" :
                "text-muted"
              }`}>
                L{d.line}: {d.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
