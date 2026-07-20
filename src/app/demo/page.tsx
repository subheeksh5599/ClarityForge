"use client";

import { Suspense, useState, useEffect, useRef, useCallback, type MutableRefObject } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { editor } from "monaco-editor";
import Nav from "../../components/Nav";
import StateVisualizer from "../../components/StateVisualizer";
import AccountPanel from "../../components/AccountPanel";
import VmTrace from "../../components/VmTrace";
import { useWallet, deployContract } from "../../components/WalletProvider";
import { useTheme } from "../../components/ThemeProvider";
import { TEMPLATES, getTemplate, Template } from "../../lib/clarity/templates";
import { getExecutableFunctions, getDefaultParams, executeFunction, ExecutionResult } from "../../lib/clarity/executor";
import { analyze, AnalysisResult } from "../../lib/clarity/analyzer";
import {
  createVmState, initStateFromContract, executeInVm,
  type VmState, type VmResult, type SimAccount
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
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const dragRef = { current: false };
  const wallet = useWallet();
  const { theme } = useTheme();

  // ── Cursor position ──
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

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

  // Render output with clickable links and copy buttons for deploy artifacts
  const renderOutput = (text: string | null) => {
    if (!text) return null;

    const lines = text.split("\n");
    const hexRegex = /(0x[a-fA-F0-9]{8,})/g;
    const contractRegex = /(ST[1-3A-HJ-NP-Za-km-z]{38,40}\.[\w-]+)/g;

    return (
      <div className="font-mono text-xs text-text/80 leading-relaxed whitespace-pre-wrap">
        {lines.map((line, li) => {
          // Check for deploy artifacts — add copy button
          const hexMatch = line.match(hexRegex);
          const contractMatch = line.match(contractRegex);

          // Render URLs within the line
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          const urlParts = line.split(urlRegex);
          const urlMatches = line.match(urlRegex) || [];
          let uIdx = 0;

          return (
            <span key={li}>
              {urlParts.map((part, pi) => {
                if (pi % 2 === 1) {
                  const url = urlMatches[uIdx++];
                  return (
                    <a key={pi} href={url} target="_blank" rel="noopener noreferrer"
                      className="text-text underline hover:text-text/70"
                      onClick={(e) => e.stopPropagation()}>
                      {url}
                    </a>
                  );
                }
                return part;
              })}
              {hexMatch && hexMatch.map((h, hi) => (
                <CopyButton key={`hex-${li}-${hi}`} text={h} label="tx hash" />
              ))}
              {contractMatch && contractMatch.map((c, ci) => (
                <CopyButton key={`ctr-${li}-${ci}`} text={c} label="contract ID" />
              ))}
              {"\n"}
            </span>
          );
        })}
      </div>
    );
  };

  // ── VM state (Remix-style) ──
  const vmStateRef = useRef<VmState>(createVmState());
  const [, forceUpdate] = useState(0); // trigger VM re-renders
  const updateVmState = (s: VmState) => { vmStateRef.current = s; forceUpdate(v => v + 1); };
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
  const UI_STATE_KEY = "clarityforge-ui";

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

  // Restore UI state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(UI_STATE_KEY);
      if (!saved) return;
      const ui = JSON.parse(saved);
      if (ui.viewMode) setViewMode(ui.viewMode);
      if (typeof ui.rightPanelOpen === "boolean") setRightPanelOpen(ui.rightPanelOpen);
    } catch { /* ignore */ }
  }, []);

  // Save files whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    } catch { /* quota exceeded — silently ignore */ }
  }, [files]);

  // Save UI state whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(UI_STATE_KEY, JSON.stringify({ viewMode, rightPanelOpen }));
    } catch { /* ignore */ }
  }, [viewMode, rightPanelOpen]);

  // Mark file as unsaved when code changes from original
  const markUnsaved = (id: string, code: string, original: string) => {
    setUnsavedFiles((prev) => {
      const next = new Set(prev);
      if (code !== original) next.add(id); else next.delete(id);
      return next;
    });
  };

  const switchTemplate = (t: Template) => {
    // Deduplicate filename
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

  const closeFile = (id: string) => {
    if (files.length <= 1) return;
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      return next;
    });
    // Set active ID outside the updater to avoid nested state calls
    if (activeFileId === id) {
      const remaining = files.filter((f) => f.id !== id);
      setActiveFileId(remaining[0]?.id ?? "");
    }
  };

  const addNewFile = () => {
    const name = window.prompt("File name:", "untitled.clar");
    if (!name) return;
    const resolved = name.endsWith(".clar") ? name : `${name}.clar`;
    // Deduplicate
    let finalName = resolved;
    let counter = 1;
    while (files.some((f) => f.name === finalName)) {
      const base = resolved.replace(/\.clar$/, "");
      finalName = `${base}-${counter}.clar`;
      counter++;
    }
    const f: FileTab = { id: nextFileId(), name: finalName, code: ";; New Clarity contract\n" };
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
        updateVmState(state);

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

  // Keyboard shortcuts (uses ref to avoid stale closures)
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

    // If wallet is connected, do real deployment
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
                f.id === activeFileId ? "text-text bg-surface border-b border-b-surface -mb-px" : "text-muted/60 hover:text-text hover:bg-text/[0.02]"
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
      <div className="flex items-center justify-between px-4 h-9 border-b border-line bg-bg shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted/60 font-mono">{activeFile.name}</span>
          {/* Environment selector */}
          <div className="flex items-center border border-line rounded-sm">
            {(["vm", "clarinet", "deploy"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setEnvMode(m)}
                className={`text-[10px] font-mono px-2.5 py-1 transition-colors ${
                  envMode === m
                    ? "bg-text/10 text-text"
                    : "text-muted/60 hover:text-text hover:bg-text/[0.03]"
                } ${m !== "vm" ? "border-l border-line" : ""}`}
              >
                {m === "vm" ? "VM" : m === "clarinet" ? "Clarinet" : "Deploy"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={handleRun} disabled={running}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-medium transition-colors ${
              running
                ? "text-muted/40 cursor-not-allowed"
                : "text-bg bg-text hover:bg-text/85 active:bg-text/70"
            }`}>
            ▶ {running ? "Running…" : envMode === "vm" ? "Run" : "Check"}
          </button>
          <button onClick={handleDeploy} disabled={deploying}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-medium border border-line transition-colors ${
              deploying
                ? "text-muted/40 cursor-not-allowed border-muted/20"
                : "text-text hover:border-text/30 hover:bg-text/[0.03] active:bg-text/[0.05]"
            }`}>
            ↑ {deploying ? "Deploying…" : "Deploy"}
          </button>
          <button
            onClick={wallet.connected ? wallet.disconnectWallet : wallet.connectWallet}
            disabled={wallet.connecting}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border border-line transition-colors ${
              wallet.connected
                ? "border-text/20 text-text hover:border-text/40 hover:bg-text/[0.03]"
                : "text-muted hover:text-text hover:border-text/20 hover:bg-text/[0.03]"
            }`}
            title={wallet.connected ? `Connected: ${wallet.address?.slice(0, 8)}…` : "Connect wallet for real deployment"}
          >
            {wallet.connecting ? "Connecting…" : wallet.connected ? "◉ Wallet" : "○ Connect"}
          </button>
          <button onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border border-line text-muted hover:text-text hover:border-text/20 hover:bg-text/[0.03] transition-colors">
            ↓ Save
          </button>
          <button onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="px-2 py-1.5 text-[11px] text-muted/60 hover:text-text font-mono transition-colors"
            title={rightPanelOpen ? "Close panel" : "Open panel"}>
            {rightPanelOpen ? "◢" : "◰"}
          </button>
        </div>
      </div>

      {/* Editor + Panel */}
      <div id="ide-container" className="flex-1 flex min-h-0">
        <div style={{ width: rightPanelOpen ? `${splitRatio}%` : "100%" }}>
          <MonacoEditor key={activeFileId} language="clarity" theme={theme === "dark" ? "clarityforge-dark" : "clarityforge-light"} value={code} onChange={(v) => setCode(v || "")}
            onMount={(editor) => { handleEditorMount(editor); }}
            beforeMount={(monaco) => {
              // Register Clarity language (guarded against HMR re-registration)
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
                    <InteractPanel analysisResult={analysisResult} selectedFn={selectedFn} setSelectedFn={setSelectedFn} fnParams={fnParams} setFnParams={setFnParams} execResult={execResult} setExecResult={setExecResult} envMode={envMode} vmStateRef={vmStateRef} selectedAccount={selectedAccount} onVmStateChange={updateVmState} />
                  ) : (
                    <pre className="font-mono text-xs text-text/80 leading-relaxed whitespace-pre-wrap">{renderOutput(output)}</pre>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full px-6 py-12">
                  <div className="text-center mb-8">
                    <p className="text-sm font-medium text-text mb-2">Welcome to ClarityForge</p>
                    <p className="text-xs text-muted/60 max-w-xs leading-relaxed">
                      Your code is loaded and ready. Click <span className="text-text font-mono">Run</span> to analyze and execute, or pick a different template below.
                    </p>
                  </div>
                  <p className="text-[10px] text-muted/40 font-mono uppercase tracking-[0.15em] mb-4 self-start">
                    Templates
                  </p>
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
                  <p className="text-[10px] text-muted/30 mt-6">
                    Ctrl+S to analyze · Ctrl+Enter to run
                  </p>
                </div>
              )}
            </div>
            {envMode === "vm" && (
              <AccountPanel
                accounts={accounts}
                selectedAccount={selectedAccount}
                onSelectAccount={setSelectedAccount}
                onRefresh={refreshAccounts}
                loading={accountsLoading}
                vmState={vmStateRef.current}
              />
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 h-6 border-t border-line bg-bg text-[10px] font-mono shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-muted/60">{activeFile.name}</span>
          {analysisResult && (
            <span className={analysisResult && (analysisResult as any).valid ? "text-green-500/60" : "text-red-400/60"}>
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
          <span className="text-muted/40">{envMode === "vm" ? "VM" : envMode === "clarinet" ? "Clarinet" : "Deploy"}</span>
          <span className="text-muted/30">{files.length} file{files.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}

function InteractPanel({ analysisResult, selectedFn, setSelectedFn, fnParams, setFnParams, execResult, setExecResult, envMode, vmStateRef, selectedAccount, onVmStateChange }: {
  analysisResult: Record<string, unknown>; selectedFn: string; setSelectedFn: (v: string) => void;
  fnParams: string[]; setFnParams: (v: string[]) => void; execResult: ExecutionResult | null; setExecResult: (v: ExecutionResult | null) => void;
  envMode: string; vmStateRef: MutableRefObject<VmState>; selectedAccount: string;
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
      state.caller = selectedAccount;
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
      {/* Function selector */}
      <div>
        <label className="text-[10px] text-muted/50 font-mono uppercase tracking-[0.12em] mb-2 block">
          Function
        </label>
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
            <option key={f.name} value={f.name}>
              {f.name} ({f.type === "public-fn" ? "public" : "read-only"})
            </option>
          ))}
        </select>
      </div>

      {/* Parameter inputs */}
      {selectedFn && selectedDef?.params?.length > 0 && (
        <div>
          <label className="text-[10px] text-muted/50 font-mono uppercase tracking-[0.12em] mb-2 block">
            Parameters
          </label>
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

      {/* Execute button */}
      {selectedFn && (
        <button
          onClick={handleExecute}
          className="w-full py-2.5 text-[11px] font-medium text-bg bg-text hover:bg-text/85 active:bg-text/70 transition-colors"
        >
          ▶ Execute {selectedFn}
        </button>
      )}

      {/* Trace output */}
      {execResult && (
        <div className="border-t border-line pt-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-[10px] text-muted/50 font-mono uppercase tracking-[0.12em]">
              Trace
            </label>
            <span className="text-[10px] text-muted/30 font-mono">
              {execResult.steps.length} step{execResult.steps.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-1">
            {execResult.steps.map((s, i) => (
              <div
                key={i}
                className={`flex items-start gap-2.5 px-3 py-2 text-[11px] rounded-sm ${
                  s.type === "return"
                    ? "bg-text/[0.04] border border-text/[0.06]"
                    : s.type === "error"
                    ? "bg-red-500/[0.06] border border-red-500/[0.12]"
                    : ""
                }`}
              >
                <span className="mt-px w-4 text-center font-mono text-muted/50 shrink-0 select-none">
                  {stepIcon(s.type)}
                </span>
                <span className="text-text/75 font-mono leading-relaxed">{s.detail}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-line flex justify-between text-[11px]">
            <span className="text-muted/50 font-mono">Cost</span>
            <span className="text-text font-mono tabular-nums">
              {execResult.costEstimate.toLocaleString()} µSTX
            </span>
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
