"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import StateVisualizer from "../../components/StateVisualizer";
import { TEMPLATES, getTemplate, Template } from "../../lib/clarity/templates";
import { getExecutableFunctions, getDefaultParams, executeFunction, ExecutionResult } from "../../lib/clarity/executor";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

function DemoContent() {
  const searchParams = useSearchParams();
  const initialSlug = searchParams.get("template") ?? "token";

  const [template, setTemplate] = useState<Template>(
    () => getTemplate(initialSlug) ?? TEMPLATES[0]
  );
  const [code, setCode] = useState(template.code);
  const [output, setOutput] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<Record<string, unknown> | null>(null);
  const [viewMode, setViewMode] = useState<"visual" | "interact" | "text">("visual");
  const [running, setRunning] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [selectedFn, setSelectedFn] = useState<string>("");
  const [fnParams, setFnParams] = useState<string[]>([]);
  const [execResult, setExecResult] = useState<ExecutionResult | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [splitRatio, setSplitRatio] = useState(60);
  const dragRef = { current: false };

  useEffect(() => {
    setCode(template.code);
    setOutput(null);
    setTxHash(null);
    setExecResult(null);
  }, [template]);

  const handleRun = async () => {
    setRunning(true);
    setOutput(null);
    setTxHash(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Request failed" })); setOutput(`✗ Error: ${err.error || `HTTP ${res.status}`}`); setRunning(false); return; }
      const data = await res.json();
      setAnalysisResult(data);
      const lines: string[] = [];
      lines.push(data.valid ? "✓ Contract analysis complete" : "✗ Contract has errors"); lines.push("");
      if (data.definitions?.length) { lines.push("Defined:"); for (const d of data.definitions) { const label = d.type === "fungible-token" ? "Fungible token" : d.type === "non-fungible-token" ? "Non-fungible token" : d.type === "public-fn" ? "Public function" : d.type === "read-only-fn" ? "Read-only function" : d.type === "private-fn" ? "Private function" : d.type === "data-var" ? "Data variable" : d.type === "map" ? "Data map" : d.type === "constant" ? "Constant" : d.type === "trait" ? "Trait" : d.type; lines.push(`  • ${label}: ${d.name} (line ${d.line})`); } lines.push(""); }
      if (data.stats) { lines.push(`Lines: ${data.stats.totalLines}`); lines.push(`Functions: ${data.stats.functions}`); lines.push(`Data vars: ${data.stats.dataVars}`); lines.push(`Maps: ${data.stats.maps}`); lines.push(`Tokens: ${data.stats.tokens}`); lines.push(""); }
      if (data.diagnostics?.length) { for (const d of data.diagnostics) { const icon = d.severity === "error" ? "✗" : d.severity === "warning" ? "⚠" : "ℹ"; lines.push(`${icon} Line ${d.line}: ${d.message}`); } lines.push(""); }
      if (data.costEstimate) lines.push(`Cost estimate: ${data.costEstimate.toLocaleString()} microSTX`);
      if (data.valid) { lines.push(""); lines.push("→ Ready for testnet deployment"); }
      setOutput(lines.join("\n"));
    } catch (e) {
      setOutput(`✗ Analysis failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
    setRunning(false);
  };

  const handleDeploy = async () => {
    setDeploying(true); setTxHash(null);
    try {
      const res = await fetch("/api/deploy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const data = await res.json();
      if (res.ok && data.txHash) {
        setTxHash(data.txHash);
        setOutput(`✓ Deployment simulated successfully\n\nThis is a simulation — real deployment requires wallet\nintegration (planned for Phase 2).\n\nNetwork: Stacks testnet\nContract: ${data.contractId ?? "N/A"}\nSimulated tx: ${data.txHash.slice(0, 20)}...\n\n→ Ready for real deployment when wallet\n   integration is complete`);
      } else { setOutput(`✗ Deploy failed: ${data.error || "Unknown error"}`); }
    } catch (e) { setOutput(`✗ Deploy failed: ${e instanceof Error ? e.message : "Unknown error"}`); }
    setDeploying(false);
  };

  const switchTemplate = (t: Template) => { setTemplate(t); setViewMode("visual"); };

  const handleMouseDown = () => { dragRef.current = true; };
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const container = document.getElementById("ide-container");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitRatio(Math.min(85, Math.max(25, pct)));
    };
    const handleMouseUp = () => { dragRef.current = false; };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, []);

  return (
    <div className="h-svh flex flex-col bg-[#0A0A0B] pt-16">
      <Nav />

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 h-10 border-b border-line bg-[#0C0C0D] shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto">
          {TEMPLATES.map((t) => (
            <button
              key={t.slug}
              onClick={() => switchTemplate(t)}
              className={`px-3 py-1.5 text-[11px] font-mono whitespace-nowrap transition-colors ${
                template.slug === t.slug
                  ? "text-text bg-text/5"
                  : "text-muted hover:text-text"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleRun} disabled={running}
            className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium transition-colors ${running ? "text-muted cursor-wait" : "text-bg bg-text hover:bg-text/90"}`}>
            ▶ {running ? "…" : "Run"}
          </button>
          <button onClick={handleDeploy} disabled={deploying}
            className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium transition-colors border border-line ${deploying ? "text-muted cursor-wait" : "text-text hover:bg-text/5"}`}>
            ↑ {deploying ? "…" : "Deploy"}
          </button>
          <button onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="px-2 py-1 text-[11px] text-muted hover:text-text transition-colors font-mono ml-2">
            {rightPanelOpen ? "◢" : "◰"}
          </button>
        </div>
      </div>

      {/* Main IDE area */}
      <div id="ide-container" className="flex-1 flex min-h-0">
        {/* Editor */}
        <div style={{ width: rightPanelOpen ? `${splitRatio}%` : "100%" }} className="transition-[width] duration-75">
          <MonacoEditor
            language="rust"
            theme="clarityforge"
            value={code}
            onChange={(v) => setCode(v || "")}
            beforeMount={(monaco) => {
              monaco.editor.defineTheme("clarityforge", {
                base: "vs-dark",
                inherit: true,
                rules: [
                  { token: "comment", foreground: "555555", fontStyle: "italic" },
                  { token: "keyword", foreground: "999999" },
                  { token: "string", foreground: "CCCCCC" },
                  { token: "number", foreground: "888888" },
                ],
                colors: {
                  "editor.background": "#0A0A0B",
                  "editor.foreground": "#EBEBE5",
                  "editor.lineHighlightBackground": "#111113",
                  "editor.selectionBackground": "#EBEBE515",
                  "editorCursor.foreground": "#EBEBE5",
                  "editorLineNumber.foreground": "#1E1E20",
                  "editorLineNumber.activeForeground": "#6B6B6B",
                  "editorGutter.background": "#0A0A0B",
                },
              });
            }}
            options={{
              fontSize: 14,
              fontFamily: "'DM Mono', monospace",
              lineNumbers: "on",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 },
              renderLineHighlight: "line",
              cursorBlinking: "smooth",
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              overviewRulerBorder: false,
              folding: true,
              lineNumbersMinChars: 3,
              automaticLayout: true,
              scrollbar: { vertical: "auto", horizontal: "auto", verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
            }}
            loading={
              <div className="h-full flex items-center justify-center text-muted text-sm font-mono">Loading editor…</div>
            }
          />
        </div>

        {/* Resize handle */}
        {rightPanelOpen && (
          <div
            onMouseDown={handleMouseDown}
            className="w-1.5 shrink-0 bg-line hover:bg-text/20 cursor-col-resize transition-colors active:bg-text/30 relative group"
          >
            <div className="absolute inset-y-0 -left-1 -right-1" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-text/0 group-hover:bg-text/10 transition-colors" />
          </div>
        )}

        {/* Right panel */}
        {rightPanelOpen && (
          <div style={{ width: `${100 - splitRatio}%` }} className="border-l border-line flex flex-col min-h-0 bg-[#080809]">
            {/* Tabs */}
            <div className="flex items-center border-b border-line shrink-0 px-2">
              {(["visual", "interact", "text"] as const).map((mode) => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  className={`px-3 py-2 text-[11px] font-mono transition-colors capitalize border-b-2 -mb-px ${
                    viewMode === mode ? "text-text border-text" : "text-muted border-transparent hover:text-text"
                  }`}>
                  {mode}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {output || txHash ? (
                <div>
                  {txHash && (
                    <div className="mb-6 pb-6 border-b border-line">
                      <p className="text-xs text-muted font-mono uppercase tracking-wider mb-1">Simulation</p>
                      <p className="font-mono text-xs text-muted">Ready for Phase 2 (wallet integration)</p>
                    </div>
                  )}
                  {viewMode === "visual" && analysisResult && !txHash ? (
                    <StateVisualizer
                      result={analysisResult as unknown as import("../../lib/clarity/analyzer").AnalysisResult}
                      costEstimate={(analysisResult as Record<string, unknown>).costEstimate as number | undefined}
                    />
                  ) : viewMode === "interact" && analysisResult ? (
                    <InteractPanel
                      analysisResult={analysisResult as Record<string, unknown>}
                      selectedFn={selectedFn} setSelectedFn={setSelectedFn}
                      fnParams={fnParams} setFnParams={setFnParams}
                      execResult={execResult} setExecResult={setExecResult}
                    />
                  ) : (
                    <pre className="font-mono text-xs text-text/80 leading-relaxed whitespace-pre-wrap">{output}</pre>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted text-xs">
                    <span className="text-text">Run</span> to analyze —{" "}
                    <span className="text-text">Deploy</span> to testnet
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 h-7 border-t border-line bg-[#0C0C0D] text-[10px] font-mono text-muted shrink-0">
        <div className="flex items-center gap-4">
          <span>{template.name}</span>
          {analysisResult && (
            <span className="text-text/60">
              {(analysisResult as Record<string, unknown>).valid ? "✓ Valid" : "✗ Errors"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {analysisResult && (() => {
            const stats = (analysisResult as any).stats;
            return stats ? <span>{stats.totalLines} lines</span> : null;
          })()}
          <span>Clarity</span>
        </div>
      </div>
    </div>
  );
}

function InteractPanel({
  analysisResult, selectedFn, setSelectedFn, fnParams, setFnParams, execResult, setExecResult,
}: {
  analysisResult: Record<string, unknown>;
  selectedFn: string; setSelectedFn: (v: string) => void;
  fnParams: string[]; setFnParams: (v: string[]) => void;
  execResult: ExecutionResult | null; setExecResult: (v: ExecutionResult | null) => void;
}) {
  const defs = (analysisResult.definitions ?? []) as any[];
  const fns = getExecutableFunctions(defs);

  const handleSelectFn = (name: string) => {
    setSelectedFn(name);
    const fn = defs.find((d: any) => d.name === name);
    if (fn) setFnParams(getDefaultParams(fn));
    setExecResult(null);
  };

  const handleExecute = () => {
    const fn = defs.find((d: any) => d.name === selectedFn);
    if (!fn) return;
    setExecResult(executeFunction(fn, defs, fnParams));
  };

  const icon = (type: string) =>
    type === "check" ? "✓" : type === "read" ? "👁" : type === "write" ? "✎" :
    type === "transfer" ? "→" : type === "emit" ? "⚡" : "↩";

  if (fns.length === 0) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted text-xs">No functions found. Run analysis first.</p></div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] text-muted font-mono uppercase tracking-wider mb-2">Function</p>
        <select value={selectedFn} onChange={(e) => handleSelectFn(e.target.value)}
          className="w-full bg-[#0A0A0B] border border-line text-xs text-text px-3 py-2 font-mono focus:outline-none focus:border-text/40">
          <option value="">Select a function...</option>
          {fns.map((f: any) => (
            <option key={f.name} value={f.name}>{f.name} ({f.type === "public-fn" ? "public" : "read-only"})</option>
          ))}
        </select>
      </div>

      {selectedFn && fnParams.length > 0 && (
        <div>
          <p className="text-[10px] text-muted font-mono uppercase tracking-wider mb-2">Parameters</p>
          <div className="space-y-1.5">
            {fnParams.map((p, i) => (
              <input key={i} type="text" value={p}
                onChange={(e) => { const next = [...fnParams]; next[i] = e.target.value; setFnParams(next); }}
                className="w-full bg-[#0A0A0B] border border-line text-xs text-text px-3 py-2 font-mono focus:outline-none focus:border-text/40"
                placeholder={`param ${i + 1}`} />
            ))}
          </div>
        </div>
      )}

      {selectedFn && (
        <button onClick={handleExecute}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-bg bg-text hover:bg-text/90 transition-colors">
          ▶ Execute {selectedFn}
        </button>
      )}

      {execResult && (
        <div>
          <p className="text-[10px] text-muted font-mono uppercase tracking-wider mb-3">Execution Trace</p>
          <div className="space-y-1.5">
            {execResult.steps.map((step, i) => (
              <div key={i}
                className={`flex items-start gap-2.5 p-2.5 text-[11px] ${
                  step.type === "return" ? "bg-text/5 border border-line" : step.type === "transfer" ? "bg-text/[0.02]" : ""
                }`}>
                <span className="mt-px shrink-0 w-4 text-center font-mono text-muted">{icon(step.type)}</span>
                <span className="text-text/80 font-mono leading-relaxed">{step.detail}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-[11px]">
            <span className="text-muted font-mono">Cost</span>
            <span className="text-text font-mono">{execResult.costEstimate.toLocaleString()} µSTX</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Demo() {
  return (
    <Suspense fallback={<div className="h-svh flex items-center justify-center text-muted text-sm bg-[#0A0A0B]">Loading…</div>}>
      <DemoContent />
    </Suspense>
  );
}
