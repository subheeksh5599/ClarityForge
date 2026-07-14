"use client";

import { Suspense, useState, useEffect, useRef, useCallback, type MutableRefObject } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { editor } from "monaco-editor";
import { request } from "@stacks/connect";
import Nav from "../../components/Nav";
import StateVisualizer from "../../components/StateVisualizer";
import AccountPanel from "../../components/AccountPanel";
import VmTrace from "../../components/VmTrace";
import { useWallet } from "../../components/WalletProvider";
import { useTheme } from "../../components/ThemeProvider";
import { TEMPLATES, getTemplate, Template } from "../../lib/clarity/templates";
import { getExecutableFunctions, getDefaultParams, executeFunction, ExecutionResult } from "../../lib/clarity/executor";
import { analyze, AnalysisResult } from "../../lib/clarity/analyzer";
import {
  createVmState, initStateFromContract, executeInVm,
  type VmState, type VmResult, type SimAccount
} from "../../lib/clarity/vm";

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
  const [unsavedFiles, setUnsavedFiles] = useState<Set<string>>(new Set());
  const [useRealVM, setUseRealVM] = useState(true);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const dragRef = { current: false };
  const wallet = useWallet();
  const { theme } = useTheme();

  // Render output with clickable links
  const renderOutput = (text: string | null) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    const matches = text.match(urlRegex) || [];
    let matchIdx = 0;
    return parts.map((part, i) => {
      if (i % 2 === 0) return part;
      const url = matches[matchIdx++];
      return (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
          className="text-text underline hover:text-text/70"
          onClick={(e) => e.stopPropagation()}>
          {url}
        </a>
      );
    });
  };

  // ── VM state (Remix-style) ──
  const vmStateRef = useRef<VmState>(createVmState());
  const [selectedAccount, setSelectedAccount] = useState(vmStateRef.current.accounts[0].address);
  const [envMode, setEnvMode] = useState<"vm" | "clarinet" | "deploy">("vm");
  const [vmResult, setVmResult] = useState<VmResult | null>(null);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const accounts = vmStateRef.current.accounts;

  const refreshAccounts = async () => {
    setAccountsLoading(true);
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.accounts?.length) {
        const fresh = createVmState();
        fresh.accounts = data.accounts.map((a: { address: string; label: string }, i: number) => ({
          address: a.address,
          balance: 100_000_000,
          label: a.label || `Account ${i + 1}`,
        }));
        vmStateRef.current.accounts = fresh.accounts;
        setSelectedAccount(fresh.accounts[0].address);
      }
    } catch { /* ignore */ }
    setAccountsLoading(false);
  };

  // ── localStorage persistence ──
  const STORAGE_KEY = "clarityforge-files";

  // Load saved files on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed: FileTab[] = JSON.parse(saved);
      if (parsed.length > 0) {
        setFiles(parsed);
        setActiveFileId(parsed[0].id);
      }
    } catch { /* ignore corrupt data */ }
  }, []);

  // Save files whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    } catch { /* quota exceeded — silently ignore */ }
  }, [files]);

  // Mark file as unsaved when code changes from original
  const markUnsaved = (id: string, code: string, original: string) => {
    setUnsavedFiles((prev) => {
      const next = new Set(prev);
      if (code !== original) next.add(id); else next.delete(id);
      return next;
    });
  };

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

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFile.name;
    a.click();
    URL.revokeObjectURL(url);
    markUnsaved(activeFile.id, code, code);
  };

  const setEditorMarkers = useCallback((diagnostics: { line: number; col: number; message: string; severity: string }[]) => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;
    const monaco = (window as any).monaco;
    if (!monaco) return;
    const markers: editor.IMarkerData[] = diagnostics.map((d) => ({
      severity: d.severity === "error" ? monaco.MarkerSeverity.Error
        : d.severity === "warning" ? monaco.MarkerSeverity.Warning
        : monaco.MarkerSeverity.Info,
      message: d.message,
      startLineNumber: d.line,
      startColumn: d.col,
      endLineNumber: d.line,
      endColumn: d.col + 20,
    }));
    monaco.editor.setModelMarkers(model, "clarity", markers);
  }, []);

  const clearEditorMarkers = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;
    const monaco = (window as any).monaco;
    if (!monaco) return;
    monaco.editor.setModelMarkers(model, "clarity", []);
  }, []);

  const handleRun = async () => {
    setRunning(true); setOutput(null); setTxHash(null); setVmResult(null);

    // ── VM Mode: execute in browser simulator ──
    if (envMode === "vm") {
      try {
        const analysisResult = analyze(code);
        setAnalysisResult(analysisResult as unknown as Record<string, unknown>);

        // Init state from contract definitions
        const state = initStateFromContract(
          JSON.parse(JSON.stringify(vmStateRef.current)),
          analysisResult.definitions
        );
        state.caller = selectedAccount;
        vmStateRef.current = state;

        if (!analysisResult.valid) {
          const l: string[] = ["✗ Analysis failed"];
          for (const d of analysisResult.diagnostics) {
            l.push(`${d.severity === "error" ? "✗" : "⚠"} L${d.line}: ${d.message}`);
          }
          setOutput(l.join("\n"));
          setRunning(false);
          return;
        }

        const fns = getExecutableFunctions(analysisResult.definitions);
        if (fns.length > 0) {
          const firstFn = fns[0];
          const defaultParams = getDefaultParams(firstFn);
          const result = executeInVm(firstFn, analysisResult.definitions, defaultParams, state);
          vmStateRef.current = result.state;
          setVmResult(result);

          const l: string[] = [];
          l.push(result.success ? "✓ VM execution complete" : "✗ VM execution failed");
          l.push("");
          l.push(`Function: ${firstFn.name} (${firstFn.type})`);
          if (firstFn.params?.length) {
            l.push(`Params: ${firstFn.params.map((p, i) => `${p.name}=${defaultParams[i]}`).join(", ")}`);
          }
          l.push(`Return: ${result.returnValue}`);
          l.push("");
          for (const step of result.steps) {
            const icon = step.type === "error" ? "✗" : step.type === "transfer" ? "→" : step.type === "write" ? "✎" : step.type === "read" ? "◎" : step.type === "emit" ? "⚡" : "↩";
            l.push(`  ${icon} ${step.detail}`);
          }
          l.push("");
          l.push(`Cost: ${result.costEstimate.toLocaleString()} µSTX`);
          l.push("");
          l.push("→ Switch to Interact tab to call specific functions");
          setOutput(l.join("\n"));
        } else {
          const l: string[] = [];
          l.push(analysisResult.valid ? "✓ Analysis complete — no executable functions found" : "✗ Errors found");
          l.push("");
          if (analysisResult.definitions?.length) {
            l.push("Defined:");
            for (const d of analysisResult.definitions) {
              const lb = d.type === "fungible-token" ? "Token" : d.type === "public-fn" ? "Public fn" : d.type === "read-only-fn" ? "Read-only" : d.type;
              l.push(`  • ${lb}: ${d.name}`);
            }
          }
          l.push("");
          l.push(`Lines: ${analysisResult.stats.totalLines} | Cost: ${analysisResult.stats.tokens * 50}`);
          setOutput(l.join("\n"));
        }
      } catch (e) {
        setOutput(`✗ ${e instanceof Error ? e.message : "VM error"}`);
      }
      setRunning(false);
      return;
    }

    // ── Clarinet / API mode ──
    setRunning(true); setOutput(null); setTxHash(null);
    try {
      const endpoint = useRealVM ? "/api/execute" : "/api/analyze";
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Request failed" })); setOutput(`✗ ${err.error || `HTTP ${res.status}`}`); setRunning(false); return; }
      const data = await res.json(); setAnalysisResult(data);
      // Push diagnostics to editor markers for red squiggly underlines
      if (data.diagnostics?.length) {
        setEditorMarkers(data.diagnostics);
      } else {
        clearEditorMarkers();
      }
      const l: string[] = [];
      l.push(data.valid ? "✓ Analysis complete" : "✗ Errors found");
      if (data.vm) l[0] += ` (${data.vm})`;
      l.push("");
      if (data.definitions?.length) { l.push("Defined:"); for (const d of data.definitions) { const lb = d.type === "fungible-token" ? "Token" : d.type === "non-fungible-token" ? "NFT" : d.type === "public-fn" ? "Public fn" : d.type === "read-only-fn" ? "Read-only fn" : d.type === "private-fn" ? "Private fn" : d.type === "data-var" ? "Data var" : d.type === "map" ? "Map" : d.type; l.push(`  • ${lb}: ${d.name} (line ${d.line})`); } l.push(""); }
      if (data.stats) { l.push(`Lines: ${data.stats.totalLines}`); l.push(`Functions: ${data.stats.functions}`); l.push(`Data vars: ${data.stats.dataVars}`); l.push(`Maps: ${data.stats.maps}`); l.push(""); }
      if (data.diagnostics?.length) { for (const d of data.diagnostics) l.push(`${d.severity === "error" ? "✗" : d.severity === "warning" ? "⚠" : "ℹ"} L${d.line}: ${d.message}`); l.push(""); }
      if (data.rawOutput?.length) { l.push("── Clarinet output ──"); for (const r of data.rawOutput.slice(0, 10)) l.push(r); l.push(""); }
      if (data.costEstimate) l.push(`Cost: ${data.costEstimate.toLocaleString()} µSTX`);
      if (data.valid) { l.push(""); l.push("→ Ready for testnet deployment"); }
      setOutput(l.join("\n"));
    } catch (e) { setOutput(`✗ ${e instanceof Error ? e.message : "Error"}`); }
    setRunning(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleRun(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleRun(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [code]);

  const handleDeploy = async () => {
    setDeploying(true); setTxHash(null);

    // If wallet is connected, do real deployment
    if (wallet.connected) {
      try {
        const contractName = activeFile.name.replace(".clar", "").replace(/[^a-zA-Z0-9_-]/g, "-");
        const result = await request("stx_deployContract", {
          name: contractName,
          clarityCode: code,
          network: "testnet",
        });
        if (result.txid) {
          const deployerAddr = wallet.address || "ST1...";
          const contractId = `${deployerAddr}.${contractName}`;
          const txLink = `https://explorer.hiro.so/txid/${result.txid}?chain=testnet`;
          const contractLink = `https://explorer.hiro.so/address/${contractId}?chain=testnet`;
          
          setTxHash(result.txid);
          setOutput(
            `✓ Contract deployed to testnet!\n\n` +
            `Name: ${contractName}\n` +
            `Contract: ${contractId}\n` +
            `TxID: ${result.txid}\n\n` +
            `→ Transaction: ${txLink}\n` +
            `→ Contract: ${contractLink}\n\n` +
            `(pending confirmation — may take a few minutes)`
          );
        } else {
          setOutput("✓ Transaction sent (txid pending)");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Deploy rejected";
        setOutput(`✗ ${msg}`);
      }
      setDeploying(false);
      return;
    }

    // Fallback: simulated deploy
    try {
      const res = await fetch("/api/deploy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const data = await res.json();
      if (res.ok && data.txHash) {
        setTxHash(data.txHash);
        const simContractId = data.contractId ?? "ST1...contract-name";
        setOutput(
          `✓ Simulation complete (testnet)\n\n` +
          `Contract: ${simContractId}\n` +
          `TxID: ${data.txHash}\n\n` +
          `→ This is a simulated deployment for prototyping\n` +
          `→ Connect wallet (Deploy mode) for real contract on testnet`
        );
      }
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
    <div className="h-svh flex flex-col bg-surface pt-16">
      <Nav />

      {/* File tabs toolbar */}
      <div className="flex items-center border-b border-line bg-bg shrink-0">
        <div className="flex items-center flex-1 overflow-x-auto">
          {files.map((f) => (
            <button
              key={f.id}
              onClick={() => { if (renamingFile !== f.id) setActiveFileId(f.id); }}
              onDoubleClick={() => startRename(f)}
              className={`group flex items-center gap-1.5 px-3 py-2 text-[11px] font-mono border-r border-line transition-colors shrink-0 ${
                f.id === activeFileId ? "text-text bg-surface border-b border-b-[#0A0A0B] -mb-px" : "text-muted hover:text-text"
              }`}
            >
              {renamingFile === f.id ? (
                <input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingFile(null); }}
                  className="bg-surface text-text text-[11px] font-mono outline-none border border-text/20 px-1 py-0 w-32"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="flex items-center gap-1">
                  {unsavedFiles.has(f.id) && <span className="w-1.5 h-1.5 rounded-full bg-text/60" />}
                  {f.name}
                </span>
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
      <div className="flex items-center justify-between px-4 h-8 border-b border-line bg-bg shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted font-mono">{activeFile.name}</span>
          {/* Environment selector */}
          <div className="flex items-center border border-line rounded-sm ml-2">
            {(["vm", "clarinet", "deploy"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setEnvMode(m)}
                className={`text-[9px] font-mono px-2 py-0.5 ${
                  envMode === m
                    ? "bg-text/10 text-text"
                    : "text-muted hover:text-text"
                } ${m !== "vm" ? "border-l border-line" : ""}`}
              >
                {m === "vm" ? "VM" : m === "clarinet" ? "Clarinet" : "Deploy"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRun} disabled={running}
            className={`flex items-center gap-1 px-3 py-0.5 text-[11px] font-medium ${running ? "text-muted" : "text-bg bg-text hover:bg-text/90"}`}>
            ▶ {running ? "…" : envMode === "vm" ? "Run" : "Check"}
          </button>
          <button onClick={handleDeploy} disabled={deploying}
            className={`flex items-center gap-1 px-3 py-0.5 text-[11px] font-medium border border-line ${deploying ? "text-muted" : "text-text hover:bg-text/5"}`}>
            ↑ {deploying ? "…" : "Deploy"}
          </button>
          <button
            onClick={wallet.connected ? wallet.disconnectWallet : wallet.connectWallet}
            disabled={wallet.connecting}
            className={`flex items-center gap-1 px-3 py-0.5 text-[11px] font-medium border border-line ${
              wallet.connected
                ? "border-text/30 text-text hover:bg-text/5"
                : "text-muted hover:text-text"
            }`}
            title={wallet.connected ? `Connected: ${wallet.address?.slice(0, 8)}…` : "Connect wallet for real deployment"}
          >
            {wallet.connecting ? "…" : wallet.connected ? "◉ Wallet" : "○ Connect"}
          </button>
          <button onClick={handleDownload}
            className="flex items-center gap-1 px-3 py-0.5 text-[11px] font-medium border border-line text-muted hover:text-text">
            ↓ Save
          </button>
          <button onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="px-2 py-0.5 text-[11px] text-muted hover:text-text font-mono ml-1">{rightPanelOpen ? "◢" : "◰"}</button>
        </div>
      </div>

      {/* Editor + Panel */}
      <div id="ide-container" className="flex-1 flex min-h-0">
        <div style={{ width: rightPanelOpen ? `${splitRatio}%` : "100%" }}>
          <MonacoEditor language="rust" theme={theme === "dark" ? "clarityforge-dark" : "clarityforge-light"} value={code} onChange={(v) => setCode(v || "")}
            onMount={(editor) => { editorRef.current = editor; }}
            beforeMount={(monaco) => {
              // Dark theme
              monaco.editor.defineTheme("clarityforge-dark", {
                base: "vs-dark", inherit: true,
                rules: [
                  { token: "comment", foreground: "555555", fontStyle: "italic" },
                  { token: "keyword", foreground: "999999" },
                  { token: "string", foreground: "CCCCCC" },
                ],
                colors: {
                  "editor.background": "#0A0A0B", "editor.foreground": "#EBEBE5",
                  "editor.lineHighlightBackground": "#111113", "editor.selectionBackground": "#EBEBE515",
                  "editorCursor.foreground": "#EBEBE5", "editorLineNumber.foreground": "#1E1E20",
                  "editorLineNumber.activeForeground": "#6B6B6B", "editorGutter.background": "#0A0A0B",
                },
              });
              // Light theme
              monaco.editor.defineTheme("clarityforge-light", {
                base: "vs", inherit: true,
                rules: [
                  { token: "comment", foreground: "999999", fontStyle: "italic" },
                  { token: "keyword", foreground: "666666" },
                  { token: "string", foreground: "333333" },
                ],
                colors: {
                  "editor.background": "#FAF8F4", "editor.foreground": "#1A1A1A",
                  "editor.lineHighlightBackground": "#F2EFEA", "editor.selectionBackground": "#1A1A1A15",
                  "editorCursor.foreground": "#1A1A1A", "editorLineNumber.foreground": "#E5E0D8",
                  "editorLineNumber.activeForeground": "#999999", "editorGutter.background": "#FAF8F4",
                },
              });
            }}
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
          <div style={{ width: `${100 - splitRatio}%` }} className="border-l border-line flex flex-col min-h-0 bg-surface-alt">
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
                    <StateVisualizer result={analysisResult as any} costEstimate={(analysisResult as any).costEstimate} sourceCode={code} />
                  ) : viewMode === "interact" && analysisResult ? (
                    <InteractPanel analysisResult={analysisResult} selectedFn={selectedFn} setSelectedFn={setSelectedFn} fnParams={fnParams} setFnParams={setFnParams} execResult={execResult} setExecResult={setExecResult} envMode={envMode} vmStateRef={vmStateRef} selectedAccount={selectedAccount} />
                  ) : (
                    <pre className="font-mono text-xs text-text/80 leading-relaxed whitespace-pre-wrap">{renderOutput(output)}</pre>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full"><p className="text-muted text-xs"><span className="text-text">Run</span> to analyze</p></div>
              )}
            </div>
            {envMode === "vm" && (
              <AccountPanel
                accounts={accounts}
                selectedAccount={selectedAccount}
                onSelectAccount={setSelectedAccount}
                onRefresh={refreshAccounts}
                loading={accountsLoading}
              />
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 h-6 border-t border-line bg-bg text-[10px] font-mono text-muted shrink-0">
        <div className="flex items-center gap-3">
          <span>{activeFile.name}</span>
          {analysisResult && <span className="text-text/60">{(analysisResult as any).valid ? "✓" : "✗"}</span>}
          {analysisResult && (analysisResult as any).vm && <span>{(analysisResult as any).vm}</span>}
          <span className="text-[9px] text-muted/50 capitalize">{envMode}</span>
        </div>
        <div className="flex items-center gap-3">
          {analysisResult && <span>{(analysisResult as any).stats?.totalLines ?? 0} lines</span>}
          <span>Clarity</span>
          <span className="text-[9px] text-muted/50">Ctrl+S to run</span>
        </div>
      </div>
    </div>
  );
}

function InteractPanel({ analysisResult, selectedFn, setSelectedFn, fnParams, setFnParams, execResult, setExecResult, envMode, vmStateRef, selectedAccount }: {
  analysisResult: Record<string, unknown>; selectedFn: string; setSelectedFn: (v: string) => void;
  fnParams: string[]; setFnParams: (v: string[]) => void; execResult: ExecutionResult | null; setExecResult: (v: ExecutionResult | null) => void;
  envMode: string; vmStateRef: MutableRefObject<VmState>; selectedAccount: string;
}) {
  const defs = (analysisResult.definitions ?? []) as any[];
  const fns = getExecutableFunctions(defs);
  const icon = (t: string) => {
    if (t === "check") return "✓";
    if (t === "read") return "◎";
    if (t === "write") return "✎";
    if (t === "transfer") return "→";
    if (t === "emit") return "⚡";
    if (t === "return") return "↩";
    return "•";
  };

  const handleExecute = () => {
    const fn = defs.find((d: any) => d.name === selectedFn);
    if (!fn) return;

    if (envMode === "vm") {
      // Use VM simulator
      const state = JSON.parse(JSON.stringify(vmStateRef.current));
      state.caller = selectedAccount;
      const result = executeInVm(fn, defs, fnParams, state);
      vmStateRef.current = result.state;
      // Convert VmResult to ExecutionResult format
      setExecResult({
        functionName: fn.name,
        params: fnParams,
        steps: result.steps.map(s => ({ type: s.type as any, detail: s.detail, storageAfter: s.storageChange ? { change: s.storageChange } : undefined })),
        returnValue: result.returnValue,
        costEstimate: result.costEstimate,
      });
    } else {
      setExecResult(executeFunction(fn, defs, fnParams));
    }
  };

  if (!fns.length) return <div className="flex items-center justify-center h-full"><p className="text-muted text-xs">No executable functions</p></div>;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] text-muted font-mono uppercase tracking-wider mb-2">Function</p>
        <select value={selectedFn} onChange={(e) => { setSelectedFn(e.target.value); const fn = defs.find((d: any) => d.name === e.target.value); if (fn) setFnParams(getDefaultParams(fn)); setExecResult(null); }}
          className="w-full bg-surface border border-line text-xs text-text px-3 py-2 font-mono focus:outline-none focus:border-text/40">
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
                className="w-full bg-surface border border-line text-xs text-text px-3 py-2 font-mono focus:outline-none focus:border-text/40" placeholder={`param ${i + 1}`} />
            ))}
          </div>
        </div>
      )}
      {selectedFn && (
        <button onClick={handleExecute}
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
    <Suspense fallback={<div className="h-svh flex items-center justify-center text-muted text-sm bg-surface">…</div>}>
      <DemoContent />
    </Suspense>
  );
}
