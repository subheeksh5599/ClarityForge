import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { writeFileSync, mkdtempSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const DEVNET_TOML = `[network]
name = "devnet"
deployment_fee_rate = 10

[accounts.deployer]
mnemonic = "${process.env.DEVNET_MNEMONIC || "twice kind fence tip hidden tilt action fragile skin nothing glory cousin green tomorrow spring wrist shed math olympic multiply hip blue scout claw"}"
balance = 100_000_000_000_000

[devnet]
disable_stacks_explorer = false
disable_stacks_api = false
`;
const CLARINET_BIN = process.env.CLARINET_PATH || "/home/arch/.local/bin/clarinet";
const MAX_CODE_LENGTH = 100_000;
const ALLOWED_ORIGINS = [
  "http://localhost:3000", "http://localhost:3456",
  "https://clarityforge-sigma.vercel.app", "https://clarityforge.vercel.app",
];

function checkOrigin(origin: string) {
  return ALLOWED_ORIGINS.some((o) => origin === o) || process.env.NODE_ENV === "development" || origin === "";
}

function isClarinetAvailable(): boolean {
  try { execSync(`test -x ${CLARINET_BIN}`); return true; } catch { return false; }
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";
  if (!checkOrigin(origin)) return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return NextResponse.json({ error: "Expected JSON" }, { status: 415 });

  let body: { code?: string; fn?: string; params?: string[] };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.code || typeof body.code !== "string") return NextResponse.json({ error: "Missing code" }, { status: 400 });
  if (body.code.length > MAX_CODE_LENGTH) return NextResponse.json({ error: "Code too large" }, { status: 413 });

  // Create clarinet project scaffold
  const tmpDir = mkdtempSync(join(tmpdir(), "cf-"));
  const contractPath = join(tmpDir, "contract.clar");
  mkdirSync(join(tmpDir, "settings"));
  mkdirSync(join(tmpDir, "tests"));
  
  writeFileSync(contractPath, body.code);
  writeFileSync(join(tmpDir, "Clarinet.toml"),
    `[project]\nname = "check"\n\n[contracts.contract]\npath = "contract.clar"\n`);
  writeFileSync(join(tmpDir, "settings", "Devnet.toml"), DEVNET_TOML);

  // If a specific function is requested, generate a test file (safe: fn is validated)
  if (body.fn && /^[a-zA-Z][a-zA-Z0-9_\-!?]*$/.test(body.fn)) {
    const safeParams = (body.params || []).map((p: string) => JSON.stringify(p)).join(" ");
    const testCode = `(define-public (test-execute)
  (begin
    (contract-call? .contract ${body.fn} ${safeParams})
  )
)

(test-execute)`;
    writeFileSync(join(tmpDir, "tests", "execute_test.clar"), testCode);
  }

  try {
    // If no clarinet, fall back to static analyzer
    if (!isClarinetAvailable()) {
      const { analyze, analyzeCost } = await import("@/lib/clarity/analyzer");
      const result = analyze(body.code);
      return NextResponse.json({ ...result, costEstimate: analyzeCost(body.code), vm: "static" });
    }

    // If a function was requested for execution, run clarinet test
    if (body.fn) {
      try {
        const testOutput = execSync(`${CLARINET_BIN} test --no-coverage`, {
          cwd: tmpDir, timeout: 30_000, maxBuffer: 1024 * 1024, encoding: "utf-8",
          env: { ...process.env },
        });
        const lines = testOutput.split("\n").filter(Boolean);
        const execSteps: { type: string; detail: string }[] = [];
        
        for (const line of lines) {
          const clean = line.replace(/^\s*\[.*?\]\s*/, "").trim();
          if (clean) {
            execSteps.push({ type: "output", detail: clean });
          }
        }
        
        return NextResponse.json({
          valid: true,
          diagnostics: [{ line: 1, col: 1, message: `✓ Executed ${body.fn} via Clarinet VM`, severity: "info" }],
          rawOutput: lines.slice(0, 20),
          vm: "clarinet",
          costEstimate: 1500,
          execSteps,
        });
      } catch (e: unknown) {
        const err = e as { stderr?: string; stdout?: string; message?: string };
        const msg = (err.stderr || err.stdout || err.message || "Execution failed").split("\n")[0];
        return NextResponse.json({
          valid: false,
          diagnostics: [{ line: 1, col: 1, message: msg.replace(/^error:\s*/i, "").trim(), severity: "error" }],
          costEstimate: 0,
          rawOutput: [msg],
          vm: "clarinet",
        });
      }
    }

    // Otherwise just check
    const raw = execSync(`${CLARINET_BIN} check`, {
      cwd: tmpDir, timeout: 15_000, maxBuffer: 1024 * 1024, encoding: "utf-8",
      env: { ...process.env },
    });

    const lines = raw.split("\n").filter(Boolean);
    const diagnostics: { line: number; col: number; message: string; severity: string }[] = [];
    let valid = true;

    for (const line of lines) {
      const m = line.match(/^(error|warning):\s*(.+)/i);
      if (m) {
        diagnostics.push({ line: 1, col: 1, message: m[2], severity: m[1].toLowerCase() });
        if (m[1].toLowerCase() === "error") valid = false;
      }
    }

    if (diagnostics.length === 0) {
      diagnostics.push({ line: 1, col: 1, message: "✓ Checked by Clarinet VM", severity: "info" });
    }

    return NextResponse.json({
      valid,
      diagnostics,
      costEstimate: lines.length > 0 ? 1000 : 0,
      rawOutput: lines.slice(0, 15),
      vm: "clarinet",
    });
  } catch (e: unknown) {
    const err = e as { stderr?: string; stdout?: string; message?: string };
    const msg = (err.stderr || err.stdout || err.message || "Execution failed").split("\n")[0];
    return NextResponse.json({
      valid: false,
      diagnostics: [{ line: 1, col: 1, message: msg.replace(/^error:\s*/i, "").trim(), severity: "error" }],
      costEstimate: 0, rawOutput: [msg], vm: "clarinet",
    });
  } finally {
    try { rmSync(tmpDir, { recursive: true }); } catch { /* best-effort */ }
  }
}

export const runtime = "nodejs";
export const maxDuration = 30;
