import { NextRequest, NextResponse } from "next/server";
import { analyze } from "@/lib/clarity/analyzer";

const MAX_CODE_LENGTH = 100_000;
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3456",
  "https://clarityforge-sigma.vercel.app",
  "https://clarityforge.vercel.app",
];

function generateTxHash(): string {
  const hex = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
  return `0x${hex}`;
}

function generateContractId(template: string): string {
  const suffix = Math.random().toString(36).substring(2, 6);
  return `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.${template}-${suffix}`;
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";
  const isAllowed = ALLOWED_ORIGINS.some((o) => origin === o)
    || process.env.NODE_ENV === "development"
    || origin === "";

  if (!isAllowed) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "Expected JSON" }, { status: 415 });
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.code || typeof body.code !== "string") {
    return NextResponse.json({ error: "Missing 'code' field" }, { status: 400 });
  }

  if (body.code.length > MAX_CODE_LENGTH) {
    return NextResponse.json({ error: "Code exceeds maximum length" }, { status: 413 });
  }

  const result = analyze(body.code);

  if (!result.valid) {
    return NextResponse.json({
      error: "Contract has syntax errors. Fix them before deploying.",
      diagnostics: result.diagnostics,
    }, { status: 422 });
  }

  const tokenDef = result.definitions.find((d) => d.type === "fungible-token");
  const nftDef = result.definitions.find((d) => d.type === "non-fungible-token");
  const contractName = tokenDef?.name ?? nftDef?.name ?? "contract";

  const txHash = generateTxHash();
  const contractId = generateContractId(contractName);

  return NextResponse.json({
    txHash,
    contractId,
    network: "testnet",
    blockHeight: 142_000 + Math.floor(Math.random() * 2000),
    definitions: result.definitions,
    stats: result.stats,
  });
}

export const runtime = "nodejs";
export const maxDuration = 5;
