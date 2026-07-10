"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Nav from "../../components/Nav";
import StateVisualizer from "../../components/StateVisualizer";
import { TEMPLATES, getTemplate, Template } from "../../lib/clarity/templates";
import { getExecutableFunctions, getDefaultParams, executeFunction, ExecutionResult } from "../../lib/clarity/executor";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface FileTab { id: string; name: string; code: string; }

let fileIdCounter = 0;
function nextFileId() { return `file-${++fileIdCounter}`; }

function DemoContent() {
  const searchParams = useSearchParams();
  const initialSlug = searchParams.get("template") ?? "token";
  const initialTemplate = getTemplate(initialSlug) ?? TEMPLATES[0];

  const [files, setFiles] = useState<FileTab[]>([
    { id: nextFileId(), name: `${initialTemplate.slug}.clar`, code: initialTemplate.code },
  ]);
  const [activeFileId, setActiveFileId] = useState(files[0].id);
  const activeFile = files.find((f) => f.id === activeFileId) ?? files[0];
  const code = activeFile.code;
  const setCode = (v: string) => setFiles((prev) => prev.map((f) => (f.id === activeFileId ? { ...f, code: v } : f)));

  const [output, setOutput] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<Record<string, unknown> | null>(null);
  const [viewMode, setViewMode] = useState<"visual" | "interact" | "text">("visual");
  const [running, setRunning] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [selectedFn, setSelectedFn] = useState("");
  const [fnParams, setFnParams] = useState<string[]>([]);
  const [execResult, setExecResult] = useState<ExecutionResult | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [splitRatio, setSplitRatio] = useState(60);
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const dragRef = { current: false };

  const switchTemplate = (t: Template) => {
    setFiles((prev) => [...prev, { id: nextFileId(), name: `${t.slug}.clar`, code: t.code }]);
    setActiveFileId(files[files.length - 1]?.id ?? "");
    setViewMode("visual");
  };

  const closeFile = (id: string) => {
    if (files.length <= 1) return;
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (activeFileId === id) setActiveFileId(next[0]?.id ?? "");
      return next;
    });
  };

  const addNewFile = () => {
    const name = window.prompt("File name:", "untitled.clar");
    if (!name) return;
    const f: FileTab = { id: nextFileId(), name: name.endsWith(".clar") ? name : `${name}.clar`, code: ";; New Clarity contract\n" };
    setFiles((prev) => [...prev, f]);
    setActiveFileId(f.id);
  };

  const startRename = (f: FileTab) => {
    setRenamingFile(f.id);
    setRenameValue(f.name);
  };

  const commitRename = () => {
    if (!renamingFile || !renameValue.trim()) { setRenamingFile(null); return; }
    const name = renameValue.endsWith(".clar") ? renameValue : `${renameValue}.clar`;
    setFiles((prev) => prev.map((f) => f.id === renamingFile ? { ...f, name } : f));
    setRenamingFile(null);
  };

  const handleRun = async () => {
    setRunning(true); setOutput(null); setTxHash(null);
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Request failed" })); setOutput(`✗ ${err.error || `HTTP ${res.status}`}`); setRunning(false); return; }
      const data = await res.json(); setAnalysisResult(data);
      const l: string[] = [];
      l.push(data.valid ? "✓ Contract analysis complete" : "✗ Contract has errors"); l.push("");
      if (data.definitions?.length) { l.push("Defined:"); for (const d of data.definitions) { const lb = d.type === "fungible-token" ? "Token" : d.type === "non-fungible-token" ? "NFT" : d.type === "public-fn" ? "Public fn" : d.type === "read-only-fn" ? "Read-only fn" : d.type === "private-fn" ? "Private fn" : d.type === "data-var" ? "Data var" : d.type === "map" ? "Map" : d.type === "constant" ? "Constant" : d.type; l.push(`  • ${lb}: ${d.name} (line ${d.line})`); } l.push(""); }
      if (data.stats) { l.push(`Lines: ${data.stats.totalLines}`); l.push(`Functions: ${data.stats.functions}`); l.push(`Data vars: ${data.stats.dataVars}`); l.push(`Maps: ${data.stats.maps}`); l.push(""); }
      if (data.diagnostics?.length) { for (const d of data.diagnostics) l.push(`${d.severity === "error" ? "✗" : "⚠"} L${d.line}: ${d.message}`); l.push(""); }
      if (data.costEstimate) l.push(`Cost: ${data.costEstimate.toLocaleString()} µSTX`);
      if (data.valid) { l.push(""); l.push("→ Ready for testnet deployment"); }
      setOutput(l.join("\n"));
    } catch (e) { setOutput(`✗ ${e instanceof Error ? e.message : "Error"}`); }
    setRunning(false);
  };

  const handleDeploy = async () => {
    setDeploying(true); setTxHash(null);
    try {
      const res = await fetch("/api/deploy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const data = await res.json();
      if (res.ok && data.txHash) { setTxHash(data.txHash); setOutput(`✓ Simulation complete\n\nNetwork: Stacks testnet\nContract: ${data.contractId ?? "N/A"}\n→ Wallet integration planned for Phase 2`); }
      else setOutput(`✗ ${data.error || "Deploy failed"}`);
    } catch (e) { setOutput(`✗ ${e instanceof Error ? e.message : "Error"}`); }
    setDeploying(false);
  };

  useEffect(() => {
    const mm = (e: MouseEvent) => { if (!dragRef.current) return; const c = document.getElementById("ide-container"); if (!c) return; setSplitRatio(Math.min(85, Math.max(25, ((e.clientX - c.getBoundingClientRect().left) / c.getBoundingClientRect().width) * 100))); };
    const mu = () => { dragRef.current = false; };
    window.addEventListener("mousemove", mm); window.addEventListener("mouseup", mu);
    return () => { window.removeEventListener("mousemove", mm); window.removeEventListener("mouseup", mu); };
  }, []);

  return (
    <div className="h-svh flex flex-col bg-[#0A0A0B] pt-16">
      <Nav />

      {/* File tabs toolbar */}
      <div className="flex items-center border-b border-line bg-[#0C0C0D] shrink-0">
        <div className="flex items-center flex-1 overflow-x-auto">
          {files.map((f) => (
            <button
              key={f.id}
              onClick={() => { if (renamingFile !== f.id) setActiveFileId(f.id); }}
              onDoubleClick={() => startRename(f)}
              className={`group flex items-center gap-1.5 px-3 py-2 text-[11px] font-mono border-r border-line transition-colors shrink-0 ${
                f.id === activeFileId ? "text-text bg-[#0A0A0B] border-b border-b-[#0A0A0B] -mb-px" : "text-muted hover:text-text"
              }`}
            >
              {renamingFile === f.id ? (
                <input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingFile(null); }}
                  className="bg-[#0A0A0B] text-text text-[11px] font-mono outline-none border border-text/20 px-1 py-0 w-32"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                f.name
              )}
              {files.length > 1 && renamingFile !== f.id && (
                <span onClick={(e) => { e.stopPropagation(); closeFile(f.id); }}
                  className="text-muted hover:text-text ml-0.5">×</span>
              )}
            </button>
          ))}
        </div>
        <button onClick={addNewFile} className="px-3 py-2 text-[11px] text-muted hover:text-text font-mono border-l border-line shrink-0">+</button>
      </div>

      {/* Run/Deploy bar */}
      <div className="flex items-center justify-between px-4 h-8 border-b border-line bg-[#0C0C0D] shrink-0">
        <span className="text-[10px] text-muted font-mono">{activeFile.name}</span>
        <div className="flex items-center gap-2">
          <button onClick={handleRun} disabled={running}
            className={`flex items-center gap-1 px-3 py-0.5 text-[11px] font-medium ${running ? "text-muted" : "text-bg bg-text hover:bg-text/90"}`}>
            ▶ {running ? "…" : "Run"}
          </button>
          <button onClick={handleDeploy} disabled={deploying}
            className={`flex items-center gap-1 px-3 py-0.5 text-[11px] font-medium border border-line ${deploying ? "text-muted" : "text-text hover:bg-text/5"}`}>
            ↑ {deploying ? "…" : "Deploy"}
          </button>
          <button onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="px-2 py-0.5 text-[11px] text-muted hover:text-text font-mono ml-1">{rightPanelOpen ? "◢" : "◰"}</button>
        </div>
      </div>

      {/* Editor + Panel */}
      <div id="ide-container" className="flex-1 flex min-h-0">
        <div style={{ width: rightPanelOpen ? `${splitRatio}%` : "100%" }}>
          <MonacoEditor language="rust" theme="clarityforge" value={code} onChange={(v) => setCode(v || "")}
            beforeMount={(monaco) => { monaco.editor.defineTheme("clarityforge", { base: "vs-dark", inherit: true, rules: [{ token: "comment", foreground: "555555", fontStyle: "italic" }, { token: "keyword", foreground: "999999" }, { token: "string", foreground: "CCCCCC" }], colors: { "editor.background": "#0A0A0B", "editor.foreground": "#EBEBE5", "editor.lineHighlightBackground": "#111113", "editor.selectionBackground": "#EBEBE515", "editorCursor.foreground": "#EBEBE5", "editorLineNumber.foreground": "#1E1E20", "editorLineNumber.activeForeground": "#6B6B6B", "editorGutter.background": "#0A0A0B" } }); }}
            options={{ fontSize: 14, fontFamily: "'DM Mono', monospace", lineNumbers: "on", minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 16, bottom: 16 }, renderLineHighlight: "line", cursorBlinking: "smooth", overviewRulerLanes: 0, hideCursorInOverviewRuler: true, overviewRulerBorder: false, folding: true, lineNumbersMinChars: 3, automaticLayout: true, scrollbar: { vertical: "auto", horizontal: "auto", verticalScrollbarSize: 6 } }}
            loading={<div className="h-full flex items-center justify-center text-muted text-sm font-mono">…</div>} />
        </div>

        {rightPanelOpen && (
          <div onMouseDown={() => { dragRef.current = true; }}
            className="w-1.5 shrink-0 bg-line hover:bg-text/20 cursor-col-resize transition-colors relative">
            <div className="absolute inset-y-0 -left-1 -right-1" />
          </div>
        )}

        {rightPanelOpen && (
          <div style={{ width: `${100 - splitRatio}%` }} className="border-l border-line flex flex-col min-h-0 bg-[#080809]">
            <div className="flex items-center border-b border-line shrink-0 px-2">
              {(["visual", "interact", "text"] as const).map((m) => (
                <button key={m} onClick={() => setViewMode(m)}
                  className={`px-3 py-2 text-[11px] font-mono capitalize border-b-2 -mb-px ${viewMode === m ? "text-text border-text" : "text-muted border-transparent hover:text-text"}`}>{m}</button>
              ))}
            </div>
            <div className="flex-1 overflow-auto p-6">
              {output ? (
                <div>
                  {txHash && <div className="mb-4 pb-4 border-b border-line"><p className="text-[10px] text-muted font-mono uppercase tracking-wider mb-0.5">Deploy Simulation</p><p className="font-mono text-[10px] text-muted">Phase 2 — wallet integration</p></div>}
                  {viewMode === "visual" && analysisResult ? (
                    <StateVisualizer result={analysisResult as any} costEstimate={(analysisResult as any).costEstimate} />
                  ) : viewMode === "interact" && analysisResult ? (
                    <InteractPanel analysisResult={analysisResult} selectedFn={selectedFn} setSelectedFn={setSelectedFn} fnParams={fnParams} setFnParams={setFnParams} execResult={execResult} setExecResult={setExecResult} />
                  ) : (
                    <pre className="font-mono text-xs text-text/80 leading-relaxed whitespace-pre-wrap">{output}</pre>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full"><p className="text-muted text-xs"><span className="text-text">Run</span> to analyze</p></div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 h-6 border-t border-line bg-[#0C0C0D] text-[10px] font-mono text-muted shrink-0">
        <div className="flex items-center gap-3">
          <span>{activeFile.name}</span>
          {analysisResult && <span className="text-text/60">{(analysisResult as any).valid ? "✓" : "✗"}</span>}
        </div>
        <div className="flex items-center gap-3">
          {analysisResult && <span>{(analysisResult as any).stats?.totalLines ?? 0} lines</span>}
          <span>Clarity</span>
        </div>
      </div>
    </div>
  );
}

function InteractPanel({ analysisResult, selectedFn, setSelectedFn, fnParams, setFnParams, execResult, setExecResult }: {
  analysisResult: Record<string, unknown>; selectedFn: string; setSelectedFn: (v: string) => void;
  fnParams: string[]; setFnParams: (v: string[]) => void; execResult: ExecutionResult | null; setExecResult: (v: ExecutionResult | null) => void;
}) {
  const defs = (analysisResult.definitions ?? []) as any[];
  const fns = getExecutableFunctions(defs);
  const icon = (t: string) => t === "check" ? "✓" : t === "read" ? "👁" : t === "write" ? "✎" : t === "transfer" ? "→" : t === "emit" ? "⚡" : "↩";

  if (!fns.length) return <div className="flex items-center justify-center h-full"><p className="text-muted text-xs">No executable functions</p></div>;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] text-muted font-mono uppercase tracking-wider mb-2">Function</p>
        <select value={selectedFn} onChange={(e) => { setSelectedFn(e.target.value); const fn = defs.find((d: any) => d.name === e.target.value); if (fn) setFnParams(getDefaultParams(fn)); setExecResult(null); }}
          className="w-full bg-[#0A0A0B] border border-line text-xs text-text px-3 py-2 font-mono focus:outline-none focus:border-text/40">
          <option value="">Select…</option>
          {fns.map((f: any) => <option key={f.name} value={f.name}>{f.name} ({f.type === "public-fn" ? "public" : "read-only"})</option>)}
        </select>
      </div>
      {selectedFn && fnParams.length > 0 && (
        <div>
          <p className="text-[10px] text-muted font-mono uppercase tracking-wider mb-2">Parameters</p>
          <div className="space-y-1.5">
            {fnParams.map((p, i) => (
              <input key={i} value={p} onChange={(e) => { const n = [...fnParams]; n[i] = e.target.value; setFnParams(n); }}
                className="w-full bg-[#0A0A0B] border border-line text-xs text-text px-3 py-2 font-mono focus:outline-none focus:border-text/40" placeholder={`param ${i + 1}`} />
            ))}
          </div>
        </div>
      )}
      {selectedFn && (
        <button onClick={() => { const fn = defs.find((d: any) => d.name === selectedFn); if (fn) setExecResult(executeFunction(fn, defs, fnParams)); }}
          className="w-full py-2 text-[11px] font-medium text-bg bg-text hover:bg-text/90">▶ Execute {selectedFn}</button>
      )}
      {execResult && (
        <div>
          <p className="text-[10px] text-muted font-mono uppercase tracking-wider mb-3">Trace</p>
          <div className="space-y-1.5">
            {execResult.steps.map((s, i) => (
              <div key={i} className={`flex items-start gap-2 p-2.5 text-[11px] ${s.type === "return" ? "bg-text/5 border border-line" : ""}`}>
                <span className="mt-px w-4 text-center font-mono text-muted shrink-0">{icon(s.type)}</span>
                <span className="text-text/80 font-mono leading-relaxed">{s.detail}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-line flex justify-between text-[11px]">
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
    <Suspense fallback={<div className="h-svh flex items-center justify-center text-muted text-sm bg-[#0A0A0B]">…</div>}>
      <DemoContent />
    </Suspense>
  );
}
