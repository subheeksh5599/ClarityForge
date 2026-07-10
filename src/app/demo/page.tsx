"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const TEMPLATES: Record<string, string> = {
  token: `;; SIP-010 Fungible Token
;; Deploy your first token

(define-fungible-token my-token u1000000)

(define-public (transfer (amount uint) (recipient principal))
  (begin
    (try! (ft-transfer? my-token amount tx-sender recipient))
    (ok true)))

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance my-token who)))`,

  nft: `;; SIP-009 NFT Collection
;; Mint unique digital assets

(define-non-fungible-token nft-collection)

(define-data-var last-id uint u0)

(define-public (mint (recipient principal))
  (let ((new-id (+ (var-get last-id) u1)))
    (var-set last-id new-id)
    (try! (nft-mint? nft-collection new-id recipient))
    (ok new-id)))`,

  dao: `;; Simple DAO Governor
;; Propose and vote on-chain

(define-data-var proposal-count uint u0)

(define-map proposals uint {
  proposer: principal,
  description: (string-utf8 256),
  votes-for: uint,
  votes-against: uint,
  executed: bool
})

(define-public (propose (desc (string-utf8 256)))
  (let ((id (+ (var-get proposal-count) u1)))
    (var-set proposal-count id)
    (map-set proposals id {
      proposer: tx-sender,
      description: desc,
      votes-for: u0,
      votes-against: u0,
      executed: false
    })
    (ok id)))`,
};

export default function Demo() {
  const [code, setCode] = useState(TEMPLATES.token);
  const [template, setTemplate] = useState<"token" | "nft" | "dao">("token");
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const switchTemplate = (k: "token" | "nft" | "dao") => {
    setTemplate(k);
    setCode(TEMPLATES[k]);
    setOutput(null);
  };

  const handleRun = async () => {
    setRunning(true);
    setOutput(null);

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

      const lines: string[] = [];
      if (data.valid) {
        lines.push("✓ Contract analysis complete");
      } else {
        lines.push("✗ Contract has errors");
      }
      lines.push("");

      // Definitions
      if (data.definitions && data.definitions.length > 0) {
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

      // Stats
      if (data.stats) {
        lines.push(`Lines: ${data.stats.totalLines}`);
        lines.push(`Functions: ${data.stats.functions}`);
        lines.push(`Data vars: ${data.stats.dataVars}`);
        lines.push(`Maps: ${data.stats.maps}`);
        lines.push(`Tokens: ${data.stats.tokens}`);
        lines.push("");
      }

      // Diagnostics
      if (data.diagnostics && data.diagnostics.length > 0) {
        for (const d of data.diagnostics) {
          const icon = d.severity === "error" ? "✗" : d.severity === "warning" ? "⚠" : "ℹ";
          lines.push(`${icon} Line ${d.line}: ${d.message}`);
        }
        lines.push("");
      }

      // Cost
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

  const labels: Record<string, string> = { token: "Token", nft: "NFT", dao: "DAO" };

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
              <div className="flex items-center">
                {(Object.keys(TEMPLATES) as Array<"token" | "nft" | "dao">).map((k) => (
                  <button
                    key={k}
                    onClick={() => switchTemplate(k as "token" | "nft" | "dao")}
                    className={`px-4 py-3 text-xs font-mono transition-colors border-b-2 -mb-px ${
                      template === k
                        ? "text-text border-text"
                        : "text-muted border-transparent hover:text-text"
                    }`}
                  >
                    {labels[k]}
                  </button>
                ))}
              </div>
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

              <div className="h-[520px] bg-[#080809] p-8 overflow-auto">
                {output ? (
                  <pre className="font-mono text-sm text-text/80 leading-relaxed whitespace-pre-wrap">
                    {output}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted text-sm">
                      Click <span className="text-text">Run</span> to simulate your contract
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
