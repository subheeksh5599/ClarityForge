"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import StateVisualizer from "../../components/StateVisualizer";
import { TEMPLATES, getTemplate, Template } from "../../lib/clarity/templates";

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
  const [viewMode, setViewMode] = useState<"text" | "visual">("visual");
  const [running, setRunning] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    setCode(template.code);
    setOutput(null);
    setTxHash(null);
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

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setOutput(`✗ Error: ${err.error || `HTTP ${res.status}`}`);
        setRunning(false);
        return;
      }

      const data = await res.json();
      setAnalysisResult(data);
      const lines: string[] = [];

      lines.push(data.valid ? "✓ Contract analysis complete" : "✗ Contract has errors");
      lines.push("");

      if (data.definitions?.length) {
        lines.push("Defined:");
        for (const d of data.definitions) {
          const label =
            d.type === "fungible-token" ? "Fungible token" :
            d.type === "non-fungible-token" ? "Non-fungible token" :
            d.type === "public-fn" ? "Public function" :
            d.type === "read-only-fn" ? "Read-only function" :
            d.type === "private-fn" ? "Private function" :
            d.type === "data-var" ? "Data variable" :
            d.type === "map" ? "Data map" :
            d.type === "constant" ? "Constant" :
            d.type === "trait" ? "Trait" : d.type;
          lines.push(`  • ${label}: ${d.name} (line ${d.line})`);
        }
        lines.push("");
      }

      if (data.stats) {
        lines.push(`Lines: ${data.stats.totalLines}`);
        lines.push(`Functions: ${data.stats.functions}`);
        lines.push(`Data vars: ${data.stats.dataVars}`);
        lines.push(`Maps: ${data.stats.maps}`);
        lines.push(`Tokens: ${data.stats.tokens}`);
        lines.push("");
      }

      if (data.diagnostics?.length) {
        for (const d of data.diagnostics) {
          const icon = d.severity === "error" ? "✗" : d.severity === "warning" ? "⚠" : "ℹ";
          lines.push(`${icon} Line ${d.line}: ${d.message}`);
        }
        lines.push("");
      }

      if (data.costEstimate) {
        lines.push(`Cost estimate: ${data.costEstimate.toLocaleString()} microSTX`);
      }

      if (data.valid) {
        lines.push("");
        lines.push("→ Ready for testnet deployment");
      }

      setOutput(lines.join("\n"));
    } catch (e) {
      setOutput(`✗ Analysis failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    }

    setRunning(false);
  };

  const handleDeploy = async () => {
    setDeploying(true);
    setTxHash(null);

    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (res.ok && data.txHash) {
        setTxHash(data.txHash);
        setOutput(
          `✓ Deployment simulated successfully\n\n` +
            `This is a simulation — real deployment requires wallet\n` +
            `integration (planned for Phase 2).\n\n` +
            `Network: Stacks testnet\n` +
            `Contract: ${data.contractId ?? "N/A"}\n` +
            `Simulated tx: ${data.txHash.slice(0, 20)}...\n\n` +
            `→ Ready for real deployment when wallet\n` +
            `   integration is complete`
        );
      } else {
        setOutput(`✗ Deploy failed: ${data.error || "Unknown error"}`);
      }
    } catch (e) {
      setOutput(`✗ Deploy failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    }

    setDeploying(false);
  };

  return (
    <>
      <Nav />
      <main className="min-h-screen pt-24 pb-20 px-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] mb-12">
            Write Clarity right now.
          </h1>

          <div className="border border-line rounded-sm overflow-hidden bg-[#0A0A0B]">
            <div className="flex items-center justify-between px-5 h-12 border-b border-line">
              <div className="flex items-center overflow-x-auto">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.slug}
                    onClick={() => setTemplate(t)}
                    className={`px-4 py-3 text-xs font-mono whitespace-nowrap transition-colors border-b-2 -mb-px ${
                      template.slug === t.slug
                        ? "text-text border-text"
                        : "text-muted border-transparent hover:text-text"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleRun}
                  disabled={running}
                  className={`flex items-center gap-2 px-5 py-1.5 text-xs font-medium transition-colors ${
                    running
                      ? "text-muted cursor-wait"
                      : "text-bg bg-text hover:bg-text/90"
                  }`}
                >
                  ▶ {running ? "Running…" : "Run"}
                </button>
                <button
                  onClick={handleDeploy}
                  disabled={deploying}
                  className={`flex items-center gap-2 px-5 py-1.5 text-xs font-medium transition-colors border border-line ${
                    deploying
                      ? "text-muted cursor-wait"
                      : "text-text hover:bg-text/5"
                  }`}
                >
                  ↑ {deploying ? "Deploying…" : "Deploy"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-line">
              <div className="h-[520px]">
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
                        "editor.lineHighlightBackground": "#141416",
                        "editor.selectionBackground": "#EBEBE515",
                        "editorCursor.foreground": "#EBEBE5",
                        "editorLineNumber.foreground": "#2A2A2C",
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
                    padding: { top: 24, bottom: 24 },
                    renderLineHighlight: "line",
                    cursorBlinking: "smooth",
                    overviewRulerLanes: 0,
                    hideCursorInOverviewRuler: true,
                    overviewRulerBorder: false,
                    folding: false,
                    lineNumbersMinChars: 3,
                    automaticLayout: true,
                    scrollbar: { vertical: "hidden", horizontal: "hidden" },
                  }}
                  loading={
                    <div className="h-full flex items-center justify-center text-muted text-sm font-mono">
                      Loading editor…
                    </div>
                  }
                />
              </div>

              <div className="h-[520px] bg-[#080809] flex flex-col">
                {/* Tabs */}
                <div className="flex items-center gap-1 px-5 py-2 border-b border-line shrink-0">
                  <button
                    onClick={() => setViewMode("visual")}
                    className={`px-3 py-1 text-xs font-mono transition-colors ${
                      viewMode === "visual" ? "text-text" : "text-muted hover:text-text"
                    }`}
                  >
                    Visual
                  </button>
                  <button
                    onClick={() => setViewMode("text")}
                    className={`px-3 py-1 text-xs font-mono transition-colors ${
                      viewMode === "text" ? "text-text" : "text-muted hover:text-text"
                    }`}
                  >
                    Text
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-8 overflow-auto">
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
                      ) : (
                        <pre className="font-mono text-sm text-text/80 leading-relaxed whitespace-pre-wrap">
                          {output}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted text-sm">
                        Click <span className="text-text">Run</span> to analyze or{" "}
                        <span className="text-text">Deploy</span> to testnet
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function Demo() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-muted text-sm">
        Loading…
      </div>
    }>
      <DemoContent />
    </Suspense>
  );
}
