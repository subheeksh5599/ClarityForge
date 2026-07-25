import { NextRequest, NextResponse } from "next/server";
import { analyze, analyzeCost } from "@/lib/clarity/analyzer";

const MAX_CODE_LENGTH = 100_000; // 100KB
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3456",
  "https://clarityforge-sigma.vercel.app",
  "https://clarityforge.vercel.app",
];

// Simple in-memory rate limiter (resets on cold start)
const RATE_WINDOW_MS = 10000; // 10 seconds
const MAX_REQUESTS_PER_WINDOW = 20;
const requestLog: Map<string, number[]> = new Map();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = requestLog.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  requestLog.set(ip, recent);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) return true;
  recent.push(now);
  return false;
}

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests — wait a few seconds" },
      { status: 429 }
    );
  }

  // Origin check (CSRF protection)
  const origin = req.headers.get("origin") ?? "";
  const isAllowed =
    ALLOWED_ORIGINS.some((o) => origin === o) ||
    process.env.NODE_ENV === "development" ||
    origin === "";

  if (!isAllowed) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }

  // Content-Type check
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "Expected JSON" }, { status: 415 });
  }

  // Parse body
  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.code !== "string") {
    return NextResponse.json(
      { error: "Missing 'code' field — send { \"code\": \"...\" }" },
      { status: 400 }
    );
  }

  // Length limit
  if (body.code.length > MAX_CODE_LENGTH) {
    return NextResponse.json(
      { error: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters` },
      { status: 413 }
    );
  }

  // Reject obvious non-Clarity input (binary, base64, HTML, etc.)
  const trimmed = body.code.trim();
  if (trimmed.length === 0) {
    return NextResponse.json({
      valid: false,
      diagnostics: [
        { line: 1, col: 1, message: "Code is empty", severity: "warning" },
      ],
      definitions: [],
      stats: { totalLines: 0, functions: 0, tokens: 0, dataVars: 0, maps: 0 },
      costEstimate: 0,
    });
  }

  // Sanity check: if fewer than 10% of chars look like Clarity tokens, warn
  const parenChars = (trimmed.match(/[()]/g) || []).length;
  const alphaChars = (trimmed.match(/[a-zA-Z]/g) || []).length;
  if (parenChars === 0 && alphaChars < 5) {
    return NextResponse.json({
      valid: false,
      diagnostics: [
        {
          line: 1,
          col: 1,
          message: "Input does not appear to be valid Clarity code — no parentheses or keywords found",
          severity: "error",
        },
      ],
      definitions: [],
      stats: { totalLines: trimmed.split("\n").length, functions: 0, tokens: 0, dataVars: 0, maps: 0 },
      costEstimate: 0,
    });
  }

  // Analyze — wrapped in try/catch so tokenizer failures don't 500
  let result;
  try {
    result = analyze(trimmed);
  } catch (e) {
    return NextResponse.json(
      {
        valid: false,
        diagnostics: [
          {
            line: 1,
            col: 1,
            message: `Analysis failed: ${e instanceof Error ? e.message : "Unknown error"}. This may happen with unusually complex or non-standard input — try Clarinet for full validation.`,
            severity: "error",
          },
        ],
        definitions: [],
        stats: {
          totalLines: trimmed.split("\n").length,
          functions: 0,
          tokens: 0,
          dataVars: 0,
          maps: 0,
        },
        costEstimate: 0,
      },
      { status: 200 } // 200, not 500 — valid response with error diagnostics
    );
  }

  const cost = analyzeCost(trimmed);

  return NextResponse.json({
    ...result,
    costEstimate: cost,
  });
}

export const runtime = "nodejs";
export const maxDuration = 5;
