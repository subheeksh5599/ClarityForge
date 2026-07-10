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
  const [template, setTemplate] = useState<"token" | "nft" | "dao">("token");
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    setRunning(true);
    setOutput(null);
    await new Promise((r) => setTimeout(r, 600));
    setOutput(
      "✓ Contract analysis complete\n" +
        "\n" +
        "• Syntax: valid\n" +
        "• Type check: passed\n" +
        "• Cost estimate: 12,400 microSTX\n" +
        "• Functions defined: 2 public, 2 read-only\n" +
        "\n" +
        "→ Ready for testnet deployment"
    );
    setRunning(false);
  };

  return (
    <>
      <Nav />
      <main className="pt-24 pb-20 px-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm text-muted font-mono tracking-[0.15em] uppercase mb-4">
            Interactive Demo
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] mb-10">
            Write Clarity right now.
          </h1>

          <div className="border border-line rounded-sm overflow-hidden bg-[#0A0A0B]">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 h-12 border-b border-line">
              <div className="flex items-center gap-1">
                {(Object.keys(TEMPLATES) as Array<"token" | "nft" | "dao">).map((k) => (
                  <button
                    key={k}
                    onClick={() => { setTemplate(k as "token" | "nft" | "dao"); setOutput(null); }}
                    className={`px-3 py-1.5 text-xs font-mono transition-colors ${
                      template === k
                        ? "text-text bg-text/5"
                        : "text-muted hover:text-text"
                    }`}
                  >
                    {k === "token" ? "Token" : k === "nft" ? "NFT" : "DAO"}
                  </button>
                ))}
              </div>
              <button
                onClick={handleRun}
                disabled={running}
                className={`flex items-center gap-2 px-4 py-1.5 text-xs font-medium transition-colors ${
                  running
                    ? "text-muted cursor-wait"
                    : "text-bg bg-text hover:bg-text/90"
                }`}
              >
                ▶ {running ? "Running…" : "Run"}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-line">
              {/* Editor */}
              <div className="h-[460px]">
                <MonacoEditor
                  language="rust"
                  theme="clarityforge"
                  value={TEMPLATES[template]}
                  beforeMount={(monaco) => {
                    monaco.editor.defineTheme("clarityforge", {
                      base: "vs-dark",
                      inherit: true,
                      rules: [
                        { token: "comment", foreground: "6B6B6B", fontStyle: "italic" },
                        { token: "keyword", foreground: "A0A0A0" },
                        { token: "string", foreground: "EBEBE5" },
                        { token: "number", foreground: "999999" },
                      ],
                      colors: {
                        "editor.background": "#0A0A0B",
                        "editor.foreground": "#EBEBE5",
                        "editor.lineHighlightBackground": "#1A1A1C",
                        "editor.selectionBackground": "#EBEBE522",
                        "editorCursor.foreground": "#EBEBE5",
                        "editorLineNumber.foreground": "#333333",
                        "editorLineNumber.activeForeground": "#6B6B6B",
                      },
                    });
                  }}
                  options={{
                    fontSize: 14,
                    fontFamily: "'DM Mono', monospace",
                    lineNumbers: "on",
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    padding: { top: 20, bottom: 20 },
                    renderLineHighlight: "line",
                    cursorBlinking: "smooth",
                    overviewRulerLanes: 0,
                    hideCursorInOverviewRuler: true,
                    overviewRulerBorder: false,
                    folding: false,
                    lineNumbersMinChars: 3,
                    automaticLayout: true,
                  }}
                  loading={
                    <div className="h-full flex items-center justify-center text-muted text-sm font-mono">
                      Loading editor…
                    </div>
                  }
                />
              </div>

              {/* Output */}
              <div className="h-[460px] bg-[#080809] p-8 overflow-auto">
                <p className="text-xs text-muted font-mono uppercase tracking-wider mb-6">
                  Output
                </p>
                {output ? (
                  <pre className="font-mono text-sm text-text/80 leading-relaxed whitespace-pre-wrap">
                    {output}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-muted text-sm">
                      Click <span className="text-text">Run</span> to simulate
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
