"use client";

import { VmStep, SimAccount } from "@/lib/clarity/vm";

interface Props {
  steps: VmStep[];
  returnValue: string;
  costEstimate: number;
  selectedAccount: SimAccount | undefined;
}

function StepIcon({ type }: { type: VmStep["type"] }) {
  switch (type) {
    case "read": return <span className="text-blue-400/80">◎</span>;
    case "write": return <span className="text-yellow-400/80">✎</span>;
    case "transfer": return <span className="text-green-400/80">→</span>;
    case "emit": return <span className="text-purple-400/80">⚡</span>;
    case "return": return <span className="text-text/60">↩</span>;
    case "error": return <span className="text-red-400/80">✗</span>;
  }
}

function StepLabel({ type }: { type: VmStep["type"] }) {
  switch (type) {
    case "read": return "READ";
    case "write": return "WRITE";
    case "transfer": return "TRANSFER";
    case "emit": return "EVENT";
    case "return": return "RETURN";
    case "error": return "ERROR";
  }
}

export default function VmTrace({ steps, returnValue, costEstimate, selectedAccount }: Props) {
  if (!steps.length) return null;

  return (
    <div className="space-y-4">
      {/* Caller info */}
      {selectedAccount && (
        <div className="text-[10px] text-muted font-mono">
          <span className="text-muted/60">caller:</span>{" "}
          <span className="text-text/80">{selectedAccount.label}</span>
          {" "}
          <span className="text-muted/40">({selectedAccount.address.slice(0, 12)}…)</span>
        </div>
      )}

      {/* Execution steps */}
      <div>
        <p className="text-[10px] text-muted font-mono uppercase tracking-wider mb-2">Trace</p>
        <div className="space-y-1">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`flex gap-2 px-2.5 py-2 text-[11px] rounded-sm ${
                step.type === "error"
                  ? "bg-red-400/5 border border-red-400/20"
                  : step.type === "return"
                  ? "bg-text/[0.03] border border-line"
                  : step.type === "transfer"
                  ? "bg-text/[0.02]"
                  : ""
              }`}
            >
              <span className="mt-px w-5 text-center font-mono shrink-0">
                <StepIcon type={step.type} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-muted/60 font-mono uppercase">
                    <StepLabel type={step.type} />
                  </span>
                  {step.storageChange && (
                    <span className="text-[9px] text-yellow-400/60 font-mono">
                      {step.storageChange}
                    </span>
                  )}
                </div>
                <div className="text-text/80 font-mono leading-relaxed mt-0.5">{step.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Return + cost */}
      <div className="flex items-center justify-between pt-2 border-t border-line">
        <div className="text-[11px] font-mono">
          <span className="text-muted/60">→ </span>
          <span className="text-text">{returnValue}</span>
        </div>
        <span className="text-[11px] text-muted font-mono">{costEstimate.toLocaleString()} µSTX</span>
      </div>
    </div>
  );
}
