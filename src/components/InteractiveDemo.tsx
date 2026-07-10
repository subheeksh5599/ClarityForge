"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import ScrollReveal from "./ScrollReveal";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const defaultCode = `;; SIP-010 Fungible Token Template
;; Deploy your first token in minutes

(define-fungible-token my-token u1000000)

(define-public (transfer (amount uint) (recipient principal))
  (begin
    (try! (ft-transfer? my-token amount tx-sender recipient))
    (ok true)
  )
)

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance my-token who))
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply my-token))
)`;

const templates = [
  { name: "SIP-010 Token", code: defaultCode },
  {
    name: "SIP-009 NFT",
    code: `;; SIP-009 Non-Fungible Token
;; Mint unique collectibles

(define-non-fungible-token nft-collection)

(define-data-var last-id uint u0)

(define-public (mint (recipient principal))
  (let ((new-id (+ (var-get last-id) u1)))
    (var-set last-id new-id)
    (try! (nft-mint? nft-collection new-id recipient))
    (ok new-id)
  )
)`,
  },
  {
    name: "DAO Governor",
    code: `;; Simple DAO Governance
;; Propose and vote on-chain

(define-data-var proposal-count uint u0)

(define-map proposals uint {
  proposer: principal,
  description: (string-utf8 256),
  for-votes: uint,
  against-votes: uint,
  executed: bool
})

(define-public (propose (description (string-utf8 256)))
  (let ((id (+ (var-get proposal-count) u1)))
    (var-set proposal-count id)
    (map-set proposals id {
      proposer: tx-sender,
      description: description,
      for-votes: u0,
      against-votes: u0,
      executed: false
    })
    (ok id)
  )
)`,
  },
];

export default function InteractiveDemo() {
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(0);
  const [code, setCode] = useState(templates[0].code);

  const handleRun = async () => {
    setRunning(true);
    setOutput(null);

    // Simulate contract execution
    await new Promise((r) => setTimeout(r, 800));

    setOutput(
      `✓ Contract analysis complete\n\n` +
        `• Syntax: valid\n` +
        `• Type check: passed\n` +
        `• Cost estimate: 12,400 microSTX\n` +
        `• Defined: 1 fungible token, 2 public functions, 2 read-only functions\n\n` +
        `→ Ready to deploy on Stacks testnet`
    );
    setRunning(false);
  };

  const selectTemplate = (idx: number) => {
    setActiveTemplate(idx);
    setCode(templates[idx].code);
    setOutput(null);
  };

  return (
    <section id="demo" className="relative py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6">
        <ScrollReveal className="mb-16">
          <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase mb-4">
            Interactive Demo
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] leading-tight max-w-2xl">
            Write Clarity{" "}
            <span className="text-accent">right now.</span>
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-2xl shadow-black/40">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 h-12 border-b border-border bg-bg">
              <div className="flex items-center gap-1">
                {templates.map((t, i) => (
                  <button
                    key={t.name}
                    onClick={() => selectTemplate(i)}
                    className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                      activeTemplate === i
                        ? "bg-accent/15 text-accent"
                        : "text-muted hover:text-text"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              <button
                onClick={handleRun}
                disabled={running}
                className={`flex items-center gap-2 px-4 py-1.5 rounded text-xs font-medium transition-colors ${
                  running
                    ? "bg-accent/30 text-accent cursor-wait"
                    : "bg-accent text-white hover:bg-accent/90"
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <polygon points="2,0 12,6 2,12" />
                </svg>
                {running ? "Running..." : "Run"}
              </button>
            </div>

            {/* Editor + Output */}
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
              <div className="h-[420px]">
                <MonacoEditor
                  language="clarity"
                  theme="clarityforge-dark"
                  value={code}
                  onChange={(v) => setCode(v || "")}
                  beforeMount={(monaco) => {
                    monaco.editor.defineTheme("clarityforge-dark", {
                      base: "vs-dark",
                      inherit: true,
                      rules: [
                        { token: "comment", foreground: "6B6B6B", fontStyle: "italic" },
                        { token: "keyword", foreground: "C792EA" },
                        { token: "string", foreground: "FFD580" },
                        { token: "number", foreground: "82AAFF" },
                        { token: "type", foreground: "3B82F6" },
                      ],
                      colors: {
                        "editor.background": "#141418",
                        "editor.foreground": "#EDEDE8",
                        "editor.lineHighlightBackground": "#1E1E24",
                        "editor.selectionBackground": "#3B82F633",
                        "editorCursor.foreground": "#3B82F6",
                        "editorLineNumber.foreground": "#3B3B3B",
                        "editorLineNumber.activeForeground": "#6B6B6B",
                      },
                    });
                  }}
                  options={{
                    fontSize: 13,
                    fontFamily: "'DM Mono', monospace",
                    lineNumbers: "on",
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    padding: { top: 16, bottom: 16 },
                    renderLineHighlight: "line",
                    cursorBlinking: "smooth",
                    smoothScrolling: true,
                    overviewRulerLanes: 0,
                    hideCursorInOverviewRuler: true,
                    overviewRulerBorder: false,
                    lineDecorationsWidth: 8,
                    glyphMargin: false,
                    folding: false,
                    lineNumbersMinChars: 3,
                    automaticLayout: true,
                  }}
                  loading={
                    <div className="h-full flex items-center justify-center text-muted font-mono text-sm">
                      Loading editor...
                    </div>
                  }
                />
              </div>

              {/* Output panel */}
              <div className="h-[420px] bg-[#0D0D0F] p-6 overflow-auto">
                <p className="text-xs text-muted font-mono uppercase tracking-wider mb-4">
                  Output
                </p>
                {output ? (
                  <pre className="font-mono text-sm text-text leading-relaxed whitespace-pre-wrap">
                    {output}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-muted text-sm font-mono">
                      Click <span className="text-accent">Run</span> to simulate your contract
                    </p>
                    <p className="text-muted/50 text-xs font-mono mt-2">
                      Execution results appear here
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
