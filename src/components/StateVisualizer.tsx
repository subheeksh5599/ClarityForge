"use client";

import { AnalysisResult, Definition, CallGraphNode, buildCallGraph } from "@/lib/clarity/analyzer";

interface Props {
  result: AnalysisResult;
  costEstimate?: number;
  sourceCode?: string;
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

function CallGraphSVG({ nodes }: { nodes: CallGraphNode[] }) {
  if (nodes.length === 0) return null;
  
  const nodeCount = nodes.length;
  const hasEdges = nodes.some((n) => n.calls.length > 0);
  
  // Layout: arrange nodes in a column or grid
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
  
  // Build edge list
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
  
  if (!hasEdges) {
    // Just show nodes without edges
    return (
      <div className="border border-line rounded-sm overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height + 16 }}>
          {nodes.map((n, i) => {
            const pos = positions[n.name];
            const color = n.type === "public-fn" ? "rgba(235,235,229,0.6)"
              : n.type === "read-only-fn" ? "rgba(235,235,229,0.4)"
              : "rgba(235,235,229,0.25)";
            return (
              <g key={n.name}>
                <rect x={pos.x - nodeW/2} y={pos.y - nodeH/2} width={nodeW} height={nodeH} rx={4}
                  fill="none" stroke={color} strokeWidth={1} />
                <text x={pos.x} y={pos.y + 5} textAnchor="middle" fill="rgba(235,235,229,0.8)"
                  fontSize={12} fontFamily="DM Mono, monospace">{n.name}</text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }
  
  return (
    <div className="border border-line rounded-sm overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height + 16 }}>
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="rgba(235,235,229,0.3)" />
          </marker>
        </defs>
        
        {/* Edges */}
        {edges.map((edge, i) => (
          <line key={i}
            x1={edge.fromPos.x} y1={edge.fromPos.y}
            x2={edge.toPos.x} y2={edge.toPos.y}
            stroke="rgba(235,235,229,0.2)" strokeWidth={1}
            markerEnd="url(#arrowhead)" />
        ))}
        
        {/* Nodes */}
        {nodes.map((n) => {
          const pos = positions[n.name];
          const isSource = edges.some((e) => e.from === n.name);
          const isTarget = edges.some((e) => e.to === n.name);
          const color = n.type === "public-fn" ? "rgba(235,235,229,0.6)"
            : n.type === "read-only-fn" ? "rgba(235,235,229,0.4)"
            : "rgba(235,235,229,0.25)";
          const fill = isSource || isTarget ? "rgba(235,235,229,0.05)" : "transparent";
          return (
            <g key={n.name}>
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

export default function StateVisualizer({ result, costEstimate, sourceCode }: Props) {
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
                  <div>
                    <span className="text-sm font-mono">{f.name}</span>
                    {f.params && f.params.length > 0 && (
                      <span className="text-xs text-muted ml-2 font-mono">
                        ({f.params.map((p) => `${p.name}: ${p.type}`).join(", ")})
                      </span>
                    )}
                  </div>
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
