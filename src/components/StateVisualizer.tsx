"use client";

import { AnalysisResult, Definition, CallGraphNode, buildCallGraph } from "@/lib/clarity/analyzer";

interface Props {
  result: AnalysisResult;
  costEstimate?: number;
  sourceCode?: string;
  onNavigateToLine?: (line: number) => void;
}

function DefIcon({ type }: { type: Definition["type"] }) {
  switch (type) {
    case "fungible-token": return "⬡";
    case "non-fungible-token": return "⬢";
    case "public-fn": return "→";
    case "read-only-fn": return "◎";
    case "private-fn": return "◈";
    case "data-var": return "▤";
    case "map": return "▦";
    case "constant": return "◆";
    case "trait": return "◇";
    default: return "·";
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

function CallGraphSVG({ nodes, onNavigate }: { nodes: CallGraphNode[]; onNavigate?: (name: string) => void }) {
  if (nodes.length === 0) return null;

  const nodeCount = nodes.length;
  const hasEdges = nodes.some((n) => n.calls.length > 0);

  const cols = Math.min(nodeCount, 3);
  const rows = Math.ceil(nodeCount / cols);
  const nodeW = 140;
  const nodeH = 36;
  const gapX = 24;
  const gapY = 20;
  const padX = 20;
  const padY = 16;
  const width = cols * nodeW + (cols - 1) * gapX + padX * 2;
  const height = rows * nodeH + (rows - 1) * gapY + padY * 2;

  const positions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((n, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions[n.name] = {
      x: padX + col * (nodeW + gapX) + nodeW / 2,
      y: padY + row * (nodeH + gapY) + nodeH / 2,
    };
  });

  const edges: { from: string; to: string; fromPos: { x: number; y: number }; toPos: { x: number; y: number } }[] = [];
  for (const node of nodes) {
    for (const callee of node.calls) {
      if (positions[callee]) {
        edges.push({
          from: node.name,
          to: callee,
          fromPos: positions[node.name],
          toPos: positions[callee],
        });
      }
    }
  }

  return (
    <div className="border border-line rounded-sm overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height + 16 }}>
        {hasEdges && (
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="rgba(235,235,229,0.3)" />
            </marker>
          </defs>
        )}

        {edges.map((edge, i) => (
          <line key={i}
            x1={edge.fromPos.x} y1={edge.fromPos.y}
            x2={edge.toPos.x} y2={edge.toPos.y}
            stroke="rgba(235,235,229,0.2)" strokeWidth={1}
            markerEnd="url(#arrowhead)" />
        ))}

        {nodes.map((n) => {
          const pos = positions[n.name];
          const isSource = edges.some((e) => e.from === n.name);
          const isTarget = edges.some((e) => e.to === n.name);
          const color = n.type === "public-fn" ? "rgba(235,235,229,0.6)"
            : n.type === "read-only-fn" ? "rgba(235,235,229,0.4)"
            : "rgba(235,235,229,0.25)";
          const fill = isSource || isTarget ? "rgba(235,235,229,0.05)" : "transparent";
          return (
            <g key={n.name}
              onClick={() => onNavigate?.(n.name)}
              style={{ cursor: onNavigate ? "pointer" : "default" }}
            >
              <rect x={pos.x - nodeW/2} y={pos.y - nodeH/2} width={nodeW} height={nodeH} rx={4}
                fill={fill} stroke={color} strokeWidth={isSource ? 1.5 : 1} />
              <text x={pos.x} y={pos.y + 5} textAnchor="middle" fill="rgba(235,235,229,0.8)"
                fontSize={12} fontFamily="DM Mono, monospace">{n.name}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function StateVisualizer({ result, costEstimate, sourceCode, onNavigateToLine }: Props) {
  const tokens = result.definitions.filter((d) =>
    d.type === "fungible-token" || d.type === "non-fungible-token"
  );
  const fns = result.definitions.filter((d) =>
    d.type === "public-fn" || d.type === "read-only-fn" || d.type === "private-fn"
  );
  const storage = result.definitions.filter((d) =>
    d.type === "data-var" || d.type === "map" || d.type === "constant"
  );

  const callGraph = sourceCode ? buildCallGraph(sourceCode, result.definitions) : null;

  const handleDefClick = (def: Definition) => {
    onNavigateToLine?.(def.line);
  };

  return (
    <div className="space-y-8">
      {/* Status bar */}
      <div className="flex items-center gap-6 text-xs">
        <span className={result.valid ? "text-green-500/70" : "text-red-400"}>
          {result.valid ? "✓ Valid" : "✗ Errors"}
        </span>
        {costEstimate && (
          <span className="text-muted">
            {costEstimate.toLocaleString()} µSTX
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
              <button
                key={t.name}
                onClick={() => handleDefClick(t)}
                className="w-full text-left flex items-center gap-3 p-3 border border-line rounded-sm hover:bg-text/[0.03] hover:border-text/20 transition-colors"
              >
                <span className="text-lg">{DefIcon({ type: t.type })}</span>
                <div>
                  <p className="text-sm font-bold">{t.name}</p>
                  <p className="text-xs text-muted font-mono">Line {t.line} · {DefLabel({ type: t.type })}</p>
                </div>
              </button>
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
              <button
                key={f.name}
                onClick={() => handleDefClick(f)}
                className="w-full text-left flex items-center justify-between py-2 px-3 hover:bg-text/[0.03] hover:border-text/10 border border-transparent hover:border-text/[0.06] transition-colors rounded-sm group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs w-5 text-center shrink-0">{DefIcon({ type: f.type })}</span>
                  <div className="min-w-0">
                    <span className="text-sm font-mono">{f.name}</span>
                    {f.params && f.params.length > 0 && (
                      <span className="text-xs text-muted ml-2 font-mono hidden sm:inline">
                        ({f.params.map((p) => `${p.name}: ${p.type}`).join(", ")})
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-muted/40 font-mono shrink-0 group-hover:text-muted/60 transition-colors">
                  L{f.line} · {DefLabel({ type: f.type })}
                </span>
              </button>
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
                  <tr
                    key={s.name}
                    onClick={() => handleDefClick(s)}
                    className="border-b border-line last:border-0 hover:bg-text/[0.02] cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-mono">{s.name}</td>
                    <td className="p-3 text-muted font-mono text-[10px]">L{s.line} · {DefLabel({ type: s.type })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Call graph */}
      {callGraph && callGraph.length > 0 && (
        <div>
          <p className="text-xs text-muted font-mono uppercase tracking-wider mb-3">Call Graph</p>
          <CallGraphSVG nodes={callGraph} />
        </div>
      )}

      {/* Diagnostics */}
      {result.diagnostics.length > 0 && (
        <div>
          <p className="text-xs text-muted font-mono uppercase tracking-wider mb-3">Diagnostics</p>
          <div className="space-y-1">
            {result.diagnostics.map((d, i) => (
              <button
                key={i}
                onClick={() => onNavigateToLine?.(d.line)}
                className={`w-full text-left text-xs font-mono py-1.5 px-3 rounded-sm transition-colors ${
                  d.severity === "error" ? "text-red-400/80 bg-red-400/5 hover:bg-red-400/10" :
                  d.severity === "warning" ? "text-yellow-400/80 bg-yellow-400/5 hover:bg-yellow-400/10" :
                  "text-muted hover:bg-text/[0.02]"
                }`}
              >
                L{d.line}: {d.message}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
