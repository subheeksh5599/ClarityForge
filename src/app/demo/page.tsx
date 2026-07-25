"use client";

import { Suspense, useState, useEffect, useRef, useCallback, type MutableRefObject } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { editor } from "monaco-editor";
import Nav from "../../components/Nav";
import StateVisualizer from "../../components/StateVisualizer";
import FileExplorer from "../../components/FileExplorer";
import { useWallet, deployContract } from "../../components/WalletProvider";
import { useTheme } from "../../components/ThemeProvider";
import { TEMPLATES, getTemplate, Template } from "../../lib/clarity/templates";
import { getExecutableFunctions, getDefaultParams, executeFunction, ExecutionResult } from "../../lib/clarity/executor";
import { analyze, AnalysisResult } from "../../lib/clarity/analyzer";
import {
  createVmState, initStateFromContract, executeInVm,
  type VmState, type VmResult
} from "../../lib/clarity/vm";
import { CLARITY_LANGUAGE, CLARITY_COMPLETIONS } from "../../lib/clarity/monaco-language";
import { SkeletonEditor } from "../../components/ui/skeleton";
import { CopyButton } from "../../components/ui/copy-button";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface FileTab { id: string; name: string; code: string; }

let fileIdCounter = 0;
function nextFileId() { return `file-${++fileIdCounter}`; }

function DemoContent() {
  const searchParams = useSearchParams();
  const initialSlug = searchParams.get("template") ?? "token";
  const initialTemplate = getTemplate(initialSlug) ?? (() => {
    try {
      const raw = localStorage.getItem("clarityforge-custom-templates");
      if (raw) {
        const custom: Template[] = JSON.parse(raw);
        const found = custom.find((t) => t.slug === initialSlug);
        if (found) return found;
      }
    } catch { /* ignore */ }
    return TEMPLATES[0];
  })();

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
  const [splitRatio, setSplitRatio] = useState(65);
  const [unsavedFiles, setUnsavedFiles] = useState<Set<string>>(new Set());
  const [showHelp, setShowHelp] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const dragRef = { current: false };
  const wallet = useWallet();
  const { theme } = useTheme();

  // ── Cursor position ──
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  // ── Share snippet ──
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    try {
      const hash = window.location.hash?.slice(1);
      if (!hash || hash.startsWith("template=")) return;
      const decoded = decodeURIComponent(atob(hash));
      if (decoded && decoded.trim().length > 0 && decoded !== code) {
        const newFile: FileTab = { id: nextFileId(), name: "shared.clar", code: decoded };
        setFiles((prev) => [...prev, newFile]);
        setActiveFileId(newFile.id);
      }
    } catch { /* invalid hash */ }
  }, []);

  const handleShare = () => {
    try {
      const encoded = btoa(encodeURIComponent(code));
      const url = `${window.location.origin}/demo#${encoded}`;
      navigator.clipboard.writeText(url).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }).catch(() => {
        window.location.hash = encoded;
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      });
    } catch { /* ignore */ }
  };

  const handleEditorMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({ line: e.position.lineNumber, col: e.position.column });
    });
  };

  const navigateToLine = (line: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.revealLineInCenter(line);
    editor.setPosition({ lineNumber: line, column: 1 });
    editor.focus();
  };

  // ── Undo / Redo ──
  const handleUndo = () => editorRef.current?.trigger("keyboard", "undo", null);
  const handleRedo = () => editorRef.current?.trigger("keyboard", "redo", null);
  const handleFormat = () => editorRef.current?.getAction("editor.action.formatDocument")?.run();

  // ── VM state ──
  const vmStateRef = useRef<VmState>(createVmState());
  const [, forceUpdate] = useState(0);
  const updateVmState = (s: VmState) => { vmStateRef.current = s; forceUpdate(v => v + 1); };

  const [envMode, setEnvMode] = useState<"vm" | "clarinet" | "deploy">("vm");
  const [vmResult, setVmResult] = useState<VmResult | null>(null);

  // ── localStorage persistence ──
  const STORAGE_KEY = "clarityforge-files";
  const UI_STATE_KEY = "clarityforge-ui";

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed: FileTab[] = JSON.parse(saved);
      if (parsed.length > 0) {
        setFiles(parsed);
        setActiveFileId(parsed[0].id);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(UI_STATE_KEY);
      if (!saved) return;
      const ui = JSON.parse(saved);
      if (ui.viewMode) setViewMode(ui.viewMode);
      if (typeof ui.rightPanelOpen === "boolean") setRightPanelOpen(ui.rightPanelOpen);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(files)); } catch { /* ignore */ }
  }, [files]);

  useEffect(() => {
    try { localStorage.setItem(UI_STATE_KEY, JSON.stringify({ viewMode, rightPanelOpen })); } catch { /* ignore */ }
  }, [viewMode, rightPanelOpen]);

  // ── File operations ──
  const handleAddFile = (name: string) => {
    const f: FileTab = { id: nextFileId(), name, code: ";; New Clarity contract\n" };
    setFiles((prev) => [...prev, f]);
    setActiveFileId(f.id);
  };

  const handleRenameFile = (id: string, name: string) => {
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, name } : f));
  };

  const handleDeleteFile = (id: string) => {
    if (files.length <= 1) return;
    const remaining = files.filter((f) => f.id !== id);
    setFiles(remaining);
    if (activeFileId === id) {
      setActiveFileId(remaining[0]?.id ?? "");
    }
  };

  const switchTemplate = (t: Template) => {
    let baseName = `${t.slug}.clar`;
    let name = baseName;
    let counter = 1;
    while (files.some((f) => f.name === name)) {
      name = `${t.slug}-${counter}.clar`;
      counter++;
    }
    const newFile: FileTab = { id: nextFileId(), name, code: t.code };
    setFiles((prev) => [...prev, newFile]);
    setActiveFileId(newFile.id);
    setViewMode("visual");
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const setEditorMarkers = useCallback((diagnostics: { line: number; col: number; message: string; severity: string }[]) => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;
    const monaco = (window as any).monaco;
    if (!monaco) return;
    const markers: editor.IMarkerData[] = diagnostics.map((d) => {
      const lineContent = model.getLineContent(d.line) || "";
      const endCol = lineContent.length > 0 ? lineContent.length + 1 : d.col + 1;
      return {
        severity: d.severity === "error" ? monaco.MarkerSeverity.Error
          : d.severity === "warning" ? monaco.MarkerSeverity.Warning
          : monaco.MarkerSeverity.Info,
        message: d.message,
        startLineNumber: d.line,
        startColumn: Math.max(1, d.col),
        endLineNumber: d.line,
        endColumn: Math.max(d.col + 1, endCol),
      };
    });
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

  // ── Real-time error squiggles (debounced analysis on every keystroke) ──
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!editorRef.current) return;
      const result = analyze(code);
      if (result.diagnostics.length > 0) {
        setEditorMarkers(result.diagnostics);
      } else {
        clearEditorMarkers();
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [code]);

  // ── Run ──
  const handleRun = async () => {
    setRunning(true); setOutput(null); setTxHash(null); setVmResult(null);

    if (envMode === "vm") {
      try {
        const analysisResult = analyze(code);
        setAnalysisResult(analysisResult as unknown as Record<string, unknown>);

        const state = initStateFromContract(
          JSON.parse(JSON.stringify(vmStateRef.current)),
          analysisResult.definitions
        );
        state.caller = "STAM1Q5N8TWU6BP3HE0AEBKHJWZGDDMCF6SZNR348"; // default account
        updateVmState(state);

        // Push error squiggles
        if (analysisResult.diagnostics?.length) {
          setEditorMarkers(analysisResult.diagnostics);
        } else {
          clearEditorMarkers();
        }

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
          updateVmState(result.state);
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
      const endpoint = envMode === "clarinet" ? "/api/execute" : "/api/analyze";
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Request failed" })); setOutput(`✗ ${err.error || `HTTP ${res.status}`}`); setRunning(false); return; }
      const data = await res.json(); setAnalysisResult(data);
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
  const handleRunRef = useRef(handleRun);
  handleRunRef.current = handleRun;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleRunRef.current(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleRunRef.current(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleDeploy = async () => {
    setDeploying(true); setTxHash(null);

    if (wallet.connected) {
      try {
        const contractName = activeFile.name.replace(".clar", "").replace(/[^a-zA-Z0-9_-]/g, "-");
        const result = await deployContract(code, contractName);
        if (result.error) {
          setOutput(`✗ ${result.error}`);
          setDeploying(false);
          return;
        }
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

      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 h-9 border-b border-line bg-bg shrink-0">
        {/* Undo / Redo */}
        <button onClick={handleUndo} className="px-1.5 py-1 text-[11px] text-muted/50 hover:text-text font-mono transition-colors" title="Undo (Ctrl+Z)">↩</button>
        <button onClick={handleRedo} className="px-1.5 py-1 text-[11px] text-muted/50 hover:text-text font-mono transition-colors" title="Redo (Ctrl+Shift+Z)">↪</button>
        <button onClick={handleFormat} className="px-1.5 py-1 text-[11px] text-muted/50 hover:text-text font-mono transition-colors" title="Format code (Shift+Alt+F)">{ }</button>

        <span className="w-px h-4 bg-line mx-1" />

        {/* Environment selector */}
        <div className="flex items-center border border-line rounded-sm">
          {(["vm", "clarinet", "deploy"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setEnvMode(m)}
              className={`text-[10px] font-mono px-2 py-1 transition-colors ${
                envMode === m
                  ? "bg-text/10 text-text"
                  : "text-muted/60 hover:text-text hover:bg-text/[0.03]"
              } ${m !== "vm" ? "border-l border-line" : ""}`}
            >
              {m === "vm" ? "VM" : m === "clarinet" ? "Clarinet" : "Deploy"}
            </button>
          ))}
        </div>

        <button onClick={handleRun} disabled={running}
          className={`flex items-center gap-1 px-3 py-1 text-[11px] font-medium transition-colors ${
            running ? "text-muted/40 cursor-not-allowed" : "text-bg bg-text hover:bg-text/85 active:bg-text/70"
          }`}>
          ▶ {running ? "…" : envMode === "vm" ? "Run" : "Check"}
        </button>
        <button onClick={handleDeploy} disabled={deploying}
          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-line transition-colors ${
            deploying ? "text-muted/40 cursor-not-allowed border-muted/20" : "text-text hover:border-text/30 hover:bg-text/[0.03]"
          }`}>
          ↑ {deploying ? "…" : "Deploy"}
        </button>
        <button onClick={handleShare}
          className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium border border-line transition-colors ${
            shareCopied ? "text-green-400 border-green-500/30" : "text-muted hover:text-text hover:border-text/20 hover:bg-text/[0.03]"
          }`}
          title="Copy shareable link">
          {shareCopied ? "✓" : "↗"}
        </button>

        <span className="flex-1" />

        <button onClick={handleDownload}
          className="px-2 py-1 text-[11px] text-muted hover:text-text font-mono transition-colors"
          title="Download .clar file">↓</button>
        <button onClick={() => setShowHelp(!showHelp)}
          className={`px-2 py-1 text-[11px] font-mono transition-colors ${showHelp ? "text-text" : "text-muted/50 hover:text-text"}`}
          title="Clarity reference">?</button>
        <button onClick={() => setRightPanelOpen(!rightPanelOpen)}
          className="px-1.5 py-1 text-[11px] text-muted/50 hover:text-text font-mono transition-colors"
          title={rightPanelOpen ? "Close panel" : "Open panel"}>
          {rightPanelOpen ? "◢" : "◰"}
        </button>
      </div>

      {/* Help panel */}
      {showHelp && (
        <div className="border-b border-line bg-surface-alt px-4 py-3 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-muted/60 uppercase tracking-[0.12em]">Clarity Reference</span>
            <button onClick={() => setShowHelp(false)} className="text-muted/40 hover:text-text text-xs">×</button>
          </div>
          <div className="grid grid-cols-4 gap-x-6 gap-y-2 text-[11px] font-mono">
            <div>
              <p className="text-text/80 mb-1">Tokens</p>
              <p className="text-muted/50">define-fungible-token</p>
              <p className="text-muted/50">define-non-fungible-token</p>
              <p className="text-muted/50">ft-transfer?</p>
              <p className="text-muted/50">ft-get-balance</p>
              <p className="text-muted/50">ft-mint?</p>
              <p className="text-muted/50">nft-mint?</p>
              <p className="text-muted/50">nft-transfer?</p>
              <p className="text-muted/50">nft-get-owner?</p>
            </div>
            <div>
              <p className="text-text/80 mb-1">Functions</p>
              <p className="text-muted/50">define-public</p>
              <p className="text-muted/50">define-read-only</p>
              <p className="text-muted/50">define-private</p>
              <p className="text-muted/50">begin</p>
              <p className="text-muted/50">try!</p>
              <p className="text-muted/50">ok / err</p>
              <p className="text-muted/50">unwrap!</p>
              <p className="text-muted/50">asserts!</p>
            </div>
            <div>
              <p className="text-text/80 mb-1">Storage</p>
              <p className="text-muted/50">define-data-var</p>
              <p className="text-muted/50">define-map</p>
              <p className="text-muted/50">var-get</p>
              <p className="text-muted/50">var-set</p>
              <p className="text-muted/50">map-get?</p>
              <p className="text-muted/50">map-set</p>
              <p className="text-muted/50">map-delete</p>
              <p className="text-muted/50">map-insert</p>
            </div>
            <div>
              <p className="text-text/80 mb-1">Types</p>
              <p className="text-muted/50">uint</p>
              <p className="text-muted/50">int</p>
              <p className="text-muted/50">bool</p>
              <p className="text-muted/50">principal</p>
              <p className="text-muted/50">buff</p>
              <p className="text-muted/50">string-ascii</p>
              <p className="text-muted/50">string-utf8</p>
              <p className="text-muted/50">list / tuple / optional</p>
            </div>
          </div>
        </div>
      )}

      {/* Main area: File Explorer + Editor + Panel */}
      <div id="ide-container" className="flex-1 flex min-h-0">
        {/* File Explorer sidebar */}
        <FileExplorer
          files={files}
          activeFileId={activeFileId}
          onSelectFile={setActiveFileId}
          onAddFile={handleAddFile}
          onRenameFile={handleRenameFile}
          onDeleteFile={handleDeleteFile}
          unsavedFiles={unsavedFiles}
        />

        {/* Editor area */}
        <div className="flex-1 flex min-w-0">
          <div style={{ width: rightPanelOpen ? `${splitRatio}%` : "100%" }}>
            <MonacoEditor key={activeFileId} language="clarity" theme={theme === "dark" ? "clarityforge-dark" : "clarityforge-light"} value={code} onChange={(v) => setCode(v || "")}
              onMount={(editor) => { handleEditorMount(editor); }}
              beforeMount={(monaco) => {
                const existing = monaco.languages.getLanguages().find((l: { id: string }) => l.id === "clarity");
                if (!existing) {
                  monaco.languages.register({ id: "clarity", extensions: [".clar"], aliases: ["Clarity"] });
                  monaco.languages.setMonarchTokensProvider("clarity", CLARITY_LANGUAGE);
                  monaco.languages.registerCompletionItemProvider("clarity", {
                    provideCompletionItems: () => ({
                      suggestions: CLARITY_COMPLETIONS.map((c) => ({
                        label: c.label,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: c.insertText,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        detail: c.detail,
                      })),
                    }),
                  });
                }

                // Register formatter for Clarity (auto-indent based on paren depth)
                monaco.languages.registerDocumentFormattingEditProvider("clarity", {
                  provideDocumentFormattingEdits: (model: editor.ITextModel) => {
                    const lines = model.getValue().split("\n");
                    const formatted: string[] = [];
                    let indent = 0;

                    for (const raw of lines) {
                      const line = raw.trim();
                      if (line === "") { formatted.push(""); continue; }

                      let closeCount = 0;
                      while (line[closeCount] === ")") closeCount++;
                      if (closeCount > 0) indent = Math.max(0, indent - closeCount);

                      formatted.push("  ".repeat(indent) + line);

                      let opens = 0, closes = 0;
                      for (const ch of line) {
                        if (ch === "(") opens++;
                        if (ch === ")") closes++;
                      }
                      indent = Math.max(0, indent + opens - closes);
                    }

                    return [
                      {
                        range: model.getFullModelRange(),
                        text: formatted.join("\n") + "\n",
                      },
                    ];
                  },
                });

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
              loading={<SkeletonEditor />} />
          </div>

          {rightPanelOpen && (
            <div onMouseDown={() => { dragRef.current = true; }}
              className="w-1.5 shrink-0 bg-line hover:bg-text/20 cursor-col-resize transition-colors relative">
              <div className="absolute inset-y-0 -left-1 -right-1" />
            </div>
          )}

          {rightPanelOpen && (
            <div style={{ width: `${100 - splitRatio}%` }} className="border-l border-line flex flex-col min-h-0 bg-surface-alt">
              <div className="flex items-center border-b border-line shrink-0">
                {(["visual", "interact", "text"] as const).map((m) => (
                  <button key={m} onClick={() => setViewMode(m)}
                    className={`px-3 py-2 text-[11px] font-mono capitalize border-b-2 -mb-px transition-colors ${viewMode === m ? "text-text border-text" : "text-muted/50 border-transparent hover:text-muted hover:border-muted/30"}`}>{m}</button>
                ))}
              </div>
              <div className="flex-1 overflow-auto p-6">
                {output ? (
                  <div>
                    {txHash && <div className="mb-4 pb-4 border-b border-line"><p className="text-[10px] text-muted font-mono uppercase tracking-wider mb-0.5">Deployment</p><p className="font-mono text-[10px] text-muted">{wallet.connected ? "Testnet via Leather/Xverse" : "Simulated"}</p></div>}
                    {viewMode === "visual" && analysisResult ? (
                      <StateVisualizer result={analysisResult as any} costEstimate={(analysisResult as any).costEstimate} sourceCode={code} onNavigateToLine={navigateToLine} />
                    ) : viewMode === "interact" && analysisResult ? (
                      <InteractPanel analysisResult={analysisResult} selectedFn={selectedFn} setSelectedFn={setSelectedFn} fnParams={fnParams} setFnParams={setFnParams} execResult={execResult} setExecResult={setExecResult} envMode={envMode} vmStateRef={vmStateRef} onVmStateChange={updateVmState} />
                    ) : (
                      <pre className="font-mono text-xs text-text/80 leading-relaxed whitespace-pre-wrap">{output}</pre>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full px-6 py-12">
                    <div className="text-center mb-8">
                      <p className="text-sm font-medium text-text mb-2">Welcome to ClarityForge</p>
                      <p className="text-xs text-muted/60 max-w-xs leading-relaxed">
                        Click <span className="text-text font-mono">▶ Run</span> to analyze and execute, or pick a template below.
                      </p>
                    </div>
                    <p className="text-[10px] text-muted/40 font-mono uppercase tracking-[0.15em] mb-4 self-start">Templates</p>
                    <div className="grid grid-cols-2 gap-1.5 w-full">
                      {TEMPLATES.map((t) => (
                        <button
                          key={t.slug}
                          onClick={() => switchTemplate(t)}
                          className={`text-left px-3 py-2.5 border border-line rounded-sm hover:bg-text/[0.03] hover:border-text/20 transition-colors ${
                            activeFile.name === `${t.slug}.clar` ? "border-text/30 bg-text/[0.02]" : ""
                          }`}
                        >
                          <span className="text-text text-[12px] font-mono block truncate">{t.name}</span>
                          <span className="text-muted/50 text-[10px]">{t.tag}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted/30 mt-6">Ctrl+S to analyze · Ctrl+Enter to run</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 h-6 border-t border-line bg-bg text-[10px] font-mono shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-muted/60">{activeFile.name}</span>
          {analysisResult && (
            <span className={(analysisResult as any).valid ? "text-green-500/60" : "text-red-400/60"}>
              {(analysisResult as any).valid ? "✓" : "✗"}
            </span>
          )}
          {analysisResult && (analysisResult as any).vm && (
            <span className="text-muted/40">{(analysisResult as any).vm}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-muted/40">Ln {cursorPos.line}, Col {cursorPos.col}</span>
          {analysisResult && <span className="text-muted/40">{(analysisResult as any).stats?.totalLines ?? 0} lines</span>}
          <span className="text-muted/40">{envMode}</span>
          <span className="text-muted/30">{files.length} file{files.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}

function InteractPanel({ analysisResult, selectedFn, setSelectedFn, fnParams, setFnParams, execResult, setExecResult, envMode, vmStateRef, onVmStateChange }: {
  analysisResult: Record<string, unknown>; selectedFn: string; setSelectedFn: (v: string) => void;
  fnParams: string[]; setFnParams: (v: string[]) => void; execResult: ExecutionResult | null; setExecResult: (v: ExecutionResult | null) => void;
  envMode: string; vmStateRef: MutableRefObject<VmState>;
  onVmStateChange: (s: VmState) => void;
}) {
  const defs = (analysisResult.definitions ?? []) as any[];
  const fns = getExecutableFunctions(defs);
  const selectedDef = defs.find((d: any) => d.name === selectedFn);

  const stepIcon = (t: string) => {
    switch (t) {
      case "check": return "✓";
      case "read": return "◎";
      case "write": return "✎";
      case "transfer": return "→";
      case "emit": return "⚡";
      case "return": return "↩";
      default: return "•";
    }
  };

  const handleExecute = () => {
    const fn = defs.find((d: any) => d.name === selectedFn);
    if (!fn) return;

    if (envMode === "vm") {
      const state = JSON.parse(JSON.stringify(vmStateRef.current));
      state.caller = "STAM1Q5N8TWU6BP3HE0AEBKHJWZGDDMCF6SZNR348";
      const result = executeInVm(fn, defs, fnParams, state);
      onVmStateChange(result.state);
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

  if (!fns.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <p className="text-xs text-muted/50 font-mono">No executable functions</p>
        <p className="text-[10px] text-muted/30">Add a define-public or define-read-only function</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="text-[10px] text-muted/50 font-mono uppercase tracking-[0.12em] mb-2 block">Function</label>
        <select
          value={selectedFn}
          onChange={(e) => {
            setSelectedFn(e.target.value);
            const fn = defs.find((d: any) => d.name === e.target.value);
            if (fn) setFnParams(getDefaultParams(fn));
            setExecResult(null);
          }}
          className="w-full bg-surface border border-line text-xs text-text px-3 py-2 font-mono focus:outline-none focus:border-text/30 transition-colors appearance-none cursor-pointer"
        >
          <option value="">Select a function…</option>
          {fns.map((f: any) => (
            <option key={f.name} value={f.name}>{f.name} ({f.type === "public-fn" ? "public" : "read-only"})</option>
          ))}
        </select>
      </div>

      {selectedFn && selectedDef?.params?.length > 0 && (
        <div>
          <label className="text-[10px] text-muted/50 font-mono uppercase tracking-[0.12em] mb-2 block">Parameters</label>
          <div className="space-y-2">
            {selectedDef.params.map((p: { name: string; type: string }, i: number) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-text/80 font-mono">{p.name}</span>
                  <span className="text-[9px] text-muted/40 font-mono">{p.type}</span>
                </div>
                <input
                  value={fnParams[i] ?? ""}
                  onChange={(e) => {
                    const n = [...fnParams];
                    n[i] = e.target.value;
                    setFnParams(n);
                  }}
                  className="w-full bg-surface border border-line text-xs text-text px-3 py-2 font-mono focus:outline-none focus:border-text/30 transition-colors"
                  placeholder={`Enter ${p.name}…`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedFn && (
        <button
          onClick={handleExecute}
          className="w-full py-2.5 text-[11px] font-medium text-bg bg-text hover:bg-text/85 active:bg-text/70 transition-colors"
        >
          ▶ Execute {selectedFn}
        </button>
      )}

      {execResult && (
        <div className="border-t border-line pt-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-[10px] text-muted/50 font-mono uppercase tracking-[0.12em]">Trace</label>
            <span className="text-[10px] text-muted/30 font-mono">{execResult.steps.length} step{execResult.steps.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="space-y-1">
            {execResult.steps.map((s, i) => (
              <div
                key={i}
                className={`flex items-start gap-2.5 px-3 py-2 text-[11px] rounded-sm ${
                  s.type === "return" ? "bg-text/[0.04] border border-text/[0.06]"
                    : s.type === "error" ? "bg-red-500/[0.06] border border-red-500/[0.12]"
                    : ""
                }`}
              >
                <span className="mt-px w-4 text-center font-mono text-muted/50 shrink-0 select-none">{stepIcon(s.type)}</span>
                <span className="text-text/75 font-mono leading-relaxed">{s.detail}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-line flex justify-between text-[11px]">
            <span className="text-muted/50 font-mono">Cost</span>
            <span className="text-text font-mono tabular-nums">{execResult.costEstimate.toLocaleString()} µSTX</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Demo() {
  return (
    <Suspense fallback={<SkeletonEditor />}>
      <DemoContent />
    </Suspense>
  );
}
